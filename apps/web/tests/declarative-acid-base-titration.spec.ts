import { describe, expect, it } from "vitest";
import { AcidBaseTitrationConfigSchema, AcidBaseTitrationPatchSchema, computeTitration, DEFAULT_ACID_BASE_TITRATION_CONFIG } from "../src/lib/qa/components/acid-base-titration";

describe("acid-base titration component", () => {
  it("has bounded defaults and patches", () => {
    expect(AcidBaseTitrationConfigSchema.parse({})).toEqual(DEFAULT_ACID_BASE_TITRATION_CONFIG);
    expect(AcidBaseTitrationPatchSchema.parse({ addedBaseVolume: 25 })).toEqual({ addedBaseVolume: 25 });
    expect(() => AcidBaseTitrationConfigSchema.parse({ addedBaseVolume: 101 })).toThrow();
  });
  it.each([[0, 1], [12.5, 1.4771], [25, 7], [30, 11.9586]])("computes pH at %s mL", (addedBaseVolume, expected) => {
    expect(computeTitration({ acidConcentration: 0.1, acidVolume: 25, baseConcentration: 0.1, addedBaseVolume }).pH).toBeCloseTo(expected, 3);
  });
});
