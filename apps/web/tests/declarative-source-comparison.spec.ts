import { describe, expect, it } from "vitest";
import {
  DEFAULT_SOURCE_COMPARISON_CONFIG,
  SourceComparisonConfigSchema,
  SourceComparisonPatchSchema,
  buildSourceComparisonRows,
} from "../src/lib/qa/components/source-comparison";

describe("buildSourceComparisonRows", () => {
  it("uses provenance without inventing a reliability judgement", () => {
    const result = buildSourceComparisonRows({ ...DEFAULT_SOURCE_COMPARISON_CONFIG, comparisonFocus: "provenance" });
    expect(result.focusLabel).toBe("出处与语境");
    expect(result.rows[0].content).toContain("First observer");
    expect(result.rows[0].content).toContain("Produced close to the event");
  });

  it("pairs each claim with that source's own evidence for corroboration", () => {
    const result = buildSourceComparisonRows(DEFAULT_SOURCE_COMPARISON_CONFIG);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].content).toBe("The change was deliberate.｜证据: Direct testimony");
    expect(result.rows[1].content).toBe("The change emerged gradually.｜证据: Multiple archived records");
  });
});

describe("SourceComparison schemas", () => {
  it("fills defaults and rejects fewer than two sources", () => {
    expect(DEFAULT_SOURCE_COMPARISON_CONFIG.comparisonFocus).toBe("corroboration");
    expect(SourceComparisonConfigSchema.safeParse({ sources: [DEFAULT_SOURCE_COMPARISON_CONFIG.sources[0]] }).success).toBe(false);
  });

  it("accepts a focus-only patch and rejects unknown focus values", () => {
    expect(SourceComparisonPatchSchema.parse({ comparisonFocus: "limitations" })).toEqual({ comparisonFocus: "limitations" });
    expect(SourceComparisonPatchSchema.safeParse({ comparisonFocus: "bias" }).success).toBe(false);
  });
});
