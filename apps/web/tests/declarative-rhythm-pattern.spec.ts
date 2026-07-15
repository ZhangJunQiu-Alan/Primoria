import { describe, expect, it } from "vitest";
import { analyzeRhythmPattern, DEFAULT_RHYTHM_PATTERN_CONFIG, RhythmPatternConfigSchema, RhythmPatternPatchSchema } from "../src/lib/qa/components/rhythm-pattern";

describe("rhythm pattern component", () => {
  it("validates defaults, patches, and tempo bounds", () => {
    expect(RhythmPatternConfigSchema.parse({})).toEqual(DEFAULT_RHYTHM_PATTERN_CONFIG);
    expect(RhythmPatternPatchSchema.parse({ tempoBpm: 120 })).toEqual({ tempoBpm: 120 });
    expect(() => RhythmPatternConfigSchema.parse({ tempoBpm: 201 })).toThrow();
  });
  it("computes playback duration and sound counts", () => {
    const result = analyzeRhythmPattern(DEFAULT_RHYTHM_PATTERN_CONFIG);
    expect(result.stepDurationSeconds).toBeCloseTo(0.3125, 8);
    expect(result.totalDurationSeconds).toBeCloseTo(2.5, 8);
    expect(result.stepsPerMeasure).toBe(8);
    expect(result).toMatchObject({ soundedSteps: 4, accentCount: 1 });
  });
  it("derives measure boundaries from meter and subdivision", () => {
    expect(analyzeRhythmPattern({ ...DEFAULT_RHYTHM_PATTERN_CONFIG, timeSignature: "6/8", subdivision: "eighth" }).stepsPerMeasure).toBe(6);
    expect(analyzeRhythmPattern({ ...DEFAULT_RHYTHM_PATTERN_CONFIG, timeSignature: "3/4", subdivision: "sixteenth" }).stepsPerMeasure).toBe(12);
  });
});
