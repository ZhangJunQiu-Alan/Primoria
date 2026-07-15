import { describe, expect, it } from "vitest";
import {
  CloseReadingConfigSchema,
  CloseReadingPatchSchema,
  DEFAULT_CLOSE_READING_CONFIG,
  segmentAnnotatedPassage,
} from "../src/lib/interactive/components/close-reading";

describe("segmentAnnotatedPassage", () => {
  it("segments exact quotations without changing the passage", () => {
    const result = segmentAnnotatedPassage(DEFAULT_CLOSE_READING_CONFIG);
    expect(result.segments.map((segment) => segment.text).join("")).toBe(DEFAULT_CLOSE_READING_CONFIG.passage);
    expect(result.segments.filter((segment) => segment.annotationIndex !== null)).toEqual([
      { text: "more than one interpretation", annotationIndex: 0 },
    ]);
    expect(result.missingAnnotationIndexes).toEqual([]);
  });

  it("reports a missing quote and leaves the passage intact", () => {
    const config = CloseReadingConfigSchema.parse({
      annotations: [{ quote: "not in passage", focus: "diction", device: "test", observation: "missing", effect: "none" }],
    });
    const result = segmentAnnotatedPassage(config);
    expect(result.segments).toEqual([{ text: config.passage, annotationIndex: null }]);
    expect(result.missingAnnotationIndexes).toEqual([0]);
  });

  it("only highlights annotations for the selected focus", () => {
    const config = CloseReadingConfigSchema.parse({
      passage: "Short clauses create speed.",
      focus: "syntax",
      annotations: [
        { quote: "Short clauses", focus: "syntax", device: "parataxis", observation: "Brief units", effect: "Fast pace" },
        { quote: "speed", focus: "diction", device: "noun choice", observation: "Names motion", effect: "Emphasis" },
      ],
    });
    const result = segmentAnnotatedPassage(config);
    expect(result.visibleAnnotations).toHaveLength(1);
    expect(result.segments.some((segment) => segment.text === "speed" && segment.annotationIndex !== null)).toBe(false);
  });
});

describe("CloseReading schemas", () => {
  it("fills defaults and rejects empty passages", () => {
    expect(DEFAULT_CLOSE_READING_CONFIG.focus).toBe("diction");
    expect(CloseReadingConfigSchema.safeParse({ passage: "" }).success).toBe(false);
  });

  it("accepts a focus-only patch and rejects unknown focus values", () => {
    expect(CloseReadingPatchSchema.parse({ focus: "syntax" })).toEqual({ focus: "syntax" });
    expect(CloseReadingPatchSchema.safeParse({ focus: "tone" }).success).toBe(false);
  });
});
