import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LinearSystemConfigSchema, computeLinearSystem, linearSystemComponent } from "../src/lib/interactive/components/linear-system";
import { QuadraticEquationConfigSchema, computeQuadraticEquation, quadraticEquationComponent } from "../src/lib/interactive/components/quadratic-equation";
import { LinearSystemWidget } from "../src/components/generative-ui/interactive/linear-system";
import { QuadraticEquationWidget } from "../src/components/generative-ui/interactive/quadratic-equation";

describe("seventh batch contracts", () => {
  it.each([linearSystemComponent, quadraticEquationComponent])("validates $componentId without code or arbitrary fields", (entry) => {
    expect(entry.configSchema.safeParse({}).success).toBe(true);
    expect(entry.configSchema.safeParse({ html: "x" }).success).toBe(false);
    expect(entry.patchSchema.safeParse({ script: "x" }).success).toBe(false);
  });
  it("enforces the documented decimal grids", () => {
    expect(LinearSystemConfigSchema.safeParse({ a1: 0.01 }).success).toBe(false);
    expect(QuadraticEquationConfigSchema.safeParse({ a: 1e-12 }).success).toBe(false);
    expect(QuadraticEquationConfigSchema.safeParse({ a: -0.01 }).success).toBe(true);
  });
});

describe("two linear constraints", () => {
  it("links the default intersection with elimination", () => {
    const r = computeLinearSystem(LinearSystemConfigSchema.parse({}));
    expect(r.type).toBe("unique");
    expect(r.solution).toEqual({ x: 3, y: 3 });
    expect(r.remainingCoefficient).toBe(3);
    expect(r.remainingConstant).toBe(9);
  });
  it("distinguishes parallel and coincident lines", () => {
    const base = { a1: 1, b1: 2, c1: 3, a2: 2, b2: 4, c2: 6 };
    expect(computeLinearSystem(LinearSystemConfigSchema.parse(base)).type).toBe("coincident");
    expect(computeLinearSystem(LinearSystemConfigSchema.parse({ ...base, c2: 7 })).type).toBe("parallel");
  });
  it("treats decimal proportionality exactly", () => {
    const r = computeLinearSystem(LinearSystemConfigSchema.parse({ a1: 0.3, b1: 0.7, c1: 0.9, a2: 0.9, b2: 2.1, c2: 2.7 }));
    expect(r.determinant).toBe(0);
    expect(r.type).toBe("coincident");
  });
  it("handles vertical lines and eliminating y", () => {
    const r = computeLinearSystem(LinearSystemConfigSchema.parse({ a1: 1, b1: 0, c1: 2, a2: 0, b2: 1, c2: 3 }));
    expect(r.solution).toEqual({ x: 2, y: 3 });
    const parallel = computeLinearSystem(LinearSystemConfigSchema.parse({ a1: 0, a2: 0, b1: 1, b2: 2, c1: 2, c2: 5 }));
    expect(parallel.eliminateX).toBe(false);
    expect(parallel.remainingCoefficient).toBe(0);
    expect(parallel.remainingConstant).toBe(-1);
  });
  it("does not collapse tautologies and contradictions into the same outcome", () => {
    const zero = { a1: 0, b1: 0, c1: 0, a2: 0, b2: 0, c2: 0 };
    expect(computeLinearSystem(LinearSystemConfigSchema.parse(zero)).type).toBe("all");
    expect(computeLinearSystem(LinearSystemConfigSchema.parse({ ...zero, c2: 1 })).type).toBe("inconsistent");
    expect(computeLinearSystem(LinearSystemConfigSchema.parse({ ...zero, a2: 1 })).type).toBe("line");
  });
  it("satisfies both equations for a deterministic grid of unique systems", () => {
    for (let n = 1; n <= 100; n++) {
      const config = LinearSystemConfigSchema.parse({ a1: (n % 17 - 8) / 10, b1: (n % 11 - 5) / 10, c1: (n % 9 - 4) / 10, a2: (n % 7 - 3) / 10, b2: (n % 13 - 6) / 10, c2: (n % 19 - 9) / 10 });
      const r = computeLinearSystem(config);
      if (!r.solution) continue;
      expect(config.a1 * r.solution.x + config.b1 * r.solution.y).toBeCloseTo(config.c1, 9);
      expect(config.a2 * r.solution.x + config.b2 * r.solution.y).toBeCloseTo(config.c2, 9);
    }
  });
});

describe("quadratic roots and degeneracy", () => {
  it("gets the roots and completed-square vertex independently", () => {
    const r = computeQuadraticEquation(QuadraticEquationConfigSchema.parse({}));
    expect(r.roots).toEqual([-1, 3]);
    expect(r.vertex).toEqual({ x: 1, y: -4 });
    expect(r.discriminant).toBe(16);
  });
  it("distinguishes repeated and conjugate complex roots", () => {
    const repeated = computeQuadraticEquation(QuadraticEquationConfigSchema.parse({ a: 1, b: -2, c: 1 }));
    expect(repeated.kind).toBe("repeated");
    expect(repeated.roots).toEqual([1]);
    const complex = computeQuadraticEquation(QuadraticEquationConfigSchema.parse({ a: -1, b: 0, c: -1 }));
    expect(complex.kind).toBe("complex");
    expect(complex.complex?.real).toBeCloseTo(0);
    expect(complex.complex?.imaginary).toBe(1);
    expect(complex.roots).toEqual([]);
  });
  it.each([
    [{ a: 0, b: 2, c: -6 }, "linear", [3]],
    [{ a: 0, b: 0, c: 0 }, "identity", []],
    [{ a: 0, b: 0, c: 1 }, "inconsistent", []],
  ] as const)("handles %j", (values, kind, roots) => {
    const r = computeQuadraticEquation(QuadraticEquationConfigSchema.parse(values));
    expect(r.kind).toBe(kind);
    expect(r.roots).toEqual(roots);
    expect(r.vertex).toBeNull();
  });
  it("preserves Vieta relations without losing the small root", () => {
    for (const a of [-4, -0.01, 0.01, 4]) for (const b of [-8, 0, 8]) for (const c of [-8, 0, 8]) {
      const r = computeQuadraticEquation(QuadraticEquationConfigSchema.parse({ a, b, c }));
      if (r.roots.length !== 2) continue;
      expect(r.roots[0] + r.roots[1]).toBeCloseTo(-b / a, 8);
      expect(r.roots[0] * r.roots[1]).toBeCloseTo(c / a, 8);
      expect(r.roots.every(Number.isFinite)).toBe(true);
    }
  });
});

it("renders degenerate systems and complex roots with finite attributes", () => {
  const scenes = [createElement(LinearSystemWidget, { config: LinearSystemConfigSchema.parse({ a1: 0, b1: 0, c1: 1 }), onChange: () => {} }), createElement(QuadraticEquationWidget, { config: QuadraticEquationConfigSchema.parse({ a: 1, b: 0, c: 1 }), onChange: () => {} })];
  for (const scene of scenes) {
    const html = renderToStaticMarkup(scene);
    expect(html).toContain("<svg");
    expect(html).not.toMatch(/NaN|Infinity|undefined/);
  }
});

it("keeps the default root domain real while allowing explicit complex exploration", () => {
  const config = QuadraticEquationConfigSchema.parse({ a: 1, b: 0, c: 1 });
  const real = renderToStaticMarkup(createElement(QuadraticEquationWidget, { config, onChange: () => {} }));
  const complex = renderToStaticMarkup(createElement(QuadraticEquationWidget, { config: { ...config, domain: "complex" }, onChange: () => {} }));
  expect(real).not.toContain("0 ± 1i");
  expect(complex).toContain("0 ± 1i");
});
