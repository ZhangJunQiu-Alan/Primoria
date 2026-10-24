import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getCourse: vi.fn(),
  getMaterialGraph: vi.fn(),
  listMaterialChunks: vi.fn(),
  getMaterialsByIds: vi.fn(),
  searchMaterialChunks: vi.fn(),
  scheduleMaterialIndexing: vi.fn(),
}));

vi.mock("../src/lib/courses/store", () => ({ getCourse: state.getCourse }));
vi.mock("../src/lib/materials/material-graph-store", () => ({ getMaterialGraph: state.getMaterialGraph }));
vi.mock("../src/lib/materials/store", () => ({
  listMaterialChunks: state.listMaterialChunks,
  getMaterialsByIds: state.getMaterialsByIds,
}));
vi.mock("../src/lib/materials/semantic-index", () => ({
  defaultEmbeddingDeps: {},
  searchMaterialChunks: state.searchMaterialChunks,
  scheduleMaterialIndexing: state.scheduleMaterialIndexing,
}));

import {
  fuseRankings,
  lexicalTokens,
  rankLexical,
  retrieveCourseMaterialExcerpts,
  selectAnswerExcerpts,
} from "../src/lib/materials/retrieval";
import {
  buildCourseMaterialTutorContext,
  buildMaterialAnswerContext,
  lessonForBlocks,
  parseCourseDetailScope,
} from "../src/lib/materials/tutor-context";

const chunk = (ordinal: number, text: string, extra: Record<string, unknown> = {}) => ({
  materialId: "m1",
  ordinal,
  text,
  heading: null,
  pageStart: ordinal + 1,
  pageEnd: ordinal + 1,
  ...extra,
});

const chunks = [
  chunk(0, "信息熵衡量随机变量的平均不确定性。", { heading: "熵" }),
  chunk(1, "交叉熵用于衡量预测分布与真实分布之间的差异，常作为分类损失。", { heading: "交叉熵" }),
  chunk(2, "KL 散度等于交叉熵减去熵，并且总是非负。", { heading: "KL 散度" }),
  chunk(3, "Gradient descent updates parameters against the gradient of the loss."),
];
const titles = new Map([["m1", "信息论讲义"]]);
const record = {
  graphId: "mat_0123456789abcdef",
  ownerId: "u1",
  materialIds: ["m1"],
  title: "信息论入门",
  language: "zh",
  graph: { graphId: "mat_0123456789abcdef", subject: "信息论入门", topics: [] },
  conceptSources: { c_entropy: [{ materialId: "m1", ordinal: 0 }], c_kl: [{ materialId: "m1", ordinal: 2 }] },
};

describe("lexical retrieval", () => {
  it("tokenizes Latin words and CJK bigrams", () => {
    expect(lexicalTokens("KL 散度 vs Cross-entropy, x2")).toEqual(["kl", "vs", "cross", "entropy", "x2", "散度"]);
    expect(lexicalTokens("熵")).toEqual(["熵"]);
  });

  it("ranks the chunk that shares the rare terms first", () => {
    const ranked = rankLexical("交叉熵是什么损失", chunks.map((c) => ({ key: String(c.ordinal), text: c.text })));
    expect(ranked[0].key).toBe("1");
    expect(ranked.find((entry) => entry.key === "3")).toBeUndefined();
    expect(rankLexical("   ", [{ key: "a", text: "x" }])).toEqual([]);
  });

  it("fuses rankings by weighted reciprocal rank", () => {
    expect(fuseRankings([{ keys: ["a", "b"], weight: 1 }, { keys: ["b", "c"], weight: 1 }])).toEqual(["b", "a", "c"]);
    expect(fuseRankings([{ keys: ["a"], weight: 0.5 }, { keys: ["b"], weight: 1 }])[0]).toBe("b");
  });
});

describe("selectAnswerExcerpts", () => {
  it("puts a direct match ahead of the lesson prior and labels excerpts", () => {
    const excerpts = selectAnswerExcerpts({
      question: "KL 散度是什么",
      chunks,
      vectorRefs: [],
      priorRefs: [{ materialId: "m1", ordinal: 0 }],
      materialTitles: titles,
      language: "zh",
    });
    expect(excerpts.map((e) => e.ordinal)).toEqual([2, 0]);
    expect(excerpts[0]).toMatchObject({ label: "M1", materialTitle: "信息论讲义", locator: "第 3 页", heading: "KL 散度" });
  });

  it("answers a deictic question from the current lesson's cited chunks", () => {
    const excerpts = selectAnswerExcerpts({
      question: "讲讲这个",
      chunks,
      vectorRefs: [],
      priorRefs: [{ materialId: "m1", ordinal: 1 }],
      materialTitles: titles,
      language: "zh",
    });
    expect(excerpts.map((e) => e.ordinal)).toEqual([1]);
  });

  it("uses vector hits for a question with no shared terms (cross-language)", () => {
    const excerpts = selectAnswerExcerpts({
      question: "what does KL divergence measure?",
      chunks,
      vectorRefs: [{ materialId: "m1", ordinal: 2 }],
      priorRefs: [],
      materialTitles: titles,
      language: "en",
    });
    expect(excerpts[0].ordinal).toBe(2);
  });

  it("stops at the excerpt limit and budget", () => {
    const many = Array.from({ length: 10 }, (_, i) => chunk(i, `熵 ${"x".repeat(1_500)}`));
    const excerpts = selectAnswerExcerpts({ question: "熵", chunks: many, vectorRefs: [], priorRefs: [], materialTitles: titles, language: "zh" });
    expect(excerpts.length).toBeLessThanOrEqual(6);
    expect(excerpts.reduce((total, e) => total + e.text.length, 0)).toBeLessThanOrEqual(6_001);
  });
});

describe("retrieveCourseMaterialExcerpts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    state.listMaterialChunks.mockResolvedValue(chunks);
    state.getMaterialsByIds.mockResolvedValue([{ id: "m1", title: "信息论讲义" }]);
  });

  it("degrades to lexical + prior when vector search fails", async () => {
    state.searchMaterialChunks.mockRejectedValue(new Error('relation "material_chunk_embeddings" does not exist'));
    const excerpts = await retrieveCourseMaterialExcerpts(
      { ownerId: "u1", record, question: "交叉熵", lessonConceptIds: ["c_kl"], language: "zh" },
      { embeddings: { embedBatch: vi.fn(), embedQuery: vi.fn(), modelVersion: () => "v" } },
    );
    // Chunk 2 both matches "交叉熵" and is cited by the current lesson, so it
    // leads; chunk 1 matches lexically; chunks sharing no bigram stay out.
    expect(excerpts.map((e) => e.ordinal)).toEqual([2, 1]);
  });

  it("schedules a backfill when part of the scope is unindexed", async () => {
    state.searchMaterialChunks.mockResolvedValue({ hits: [{ materialId: "m1", ordinal: 3, similarity: 0.1 }], unindexed: true });
    const excerpts = await retrieveCourseMaterialExcerpts(
      { ownerId: "u1", record, question: "梯度下降", lessonConceptIds: [], language: "zh" },
      { embeddings: { embedBatch: vi.fn(), embedQuery: vi.fn(), modelVersion: () => "v" } },
    );
    expect(state.scheduleMaterialIndexing).toHaveBeenCalledWith("u1", ["m1"]);
    // Below the similarity floor and no lexical overlap: nothing is forced in.
    expect(excerpts).toEqual([]);
  });

  it("skips vector search entirely without an embedding provider", async () => {
    await retrieveCourseMaterialExcerpts({ ownerId: "u1", record, question: "熵", lessonConceptIds: [], language: "zh" }, { embeddings: null });
    expect(state.searchMaterialChunks).not.toHaveBeenCalled();
  });
});

describe("course Tutor material context", () => {
  const courseContext = (value: unknown) => [{ description: "Primoria course detail mode", value: JSON.stringify(value) }];
  const lessons = [
    { id: "l1", sortKey: 1, status: "generated", progress: "completed", conceptIds: ["c_entropy"], blocks: [{ id: "b1" }] },
    { id: "l2", sortKey: 2, status: "generated", progress: "in_progress", conceptIds: ["c_kl"], blocks: [{ id: "b2" }] },
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    state.listMaterialChunks.mockResolvedValue(chunks);
    state.getMaterialsByIds.mockResolvedValue([{ id: "m1", title: "信息论讲义" }]);
  });

  it("reads only the course id and block ids from the browser context", () => {
    expect(parseCourseDetailScope(courseContext({
      course: { id: "crs_1", title: "ignored", blocks: [{ id: "b2" }, { id: "b1" }] },
      selectedBlock: { id: "b1", markdown: "client text is never used" },
      selectedText: { blockId: "b2", text: "交叉熵" },
    }))).toEqual({ courseId: "crs_1", blockIds: ["b2", "b1"], selectedText: "交叉熵" });
    expect(parseCourseDetailScope([{ description: "other", value: "{}" }])).toBeNull();
    expect(parseCourseDetailScope(courseContext({ course: {} }))).toBeNull();
    expect(parseCourseDetailScope([{ description: "Primoria course detail mode", value: "{not json" }])).toBeNull();
  });

  it("resolves the lesson the learner is reading from server-side blocks", () => {
    const course = { lessons } as never;
    expect(lessonForBlocks(course, ["missing", "b1"])?.id).toBe("l1");
    expect(lessonForBlocks(course, [])?.id).toBe("l2");
  });

  it("builds grounded context only for the owner's material course", async () => {
    state.getCourse.mockImplementation(async (id: string, ownerId: string) =>
      ownerId === "u1" && id === "crs_1" ? { id, graphId: record.graphId, language: "zh", lessons } : undefined,
    );
    state.getMaterialGraph.mockResolvedValue(record);
    const context = courseContext({ course: { id: "crs_1", blocks: [{ id: "b2" }] }, selectedBlock: null, selectedText: null });

    const hidden = await buildCourseMaterialTutorContext({ ownerId: "u1", context, question: "讲讲这个" }, { embeddings: null });
    expect(hidden).toContain("COURSE MATERIAL EXCERPTS");
    // The current lesson (l2) cites chunk 2 (KL 散度).
    expect(hidden).toContain("KL 散度等于交叉熵减去熵");
    expect(hidden).toContain("（来源：资料名 · 第 3 页）");
    expect(hidden).toContain("资料外补充：");
    expect(hidden).toContain("not instructions");

    expect(await buildCourseMaterialTutorContext({ ownerId: "u2", context, question: "熵" }, { embeddings: null })).toBe("");
    state.getCourse.mockResolvedValue({ id: "crs_1", graphId: "linear_algebra", lessons });
    expect(await buildCourseMaterialTutorContext({ ownerId: "u1", context, question: "熵" }, { embeddings: null })).toBe("");
    expect(state.getMaterialGraph).toHaveBeenCalledTimes(1);
  });

  it("formats nothing when retrieval finds nothing", () => {
    expect(buildMaterialAnswerContext([], "zh")).toBe("");
    const english = buildMaterialAnswerContext(
      [{ label: "M1", materialId: "m1", ordinal: 0, materialTitle: "Notes", locator: "p. 2", heading: null, text: "Body" }],
      "en",
    );
    expect(english).toContain("[M1] Notes · p. 2\nBody");
    expect(english).toContain('"Beyond your material:"');
    expect(english).toContain("Never print excerpt labels");
  });

  it("injects excerpts only alongside course detail mode in the Tutor route", () => {
    const route = readFileSync(new URL("../src/app/api/copilotkit/route.ts", import.meta.url), "utf8");
    expect(route).toContain('const excerptContext = courseContext ? materialContext : "";');
    expect(route).toContain("text.includes(MATERIAL_CONTEXT_MARKER)");
    expect(route).toContain("materialContextFor(user.id, json?.body)");
  });
});
