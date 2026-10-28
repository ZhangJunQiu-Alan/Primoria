import { afterAll, describe, expect, it, vi } from "vitest";

// One writer slot makes "does a pending image hold the slot?" observable: if it
// did, no later batch could start writing until the image resolved.
vi.hoisted(() => {
  process.env.LESSON_BATCH_CONCURRENCY = "1";
});

import { processLessonGenerationJob, type LessonJobStore } from "../src/lib/courses/lesson-generation-processor";
import { batchBlockJobs } from "../src/lib/ai/course-generation/block-writer";
import { compileLessonPlanIr } from "../src/lib/ai/course-generation/lesson-plan-compiler";
import { LeaseLostError } from "../src/lib/ai/course-generation/generation-errors";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";
import type { MediaAssetStore } from "../src/lib/ai/media/media-assets";
import type { LessonGenerationClaim } from "../src/lib/courses/lesson-generation-jobs";
import type { LessonGenerationContext } from "../src/lib/courses/lesson-generation-context";

afterAll(() => {
  delete process.env.LESSON_BATCH_CONCURRENCY;
});

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

// The c1 concept batch (orders 3-5) carries the image and is the second batch written.
const ir = {
  v: 2,
  lesson: ["Photosynthesis Foundations", 35],
  blocks: [
    [1, "T", "hook", ["c1"], "hook", WI],
    [2, "T", "roadmap", CONCEPTS, "roadmap", WI],
    [3, "T", "explanation", ["c1"], "explain c1", WI],
    [4, "T", "example", ["c1"], "example c1", WI],
    [5, "I", "deepening", ["c1"], "anchor image c1", WI],
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

const TOTAL_BATCHES = batchBlockJobs(compileLessonPlanIr(ir, kg, { contextHint: "photosynthesis" }).jobs).length;

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
  if (job.type === "image") {
    return { order: job.order, title, learningGoal: "g", imageKind: "structure_diagram", prompt: "p", alt: "a", caption: "c" };
  }
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

function makeStore(overrides: Partial<LessonJobStore> = {}) {
  const state = { progress: 0, published: null as { blocks: { type: string; status?: string }[] } | null };
  const store: LessonJobStore = {
    async updateStage() {
      return true;
    },
    async incrementProgress() {
      state.progress += 1;
      return true;
    },
    async loadCheckpoints() {
      return [];
    },
    async upsertCheckpoint() {
      return true;
    },
    async deleteBatchCheckpoints() {
      return true;
    },
    async deletePlanAndDependents() {
      return true;
    },
    async publish(_fence, lesson) {
      state.published = { blocks: lesson.blocks as { type: string; status?: string }[] };
      return { ok: true };
    },
    async publishPartial() {
      return { ok: true };
    },
    ...overrides,
  };
  return { store, state };
}

const emptyMediaStore: MediaAssetStore = {
  async findByCacheKey() {
    return null;
  },
  async getById() {
    return null;
  },
  async insert() {
    throw new Error("not used");
  },
};

/** The image waits (bounded) for every batch to start writing, then fails so the
 * block resolves to an inline error without touching media storage. */
function gatedRun(store: LessonJobStore) {
  let writerCalls = 0;
  let releaseImage!: () => void;
  const allWritersStarted = new Promise<void>((resolve) => {
    releaseImage = resolve;
  });
  const observed = { writersStartedBeforeImage: false };

  const run = processLessonGenerationJob(claim, {
    store,
    loadContext: async () => ctx,
    settings: {},
    plannerInvoke: async () => ir,
    writerInvoke: async ({ batch }) => {
      writerCalls += 1;
      if (writerCalls === TOTAL_BATCHES) releaseImage();
      return (batch as { jobs: { order: number; type: string; conceptIds?: string[] }[] }).jobs.map((job) => contentFor(job));
    },
    mediaStore: emptyMediaStore,
    imageGenerate: async () => {
      await Promise.race([allWritersStarted, new Promise((resolve) => setTimeout(resolve, 15_000))]);
      observed.writersStartedBeforeImage = writerCalls === TOTAL_BATCHES;
      throw new Error("fixture image unavailable");
    },
  });
  return { run, observed };
}

describe("lesson generation imaging vs writer slots", () => {
  it("frees the writer slot while a batch's image is still generating", async () => {
    const { store, state } = makeStore();
    const { run, observed } = gatedRun(store);

    await run;

    expect(TOTAL_BATCHES).toBeGreaterThan(2);
    expect(observed.writersStartedBeforeImage).toBe(true);
    expect(state.progress).toBe(TOTAL_BATCHES);
    expect(state.published?.blocks.find((block) => block.type === "image")?.status).toBe("error");
  });

  it("surfaces a lease loss during imaging only after every batch settles", async () => {
    const { store, state } = makeStore({
      async incrementProgress() {
        return false;
      },
    });
    const { run } = gatedRun(store);

    await expect(run).rejects.toBeInstanceOf(LeaseLostError);
    expect(state.published).toBeNull();
  });
});
