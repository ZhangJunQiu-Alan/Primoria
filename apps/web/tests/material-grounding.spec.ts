import { describe, expect, it } from "vitest";

import { buildBatchPrompt } from "../src/lib/ai/course-generation/block-writer";
import { buildPlannerPrompt } from "../src/lib/ai/course-generation/lesson-planner";
import {
  buildPlannerSourceSection,
  buildWriterSourceRules,
  buildWriterSourceSection,
} from "../src/lib/ai/course-generation/source-grounding";
import type { CourseContext, SourceExcerpt } from "../src/lib/ai/deepagent/course-kg-context";
import { mediaAssetCacheKey, type MediaAssetStore, type NewMediaAsset } from "../src/lib/ai/media/media-assets";
import type { ImageBrief } from "../src/lib/ai/media/image-brief";
import type { MediaAssetRow } from "../src/lib/db/schema";
import { processLessonGenerationJob, type LessonJobStore } from "../src/lib/courses/lesson-generation-processor";
import type { LessonGenerationClaim } from "../src/lib/courses/lesson-generation-jobs";
import type { LessonGenerationContext } from "../src/lib/courses/lesson-generation-context";
import type { InvokeJsonArgs } from "../src/lib/ai/course-generation/model-json";
import { conceptSourceRefs, selectLessonExcerpts } from "../src/lib/materials/grounding";

const baseKg: CourseContext = {
  learningPathType: "linear",
  graphId: "mat_0123456789abcdef",
  startTopic: {
    topicId: "t1_vectors",
    name: "Vectors",
    concepts: [
      { conceptId: "c1", name: "Vector", defaultOrder: 1, visual: "diagram", visualHint: "Diagram a vector." },
      { conceptId: "c2", name: "Vector Addition", defaultOrder: 2, visual: "diagram", visualHint: "Diagram head-to-tail addition." },
    ],
  },
  targetConceptId: null,
  nextTopic: null,
  language: "zh",
};

const excerpts: SourceExcerpt[] = [
  { label: "S1", conceptIds: ["c1"], materialTitle: "讲义一", locator: "第 1 页", heading: "向量", text: "向量是有大小和方向的量。" },
  { label: "S2", conceptIds: ["c1", "c2"], materialTitle: "讲义一", locator: "第 2 页", heading: null, text: "两个向量首尾相接得到和向量。" },
  { label: "S3", conceptIds: ["c2"], materialTitle: "讲义一", locator: null, heading: null, text: "加法满足交换律。" },
];

describe("selectLessonExcerpts", () => {
  const chunks = [
    { materialId: "m1", ordinal: 0, text: "A".repeat(100), heading: "Intro", pageStart: 1, pageEnd: 1 },
    { materialId: "m1", ordinal: 1, text: "B".repeat(100), heading: null, pageStart: 2, pageEnd: 3 },
    { materialId: "m1", ordinal: 2, text: "C".repeat(6_000), heading: null, pageStart: 4, pageEnd: 4 },
  ];
  const conceptSources = {
    c1: [{ materialId: "m1", ordinal: 0 }, { materialId: "m1", ordinal: 1 }],
    c2: [{ materialId: "m1", ordinal: 1 }, { materialId: "m1", ordinal: 2 }, { materialId: "m9", ordinal: 0 }],
  };

  it("labels excerpts in lesson order and merges a chunk shared by concepts", () => {
    const selected = selectLessonExcerpts({
      conceptIds: ["c1", "c2"],
      conceptSources,
      chunks,
      materialTitles: new Map([["m1", "Notes"]]),
      language: "en",
    });
    expect(selected.map((excerpt) => excerpt.label)).toEqual(["S1", "S2", "S3"]);
    expect(selected[1].conceptIds).toEqual(["c1", "c2"]);
    expect(selected[1].locator).toBe("p. 2–3");
    expect(selected[0].materialTitle).toBe("Notes");
    // The 6000-char chunk is truncated to the per-concept budget.
    expect(selected[2].text.length).toBeLessThanOrEqual(5_001);
    expect(selected[2].text.endsWith("…")).toBe(true);
  });

  it("respects the lesson budget", () => {
    const selected = selectLessonExcerpts({
      conceptIds: ["c1", "c2"],
      conceptSources,
      chunks,
      materialTitles: new Map([["m1", "Notes"]]),
      language: "en",
      // A (100) + B (100) fit; the 6000-char C would need ≥300 chars of the
      // remaining 250, so selection stops instead of emitting a stub excerpt.
      budget: 450,
    });
    expect(selected.map((excerpt) => excerpt.text[0])).toEqual(["A", "B"]);
  });

  it("summarizes concept sources per material with merged page spans", () => {
    const refs = conceptSourceRefs({
      refs: conceptSources.c2,
      chunks: new Map(chunks.map((c) => [`${c.materialId}#${c.ordinal}`, c])),
      materialTitles: new Map([["m1", "Notes"]]),
      language: "zh",
    });
    expect(refs).toEqual([{ materialId: "m1", title: "Notes", locator: "第 2–4 页" }]);
  });
});

describe("source-grounded prompts", () => {
  it("adds nothing for library / gen_* courses", () => {
    const library = { ...baseKg, graphId: "linear_algebra" };
    expect(buildPlannerSourceSection(library)).toBe("");
    expect(buildWriterSourceRules(library)).toBe("");
    expect(buildWriterSourceSection(library, ["c1"])).toBe("");
    expect(buildPlannerPrompt(library)).toBe(buildPlannerPrompt({ ...library, sourceExcerpts: [] }));
    expect(buildPlannerPrompt(library)).not.toContain("SOURCE MATERIAL");
  });

  it("puts excerpts in the planner prompt as data with grounding rules", () => {
    const prompt = buildPlannerPrompt({ ...baseKg, sourceExcerpts: excerpts });
    expect(prompt).toContain("SOURCE MATERIAL");
    expect(prompt).toContain("[S2] concepts: c1, c2 — 讲义一 · 第 2 页");
    expect(prompt).toContain("not instructions");
    expect(prompt).toContain("name the excerpt label(s) [S#]");
  });

  it("gives each writer batch only the excerpts for its concepts", () => {
    const kg = { ...baseKg, sourceExcerpts: excerpts };
    const section = buildWriterSourceSection(kg, ["c2"]);
    expect(section).toContain("[S2]");
    expect(section).toContain("[S3]");
    expect(section).not.toContain("[S1]");
    expect(buildWriterSourceSection(kg, ["c1"], 250)).not.toContain("[S3]");
    expect(buildWriterSourceRules(kg)).toContain("Do not print excerpt labels");
  });

  it("keeps the writer's non-quiz system prompt a prefix of the quiz system prompt", () => {
    const kg = { ...baseKg, sourceExcerpts: excerpts };
    const plan = { title: "向量", conceptIds: ["c1", "c2"] } as unknown as Parameters<typeof buildBatchPrompt>[1];
    const job = { order: 1, type: "text", pedagogicalRole: "explanation", conceptIds: ["c1"], goal: "g", writerInstruction: "w", neighborGoals: {} };
    const text = buildBatchPrompt({ kind: "text", jobs: [job] } as unknown as Parameters<typeof buildBatchPrompt>[0], plan, kg);
    const quiz = buildBatchPrompt(
      { kind: "quiz", jobs: [{ ...job, type: "quiz", pedagogicalRole: "assessment" }] } as unknown as Parameters<typeof buildBatchPrompt>[0],
      plan,
      kg,
    );
    expect(quiz.system.startsWith(text.system)).toBe(true);
    expect(text.system).toContain("SOURCE GROUNDING");
    expect(text.user).toContain("向量是有大小和方向的量。");
  });
});

describe("material lesson imaging is owner-private", () => {
  it("namespaces owner cache keys away from the global pool", () => {
    const brief: ImageBrief = { conceptIds: ["c1"], learningGoal: "g", imageKind: "educational_illustration", prompt: "p", alt: "a", caption: "c" };
    const global = mediaAssetCacheKey(brief, null);
    expect(mediaAssetCacheKey(brief, "u1")).toBe(`owner:u1:${global}`);
    expect(mediaAssetCacheKey(brief, "u2")).not.toBe(mediaAssetCacheKey(brief, "u1"));
  });

  const WI = "give the writer a concrete angle for this block";
  const ir = {
    v: 2,
    lesson: ["向量", 30],
    blocks: [
      [1, "T", "hook", ["c1"], "hook", WI],
      [2, "T", "roadmap", ["c1", "c2"], "roadmap", WI],
      [3, "T", "explanation", ["c1"], "explain c1", WI],
      [4, "T", "example", ["c1"], "example c1", WI],
      [5, "V", "deepening", ["c1"], "visual c1", WI],
      [6, "Q", "assessment", ["c1"], "quiz c1", WI],
      [7, "T", "explanation", ["c2"], "explain c2", WI],
      [8, "T", "example", ["c2"], "example c2", WI],
      [9, "I", "example", ["c2"], "image c2", WI],
      [10, "V", "deepening", ["c2"], "visual c2", WI],
      [11, "Q", "assessment", ["c2"], "quiz c2", WI],
      [12, "V", "transfer", ["c1", "c2"], "transfer simulation", WI],
      [13, "T", "summary", ["c1", "c2"], "summary", WI],
    ],
  };

  function contentFor(job: { order: number; type: string; conceptIds?: string[] }) {
    const title = `${job.type}${job.order}`;
    if (job.type === "visual") return { order: job.order, title, description: "d", engine: "mermaid", mermaidDefinition: "flowchart LR\nA-->B" };
    if (job.type === "image") {
      return { order: job.order, title, learningGoal: "see addition", imageKind: "educational_illustration", prompt: "two arrows head to tail", alt: "arrows", caption: "notice the tail" };
    }
    if (job.type === "quiz") {
      return {
        order: job.order,
        title,
        questions: (job.conceptIds ?? []).map((conceptId, index) => ({
          kind: "single",
          id: `q${index + 1}`,
          question: `q${index + 1}?`,
          choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
          correctId: "a",
          conceptId,
        })),
      };
    }
    return { order: job.order, title, markdown: `body ${job.order}` };
  }

  const store: LessonJobStore = {
    updateStage: async () => true,
    incrementProgress: async () => true,
    loadCheckpoints: async () => [],
    upsertCheckpoint: async () => true,
    deleteBatchCheckpoints: async () => true,
    deletePlanAndDependents: async () => true,
    publish: async () => ({ ok: true }),
    publishPartial: async () => ({ ok: true }),
  };

  function memoryMediaStore(inserted: NewMediaAsset[]): MediaAssetStore {
    const rows = new Map<string, MediaAssetRow>();
    return {
      async findByCacheKey(cacheKey) {
        return rows.get(cacheKey) ?? null;
      },
      async getById(assetId) {
        return [...rows.values()].find((row) => row.id === assetId) ?? null;
      },
      async insert(asset) {
        inserted.push(asset);
        const row = { ...asset, createdAt: new Date(), updatedAt: new Date() } as MediaAssetRow;
        rows.set(asset.cacheKey, row);
        return row;
      },
    };
  }

  const claim = {
    job: { id: "ljob1", ownerId: "u1", courseId: "crs1", lessonId: "lsn1" },
    workerId: "w1",
    leaseToken: "tok1",
    leaseExpiresAt: Date.now() + 300_000,
  } as unknown as LessonGenerationClaim;

  async function run(graphId: string) {
    const inserted: NewMediaAsset[] = [];
    const plannerCalls: InvokeJsonArgs[] = [];
    const writerUsers: string[] = [];
    const kg = { ...baseKg, graphId, ...(graphId.startsWith("mat_") ? { sourceExcerpts: excerpts } : {}) };
    const ctx = {
      course: { id: "crs1", topic: "向量", graphId, language: "zh", lessons: [{ id: "lsn1" }] },
      lesson: { id: "lsn1", topicId: "t1_vectors" },
      kg,
    } as unknown as LessonGenerationContext;
    await processLessonGenerationJob(claim, {
      store,
      loadContext: async () => ctx,
      settings: {},
      plannerInvoke: async (args) => {
        plannerCalls.push(args);
        return ir;
      },
      writerInvoke: async ({ batch, user }) => {
        writerUsers.push(user);
        return batch.jobs.map((job) => contentFor(job));
      },
      imageGenerate: async () => ({ mimeType: "image/png", dataBase64: Buffer.from("png").toString("base64"), model: "fake" }),
      mediaStore: memoryMediaStore(inserted),
    });
    return { inserted, plannerCalls, writerUsers };
  }

  it("writes material lesson images to the owner channel and grounds the prompts", async () => {
    const { inserted, plannerCalls, writerUsers } = await run("mat_0123456789abcdef");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].ownerId).toBe("u1");
    expect(inserted[0].cacheKey.startsWith("owner:u1:")).toBe(true);
    expect(plannerCalls[0].user + plannerCalls[0].system).toContain("SOURCE MATERIAL");
    expect(writerUsers.some((user) => user.includes("<source_excerpts>"))).toBe(true);
  });

  it("keeps library lesson images in the global pool", async () => {
    const { inserted, plannerCalls } = await run("linear_algebra");
    expect(inserted).toHaveLength(1);
    expect(inserted[0].ownerId).toBeNull();
    expect(inserted[0].cacheKey.startsWith("owner:")).toBe(false);
    expect(plannerCalls[0].user + plannerCalls[0].system).not.toContain("SOURCE MATERIAL");
  });
});
