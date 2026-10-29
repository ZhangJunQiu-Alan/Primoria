import { describe, expect, it, vi } from "vitest";
import { processLessonGenerationJob, type LessonJobStore } from "../src/lib/courses/lesson-generation-processor";
import { buildBatchPrompt, type BlockBatch } from "../src/lib/ai/course-generation/block-writer";
import { compileBlockContent } from "../src/lib/ai/course-generation/block-content-compiler";
import { compileLessonPlanIr, type BlockGenerationJob } from "../src/lib/ai/course-generation/lesson-plan-compiler";
import { imageCacheKey, type ImageBrief } from "../src/lib/ai/media/image-brief";
import { finalizeImageBlocks, findReusableImage, makePendingImageBlock, type PendingImageBlock } from "../src/lib/ai/media/image-builder";
import type { MediaAssetStore, NewMediaAsset } from "../src/lib/ai/media/media-assets";
import type { MediaAssetRow } from "../src/lib/db/schema";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";
import type { LessonGenerationClaim } from "../src/lib/courses/lesson-generation-jobs";
import type { LessonGenerationContext } from "../src/lib/courses/lesson-generation-context";
import type { ImageBlock } from "../src/lib/courses/types";

const brief = (over: Partial<ImageBrief> = {}): ImageBrief => ({
  conceptIds: ["c1"],
  learningGoal: "goal",
  imageKind: "structure_diagram",
  prompt: "prompt",
  alt: "alt",
  caption: "caption",
  ...over,
});

function memoryStore(seed: NewMediaAsset[] = []) {
  const rows = new Map<string, MediaAssetRow>();
  const insert = async (asset: NewMediaAsset) => {
    const row = { ...asset, createdAt: new Date() } as unknown as MediaAssetRow;
    rows.set(asset.id, row);
    return row;
  };
  for (const asset of seed) void insert(asset);
  const store: MediaAssetStore = {
    async findByCacheKey(cacheKey) {
      return [...rows.values()].find((row) => row.cacheKey === cacheKey) ?? null;
    },
    async getById(id) {
      return rows.get(id) ?? null;
    },
    insert,
  };
  return { store, rows };
}

// A prewarmed concept image: its own text differs from anything a writer would brief.
const prewarmed: NewMediaAsset = {
  id: "media_prewarm_c1",
  ownerId: null,
  cacheKey: imageCacheKey(brief({ language: "en" })),
  provider: "codex-imagegen",
  model: "image_gen:unreported",
  mimeType: "image/webp",
  dataBase64: null,
  storagePath: "lesson-images/media_prewarm_c1.webp",
  prompt: "PREWARM prompt: before/after union(2,4) parent arrays",
  brief: brief({ language: "en", learningGoal: "PREWARM goal", prompt: "PREWARM prompt: before/after union(2,4) parent arrays" }),
  alt: "PREWARM alt: parent array and trees before and after union(2, 4)",
  caption: "PREWARM caption: quick-union links roots, not the input nodes.",
  width: 1672,
  height: 941,
  byteLength: 1,
};

const png = { mimeType: "image/png", dataBase64: Buffer.from("x").toString("base64"), model: "fake" };

describe("image cache keys", () => {
  it("keeps prewarmed concept keys stable", () => {
    // Recorded in the 2026-10 English prewarm import for ai_alphabeta.
    expect(imageCacheKey(brief({ conceptIds: ["ai_alphabeta"], language: "en", prompt: "", learningGoal: "" }))).toBe(
      "340dadded0a2688f8a0fac76e36d394eb37e327c2a760ef29c0c44c7adcc2abb",
    );
  });

  it("keys an image with no concept by its own brief", () => {
    const leaf = brief({ conceptIds: [], prompt: "chloroplast in a leaf" });
    expect(imageCacheKey(leaf)).not.toBe(imageCacheKey(brief({ conceptIds: [], prompt: "two skaters pushing apart" })));
    expect(imageCacheKey(leaf)).not.toBe(imageCacheKey({ ...leaf, learningGoal: "another goal" }));
    expect(imageCacheKey(leaf)).toBe(imageCacheKey({ ...leaf, caption: "reworded caption" }));
  });

  it("never serves one editor-added image for an unrelated one", async () => {
    const { store } = memoryStore();
    const generate = vi.fn(async () => png);
    const pending = (id: string, prompt: string) =>
      makePendingImageBlock({ id, title: id, conceptIds: [], brief: brief({ conceptIds: [], prompt, caption: prompt }) });
    const opts = { ownerId: null, model: "m", language: "en", store, generate };

    const [leaf] = (await finalizeImageBlocks([pending("b1", "chloroplast in a leaf")], opts)) as ImageBlock[];
    const [skaters] = (await finalizeImageBlocks([pending("b2", "two skaters pushing apart")], opts)) as ImageBlock[];

    expect(generate).toHaveBeenCalledTimes(2);
    expect(skaters.assetId).not.toBe(leaf.assetId);
    expect(skaters.caption).toBe("two skaters pushing apart");
  });
});

describe("findReusableImage", () => {
  const { store } = memoryStore([prewarmed]);

  it("returns the cached picture's own brief for a concept", async () => {
    await expect(findReusableImage(["c1"], { ownerId: null, language: "en-US", store })).resolves.toEqual({
      imageKind: "structure_diagram",
      learningGoal: "PREWARM goal",
      prompt: prewarmed.prompt,
      alt: prewarmed.alt,
      caption: prewarmed.caption,
      negativePrompt: undefined,
    });
  });

  it("finds nothing for another language, an uncached concept, or no concept", async () => {
    await expect(findReusableImage(["c1"], { ownerId: null, language: "zh", store })).resolves.toBeNull();
    await expect(findReusableImage(["c2"], { ownerId: null, language: "en", store })).resolves.toBeNull();
    await expect(findReusableImage([], { ownerId: null, language: "en", store })).resolves.toBeNull();
  });
});

const WI = "give the writer a concrete angle for this block";
const kg: CourseContext = {
  learningPathType: "linear",
  graphId: "dsa",
  startTopic: {
    topicId: "t1",
    name: "Union-find",
    concepts: ["c1", "c2"].map((conceptId, index) => ({
      conceptId,
      name: `Concept ${index + 1}`,
      defaultOrder: index + 1,
      visual: "diagram" as const,
      visualHint: "Diagram the mechanism.",
    })),
  },
  targetConceptId: "c1",
  nextTopic: null,
  language: "en",
};

const ir = {
  v: 2,
  lesson: ["Union-find", 35],
  blocks: [
    [1, "T", "hook", ["c1"], "hook", WI],
    [2, "T", "roadmap", ["c1", "c2"], "roadmap", WI],
    [3, "T", "explanation", ["c1"], "explain c1", WI],
    [4, "T", "example", ["c1"], "example c1", WI],
    [5, "I", "example", ["c1"], "analogy image: skinny chain vs bushy tree", WI],
    [6, "Q", "assessment", ["c1"], "quiz c1", WI],
    [7, "T", "explanation", ["c2"], "explain c2", WI],
    [8, "T", "example", ["c2"], "example c2", WI],
    [9, "V", "example", ["c2"], "visual example c2", WI],
    [10, "V", "deepening", ["c2"], "visual c2", WI],
    [11, "Q", "assessment", ["c2"], "quiz c2", WI],
    [12, "V", "transfer", ["c1", "c2"], "transfer simulation", WI],
    [13, "T", "summary", ["c1", "c2"], "summary", WI],
  ],
};

const existingImage = {
  imageKind: "structure_diagram" as const,
  learningGoal: "PREWARM goal",
  prompt: prewarmed.prompt,
  alt: prewarmed.alt,
  caption: prewarmed.caption,
};

describe("writer with an existing concept image", () => {
  const plan = compileLessonPlanIr(ir, kg, { contextHint: "union-find" });
  const imageJob = plan.jobs.find((job) => job.type === "image")!;
  const conceptBatch = (job: BlockGenerationJob): BlockBatch => ({
    kind: "concept",
    jobs: plan.jobs.filter((j) => [3, 4].includes(j.order)).concat(job),
  });

  it("asks only for a title and pins sibling blocks to the picture", () => {
    const plain = buildBatchPrompt(conceptBatch(imageJob), plan, kg);
    const reused = buildBatchPrompt(conceptBatch({ ...imageJob, existingImage }), plan, kg);

    expect(reused.system).toBe(plain.system);
    expect(plain.user).toContain('"prompt"');
    expect(reused.user).toContain('"title" ONLY');
    expect(reused.user).toContain(prewarmed.alt);
    expect(reused.user).toContain(prewarmed.caption);
    expect(reused.user).toContain("FIXED IMAGES: block 5");
    expect(plain.user).not.toContain("FIXED IMAGES");
  });

  it("compiles the cached brief under the writer's title", () => {
    const written = { order: 5, title: "Quick-union before and after union(2, 4)", imageKind: "analogy_illustration", prompt: "ignored", alt: "ignored", caption: "ignored", learningGoal: "ignored" };
    const block = compileBlockContent({ ...imageJob, existingImage }, written, "lsn1") as PendingImageBlock;

    expect(block.title).toBe(written.title);
    expect(block.brief).toMatchObject({ conceptIds: ["c1"], ...existingImage });
    expect(() => compileBlockContent({ ...imageJob, existingImage }, { order: 5 }, "lsn1")).toThrow(/content invalid/);
  });
});

describe("lesson generation reusing a prewarmed image", () => {
  const claim: LessonGenerationClaim = {
    job: {
      id: "ljob1", ownerId: "u1", courseId: "crs1", lessonId: "lsn1", status: "running", stage: "queued",
      attempts: 1, maxAttempts: 2, progressCompleted: 0, progressTotal: 0, leaseOwner: "w1", leaseToken: "tok1",
      leaseExpiresAt: Date.now() + 300_000, heartbeatAt: Date.now(), lastError: null, errorCategory: null,
      startedAt: Date.now(), completedAt: null, createdAt: Date.now(), updatedAt: Date.now(),
    },
    workerId: "w1",
    leaseToken: "tok1",
    leaseExpiresAt: Date.now() + 300_000,
  };
  const ctx: LessonGenerationContext = {
    course: { id: "crs1", topic: "union-find", graphId: "dsa", language: "en", lessons: [{ id: "lsn1" }] } as unknown as LessonGenerationContext["course"],
    lesson: { id: "lsn1", topicId: "t1" } as unknown as LessonGenerationContext["lesson"],
    kg,
  };

  function contentFor(job: { order: number; type: string; conceptIds?: string[] }) {
    const title = `${job.type}${job.order}`;
    if (job.type === "image") return { order: job.order, title: "Quick-union before and after union(2, 4)" };
    if (job.type === "visual") return { order: job.order, title, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
    if (job.type === "quiz") {
      return {
        order: job.order,
        title,
        questions: (job.conceptIds ?? []).map((conceptId, index) => ({
          kind: "single", id: `q${index + 1}`, question: `q${index + 1}?`,
          choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }], correctId: "a", conceptId,
        })),
      };
    }
    return { order: job.order, title, markdown: `body ${job.order}` };
  }

  it("titles and explains the cached picture without generating a new one", async () => {
    let published: ImageBlock[] = [];
    const store: LessonJobStore = {
      updateStage: async () => true,
      incrementProgress: async () => true,
      loadCheckpoints: async () => [],
      upsertCheckpoint: async () => true,
      deleteBatchCheckpoints: async () => true,
      deletePlanAndDependents: async () => true,
      publish: async (_fence, lesson) => {
        published = (lesson.blocks as ImageBlock[]).filter((block) => block.type === "image");
        return { ok: true };
      },
      publishPartial: async () => ({ ok: true }),
    };
    const writerUsers: string[] = [];
    const imageGenerate = vi.fn(async () => png);

    await processLessonGenerationJob(claim, {
      store,
      loadContext: async () => ctx,
      plannerInvoke: async () => ir,
      writerInvoke: async ({ batch, user }) => {
        writerUsers.push(user);
        return (batch as { jobs: { order: number; type: string; conceptIds?: string[] }[] }).jobs.map((job) => contentFor(job));
      },
      mediaStore: memoryStore([prewarmed]).store,
      imageGenerate,
    });

    expect(imageGenerate).not.toHaveBeenCalled();
    expect(writerUsers.find((user) => user.includes("order 5:"))).toContain("FIXED IMAGES: block 5");
    expect(published).toHaveLength(1);
    expect(published[0]).toMatchObject({
      status: "ready",
      assetId: prewarmed.id,
      title: "Quick-union before and after union(2, 4)",
      caption: prewarmed.caption,
      alt: prewarmed.alt,
      imageKind: "structure_diagram",
    });
  });
});
