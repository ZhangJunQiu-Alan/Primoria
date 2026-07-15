import { describe, expect, it } from "vitest";
import { ClimateComparisonConfigSchema, ClimateComparisonPatchSchema, DEFAULT_CLIMATE_COMPARISON_CONFIG, summarizeClimate } from "../src/lib/interactive/components/climate-comparison";

describe("climate comparison component", () => {
  it("validates defaults, patches, and twelve-month inputs", () => {
    expect(ClimateComparisonConfigSchema.parse({})).toEqual(DEFAULT_CLIMATE_COMPARISON_CONFIG);
    expect(ClimateComparisonPatchSchema.parse({ comparisonFocus: "hemisphere" })).toEqual({ comparisonFocus: "hemisphere" });
    expect(() => ClimateComparisonConfigSchema.parse({ places: DEFAULT_CLIMATE_COMPARISON_CONFIG.places.map((place, index) => index ? place : { ...place, monthlyTemperatureC: [1, 2] }) })).toThrow();
  });
  it("computes comparable annual summaries", () => {
    const [coastal, continental] = summarizeClimate(DEFAULT_CLIMATE_COMPARISON_CONFIG);
    expect(coastal.temperatureRangeC).toBe(1);
    expect(continental.temperatureRangeC).toBe(30);
    expect(coastal.annualPrecipitationMm).toBe(2310);
  });
});
