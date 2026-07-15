import { describe, expect, it } from "vitest";
import { CharacterRelationshipsConfigSchema, CharacterRelationshipsPatchSchema, DEFAULT_CHARACTER_RELATIONSHIPS_CONFIG, deriveCharacterRelationships } from "../src/lib/interactive/components/character-relationships";

describe("character relationships component", () => {
  it("validates defaults and patches", () => {
    expect(CharacterRelationshipsConfigSchema.parse({})).toEqual(DEFAULT_CHARACTER_RELATIONSHIPS_CONFIG);
    expect(CharacterRelationshipsPatchSchema.parse({ selectedPhase: "End" })).toEqual({ selectedPhase: "End" });
  });
  it("filters by phase and drops dangling references", () => {
    const result = deriveCharacterRelationships({ ...DEFAULT_CHARACTER_RELATIONSHIPS_CONFIG, relationships: [...DEFAULT_CHARACTER_RELATIONSHIPS_CONFIG.relationships, { fromCharacterId: "missing", toCharacterId: "character-a", relationship: "unknown", phase: "Middle" }] });
    expect(result.visibleRelationships).toHaveLength(1);
    expect(result.invalidRelationshipCount).toBe(1);
  });
});
