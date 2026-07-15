import { describe, expect, it } from "vitest";
import { analyzeSentenceStructure, DEFAULT_SENTENCE_STRUCTURE_CONFIG, SentenceStructureConfigSchema, SentenceStructurePatchSchema } from "../src/lib/qa/components/sentence-structure";

describe("sentence structure component", () => {
  it("validates defaults, language enum, and patches", () => {
    expect(SentenceStructureConfigSchema.parse({})).toEqual(DEFAULT_SENTENCE_STRUCTURE_CONFIG);
    expect(SentenceStructurePatchSchema.parse({ languageCode: "zh" })).toEqual({ languageCode: "zh" });
    expect(() => SentenceStructureConfigSchema.parse({ languageCode: "xx" })).toThrow();
  });
  it("finds roots and rejects dangling dependencies", () => {
    const config = { ...DEFAULT_SENTENCE_STRUCTURE_CONFIG, phrases: [...DEFAULT_SENTENCE_STRUCTURE_CONFIG.phrases, { id: "bad", text: "bad", role: "modifier", dependsOnId: "missing" }] };
    const result = analyzeSentenceStructure(config);
    expect(result.roots.map((phrase) => phrase.id)).toEqual(["predicate"]);
    expect(result.invalidPhrases.map((phrase) => phrase.id)).toEqual(["bad"]);
  });
});
