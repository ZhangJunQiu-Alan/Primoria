import { describe, expect, it } from "vitest";
import { DEFAULT_EXPERIMENT_DESIGN_CONFIG, ExperimentDesignConfigSchema, ExperimentDesignPatchSchema, summarizeExperimentDesign } from "../src/lib/qa/components/experiment-design";

describe("experiment design component", () => {
  it("validates defaults, patches, and sample bounds", () => {
    expect(ExperimentDesignConfigSchema.parse({})).toEqual(DEFAULT_EXPERIMENT_DESIGN_CONFIG);
    expect(ExperimentDesignPatchSchema.parse({ sampleSize: 80 })).toEqual({ sampleSize: 80 });
    expect(() => ExperimentDesignConfigSchema.parse({ sampleSize: 3 })).toThrow();
  });
  it("allocates all participants and detects an explicit control", () => {
    const result = summarizeExperimentDesign({ ...DEFAULT_EXPERIMENT_DESIGN_CONFIG, sampleSize: 41 });
    expect(result.allocations.map((group) => group.participants)).toEqual([21, 20]);
    expect(result.hasExplicitControlGroup).toBe(true);
  });
});
