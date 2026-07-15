import { describe, expect, it } from "vitest";
import { DEFAULT_SORTING_STEPS_CONFIG, SortingStepsConfigSchema, SortingStepsPatchSchema, traceSort } from "../src/lib/qa/components/sorting-steps";

describe("sorting steps component", () => {
  it("validates defaults, patches, and value bounds", () => {
    expect(SortingStepsConfigSchema.parse({})).toEqual(DEFAULT_SORTING_STEPS_CONFIG);
    expect(SortingStepsPatchSchema.parse({ algorithm: "selection" })).toEqual({ algorithm: "selection" });
    expect(() => SortingStepsConfigSchema.parse({ values: [3, 2, 1] })).toThrow();
  });
  it("produces exact bubble and selection traces", () => {
    const bubble = traceSort({ algorithm: "bubble", values: [5, 2, 4, 1] });
    const selection = traceSort({ algorithm: "selection", values: [5, 2, 4, 1] });
    expect(bubble).toMatchObject({ comparisons: 6, swaps: 5, sorted: [1, 2, 4, 5] });
    expect(selection).toMatchObject({ comparisons: 6, swaps: 1, sorted: [1, 2, 4, 5] });
  });
  it("insertion sort ends sorted for any input, counting shifts as swaps", () => {
    const insertion = traceSort({ algorithm: "insertion", values: [5, 2, 4, 1, 8, 3] });
    expect(insertion.sorted).toEqual([1, 2, 3, 4, 5, 8]);
    expect(insertion.swaps).toBeGreaterThan(0);
    const sortedInput = traceSort({ algorithm: "insertion", values: [1, 2, 3, 4] });
    expect(sortedInput).toMatchObject({ comparisons: 3, swaps: 0, sorted: [1, 2, 3, 4] });
  });
});
