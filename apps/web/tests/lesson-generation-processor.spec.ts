import { describe, expect, it } from "vitest";

import { LessonPlanIrSchema } from "../src/lib/ai/course-generation/lesson-plan-ir";
import { processLessonGenerationJob, type LessonJobStore } from "../src/lib/courses/lesson-generation-processor";
import { CURRENT_CHECKPOINT_VERSIONS } from "../src/lib/ai/course-generation/versions";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";
import type { LessonPlannerInvoke } from "../src/lib/ai/course-generation/lesson-planner";
import type { InvokeJsonArgs } from "../src/lib/ai/course-generation/model-json";
import type { LessonGenerationClaim } from "../src/lib/courses/lesson-generation-jobs";
import type { LessonGenerationContext } from "../src/lib/courses/lesson-generation-context";

const CONCEPTS = ["c1", "c2"];
const WI = "give the writer a concrete angle for this block";

const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "biology",
  startTopic: {
    topicId: "t1",
    name: "Photosynthesis",
    concepts: CONCEPTS.map((conceptId, index) => ({
      conceptId,
      name: `Concept ${index + 1}`,
      defaultOrder: index + 1,
      visual: "diagram" as const,
      visualHint: "Diagram the mechanism.",
    })),
  },
  targetConceptId: "c1",
  nextTopic: null,
};

const fixedIr = {
  v: 2,
  lesson: ["Photosynthesis Foundations", 35],
  blocks: [
    [1, "T", "hook", ["c1"], "hook", WI],
    [2, "T", "roadmap", CONCEPTS, "roadmap", WI],
    [3, "T", "explanation", ["c1"], "explain c1", WI],
    [4, "T", "example", ["c1"], "example c1", WI],
    [5, "V", "deepening", ["c1"], "visual c1", WI],
    [6, "Q", "assessment", ["c1"], "quiz c1", WI],
    [7, "T", "explanation", ["c2"], "explain c2", WI],
    [8, "T", "example", ["c2"], "example c2", WI],
    [9, "V", "example", ["c2"], "visual example c2", WI],
    [10, "V", "deepening", ["c2"], "visual c2", WI],
    [11, "Q", "assessment", ["c2"], "quiz c2", WI],
    [12, "V", "transfer", CONCEPTS, "transfer simulation", WI],
    [13, "T", "summary", CONCEPTS, "summary", WI],
  ],
};

const malformedIr = { v: Number.NaN };

type Checkpoint = { checkpointKey: string; kind: "plan" | "batch"; payload: unknown; versions: typeof CURRENT_CHECKPOINT_VERSIONS };

function makeStore(seed: Checkpoint[] = []) {
  const state = {
    checkpoints: [...seed],
    deletedPlan: false,
    published: null as { title: string; blocks: unknown[]; estimatedMinutes: number } | null,
  };
  const store: LessonJobStore = {
    async updateStage() {
      return true;
    },
    async incrementProgress() {
      return true;
    },
    async loadCheckpoints() {
      return state.checkpoints.map((cp) => ({ ...cp }));
    },
    async upsertCheckpoint(_fence, cp) {
      const entry = { checkpointKey: cp.checkpointKey, kind: cp.kind, payload: cp.payload, versions: cp.versions };
      const index = state.checkpoints.findIndex((existing) => existing.checkpointKey === cp.checkpointKey);
      if (index >= 0) state.checkpoints[index] = entry;
      else state.checkpoints.push(entry);
      return true;
    },
    async deleteBatchCheckpoints() {
      state.checkpoints = state.checkpoints.filter((cp) => cp.kind !== "batch");
      return true;
    },
    async deletePlanAndDependents() {
      state.checkpoints = [];
      state.deletedPlan = true;
      return true;
    },
    async publish(_fence, lesson) {
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
  course: { id: "crs1", topic: "photosynthesis", graphId: "biology", lessons: [{ id: "lsn1" }] } as unknown as LessonGenerationContext["course"],
  lesson: { id: "lsn1", topicId: "t1" } as unknown as LessonGenerationContext["lesson"],
  kg,
};

function contentFor(job: { order: number; type: string; conceptIds?: string[] }) {
  const title = `${job.type}${job.order}`;
  if (job.type === "visual") {
    return { order: job.order, title, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
  }
  if (job.type === "quiz") {
    return {
      order: job.order,
      title,
      questions: (job.conceptIds ?? []).map((conceptId, index) => ({
        kind: "single",
        id: `q${index + 1}`,
        question: `q${index + 1}?`,
        choices: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correctId: "a",
        conceptId,
      })),
    };
  }
  return { order: job.order, title, markdown: `body ${job.order}` };
}

function options(store: LessonJobStore, plannerInvoke: LessonPlannerInvoke) {
  return {
    store,
    loadContext: async () => ctx,
    settings: {},
    plannerInvoke,
    writerInvoke: async ({ batch }: { batch: { jobs: { order: number; type: string; conceptIds?: string[] }[] } }) =>
      batch.jobs.map((job) => contentFor(job)),
  };
}

describe("lesson generation planner repair", () => {
  it("repairs malformed fresh planner IR once and checkpoints the repaired IR", async () => {
    const { store, state } = makeStore();
    const calls: InvokeJsonArgs[] = [];
    const plannerInvoke: LessonPlannerInvoke = async (args) => {
      calls.push(args);
      return calls.length === 1 ? malformedIr : fixedIr;
    };

    await processLessonGenerationJob(claim, options(store, plannerInvoke));

    expect(calls).toHaveLength(2);
    expect(calls[0].schema).toBe(LessonPlanIrSchema);
    expect(calls[1].schema).toBe(LessonPlanIrSchema);
    expect(calls[1].user).toContain("failed deterministic validation");
    expect(state.published?.title).toBe("Photosynthesis Foundations");
    const planCheckpoint = state.checkpoints.find((cp) => cp.kind === "plan");
    expect((planCheckpoint?.payload as { rawIr?: unknown } | undefined)?.rawIr).toBe(fixedIr);
  });

  it("clears checkpoints and does not publish when the one repair still fails", async () => {
    const staleBatch: Checkpoint = {
      checkpointKey: "batch:stale",
      kind: "batch",
      payload: [{ order: 1 }],
      versions: CURRENT_CHECKPOINT_VERSIONS,
    };
    const { store, state } = makeStore([staleBatch]);
    const calls: InvokeJsonArgs[] = [];
    const plannerInvoke: LessonPlannerInvoke = async (args) => {
      calls.push(args);
      return malformedIr;
    };

    await expect(processLessonGenerationJob(claim, options(store, plannerInvoke))).rejects.toThrow();

    expect(calls).toHaveLength(2);
    expect(state.deletedPlan).toBe(true);
    expect(state.checkpoints).toEqual([]);
    expect(state.published).toBeNull();
  });
});
