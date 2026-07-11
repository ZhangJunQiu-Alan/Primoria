import type { CourseBlock } from "./types";
import type { TutorProviderSettings } from "../ai/types";
import { planLesson, repairLessonPlan, type LessonPlannerInvoke } from "../ai/course-generation/lesson-planner";
import { compileLessonPlanIr, type CompiledLessonPlan } from "../ai/course-generation/lesson-plan-compiler";
import {
  batchBlockJobs,
  batchCheckpointKey,
  generateBlockBatch,
  type BlockBatch,
  type BlockBatchInvoke,
  type CompiledBatchBlock,
} from "../ai/course-generation/block-writer";
import { validateLessonBlocks } from "../ai/course-generation/lesson-validator";
import { finalizeImageBlocks, isPendingImageBlock, type FinalizeImageOptions, type ImageGenerate } from "../ai/media/image-builder";
import type { MediaAssetStore } from "../ai/media/media-assets";
import { IR_VERSION } from "../ai/course-generation/lesson-plan-ir";
import { CURRENT_CHECKPOINT_VERSIONS, isCheckpointCompatible } from "../ai/course-generation/versions";
import {
  CoverageError,
  GenerationError,
  IrParseError,
  LeaseLostError,
  LessonValidationError,
  PlannerError,
} from "../ai/course-generation/generation-errors";
import {
  deleteLessonGenerationBatchCheckpoints,
  deleteLessonGenerationPlanAndDependents,
  incrementLessonGenerationProgress,
  loadLessonGenerationCheckpoints,
  publishLessonAndCompleteJob,
  publishPartialLessonBlocks,
  updateLessonGenerationStage,
  upsertLessonGenerationCheckpoint,
  type LessonGenerationClaim,
} from "./lesson-generation-jobs";
import { loadLessonGenerationContext, type LessonGenerationContext } from "./lesson-generation-context";

// Worker stage execution (engineering doc §9). Stages run explicitly so each
// Planner / Block-Batch result is checkpointed and a resumed worker regenerates
// only what is missing. Every mutation is fenced; a fenced write returning false
// means the lease was lost and the worker stops without further writes.

type Fence = { jobId: string; workerId: string; leaseToken: string };

type PlanCheckpointPayload = { rawIr: unknown; compiledPlan: CompiledLessonPlan };

/** Store surface the processor depends on — injectable so the stage flow can be
 * unit-tested with an in-memory store (doc §17.3). */
export type LessonJobStore = {
  updateStage: typeof updateLessonGenerationStage;
  incrementProgress: typeof incrementLessonGenerationProgress;
  loadCheckpoints: typeof loadLessonGenerationCheckpoints;
  upsertCheckpoint: (
    fence: Fence,
    checkpoint: { checkpointKey: string; kind: "plan" | "batch"; payload: unknown; versions: typeof CURRENT_CHECKPOINT_VERSIONS },
  ) => Promise<boolean>;
  deleteBatchCheckpoints: typeof deleteLessonGenerationBatchCheckpoints;
  deletePlanAndDependents: typeof deleteLessonGenerationPlanAndDependents;
  publish: typeof publishLessonAndCompleteJob;
  publishPartial: typeof publishPartialLessonBlocks;
};

export type ProcessLessonJobOptions = {
  store?: LessonJobStore;
  loadContext?: (input: { ownerId: string; courseId: string; lessonId: string }) => Promise<LessonGenerationContext>;
  /** Platform model settings; default {} resolves from server env (no BYOK). */
  settings?: TutorProviderSettings;
  plannerInvoke?: LessonPlannerInvoke;
  writerInvoke?: BlockBatchInvoke;
  /** Image generator for the imaging stage; default calls Gemini. Injectable so
   * the pipeline can be tested without the real API. */
  imageGenerate?: ImageGenerate;
  mediaStore?: MediaAssetStore;
};

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-lite-image";

export type ProcessLessonJobOutcome = {
  ownerId: string;
  courseId: string;
  lessonId: string;
  graphId: string | null;
  topic: string;
};

const PLAN_KEY = `plan:v${IR_VERSION}`;

// Concurrent block batches per lesson. Peak in-flight LLM calls is roughly this
// times LESSON_WORKER_CONCURRENCY, so raise both with provider rate limits in mind.
const rawBatchConcurrency = Number(process.env.LESSON_BATCH_CONCURRENCY ?? "");
const BATCH_CONCURRENCY =
  Number.isInteger(rawBatchConcurrency) && rawBatchConcurrency >= 1 && rawBatchConcurrency <= 8
    ? rawBatchConcurrency
    : 6;

function assertFenced(ok: boolean): void {
  if (!ok) throw new LeaseLostError();
}

function isRepairablePlanError(error: unknown): error is IrParseError | CoverageError {
  return error instanceof IrParseError || error instanceof CoverageError;
}

async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

export async function processLessonGenerationJob(
  claim: LessonGenerationClaim,
  options: ProcessLessonJobOptions = {},
): Promise<ProcessLessonJobOutcome> {
  const store = options.store ?? DEFAULT_STORE;
  const loadContext = options.loadContext ?? loadLessonGenerationContext;
  const settings = options.settings ?? {};
  const fence: Fence = { jobId: claim.job.id, workerId: claim.workerId, leaseToken: claim.leaseToken };
  const { ownerId, courseId, lessonId } = claim.job;

  const ctx = await loadContext({ ownerId, courseId, lessonId });

  // ── Planning ──────────────────────────────────────────────────────────────
  assertFenced(await store.updateStage(fence, { stage: "planning", progressCompleted: 0, progressTotal: 0 }));

  const plan = await loadOrCreatePlan(fence, ctx, store, settings, options.plannerInvoke);
  const batches = batchBlockJobs(plan.jobs);
  // progress_total = number of batches + validation + saving (doc §9.2).
  const progressTotal = batches.length + 2;
  assertFenced(await store.updateStage(fence, { progressTotal }));

  // Lesson images are GLOBAL (ownerId null): the media cache is keyed globally by
  // brief semantics and shared across users, so the asset must be globally
  // readable — an owner-scoped asset would 404 for every user who reuses it.
  // Safe because generated images carry no user context (no text, and the brief
  // is never exposed through the asset URL).
  const imaging: FinalizeImageOptions = {
    ownerId: null,
    model: IMAGE_MODEL,
    language: ctx.course.language ?? null,
    generate: options.imageGenerate,
    store: options.mediaStore,
  };

  // ── Writing (+ inline imaging) ──────────────────────────────────────────────
  // Each batch resolves its own pending image blocks right after it is written, so
  // the progressive-publish prefix can advance past ready images instead of
  // stalling at the first one. Imaging is idempotent (global media cache) and a
  // single image failure renders inline, never failing the lesson.
  assertFenced(await store.updateStage(fence, { stage: "writing" }));

  const compiledBlocks = await writeMissingBatches(fence, ctx, store, batches, plan, settings, imaging, options.writerInvoke);

  // ── Imaging (safety net) ────────────────────────────────────────────────────
  // Batches finalize their own images above, so this normally finds nothing
  // pending and passes through — it only catches a block some path left unresolved.
  assertFenced(await store.updateStage(fence, { stage: "imaging", progressCompleted: batches.length }));

  const blocks = await finalizeImageBlocks(assembleBlocks(compiledBlocks), imaging);

  // ── Validating ──────────────────────────────────────────────────────────────
  assertFenced(await store.updateStage(fence, { stage: "validating", progressCompleted: batches.length }));

  const result = validateLessonBlocks(blocks, plan.conceptIds);
  if (!result.ok) {
    // Cannot reliably attribute gaps to specific batches: keep the plan, drop all
    // batch checkpoints, regenerate block content next attempt (doc §9.4).
    await store.deleteBatchCheckpoints(fence);
    throw new LessonValidationError(`assembled lesson failed validation: ${result.missing.join(", ")}`, result.missing);
  }

  // ── Saving (atomic publish) ─────────────────────────────────────────────────
  assertFenced(await store.updateStage(fence, { stage: "saving", progressCompleted: batches.length + 1 }));
  const published = await store.publish(fence, { title: plan.title, blocks, estimatedMinutes: plan.estimatedMinutes });
  assertFenced(published.ok);

  return { ownerId, courseId, lessonId, graphId: ctx.course.graphId ?? null, topic: ctx.course.topic };
}

async function loadOrCreatePlan(
  fence: Fence,
  ctx: LessonGenerationContext,
  store: LessonJobStore,
  settings: TutorProviderSettings,
  plannerInvoke?: LessonPlannerInvoke,
): Promise<CompiledLessonPlan> {
  const checkpoints = await store.loadCheckpoints(fence.jobId);
  const planCp = checkpoints.find((cp) => cp.kind === "plan" && isCheckpointCompatible(cp.versions));
  if (planCp) {
    try {
      const payload = planCp.payload as PlanCheckpointPayload;
      // Recompile from the stored raw IR so the running compiler is authoritative.
      return compileLessonPlanIr(payload.rawIr, ctx.kg, { contextHint: ctx.course.topic });
    } catch {
      // Stored plan is incompatible with the current compiler — drop it and the
      // dependent batches, then plan fresh in this same attempt (doc §9.2).
      assertFenced(await store.deletePlanAndDependents(fence));
    }
  }

  try {
    let rawIr = await planLesson(ctx.kg, { contextHint: ctx.course.topic, settings, invoke: plannerInvoke });
    let compiled: CompiledLessonPlan;
    try {
      compiled = compileLessonPlanIr(rawIr, ctx.kg, { contextHint: ctx.course.topic });
    } catch (error) {
      if (!isRepairablePlanError(error)) throw error;
      rawIr = await repairLessonPlan(ctx.kg, rawIr, error, { contextHint: ctx.course.topic, settings, invoke: plannerInvoke });
      compiled = compileLessonPlanIr(rawIr, ctx.kg, { contextHint: ctx.course.topic });
    }
    const payload: PlanCheckpointPayload = { rawIr, compiledPlan: compiled };
    assertFenced(await store.upsertCheckpoint(fence, { checkpointKey: PLAN_KEY, kind: "plan", payload, versions: CURRENT_CHECKPOINT_VERSIONS }));
    return compiled;
  } catch (error) {
    if (error instanceof LeaseLostError) throw error;
    // Clear any stale plan/batch checkpoints so the next attempt re-plans clean.
    await store.deletePlanAndDependents(fence).catch(() => undefined);
    throw error instanceof GenerationError ? error : new PlannerError(error instanceof Error ? error.message : String(error));
  }
}

async function writeMissingBatches(
  fence: Fence,
  ctx: LessonGenerationContext,
  store: LessonJobStore,
  batches: BlockBatch[],
  plan: CompiledLessonPlan,
  settings: TutorProviderSettings,
  imaging: FinalizeImageOptions,
  writerInvoke?: BlockBatchInvoke,
): Promise<Map<string, CompiledBatchBlock[]>> {
  const checkpoints = await store.loadCheckpoints(fence.jobId);
  const compatibleBatch = new Map<string, CompiledBatchBlock[]>();
  for (const cp of checkpoints) {
    if (cp.kind === "batch" && isCheckpointCompatible(cp.versions)) {
      compatibleBatch.set(cp.checkpointKey, cp.payload as CompiledBatchBlock[]);
    }
  }

  const planned = batches.map((batch) => ({ batch, key: batchCheckpointKey(batch) }));
  const results = new Map<string, CompiledBatchBlock[]>();
  // Restore compatible batches, finalizing any pending image blocks (checkpoints
  // store the pre-image compiled batch; imaging is idempotent, so images generated
  // on a previous attempt are cache hits here).
  const restored = planned.filter(({ key }) => compatibleBatch.has(key));
  await mapLimit(restored, BATCH_CONCURRENCY, async ({ key }) => {
    results.set(key, await finalizeBatchImages(compatibleBatch.get(key)!, imaging));
  });

  // Reflect already-checkpointed batches in progress before generating the rest.
  assertFenced(await store.updateStage(fence, { progressCompleted: results.size }));

  // Progressive publish (best-effort): after each batch lands, push the growing
  // in-order prefix of ready blocks into the still-"generating" lesson so the
  // reader renders early content while later batches finish. Never authoritative
  // — the final publish overwrites with the validated full set — and never throws
  // into the pipeline. Serialized + high-water-marked so a slow write can't regress
  // the visible prefix, and stopped at the first gap or pending image (below).
  const expectedOrders = plan.jobs.map((job) => job.order).sort((a, b) => a - b);
  let publishedPrefix = 0;
  let partialChain: Promise<void> = Promise.resolve();
  const schedulePartialPublish = () => {
    const prefix = readyBlockPrefix(results, expectedOrders);
    if (prefix.length <= publishedPrefix) return;
    publishedPrefix = prefix.length;
    partialChain = partialChain.then(async () => {
      try {
        await store.publishPartial(fence, { blocks: prefix });
      } catch {
        // Preview only — the next batch or the final publish recovers.
      }
    });
  };

  // Surface any batches restored from checkpoints before generating the rest.
  schedulePartialPublish();

  const missing = planned.filter(({ key }) => !results.has(key));
  await mapLimit(missing, BATCH_CONCURRENCY, async ({ batch, key }) => {
    const compiled = await generateBlockBatch({ batch, plan, kg: ctx.kg, lessonId: ctx.lesson.id, settings, invoke: writerInvoke });
    // Checkpoint the pre-image compiled batch (text is the expensive part to
    // recover); imaging happens after and re-derives on resume from the cache.
    assertFenced(await store.upsertCheckpoint(fence, { checkpointKey: key, kind: "batch", payload: compiled, versions: CURRENT_CHECKPOINT_VERSIONS }));
    results.set(key, await finalizeBatchImages(compiled, imaging));
    assertFenced(await store.incrementProgress(fence));
    schedulePartialPublish();
  });

  await partialChain;
  return results;
}

// Finalize a single batch's pending image blocks in place, preserving order.
// Returns the batch unchanged when it has no images (the common case), so
// non-image batches never touch the imaging path.
async function finalizeBatchImages(
  compiled: CompiledBatchBlock[],
  imaging: FinalizeImageOptions,
): Promise<CompiledBatchBlock[]> {
  if (!compiled.some((entry) => isPendingImageBlock(entry.block))) return compiled;
  const finalized = await finalizeImageBlocks(compiled.map((entry) => entry.block), imaging);
  return compiled.map((entry, index) => ({ order: entry.order, block: finalized[index] }));
}

// Longest in-order prefix of ready blocks safe to publish early. Walks the full
// planned order sequence and stops at the first order not yet generated (a gap
// from a still-running batch). Batches finalize their own images before entering
// `results`, so image blocks here are already ready/error; the pending-image guard
// is a defensive stop against any unresolved (non-persistable) image — keeping a
// progressive publish a contiguous, image-safe run from the start of the lesson.
function readyBlockPrefix(byKey: Map<string, CompiledBatchBlock[]>, expectedOrders: number[]): CourseBlock[] {
  const byOrder = new Map<number, CourseBlock>();
  for (const list of byKey.values()) for (const entry of list) byOrder.set(entry.order, entry.block);
  const prefix: CourseBlock[] = [];
  for (const order of expectedOrders) {
    const block = byOrder.get(order);
    if (!block || isPendingImageBlock(block)) break;
    prefix.push(block);
  }
  return prefix;
}

function assembleBlocks(byKey: Map<string, CompiledBatchBlock[]>): CourseBlock[] {
  const entries: CompiledBatchBlock[] = [];
  for (const list of byKey.values()) entries.push(...list);
  return entries.sort((a, b) => a.order - b.order).map((entry) => entry.block);
}

const DEFAULT_STORE: LessonJobStore = {
  updateStage: updateLessonGenerationStage,
  incrementProgress: incrementLessonGenerationProgress,
  loadCheckpoints: loadLessonGenerationCheckpoints,
  // The real upsert verifies the active lease (FOR UPDATE) before writing.
  upsertCheckpoint: upsertLessonGenerationCheckpoint,
  deleteBatchCheckpoints: deleteLessonGenerationBatchCheckpoints,
  deletePlanAndDependents: deleteLessonGenerationPlanAndDependents,
  publish: publishLessonAndCompleteJob,
  publishPartial: publishPartialLessonBlocks,
};
