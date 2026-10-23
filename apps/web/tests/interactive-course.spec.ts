import { describe, expect, it } from "vitest";
import { compileBlockContent } from "../src/lib/ai/course-generation/block-content-compiler";
import { buildBatchPrompt } from "../src/lib/ai/course-generation/block-writer";
import { buildPlannerPrompt } from "../src/lib/ai/course-generation/lesson-planner";
import { parseInteractivePayload } from "../src/lib/interactive/payload";
import { assertPersistableCourseBlock } from "../src/lib/courses/mermaid-validation";
import type { BlockGenerationJob, CompiledLessonPlan } from "../src/lib/ai/course-generation/lesson-plan-compiler";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";

const job: BlockGenerationJob = { jobId: "b1", order: 1, type: "visual", pedagogicalRole: "example", conceptIds: ["lens"], goal: "观察凸透镜成像", writerInstruction: "拖动物体观察像距", neighborGoals: {}, engine: "html", interactiveCandidates: ["physics.lens-imaging"] };
const payload = { componentId: "physics.lens-imaging", configVersion: 1, config: { focalLength: 10, objectDistance: 30 } };

describe("catalog-first course visual compilation", () => {
  it("exposes bounded template capabilities before planning without broadening concept coverage", () => {
    const kg = { learningGoal: "串并联电路实验室", startTopic: { topicId: "electricity", name: "电功率", concepts: [{ conceptId: "power", name: "电功率", defaultOrder: 1 }] }, language: "zh" } as CourseContext;
    const prompt = buildPlannerPrompt(kg);
    const candidates = prompt.split("TRUSTED VISUALIZATION CANDIDATES")[1].split("When a candidate")[0];
    expect(candidates).toContain("physics.circuit-lab");
    expect(candidates).toContain("Excludes:");
    expect((candidates.match(/\n  - /g) ?? []).length).toBeLessThanOrEqual(4);
    expect(prompt).toContain("VALID CONCEPT IDS: power");
    expect(prompt).toContain("never omit required concepts or change the lesson scope");
    expect(prompt).not.toContain("biology.mendelian-genetics");
  });
  it("compiles a validated, versioned component instead of generated HTML", async () => {
    const block = compileBlockContent(job, { title: "透镜", description: "拖动物体观察光路。", interactive: payload, html: "<script>untrusted</script>" }, "lesson");
    expect(block).toMatchObject({ engine: "interactive", interactive: { componentId: payload.componentId, configVersion: 1, config: { focalLength: 10, objectDistance: 30, lensType: "convex" } } });
    expect(block).not.toHaveProperty("html");
    await expect(assertPersistableCourseBlock(block)).resolves.toBeUndefined();
  });
  it.each([
    { ...payload, configVersion: 999 },
    { ...payload, componentId: "fake.component" },
    { ...payload, config: { focalLength: -1 } },
    { ...payload, config: { sourceCode: "alert(1)" } },
  ])("rejects unknown, incompatible or invalid payload %j", (interactive) => {
    expect(() => compileBlockContent(job, { title: "x", description: "x", interactive }, "lesson")).toThrow();
  });
  it("rejects an implemented component outside the block's retrieved candidates", () => {
    expect(() => compileBlockContent({ ...job, interactiveCandidates: [] }, { title: "x", description: "x", interactive: payload }, "lesson")).toThrow(/retrieved candidates/);
  });
  it("retains the deterministic legacy fallback engine", () => {
    expect(compileBlockContent(job, { title: "x", description: "x", html: "<div>old content</div>", engine: "invented" }, "lesson")).toMatchObject({ engine: "html", html: "<div>old content</div>" });
  });
  it("gives the Web writer only bounded candidates and their config contracts", () => {
    const plan = { title: "Optics", jobs: [job] } as CompiledLessonPlan;
    const kg = { startTopic: { name: "Optics", concepts: [{ conceptId: "lens", name: "Lens" }] }, language: "en" } as unknown as CourseContext;
    const prompt = buildBatchPrompt({ kind: "concept", jobs: [job] }, plan, kg);
    expect(prompt.user).toContain("CATALOG FIRST");
    expect(prompt.user).toContain("physics.lens-imaging (configVersion=1)");
    expect(prompt.user).not.toContain("chem.acid-base-titration");
  });
  it("rejects extra top-level payload fields and normalizes valid defaults", () => {
    expect(() => parseInteractivePayload({ ...payload, script: "bad" })).toThrow();
    expect(parseInteractivePayload(payload).config.showRays).toBe(true);
  });
});
