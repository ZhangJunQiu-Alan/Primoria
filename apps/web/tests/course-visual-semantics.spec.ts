import { describe, expect, it } from "vitest";
import { compileBlockContent } from "../src/lib/ai/course-generation/block-content-compiler";
import { courseInteractiveCandidates, type BlockGenerationJob, type CompiledLessonPlan } from "../src/lib/ai/course-generation/lesson-plan-compiler";
import { generateBlockBatch } from "../src/lib/ai/course-generation/block-writer";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";

const job: BlockGenerationJob = {
  jobId: "b6", order: 6, type: "visual", pedagogicalRole: "deepening",
  conceptIds: ["entropy"], goal: "operate the binary entropy curve H(p)",
  writerInstruction: "Move a probability probe along the binary entropy curve and display H(p).",
  neighborGoals: {}, engine: "math_explorer", interactiveCandidates: [],
};
const kg = {
  language: "en", startTopic: { name: "Entropy", concepts: [{ conceptId: "entropy", name: "Shannon Entropy", defaultOrder: 1 }] },
} as CourseContext;
const plan = { title: "Entropy", jobs: [job] } as CompiledLessonPlan;
const payload = (overrides: Record<string, unknown> = {}) => ({
  functions: [{ expr: "a*x^2" }], parameters: [{ name: "a", min: 0, max: 2, default: 1 }],
  xRange: [-2, 2], yRange: [-1, 8], ...overrides,
});
const compile = (mathExplorer: unknown) => compileBlockContent(job, { title: "Entropy", description: "Explore the model.", mathExplorer }, "lesson", "en");

describe("course visualization capability and semantics", () => {
  it("rejects the production entropy curve whose p slider is disconnected", () => {
    expect(() => compile(payload({ functions: [{ expr: "-x*log2(x)-(1-x)*log2(1-x)" }], parameters: [{ name: "p", min: .001, max: .999, default: .5 }] }))).toThrow("does not affect any plotted expression");
  });
  it("rejects the production parameter-only entropy payload with no declared plotting domain", () => {
    expect(() => compile({ functions: [{ expr: "-p*log2(p)-(1-p)*log2(1-p)" }], parameters: [{ name: "p", min: .001, max: .999, default: .5 }] })).toThrow("xRange");
  });
  it.each([
    [{ functions: [] }, "at least one"],
    [{ xRange: undefined }, "xRange"],
    [{ yRange: [1, 1] }, "yRange"],
    [{ functions: [{ expr: "a*xx" }] }, "Undeclared variable"],
    [{ functions: [{ expr: "a*(x+" }] }, "Invalid math expression"],
    [{ parameters: [{ name: "x", min: 0, max: 1, default: .5 }] }, "must not shadow"],
    [{ parameters: [{ name: "a", min: 2, max: 1, default: 1 }] }, "min < max"],
    [{ parameters: [{ name: "a", min: 0, max: 1, default: 2 }] }, "in-range default"],
    [{ parameters: [{ name: "a", min: 0, max: 1, default: .5, step: 0 }] }, "positive step"],
  ])("rejects malformed math configuration %j", (overrides, message) => {
    expect(() => compile(payload(overrides))).toThrow(message);
  });
  it("keeps valid Cartesian and parametric models", () => {
    expect(compile(payload())).toMatchObject({ engine: "math_explorer" });
    expect(compile(payload({ functions: [{ expr: "a" }] }))).toMatchObject({ engine: "math_explorer" });
    expect(compile(payload({ functions: [{ expr: "x*sin(t)" }], parameters: [{ name: "t", min: 0, max: 6.28, default: 1 }] }))).toMatchObject({ engine: "math_explorer" });
    expect(compile(payload({ mode: "parametric", functions: undefined, curves: [{ xExpr: "a*cos(t)", yExpr: "a*sin(t)" }], tRange: [0, 6.28] }))).toMatchObject({ engine: "math_explorer" });
  });
  it("allows a complete sandbox simulation to supersede a restrictive KG engine", () => {
    const html = '<label>p<input type="range" oninput="this.nextElementSibling.value=this.value"><output>0.5</output></label>';
    expect(compileBlockContent(job, { title: "Entropy", description: "Move p.", html }, "lesson")).toMatchObject({ engine: "html", html });
    expect(() => compileBlockContent(job, { title: "Entropy", description: "Move p.", engine: "imaginary", html: "" }, "lesson")).toThrow();
  });
  it("rejects a compact script whose line comment swallows the function closure", () => {
    expect(() => compileBlockContent(job, { title: "Entropy", description: "Move p.", html: '<input type="range"><script>(function(){ const p=0.5; // draw curve })();</script>' }, "lesson")).toThrow("HTML script syntax invalid");
    expect(compileBlockContent(job, { title: "Entropy", description: "Move p.", html: '<input type="range"><script>(function(){ const p=0.5; /* draw curve */ })();</script>' }, "lesson")).toMatchObject({ engine: "html" });
  });
  it("does not retrieve chemistry or arithmetic from generic instructions for an unsupported entropy concept", () => {
    expect(courseInteractiveCandidates(kg, job)).toEqual([]);
    const sorting = { startTopic: { concepts: [{ conceptId: "sort", name: "Bubble Sort" }] } } as CourseContext;
    expect(courseInteractiveCandidates(sorting, { goal: "Animate sorting an array", conceptIds: ["sort"] })).toContain("cs.sorting-steps");
  });
  it("repairs a disconnected slider using a working sandbox payload instead of accepting it", async () => {
    let attempts = 0;
    const result = await generateBlockBatch({ batch: { kind: "concept", jobs: [job] }, plan, kg, lessonId: "lesson", invoke: async ({ repairHint }) => {
      attempts++;
      if (!repairHint) return [{ order: 6, title: "Entropy", description: "Move p.", mathExplorer: payload({ parameters: [{ name: "p", min: 0, max: 1, default: .5 }] }) }];
      expect(repairHint).toContain("does not affect any plotted expression");
      return [{ order: 6, title: "Entropy", description: "Move p.", html: '<input type="range" oninput="this.nextElementSibling.value=this.value"><output>0.5</output>' }];
    } });
    expect(attempts).toBe(2);
    expect(result[0].block).toMatchObject({ engine: "html" });
  });
});
