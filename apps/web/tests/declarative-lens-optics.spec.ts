import { describe, expect, it } from "vitest";
import {
  DEFAULT_LENS_CONFIG,
  LensImagingConfigSchema,
  LensImagingPatchSchema,
  computeLensImage,
} from "../src/lib/interactive/components/lens-imaging";
import { COMPONENT_REGISTRY } from "../src/lib/interactive/components/registry";

// Correctness criteria from the component spec: 1/f = 1/u + 1/v.

describe("computeLensImage", () => {
  it("convex, u > 2f: real, inverted, reduced (f=10, u=30 → v=15, m=-0.5)", () => {
    const result = computeLensImage({ lensType: "convex", focalLength: 10, objectDistance: 30 });
    if (result.none) throw new Error("expected an image");
    expect(result.v).toBeCloseTo(15);
    expect(result.m).toBeCloseTo(-0.5);
    expect(result.real).toBe(true);
  });

  it("convex, f < u < 2f: real, inverted, magnified (f=10, u=15 → v=30, m=-2)", () => {
    const result = computeLensImage({ lensType: "convex", focalLength: 10, objectDistance: 15 });
    if (result.none) throw new Error("expected an image");
    expect(result.v).toBeCloseTo(30);
    expect(result.m).toBeCloseTo(-2);
    expect(result.real).toBe(true);
  });

  it("convex, u < f: virtual, upright, magnified (f=10, u=5 → v=-10, m=+2)", () => {
    const result = computeLensImage({ lensType: "convex", focalLength: 10, objectDistance: 5 });
    if (result.none) throw new Error("expected an image");
    expect(result.v).toBeCloseTo(-10);
    expect(result.m).toBeCloseTo(2);
    expect(result.real).toBe(false);
  });

  it("convex, u = f: no image (parallel rays)", () => {
    const result = computeLensImage({ lensType: "convex", focalLength: 10, objectDistance: 10 });
    expect(result.none).toBe(true);
  });

  it("concave: always virtual, upright, reduced (f=10, u=30 → v=-7.5, m=+0.25)", () => {
    const result = computeLensImage({ lensType: "concave", focalLength: 10, objectDistance: 30 });
    if (result.none) throw new Error("expected an image");
    expect(result.v).toBeCloseTo(-7.5);
    expect(result.m).toBeCloseTo(0.25);
    expect(result.real).toBe(false);
  });
});

describe("LensImagingConfigSchema", () => {
  it("fills defaults from an empty object", () => {
    expect(DEFAULT_LENS_CONFIG).toEqual({
      lensType: "convex",
      focalLength: 10,
      objectDistance: 30,
      objectHeight: 8,
      showRays: true,
    });
  });

  it("rejects out-of-range values", () => {
    expect(LensImagingConfigSchema.safeParse({ focalLength: 200 }).success).toBe(false);
    expect(LensImagingConfigSchema.safeParse({ objectDistance: 0 }).success).toBe(false);
    expect(LensImagingConfigSchema.safeParse({ lensType: "mirror" }).success).toBe(false);
  });

  it("patch schema accepts a minimal single-field patch and rejects bad values", () => {
    expect(LensImagingPatchSchema.parse({ objectDistance: 39 })).toEqual({ objectDistance: 39 });
    expect(LensImagingPatchSchema.safeParse({ objectDistance: 999 }).success).toBe(false);
  });
});

describe("COMPONENT_REGISTRY", () => {
  it("has unique ids and the expected implemented component set", () => {
    const ids = COMPONENT_REGISTRY.map((entry) => entry.componentId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(COMPONENT_REGISTRY).toHaveLength(19);
    expect(COMPONENT_REGISTRY.every((entry) => entry.implemented)).toBe(true);
  });
});
