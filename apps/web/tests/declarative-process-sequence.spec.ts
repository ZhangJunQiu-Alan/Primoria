import { describe, expect, it } from "vitest";
import { DEFAULT_PROCESS_SEQUENCE_CONFIG, deriveProcessSequence, ProcessSequenceConfigSchema, ProcessSequencePatchSchema } from "../src/lib/qa/components/process-sequence";

describe("process sequence component", () => {
  it("validates defaults, patches, and minimum steps", () => {
    expect(ProcessSequenceConfigSchema.parse({})).toEqual(DEFAULT_PROCESS_SEQUENCE_CONFIG);
    expect(ProcessSequencePatchSchema.parse({ processName: "Water cycle" })).toEqual({ processName: "Water cycle" });
    expect(() => ProcessSequenceConfigSchema.parse({ steps: [] })).toThrow();
  });
  it("filters dangling and self-referential feedback", () => {
    const result = deriveProcessSequence({ ...DEFAULT_PROCESS_SEQUENCE_CONFIG, feedbackLinks: [{ fromStepId: "step-2", toStepId: "step-1", reason: "revise" }, { fromStepId: "missing", toStepId: "step-1", reason: "bad" }, { fromStepId: "step-1", toStepId: "step-1", reason: "self" }] });
    expect(result.validFeedbackLinks).toHaveLength(1);
    expect(result.invalidFeedbackCount).toBe(2);
  });
});
