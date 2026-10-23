import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LeverBalanceConfigSchema, BuoyancyLabConfigSchema, computeLeverBalance, computeBuoyancy, leverBalanceComponent, buoyancyLabComponent } from "../src/lib/interactive/components/lever-buoyancy";
import { ElectricFieldConfigSchema, electricFieldAt, electricFieldComponent } from "../src/lib/interactive/components/electric-field";
import { BinomialDistributionConfigSchema, computeBinomial, binomialDistributionComponent } from "../src/lib/interactive/components/binomial-distribution";
import { LeverBalanceWidget, BuoyancyLabWidget } from "../src/components/generative-ui/interactive/lever-buoyancy";
import { ElectricFieldWidget } from "../src/components/generative-ui/interactive/electric-field";
import { BinomialDistributionWidget } from "../src/components/generative-ui/interactive/binomial-distribution";

describe("fourth science batch config contracts", () => {
  it.each([leverBalanceComponent, buoyancyLabComponent, electricFieldComponent, binomialDistributionComponent])("strictly validates $componentId", (entry) => {
    expect(entry.configSchema.safeParse({}).success).toBe(true);
    expect(entry.patchSchema.parse({})).toEqual({});
    expect(entry.configSchema.safeParse({ script: "unsafe" }).success).toBe(false);
    expect(entry.patchSchema.safeParse({ script: "unsafe" }).success).toBe(false);
  });
});

describe("statics", () => {
  it("matches force times perpendicular arm and balances the default lever", () => {
    const r = computeLeverBalance(LeverBalanceConfigSchema.parse({}));
    expect(r.leftMoment).toBe(24);
    expect(r.rightMoment).toBe(24);
    expect(r.balanced).toBe(true);
    expect(r.requiredRightForce).toBe(20);
  });
  it("distinguishes moment direction and zero forces", () => {
    expect(computeLeverBalance(LeverBalanceConfigSchema.parse({ rightForceN: 0 })).netMoment).toBeGreaterThan(0);
    expect(computeLeverBalance(LeverBalanceConfigSchema.parse({ leftForceN: 0 })).netMoment).toBeLessThan(0);
    expect(computeLeverBalance(LeverBalanceConfigSchema.parse({ leftForceN: 0, rightForceN: 0 })).balanced).toBe(true);
  });
  it("uses displaced volume for buoyancy and density ratio for floating", () => {
    const held = computeBuoyancy(BuoyancyLabConfigSchema.parse({}));
    expect(held.buoyantForce).toBeCloseTo(7.84, 12);
    expect(held.weight).toBeCloseTo(5.88, 12);
    expect(held.supportForce).toBeLessThan(0);
    const floating = computeBuoyancy(BuoyancyLabConfigSchema.parse({ mode: "released" }));
    expect(floating.immersion).toBe(0.6);
    expect(floating.buoyantForce).toBeCloseTo(floating.weight, 12);
  });
  it("does not make a sunken object's buoyancy equal its weight", () => {
    const sunk = computeBuoyancy(BuoyancyLabConfigSchema.parse({ mode: "released", objectDensity: 2000 }));
    expect(sunk.sunk).toBe(true);
    expect(sunk.buoyantForce).toBeCloseTo(9.8, 12);
    expect(sunk.supportForce).toBeCloseTo(9.8, 12);
    expect(computeBuoyancy(BuoyancyLabConfigSchema.parse({ immersion: 0 })).buoyantForce).toBe(0);
  });
});

describe("Coulomb superposition", () => {
  it("separates zero potential from zero field at a dipole midpoint", () => {
    const r = electricFieldAt(ElectricFieldConfigSchema.parse({}), 0, 0)!;
    expect(r.potential).toBeCloseTo(0, 12);
    expect(r.ey).toBe(0);
    expect(r.ex).toBeCloseTo(143.8008286768, 10);
  });
  it("cancels equal like-charge midpoint fields and marks singularities", () => {
    const config = ElectricFieldConfigSchema.parse({ charge2NC: 2 });
    expect(electricFieldAt(config, 0, 0)?.magnitude).toBe(0);
    expect(electricFieldAt(config, 0, 0)?.potential).toBeGreaterThan(0);
    expect(electricFieldAt(config, -0.5, 0)).toBeNull();
    expect(electricFieldAt({ ...config, charge1NC: 0 }, -0.5, 0)).not.toBeNull();
  });
  it("matches minus the potential gradient", () => {
    const config = ElectricFieldConfigSchema.parse({ charge1NC: 3, charge2NC: -1 });
    const h = 1e-5, x = 0.2, y = 0.8, r = electricFieldAt(config, x, y)!;
    const dx = (electricFieldAt(config, x + h, y)!.potential - electricFieldAt(config, x - h, y)!.potential) / (2 * h);
    const dy = (electricFieldAt(config, x, y + h)!.potential - electricFieldAt(config, x, y - h)!.potential) / (2 * h);
    expect(r.ex).toBeCloseTo(-dx, 6);
    expect(r.ey).toBeCloseTo(-dy, 6);
  });
});

describe("binomial probability", () => {
  it("matches a fair coin's ten-trial central probability", () => {
    const r = computeBinomial(BinomialDistributionConfigSchema.parse({}));
    expect(r.eventProbability).toBeCloseTo(252 / 1024, 12);
    expect(r.mean).toBe(5);
    expect(r.variance).toBe(2.5);
    expect(r.outcomes.reduce((sum, row) => sum + row.probability, 0)).toBeCloseTo(1, 12);
  });
  it.each([0, 1])("handles degenerate p=%s without NaN", (successProbability) => {
    const r = computeBinomial(BinomialDistributionConfigSchema.parse({ successProbability }));
    expect(r.outcomes.filter((v) => v.probability === 1)).toHaveLength(1);
    expect(r.outcomes.every((v) => Number.isFinite(v.probability))).toBe(true);
    expect(r.variance).toBe(0);
  });
  it("handles cumulative and impossible threshold events", () => {
    const config = BinomialDistributionConfigSchema.parse({ trials: 2, successProbability: 0.5, threshold: 1 });
    expect(computeBinomial({ ...config, event: "at-most" }).eventProbability).toBe(0.75);
    expect(computeBinomial({ ...config, event: "at-least" }).eventProbability).toBe(0.75);
    expect(computeBinomial({ ...config, threshold: 4 }).eventProbability).toBe(0);
    expect(computeBinomial({ ...config, threshold: 4, event: "at-most" }).eventProbability).toBe(1);
  });
  it("matches independently weighted moments at the upper trial bound", () => {
    const r = computeBinomial(BinomialDistributionConfigSchema.parse({ trials: 40, successProbability: 0.73 }));
    const mean = r.outcomes.reduce((sum, row) => sum + row.k * row.probability, 0);
    const variance = r.outcomes.reduce((sum, row) => sum + (row.k - mean) ** 2 * row.probability, 0);
    expect(mean).toBeCloseTo(r.mean, 10);
    expect(variance).toBeCloseTo(r.variance, 10);
  });
});

describe("fourth batch rendering", () => {
  const scenes = [
    ["lever", () => createElement(LeverBalanceWidget, { config: LeverBalanceConfigSchema.parse({ leftForceN: 0, rightForceN: 0 }), onChange: () => {} })],
    ["buoyancy", () => createElement(BuoyancyLabWidget, { config: BuoyancyLabConfigSchema.parse({ mode: "released", objectDensity: 2000 }), onChange: () => {} })],
    ["field", () => createElement(ElectricFieldWidget, { config: ElectricFieldConfigSchema.parse({ probeX: -0.5, probeY: 0 }), onChange: () => {} })],
    ["binomial", () => createElement(BinomialDistributionWidget, { config: BinomialDistributionConfigSchema.parse({ successProbability: 0 }), onChange: () => {} })],
  ] as const;
  it.each(scenes)("renders %s boundary state without invalid values", (_id, render) => {
    const html = renderToStaticMarkup(render());
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
    expect(html).toContain('role="note"');
  });
});
