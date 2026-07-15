import { describe, expect, it } from "vitest";
import { DEFAULT_FUNCTION_EXPLORER_CONFIG, evaluateTransformedFunction, FunctionExplorerConfigSchema, FunctionExplorerPatchSchema } from "../src/lib/interactive/components/function-explorer";

describe("function explorer component", () => {
  it("validates defaults, patches, and bounds", () => {
    expect(FunctionExplorerConfigSchema.parse({})).toEqual(DEFAULT_FUNCTION_EXPLORER_CONFIG);
    expect(FunctionExplorerPatchSchema.parse({ h: 2 })).toEqual({ h: 2 });
    expect(() => FunctionExplorerConfigSchema.parse({ b: 0 })).toThrow();
  });
  it("evaluates y=a*f(b(x-h))+k and preserves sqrt domain", () => {
    expect(evaluateTransformedFunction({ ...DEFAULT_FUNCTION_EXPLORER_CONFIG, a: 2, h: 1, k: 3 }, 3)).toBe(11);
    expect(evaluateTransformedFunction({ ...DEFAULT_FUNCTION_EXPLORER_CONFIG, functionType: "sqrt", h: 2 }, 1)).toBeNull();
  });
});
