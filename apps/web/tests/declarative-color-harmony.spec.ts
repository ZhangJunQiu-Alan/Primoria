import { describe, expect, it } from "vitest";
import { ColorHarmonyConfigSchema, ColorHarmonyPatchSchema, DEFAULT_COLOR_HARMONY_CONFIG, deriveColorHarmony } from "../src/lib/qa/components/color-harmony";

describe("color harmony component", () => {
  it("validates defaults, patches, and hue bounds", () => {
    expect(ColorHarmonyConfigSchema.parse({})).toEqual(DEFAULT_COLOR_HARMONY_CONFIG);
    expect(ColorHarmonyPatchSchema.parse({ harmony: "triadic" })).toEqual({ harmony: "triadic" });
    expect(() => ColorHarmonyConfigSchema.parse({ baseHueDeg: 360 })).toThrow();
  });
  it("derives complementary, analogous, and wrapped triadic hues", () => {
    expect(deriveColorHarmony(DEFAULT_COLOR_HARMONY_CONFIG).map((color) => color.hueDeg)).toEqual([30, 210]);
    expect(deriveColorHarmony({ ...DEFAULT_COLOR_HARMONY_CONFIG, baseHueDeg: 10, harmony: "analogous" }).map((color) => color.hueDeg)).toEqual([340, 10, 40]);
    expect(deriveColorHarmony({ ...DEFAULT_COLOR_HARMONY_CONFIG, baseHueDeg: 300, harmony: "triadic" }).map((color) => color.hueDeg)).toEqual([300, 60, 180]);
  });
});
