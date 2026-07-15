import { describe, expect, it } from "vitest";
import { DEFAULT_WAVE_SUPERPOSITION_CONFIG, describeSuperposition, sampleWave, WaveSuperpositionConfigSchema, WaveSuperpositionPatchSchema } from "../src/lib/interactive/components/wave-superposition";

describe("wave superposition component", () => {
  it("validates defaults, patches, and bounds", () => {
    expect(WaveSuperpositionConfigSchema.parse({})).toEqual(DEFAULT_WAVE_SUPERPOSITION_CONFIG);
    expect(WaveSuperpositionPatchSchema.parse({ phaseDiffDeg: 180 })).toEqual({ phaseDiffDeg: 180 });
    expect(() => WaveSuperpositionConfigSchema.parse({ frequency1: 4 })).toThrow();
  });
  it("recognizes equal-wave constructive and destructive cases", () => {
    const constructive = { ...DEFAULT_WAVE_SUPERPOSITION_CONFIG, phaseDiffDeg: 0 };
    const destructive = { ...DEFAULT_WAVE_SUPERPOSITION_CONFIG, phaseDiffDeg: 180 };
    expect(sampleWave(constructive, 0.25).resultant).toBeCloseTo(2, 8);
    expect(sampleWave(destructive, 0.25).resultant).toBeCloseTo(0, 8);
    expect(describeSuperposition(destructive).relation).toBe("destructive");
  });
  it("uses each wave frequency in the time term", () => {
    const config = { ...DEFAULT_WAVE_SUPERPOSITION_CONFIG, frequency1: 1, frequency2: 2, phaseDiffDeg: 0 };
    expect(sampleWave(config, 0, 0.125).wave1).toBeCloseTo(-Math.SQRT1_2, 8);
    expect(sampleWave(config, 0, 0.125).wave2).toBeCloseTo(-1, 8);
  });
});
