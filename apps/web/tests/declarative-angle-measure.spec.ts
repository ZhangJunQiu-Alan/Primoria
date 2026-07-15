import { describe, expect, it } from "vitest";
import { AngleMeasureConfigSchema, AngleMeasurePatchSchema, classifyAngle, DEFAULT_ANGLE_MEASURE_CONFIG } from "../src/lib/qa/components/angle-measure";

describe("angle measure component", () => {
  it("validates defaults, patches, and bounds", () => {
    expect(AngleMeasureConfigSchema.parse({})).toEqual(DEFAULT_ANGLE_MEASURE_CONFIG);
    expect(AngleMeasurePatchSchema.parse({ showProtractor: true })).toEqual({ showProtractor: true });
    expect(() => AngleMeasureConfigSchema.parse({ angleDeg: 181 })).toThrow();
  });
  it.each([[0, "零角"], [45, "锐角"], [90, "直角"], [135, "钝角"], [180, "平角"]])("classifies %s degrees", (angle, label) => expect(classifyAngle(angle)).toBe(label));
});
