import { describe, expect, it } from "vitest";
import { screenPointToSvg } from "../src/components/generative-ui/interactive/primitives/svg-drag-handle";
import { niceAxisTicks, quadraticSceneXRange, plotCoordinates, unplotCoordinates } from "../src/components/generative-ui/interactive/primitives/scene-frame";

describe("SVG drag coordinates", () => {
  it("reverses CSS scale and translation without applying DPR twice", () => {
    expect(screenPointToSvg(160, 95, { a: 0.5, b: 0, c: 0, d: 0.5, e: 10, f: 20 })).toEqual({ x: 300, y: 150 });
  });
  it("handles rotated affine transforms", () => {
    const result = screenPointToSvg(94, 208, { a: 0, b: 2, c: -2, d: 0, e: 100, f: 200 });
    expect(result).toEqual({ x: 4, y: 3 });
  });
  it("declines noninvertible or invalid screen transforms", () => {
    expect(screenPointToSvg(0, 0, { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 })).toBeNull();
    expect(screenPointToSvg(NaN, 0, { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })).toBeNull();
  });
  it("round trips plot positions after asymmetric margins", () => {
    const p = plotCoordinates(-8, 8, -2, 13);
    for (const x of [-8, 0, 3.5, 8]) for (const y of [-2, 0, 7, 13]) {
      const point = unplotCoordinates(p.x(x), p.y(y), -8, 8, -2, 13);
      expect(point.x).toBeCloseTo(x, 12);
      expect(point.y).toBeCloseTo(y, 12);
    }
  });
  it("keeps teaching features visible without letting a remote root flatten the scene", () => {
    const ordinary = quadraticSceneXRange([-1, 3, 1]);
    expect(ordinary.xMin).toBeLessThan(-1);
    expect(ordinary.xMax).toBeGreaterThan(3);
    expect(quadraticSceneXRange([1e10, Infinity])).toEqual({ xMin: -3, xMax: 3 });
  });
  it("uses readable decimal ticks and declines degenerate ranges", () => {
    expect(niceAxisTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(niceAxisTicks(0, 1, 4)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(niceAxisTicks(100, 1000, 6)).toEqual([200, 400, 600, 800, 1000]);
    expect(niceAxisTicks(1, 1, 4)).toEqual([]);
    expect(niceAxisTicks(0, Infinity, 4)).toEqual([]);
  });

});
