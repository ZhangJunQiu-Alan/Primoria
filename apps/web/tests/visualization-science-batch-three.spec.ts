import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrigonometryCircleConfigSchema, computeTrigonometry, trigonometryCircleComponent } from "../src/lib/interactive/components/trigonometry-circle";
import { ChemicalEquilibriumConfigSchema, computeChemicalEquilibrium, chemicalEquilibriumComponent } from "../src/lib/interactive/components/chemical-equilibrium";
import { MolecularGeometryConfigSchema, getMolecularGeometry, projectMoleculeVector, molecularGeometryComponent } from "../src/lib/interactive/components/molecular-geometry";
import { TrigonometryCircleWidget } from "../src/components/generative-ui/interactive/trigonometry-circle";
import { ChemicalEquilibriumWidget } from "../src/components/generative-ui/interactive/chemical-equilibrium";
import { MolecularGeometryWidget } from "../src/components/generative-ui/interactive/molecular-geometry";

describe("third science batch contracts", () => {
  it.each([trigonometryCircleComponent, chemicalEquilibriumComponent, molecularGeometryComponent])("strictly validates $componentId configs and patches", (entry) => {
    expect(entry.configSchema.safeParse({}).success).toBe(true);
    expect(entry.configSchema.safeParse({ source: "javascript:alert(1)" }).success).toBe(false);
    expect(entry.patchSchema.safeParse({ source: "unsafe" }).success).toBe(false);
    expect(entry.patchSchema.parse({})).toEqual({});
  });
});

describe("trigonometric ratios", () => {
  it("separates coordinates from radius-independent ratios", () => {
    const r = computeTrigonometry(TrigonometryCircleConfigSchema.parse({ angleDeg: 30, radius: 2 }));
    expect(r.sin).toBeCloseTo(0.5, 12);
    expect(r.cos).toBeCloseTo(Math.sqrt(3) / 2, 12);
    expect(r.y).toBeCloseTo(1, 12);
    expect(r.x).toBeCloseTo(Math.sqrt(3), 12);
    expect(r.sin ** 2 + r.cos ** 2).toBeCloseTo(1, 12);
  });
  it.each([-270, -90, 90, 270, 450])("does not invent tan(%s degrees)", (angleDeg) => {
    expect(computeTrigonometry(TrigonometryCircleConfigSchema.parse({ angleDeg })).tan).toBeNull();
  });
  it("preserves periodicity and normalizes negative angles", () => {
    const first = computeTrigonometry(TrigonometryCircleConfigSchema.parse({ angleDeg: -30 }));
    const next = computeTrigonometry(TrigonometryCircleConfigSchema.parse({ angleDeg: 330 }));
    expect(first.normalizedAngle).toBe(330);
    expect(first.cos).toBeCloseTo(next.cos, 12);
    expect(first.sin).toBeCloseTo(next.sin, 12);
  });
});

describe("reversible reaction model", () => {
  it("conserves concentration and satisfies the kinetic equation", () => {
    const config = ChemicalEquilibriumConfigSchema.parse({ initialA: 0.3, initialB: 1.7 });
    const r = computeChemicalEquilibrium(config);
    for (const time of [0, 0.01, 1, 10, 60, 500]) {
      const state = r.stateAt(time);
      expect(state.a + state.b).toBeCloseTo(2, 12);
      expect(state.a).toBeGreaterThanOrEqual(0);
      expect(state.b).toBeGreaterThanOrEqual(0);
    }
    const h = 1e-4, state = r.stateAt(3);
    expect((r.stateAt(3 + h).a - r.stateAt(3 - h).a) / (2 * h)).toBeCloseTo(-state.forward + state.reverse, 9);
  });
  it("has equal nonzero rates at dynamic equilibrium", () => {
    const r = computeChemicalEquilibrium(ChemicalEquilibriumConfigSchema.parse({}));
    const state = r.stateAt(500);
    expect(state.b / state.a).toBeCloseTo(2, 12);
    expect(state.forward).toBeCloseTo(state.reverse, 12);
    expect(state.forward).toBeGreaterThan(0);
  });
  it("handles an empty system and an initially equilibrated system", () => {
    const empty = computeChemicalEquilibrium(ChemicalEquilibriumConfigSchema.parse({ initialA: 0, initialB: 0 }));
    expect(empty.current).toEqual({ a: 0, b: 0, forward: 0, reverse: 0 });
    const stationary = computeChemicalEquilibrium(ChemicalEquilibriumConfigSchema.parse({ forwardRate: 0.2, reverseRate: 0.1, initialA: 0.5, initialB: 1 }));
    expect(stationary.stateAt(50).a).toBeCloseTo(0.5, 12);
  });
});

describe("molecular geometry", () => {
  const angle = (a: readonly number[], b: readonly number[]) => Math.acos(Math.max(-1, Math.min(1, a.reduce((sum, v, i) => sum + v * b[i], 0)))) * 180 / Math.PI;
  it("has tetrahedral geometry and water/ammonia bond angles", () => {
    const methane = getMolecularGeometry("CH4");
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) expect(angle(methane.bonds[i], methane.bonds[j])).toBeCloseTo(109.471220634, 8);
    const water = getMolecularGeometry("H2O");
    expect(angle(water.bonds[0], water.bonds[1])).toBeCloseTo(104.5, 10);
    expect(water.lonePairs).toHaveLength(2);
    const ammonia = getMolecularGeometry("NH3");
    expect(angle(ammonia.bonds[0], ammonia.bonds[1])).toBeCloseTo(107, 10);
  });
  it("retains multiple bonds and valid projection depths", () => {
    expect(getMolecularGeometry("CO2").bondOrder).toBe(2);
    const vector = getMolecularGeometry("SF6").bonds[0];
    const front = projectMoleculeVector(vector, 0.5, 0.2);
    expect(Number.isFinite(front.x)).toBe(true);
    expect(front.perspective).toBeGreaterThan(0);
  });
  it.each(["CO2", "BF3", "CH4", "NH3", "H2O", "PCl5", "SF6"] as const)("has normalized domain directions for %s", (molecule) => {
    const geometry = getMolecularGeometry(molecule);
    for (const vector of [...geometry.bonds, ...geometry.lonePairs]) expect(Math.hypot(...vector)).toBeCloseTo(1, 12);
  });
});

describe("third batch scene rendering", () => {
  it("keeps tangent branches disconnected", () => {
    const html = renderToStaticMarkup(createElement(TrigonometryCircleWidget, { config: TrigonometryCircleConfigSchema.parse({ mode: "graph", functionType: "tan", angleDeg: 90 }), onChange: () => {} }));
    expect(html).toContain("未定义");
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it("renders an empty reversible system without division by zero", () => {
    const html = renderToStaticMarkup(createElement(ChemicalEquilibriumWidget, { config: ChemicalEquilibriumConfigSchema.parse({ initialA: 0, initialB: 0, view: "rates" }), onChange: () => {} }));
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/NaN|Infinity/);
  });
  it.each(["CO2", "BF3", "CH4", "NH3", "H2O", "PCl5", "SF6"] as const)("renders %s and its accessible rotation controls", (molecule) => {
    const html = renderToStaticMarkup(createElement(MolecularGeometryWidget, { config: MolecularGeometryConfigSchema.parse({ molecule, mode: "electron-domains" }), onChange: () => {} }));
    expect(html).toContain("向左旋转");
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  });
});
