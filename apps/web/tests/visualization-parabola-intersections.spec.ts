import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ParabolaIntersectionsConfigSchema, ParabolaIntersectionsPatchSchema, computeParabolaIntersections } from "../src/lib/interactive/components/parabola-intersections";
import { ParabolaIntersectionsWidget } from "../src/components/generative-ui/interactive/parabola-intersections";

describe("parabola and line intersections", () => {
  it("validates decimal-grid teaching parameters strictly", () => {
    expect(ParabolaIntersectionsConfigSchema.safeParse({ a: 1e-12 }).success).toBe(false);
    expect(ParabolaIntersectionsPatchSchema.safeParse({ html: "x" }).success).toBe(false);
  });
  it("matches horizontal intersections and Vieta relations", () => {
    const r = computeParabolaIntersections(ParabolaIntersectionsConfigSchema.parse({ intercept: 5 }));
    expect(r.roots).toEqual([-3, 3]);
    expect(r.gap).toBe(6);
    expect(r.chord).toBe(6);
    expect(r.rootSum).toBe(0);
    expect(r.rootProduct).toBe(-9);
  });
  it("subtracts both line coefficients before evaluating the discriminant", () => {
    const r = computeParabolaIntersections(ParabolaIntersectionsConfigSchema.parse({ a: 1, b: 0, c: 0, slope: 1, intercept: 2, scene: "line" }));
    expect(r.roots).toEqual([-1, 2]);
    expect(r.discriminant).toBe(9);
    expect(r.gap).toBe(3);
    expect(r.chord).toBeCloseTo(3 * Math.SQRT2, 12);
  });
  it("matches the bridge water-level example without equating it to vessel headroom", () => {
    const r = computeParabolaIntersections(ParabolaIntersectionsConfigSchema.parse({ a: -0.4, b: 0, c: 9, intercept: 3, scene: "bridge" }));
    expect(r.bridgeValid).toBe(true);
    expect(r.gap).toBeCloseTo(2 * Math.sqrt(15), 12);
    expect(r.discriminant).toBe(9.6);
  });
  it("matches the observed oblique-line example while separating horizontal gap and chord", () => {
    const r = computeParabolaIntersections(ParabolaIntersectionsConfigSchema.parse({ a: 0.5, b: 0, c: -3, slope: 1, intercept: 2, scene: "line" }));
    expect(r.roots[0]).toBeCloseTo(1 - Math.sqrt(11), 12);
    expect(r.roots[1]).toBeCloseTo(1 + Math.sqrt(11), 12);
    expect(r.gap).toBeCloseTo(2 * Math.sqrt(11), 12);
    expect(r.chord).toBeCloseTo(2 * Math.sqrt(22), 12);
  });
  it("distinguishes tangency and a waterline above the opening", () => {
    const config = ParabolaIntersectionsConfigSchema.parse({ a: -0.4, c: 9, scene: "bridge" });
    const tangent = computeParabolaIntersections({ ...config, intercept: 9 });
    expect(tangent.points).toHaveLength(1);
    expect(tangent.gap).toBe(0);
    const above = computeParabolaIntersections({ ...config, intercept: 10 });
    expect(above.points).toHaveLength(0);
    expect(above.gap).toBeNull();
  });
  it("does not use a stored oblique slope in a horizontal scenario", () => {
    const r = computeParabolaIntersections(ParabolaIntersectionsConfigSchema.parse({ scene: "horizontal", slope: 3 }));
    expect(r.slope).toBe(0);
    expect(r.roots).toEqual([-2, 2]);
  });
  it("handles coincident, parallel and one-point degenerate lines", () => {
    const config = ParabolaIntersectionsConfigSchema.parse({ a: 0, b: 1, c: 2, slope: 1, intercept: 2, scene: "line" });
    expect(computeParabolaIntersections(config).kind).toBe("identity");
    expect(computeParabolaIntersections({ ...config, intercept: 3 }).kind).toBe("inconsistent");
    expect(computeParabolaIntersections({ ...config, slope: 2 }).points).toEqual([{ x: 0, y: 2 }]);
  });
  it("puts every real point on both original curves across deterministic cases", () => {
    for (let n = 1; n < 80; n++) {
      const config = ParabolaIntersectionsConfigSchema.parse({ a: (n % 9 - 4) / 10, b: (n % 17 - 8) / 10, c: (n % 7 - 3) / 10, slope: (n % 11 - 5) / 10, intercept: (n % 13 - 6) / 10, scene: "line" });
      const r = computeParabolaIntersections(config);
      for (const point of r.points) {
        expect(config.a * point.x ** 2 + config.b * point.x + config.c).toBeCloseTo(point.y, 8);
        expect(config.slope * point.x + config.intercept).toBeCloseTo(point.y, 8);
      }
    }
  });
  it("renders all three scenarios with finite coordinates", () => {
    for (const scene of ["horizontal", "line", "bridge"] as const) {
      const html = renderToStaticMarkup(createElement(ParabolaIntersectionsWidget, { config: ParabolaIntersectionsConfigSchema.parse({ scene }), onChange: () => {} }));
      expect(html).toContain("<svg");
      expect(html).not.toMatch(/NaN|Infinity|undefined/);
    }
  });
});
