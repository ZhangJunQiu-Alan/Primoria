import { afterEach, describe, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("../src/lib/ai/course-generation/model-json", () => ({ invokeJson: invoke }));
import { generateBlockBatch } from "../src/lib/ai/course-generation/block-writer";
import type { BlockGenerationJob, CompiledLessonPlan } from "../src/lib/ai/course-generation/lesson-plan-compiler";
import type { CourseContext } from "../src/lib/ai/deepagent/course-kg-context";

afterEach(() => { vi.unstubAllEnvs(); invoke.mockReset(); });
describe("structured block writing model policy", () => {
  it.each(["concept", "activation"] as const)("uses non-thinking structured output while retaining an explicit model override for %s", async (kind) => {
    vi.stubEnv("AI_MODEL_FAST", "fast-fixture");
    const job: BlockGenerationJob = { jobId: "b1", order: 1, type: "text", pedagogicalRole: kind === "activation" ? "hook" : "explanation", conceptIds: ["c1"], goal: "Explain a circuit", writerInstruction: "Explain one concrete mechanism.", neighborGoals: {} };
    const plan = { title: "Circuit", jobs: [job] } as CompiledLessonPlan;
    const kg = { language: "en", startTopic: { name: "Circuit", concepts: [{ conceptId: "c1", name: "Circuit", defaultOrder: 1 }] } } as CourseContext;
    invoke.mockResolvedValue([{ order: 1, title: "Circuit", markdown: "A complete circuit permits electric current." }]);
    await generateBlockBatch({ batch: { kind, jobs: [job] }, plan, kg, lessonId: "test", settings: { model: "quality-pro" } });
    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke.mock.calls[0][0]).toMatchObject({ utility: true, settings: { model: "quality-pro" } });
  });
});
