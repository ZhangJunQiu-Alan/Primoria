import { describe, expect, it, vi } from "vitest";
import { imageTextIssues } from "../src/lib/ai/media/image-text-quality";
import { resolveImageAsset, type MediaAssetStore } from "../src/lib/ai/media/media-assets";
import { compileBlockContent } from "../src/lib/ai/course-generation/block-content-compiler";
import type { BlockGenerationJob } from "../src/lib/ai/course-generation/lesson-plan-compiler";

const valid = {
  conceptIds: ["c_1801_chain_rule"], language: "en", imageKind: "structure_diagram" as const,
  learningGoal: "Apply the chain rule", prompt: "A function chain x → x² → sin(x²).",
  alt: "A function chain connects x to u = x² and y = sin u, with the two derivatives multiplied below.",
  caption: "Multiply the outer and inner derivatives to obtain 2x cos(x²).",
};
const job = { type: "image", order: 1, conceptIds: valid.conceptIds, pedagogicalRole: "explanation" } as BlockGenerationJob;
const store = (): MediaAssetStore => ({ findByCacheKey: vi.fn().mockResolvedValue(null), getById: vi.fn(), insert: vi.fn() });

describe("image text quality", () => {
  it.each([
    { alt: "   ", caption: "Compare the two functions.", code: "empty" },
    { alt: "The same explanation.", caption: "  the SAME explanation!  ", code: "duplicate" },
    { alt: "A labelled Python example explaining string transformations.", caption: "Methods return a new string.", code: "generic_alt" },
    { ...valid, caption: "The derivative simplifies to2x cos(x²).", code: "word_number_glue" },
    { ...valid, caption: "A constant increase of3seats per row gives a total of 255.", code: "word_number_glue" },
    { ...valid, caption: "Refining the rectangles converges to the integral1/2.", code: "word_number_glue" },
    { ...valid, caption: "Values greater than4 are rejected by2 rules.", code: "word_number_glue" },
  ])("detects $code", ({ code, ...text }) => {
    expect(imageTextIssues(text)).toContainEqual(expect.objectContaining({ code, severity: "error" }));
  });

  it("preserves legitimate formulas, chemical names, identifiers and units", () => {
    expect(imageTextIssues({ alt: "CO2, IPv4, binary32, log2, 2ab, 4ac and score2 are intentional notation.", caption: "The graph labels 2x cos(x²), sinθ and a force of 2 N." })).toEqual([]);
    expect(imageTextIssues({ alt: "The code assigns area1 = w * h and factor2 = area1 / 2, then prints both.", caption: "Variables keep their values until reassigned, as IPv4/IPv6 labels show." })).toEqual([]);
    expect(imageTextIssues({ alt: "A diagram of a leaf shows veins branching from a central midrib.", caption: "The veins distribute water through the leaf." })).toEqual([]);
  });

  it("flags short or title-only alt for review and permits concise Chinese", () => {
    expect(imageTextIssues({ alt: "A red circle.", caption: "The point marks the origin.", title: "A red circle" })).toEqual([
      { field: "alt", code: "short_alt", severity: "review" },
      { field: "alt", code: "title_as_alt", severity: "review" },
    ]);
    expect(imageTextIssues({ alt: "箭头连接内函数与外函数。", caption: "链式法则将两个导数相乘。", language: "zh-CN" })).toEqual([]);
  });

  it("rejects a malformed fresh writer brief before imaging", () => {
    expect(() => compileBlockContent(job, { title: "Chain rule", ...valid, caption: valid.alt }, "lsn1")).toThrow(/content invalid/);
    expect(() => compileBlockContent(job, { title: "Chain rule", ...valid }, "lsn1")).not.toThrow();
  });

  it("checks a fresh brief by the course language and names the fix for the writer", () => {
    const zh = { title: "链式法则", ...valid, alt: "箭头连接内函数与外函数。", caption: "链式法则将两个导数相乘。" };
    expect(() => compileBlockContent(job, zh, "lsn1", "zh")).not.toThrow();
    expect(() => compileBlockContent(job, { ...zh, caption: zh.alt }, "lsn1", "zh")).toThrow(/alt must differ from caption/);
    expect(() => compileBlockContent(job, { title: "Chain rule", ...valid, caption: "It simplifies to2x." }, "lsn1", "en")).toThrow(/caption needs a space/);
  });

  it("rejects malformed new assets before generation, storage or DB insertion", async () => {
    const db = store();
    const generate = vi.fn();
    await expect(resolveImageAsset({ brief: { ...valid, caption: valid.alt }, ownerId: null, model: "test", generate, objects: null }, db)).rejects.toThrow(/duplicate/);
    expect(generate).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("allows a valid cached asset even if the requesting brief is malformed", async () => {
    const db = store();
    vi.mocked(db.findByCacheKey).mockResolvedValue({ id: "media1", alt: valid.alt, caption: valid.caption, prompt: valid.prompt, brief: valid, mimeType: "image/webp" } as Awaited<ReturnType<MediaAssetStore["findByCacheKey"]>>);
    const generate = vi.fn();
    await expect(resolveImageAsset({ brief: { ...valid, caption: valid.alt }, ownerId: null, model: "test", generate }, db)).resolves.toMatchObject({ assetId: "media1", reused: true, alt: valid.alt, caption: valid.caption });
    expect(generate).not.toHaveBeenCalled();
  });
});
