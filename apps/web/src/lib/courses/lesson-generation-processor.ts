import type { CourseBlock } from "./types";
import type { TutorProviderSettings } from "../ai/types";
import { planLesson, type LessonPlannerInvoke } from "../ai/course-generation/lesson-planner";
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
import { finalizeImageBlocks, type ImageGenerate } from "../ai/media/image-builder";
import type { MediaAssetStore } from "../ai/media/media-assets";
import { IR_VERSION } from "../ai/course-generation/lesson-plan-ir";
import { CURRENT_CHECKPOINT_VERSIONS, isCheckpointCompatible } from "../ai/course-generation/versions";
import { GenerationError, LeaseLostError, LessonValidationError, PlannerError } from "../ai/course-generation/generation-errors";
import {
  deleteLessonGenerationBatchCheckpoints,
  deleteLessonGenerationPlanAndDependents,
  incrementLessonGenerationProgress,
  loadLessonGenerationCheckpoints,
  publishLessonAndCompleteJob,
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

function assertFenced(ok: boolean): void {
  if (!ok) throw new LeaseLostError();
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

  // ── Writing ───────────────────────────────────────────────────────────────
  assertFenced(await store.updateStage(fence, { stage: "writing" }));

  const compiledBlocks = await writeMissingBatches(fence, ctx, store, batches, plan, settings, options.writerInvoke);

  // ── Imaging ─────────────────────────────────────────────────────────────────
  // Resolve any pending image blocks into media assets (parallel). A single image
  // failure is rendered inline as an error block, not a lesson failure. The media
  // cache makes this idempotent on resume, so it needs no separate checkpoint.
  assertFenced(await store.updateStage(fence, { stage: "imaging", progressCompleted: batches.length }));

  // Lesson images are GLOBAL (ownerId null): the media cache is keyed globally by
  // brief semantics and shared across users, so the asset must be globally
  // readable — an owner-scoped asset would 404 for every user who reuses it.
  // Safe because generated images carry no user context (no text, and the brief
  // is never exposed through the asset URL).
  const blocks = await finalizeImageBlocks(assembleBlocks(compiledBlocks), {
    ownerId: null,
    model: IMAGE_MODEL,
    language: ctx.course.language ?? null,
    generate: options.imageGenerate,
    store: options.mediaStore,
  });

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
    const rawIr = await planLesson(ctx.kg, { contextHint: ctx.course.topic, settings, invoke: plannerInvoke });
    const compiled = compileLessonPlanIr(rawIr, ctx.kg, { contextHint: ctx.course.topic });
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
  for (const { key } of planned) {
    const existing = compatibleBatch.get(key);
    if (existing) results.set(key, existing);
  }

  // Reflect already-checkpointed batches in progress before generating the rest.
  assertFenced(await store.updateStage(fence, { progressCompleted: results.size }));

  const missing = planned.filter(({ key }) => !results.has(key));
  await mapLimit(missing, 3, async ({ batch, key }) => {
    const compiled = await generateBlockBatch({ batch, plan, kg: ctx.kg, lessonId: ctx.lesson.id, settings, invoke: writerInvoke });
    assertFenced(await store.upsertCheckpoint(fence, { checkpointKey: key, kind: "batch", payload: compiled, versions: CURRENT_CHECKPOINT_VERSIONS }));
    results.set(key, compiled);
    assertFenced(await store.incrementProgress(fence));
  });

  return results;
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
};
