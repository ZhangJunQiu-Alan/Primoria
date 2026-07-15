import { describe, expect, it } from "vitest";
import {
  ArgumentMapConfigSchema,
  ArgumentMapPatchSchema,
  DEFAULT_ARGUMENT_MAP_CONFIG,
  analyzeArgumentMap,
} from "../src/lib/interactive/components/argument-map";

describe("analyzeArgumentMap", () => {
  it("groups statements and counts semantic relations", () => {
    const result = analyzeArgumentMap(DEFAULT_ARGUMENT_MAP_CONFIG);
    expect(result.groups.support.map((statement) => statement.kind)).toEqual(["reason", "evidence"]);
    expect(result.groups.challenge.map((statement) => statement.kind)).toEqual(["objection"]);
    expect(result.counts).toEqual({ supports: 2, challenges: 1, "responds-to": 0 });
    expect(result.invalidRelations).toHaveLength(0);
  });

  it("isolates relations whose source or target does not exist", () => {
    const config = ArgumentMapConfigSchema.parse({
      relations: [
        { fromId: "missing", toId: "central-claim", relationType: "supports" },
        { fromId: "reason-1", toId: "missing", relationType: "supports" },
      ],
    });
    const result = analyzeArgumentMap(config);
    expect(result.validRelations).toHaveLength(0);
    expect(result.invalidRelations).toHaveLength(2);
  });
});

describe("ArgumentMap schemas", () => {
  it("fills defaults and rejects too few statements or relations", () => {
    expect(DEFAULT_ARGUMENT_MAP_CONFIG.statements).toHaveLength(3);
    expect(DEFAULT_ARGUMENT_MAP_CONFIG.relations).toHaveLength(3);
    expect(ArgumentMapConfigSchema.safeParse({ statements: DEFAULT_ARGUMENT_MAP_CONFIG.statements.slice(0, 2) }).success).toBe(false);
    expect(ArgumentMapConfigSchema.safeParse({ relations: [DEFAULT_ARGUMENT_MAP_CONFIG.relations[0]] }).success).toBe(false);
  });

  it("accepts a claim-only patch and rejects empty claims", () => {
    expect(ArgumentMapPatchSchema.parse({ centralClaim: "A defensible claim" })).toEqual({ centralClaim: "A defensible claim" });
    expect(ArgumentMapPatchSchema.safeParse({ centralClaim: "" }).success).toBe(false);
  });
});
