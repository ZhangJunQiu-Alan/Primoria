import { afterEach, describe, expect, it, vi } from "vitest";
import { distillFacts } from "../src/lib/ai/extractor/distill";
import { distillProfileIntake } from "../src/lib/ai/extractor/profile-intake";
import { invokeJson } from "../src/lib/ai/course-generation/model-json";

vi.mock("../src/lib/ai/course-generation/model-json", () => ({ invokeJson: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("extractor model tier", () => {
  it("extracts supported profile facts using the fast tier", async () => {
    vi.stubEnv("AI_MODEL_FAST", "deepseek-flash");
    vi.mocked(invokeJson).mockResolvedValue({ facts: [{
      decision: "save", text: "喜欢图解", category: "preference", confidence: 0.9, sourceQuote: "喜欢图解",
    }] });
    const result = await distillProfileIntake({
      sourceText: "喜欢图解", sourceKind: "onboarding", jobId: "tier-test", existingFacts: [],
    });
    expect(invokeJson).toHaveBeenCalledWith(expect.objectContaining({ settings: { model: "deepseek-flash" } }));
    expect(result.ops).toHaveLength(1);
    expect(result.ops[0]).toMatchObject({ op: "add", text: "喜欢图解", category: "preference" });
  });

  it("uses the fast tier for lesson distillation without weakening evidence checks", async () => {
    vi.stubEnv("AI_MODEL_FAST", "deepseek-flash");
    vi.mocked(invokeJson).mockResolvedValue({ facts: [
      { op: "add", text: "Prefers diagrams", category: "preference", evidenceEventIds: ["event-1"] },
      { op: "add", text: "Knows calculus", category: "prior_knowledge", evidenceEventIds: ["invented-event"] },
    ] });
    const result = await distillFacts({
      ctx: { topicName: "Ratios", conceptNames: [], existingFacts: [], events: [
        { id: "event-1", kind: "chat.feedback", summary: "I prefer diagrams" },
      ] },
      lessonId: "tier-test",
    });
    expect(invokeJson).toHaveBeenCalledWith(expect.objectContaining({ settings: { model: "deepseek-flash" } }));
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ text: "Prefers diagrams", evidence: { eventIds: ["event-1"] } });
  });

  it("preserves an explicit model and falls back when no fast tier is configured", async () => {
    vi.stubEnv("AI_MODEL_FAST", "deepseek-flash");
    vi.mocked(invokeJson).mockResolvedValue({ facts: [] });
    const input = { ctx: { topicName: "Ratios", conceptNames: [], existingFacts: [], events: [] }, lessonId: "tier-test" };
    await distillFacts({ ...input, settings: { model: "deepseek-v4-pro" } });
    expect(invokeJson).toHaveBeenLastCalledWith(expect.objectContaining({ settings: { model: "deepseek-v4-pro" } }));
    vi.stubEnv("AI_MODEL_FAST", "");
    await distillFacts(input);
    expect(invokeJson).toHaveBeenLastCalledWith(expect.objectContaining({ settings: {} }));
  });
});
