#!/usr/bin/env tsx

import { processLessonGenerationJob, type LessonJobStore } from "../src/lib/courses/lesson-generation-processor.ts";
import { CURRENT_CHECKPOINT_VERSIONS } from "../src/lib/ai/course-generation/versions.ts";
import { LeaseLostError, LessonValidationError } from "../src/lib/ai/course-generation/generation-errors.ts";
import type { CompiledBatchBlock } from "../src/lib/ai/course-generation/block-writer.ts";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context.ts";
import type { LessonGenerationClaim } from "../src/lib/courses/lesson-generation-jobs.ts";
import type { LessonGenerationContext } from "../src/lib/courses/lesson-generation-context.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function assertRejects(run: () => Promise<unknown>, ErrorClass: new (...a: never[]) => Error, message: string) {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  assert(caught instanceof ErrorClass, `${message} (got ${caught?.constructor?.name ?? "no throw"})`);
}

const CONCEPTS = ["c1", "c2", "c3", "c4"];
const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "g1",
  startTopic: {
    topicId: "t1",
    name: "导数",
    concepts: CONCEPTS.map((conceptId, index) => ({
      conceptId,
      name: `概念${index + 1}`,
      defaultOrder: index + 1,
      ...(conceptId === "c2" ? { visual: "function" as const, visualHint: "plot it" } : {}),
    })),
  },
  targetConceptId: "c1",
  nextTopic: null,
};

const fixedIr = {
  v: 1,
  lesson: ["导数入门", 45],
  blocks: [
    [1, "T", "hook", ["c1"], "hook"],
    [2, "T", "roadmap", CONCEPTS, "roadmap"],
    [3, "T", "explanation", ["c1"], "explain c1"],
    [4, "C", "example", ["c1"], "example c1"],
    [5, "T", "explanation", ["c2"], "explain c2"],
    [6, "T", "example", ["c2"], "example c2"],
    [7, "T", "explanation", ["c3"], "explain c3"],
    [8, "C", "example", ["c3"], "example c3"],
    [9, "T", "explanation", ["c4"], "explain c4"],
    [10, "C", "example", ["c4"], "example c4"],
    [11, "A", "deepening", ["c1"], "analogy"],
    [12, "V", "deepening", ["c2"], "visual"],
    [13, "X", "transfer", CONCEPTS, "transfer"],
    [14, "Q", "assessment", CONCEPTS, "quiz"],
    [15, "T", "summary", CONCEPTS, "summary"],
  ],
};

type Content = Record<string, unknown> & { order: number };
function contentFor(j: { order: number; type: string }, titleOverride?: string): Content {
  const order = j.order;
  const title = titleOverride ?? `${j.type}${order}`;
  switch (j.type) {
    case "analogy":
      return { order, title, source: "s", target: "t", mapping: "m" };
    case "transfer":
      return { order, title, fromDomain: "f", toDomain: "to", explanation: "e", example: "ex" };
    case "code":
      return { order, title, language: "python", code: "print(1)", explanation: "e" };
    case "visual":
      return { order, title, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
    case "quiz":
      return {
        order,
        title,
        questions: CONCEPTS.map((conceptId, i) => ({
          kind: "single",
          id: `q${i + 1}`,
          question: `q${i + 1}?`,
          choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
          correctId: "a",
          conceptId,
        })),
      };
    default:
      return { order, title, markdown: `body ${order}` };
  }
}

type Checkpoint = { checkpointKey: string; kind: "plan" | "batch"; payload: unknown; versions: typeof CURRENT_CHECKPOINT_VERSIONS };

// In-memory fenced store mirroring the real contract (doc §17.3): when
// leaseValid is false every fenced write returns false, modelling a lost lease.
function makeStore(seed: Checkpoint[] = []) {
  const state = {
    leaseValid: true,
    checkpoints: [...seed] as Checkpoint[],
    stage: "queued" as string,
    progressCompleted: 0,
    progressTotal: 0,
    published: null as { title: string; blocks: unknown[]; estimatedMinutes: number } | null,
    deletedBatch: false,
    deletedPlan: false,
  };
  const store: LessonJobStore = {
    async updateStage(_fence, patch) {
      if (!state.leaseValid) return false;
      if (patch.stage !== undefined) state.stage = patch.stage;
      if (patch.progressCompleted !== undefined) state.progressCompleted = patch.progressCompleted;
      if (patch.progressTotal !== undefined) state.progressTotal = patch.progressTotal;
      return true;
    },
    async incrementProgress() {
      if (!state.leaseValid) return false;
      state.progressCompleted += 1;
      return true;
    },
    async loadCheckpoints() {
      return state.checkpoints.map((cp) => ({ ...cp }));
    },
    async upsertCheckpoint(_fence, cp) {
      if (!state.leaseValid) return false;
      const idx = state.checkpoints.findIndex((c) => c.checkpointKey === cp.checkpointKey);
      const entry = { checkpointKey: cp.checkpointKey, kind: cp.kind, payload: cp.payload, versions: cp.versions };
      if (idx >= 0) state.checkpoints[idx] = entry;
      else state.checkpoints.push(entry);
      return true;
    },
    async deleteBatchCheckpoints() {
      if (!state.leaseValid) return false;
      state.checkpoints = state.checkpoints.filter((c) => c.kind !== "batch");
      state.deletedBatch = true;
      return true;
    },
    async deletePlanAndDependents() {
      if (!state.leaseValid) return false;
      state.checkpoints = [];
      state.deletedPlan = true;
      return true;
    },
    async publish(_fence, lesson) {
      if (!state.leaseValid) return { ok: false };
      state.published = { title: lesson.title, blocks: lesson.blocks, estimatedMinutes: lesson.estimatedMinutes };
      return { ok: true };
    },
  };
  return { store, state };
}

const claim: LessonGenerationClaim = {
  job: {
    id: "ljob1",
    ownerId: "u1",
    courseId: "crs1",
    lessonId: "lsn1",
    status: "running",
    stage: "queued",
    attempts: 1,
    maxAttempts: 2,
    progressCompleted: 0,
    progressTotal: 0,
    leaseOwner: "w1",
    leaseToken: "tok1",
    leaseExpiresAt: Date.now() + 300_000,
    heartbeatAt: Date.now(),
    lastError: null,
    errorCategory: null,
    startedAt: Date.now(),
    completedAt: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  workerId: "w1",
  leaseToken: "tok1",
  leaseExpiresAt: Date.now() + 300_000,
};

const ctx: LessonGenerationContext = {
  course: { id: "crs1", topic: "导数", graphId: "g1", lessons: [{ id: "lsn1" }] } as unknown as LessonGenerationContext["course"],
  lesson: { id: "lsn1", topicId: "t1" } as unknown as LessonGenerationContext["lesson"],
  kg,
};
const loadContext = async () => ctx;

function options(store: LessonJobStore, onWriterCall?: () => void) {
  return {
    store,
    loadContext,
    settings: {},
    plannerInvoke: async () => fixedIr,
    writerInvoke: async ({ batch }: { batch: { jobs: { order: number; type: string }[] } }) => {
      onWriterCall?.();
      return batch.jobs.map((j) => contentFor(j));
    },
  };
}

const TOTAL_BATCHES = 8; // activation + 4 concept groups + transfer + quiz + summary

async function main() {
  // ── Full successful job ─────────────────────────────────────────────────────
  {
    const { store, state } = makeStore();
    let writerCalls = 0;
    const outcome = await processLessonGenerationJob(claim, options(store, () => (writerCalls += 1)));
    assert(state.published !== null, "lesson was published");
    assert(state.published?.blocks.length === 15, "published 15 blocks");
    assert(state.published?.title === "导数入门", "published plan title");
    assert(state.published?.estimatedMinutes === 45, "published plan minutes");
    assert(state.progressTotal === TOTAL_BATCHES + 2, "progress total = batches + validate + save");
    assert(state.stage === "saving", "final non-publish stage was saving");
    assert(writerCalls === TOTAL_BATCHES, "writer invoked once per batch on a clean run");
    assert(state.checkpoints.filter((c) => c.kind === "batch").length === TOTAL_BATCHES, "all batches checkpointed");
    assert(state.checkpoints.some((c) => c.kind === "plan"), "plan checkpointed");
    assert(outcome.courseId === "crs1" && outcome.topic === "导数", "outcome carries course identity");
  }

  // ── Resume: reuse compatible plan + partial batch checkpoints (doc §9.3) ─────
  {
    const first = makeStore();
    await processLessonGenerationJob(claim, options(first.store));
    const planCp = first.state.checkpoints.find((c) => c.kind === "plan")!;
    const batchCps = first.state.checkpoints.filter((c) => c.kind === "batch");
    const seeded = [planCp, ...batchCps.slice(0, 3)];

    const { store, state } = makeStore(seeded);
    let writerCalls = 0;
    await processLessonGenerationJob(claim, options(store, () => (writerCalls += 1)));
    assert(writerCalls === TOTAL_BATCHES - 3, "only missing batches are regenerated on resume");
    assert(state.published?.blocks.length === 15, "resume still publishes a complete lesson");
  }

  // ── Lost lease: every fenced write is a no-op, worker must abort (doc §7.2) ──
  {
    const { store, state } = makeStore();
    state.leaseValid = false;
    await assertRejects(() => processLessonGenerationJob(claim, options(store)), LeaseLostError, "lost lease aborts the job");
    assert(state.published === null, "nothing is published after lease loss");
  }

  // ── Validation failure drops batch checkpoints, never publishes (doc §9.4) ───
  {
    const { store, state } = makeStore();
    const badOptions = {
      ...options(store),
      // duplicate titles on all text blocks -> validator rejects the lesson
      writerInvoke: async ({ batch }: { batch: { jobs: { order: number; type: string }[] } }) =>
        batch.jobs.map((j) => contentFor(j, j.type === "text" ? "dup" : undefined)),
    };
    await assertRejects(() => processLessonGenerationJob(claim, badOptions), LessonValidationError, "validation failure rejects");
    assert(state.published === null, "no partial publication on validation failure");
    assert(state.deletedBatch, "batch checkpoints cleared for regeneration");
    assert(state.checkpoints.some((c) => c.kind === "plan"), "plan checkpoint is preserved");
  }

  process.stdout.write("[lesson-generation-processor.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
