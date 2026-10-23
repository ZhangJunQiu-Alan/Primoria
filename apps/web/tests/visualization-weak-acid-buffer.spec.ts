import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WeakAcidBufferConfigSchema, WeakAcidBufferPatchSchema, computeWeakAcidBuffer } from "../src/lib/interactive/components/weak-acid-buffer";
import { WeakAcidBufferWidget } from "../src/components/generative-ui/interactive/weak-acid-buffer";

describe("weak acid mass and charge balance", () => {
  it("rejects unbounded/code parameters", () => {
    expect(WeakAcidBufferConfigSchema.safeParse({ pKa: 20 }).success).toBe(false);
    expect(WeakAcidBufferPatchSchema.safeParse({ html: "x" }).success).toBe(false);
  });
  it("recovers the weak-acid quadratic limit at moderate concentration", () => {
    const r = computeWeakAcidBuffer(WeakAcidBufferConfigSchema.parse({ totalConcentration: 0.1, pKa: 5, saltFraction: 0 }));
    const h = (-1e-5 + Math.sqrt(1e-10 + 4e-6)) / 2;
    expect(r.h).toBeCloseTo(h, 10);
    expect(r.pH).toBeCloseTo(3.002171, 5);
  });
  it("includes water in empty and very dilute solutions", () => {
    const empty = computeWeakAcidBuffer(WeakAcidBufferConfigSchema.parse({ totalConcentration: 0 }));
    expect(empty.pH).toBeCloseTo(7, 12);
    const dilute = computeWeakAcidBuffer(WeakAcidBufferConfigSchema.parse({ totalConcentration: 1e-10, saltFraction: 0 }));
    expect(dilute.pH).toBeGreaterThan(6.99);
    expect(dilute.pH).toBeLessThanOrEqual(7);
  });
  it("gives pH near pKa for a concentrated equimolar pair", () => {
    const r = computeWeakAcidBuffer(WeakAcidBufferConfigSchema.parse({}));
    expect(r.pH).toBeCloseTo(4.76, 3);
  });
  it("conserves mass, charge and equilibrium across acid/base additions", () => {
    for (const pKa of [1, 4.76, 12]) for (const concentration of [0, 1e-9, 0.1, 1]) for (const saltFraction of [0, 0.5, 1]) for (const addedBaseMM of [-100, 0, 100]) {
      const r = computeWeakAcidBuffer(WeakAcidBufferConfigSchema.parse({ pKa, totalConcentration: concentration, saltFraction, addedBaseMM }));
      expect(r.a + r.ha).toBeCloseTo(concentration, 12);
      expect(Math.abs(r.chargeResidual)).toBeLessThan(1e-13);
      expect(r.h * r.oh).toBeCloseTo(1e-14, 20);
      if (r.ha > 1e-15) expect(r.h * r.a / r.ha).toBeCloseTo(r.ka, 10);
      expect(Number.isFinite(r.pH) && r.capacity > 0).toBe(true);
    }
  });
  it("predicts local capacity from an independent numerical derivative", () => {
    const config = WeakAcidBufferConfigSchema.parse({}), deltaMM = 0.001;
    const a = computeWeakAcidBuffer(config, -deltaMM), b = computeWeakAcidBuffer(config, deltaMM), r = computeWeakAcidBuffer(config);
    const numeric = deltaMM * 2 / 1000 / (b.pH - a.pH);
    expect(numeric).toBeCloseTo(r.capacity, 8);
  });
  it("shows stronger response after the buffer species is depleted", () => {
    const config = WeakAcidBufferConfigSchema.parse({});
    const near = computeWeakAcidBuffer(config, 1).pH - computeWeakAcidBuffer(config, 0).pH;
    const far = computeWeakAcidBuffer(config, 61).pH - computeWeakAcidBuffer(config, 60).pH;
    expect(far).toBeGreaterThan(near);
  });
  it("renders empty species and response curves without invalid numbers", () => {
    for (const view of ["composition", "response"] as const) {
      const html = renderToStaticMarkup(createElement(WeakAcidBufferWidget, { config: WeakAcidBufferConfigSchema.parse({ totalConcentration: 0, view }), onChange: () => {} }));
      expect(html).toContain("<svg");
      expect(html).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
