import { describe, expect, it } from "vitest";
import { analyzeNarrativeArc, DEFAULT_NARRATIVE_ARC_CONFIG, NarrativeArcConfigSchema, NarrativeArcPatchSchema } from "../src/lib/qa/components/narrative-arc";

describe("narrative arc component", () => {
  it("validates defaults, patches, and tension bounds", () => {
    expect(NarrativeArcConfigSchema.parse({})).toEqual(DEFAULT_NARRATIVE_ARC_CONFIG);
    expect(NarrativeArcPatchSchema.parse({ narrativeForm: "three-act" })).toEqual({ narrativeForm: "three-act" });
    expect(() => NarrativeArcConfigSchema.parse({ beats: DEFAULT_NARRATIVE_ARC_CONFIG.beats.map((beat, index) => index ? beat : { ...beat, tension: 11 }) })).toThrow();
  });
  it("locates the highest-tension beat", () => {
    const result = analyzeNarrativeArc(DEFAULT_NARRATIVE_ARC_CONFIG);
    expect(result.climax.id).toBe("beat-2");
    expect(result.climaxIndex).toBe(1);
  });
});
