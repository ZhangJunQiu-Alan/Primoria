import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { loadLocalEnv } from "../scripts/kg-db-common.mjs";
import { buildGraphCandidates } from "../src/lib/knowledge-graph/graph-router";
import { getKnowledgeGraphPool, searchKnowledgeGraphNodes } from "../src/lib/knowledge-graph/search";

const describeLive = process.env.RUN_KG_GOLDEN_DB === "1" ? describe : describe.skip;

describeLive("KG golden routing against seeded embeddings", () => {
  beforeAll(() => {
    loadLocalEnv();
  });

  afterAll(async () => {
    await getKnowledgeGraphPool().end();
  });

  it('ranks Python Fundamentals first for "Teach me Python from the beginning"', async () => {
    const response = await searchKnowledgeGraphNodes({
      query: "Teach me Python from the beginning",
      topK: 30,
    });
    const ranked = buildGraphCandidates(response.results, 6, response.encodedQuery.coreQuery);

    expect(ranked[0]?.graphId).toBe("python_fundamentals");
    expect(ranked.find((candidate) => candidate.graphId === "python_fundamentals")?.bestSimilarity).toBeGreaterThan(
      ranked.find((candidate) => candidate.graphId === "sicp_cs61a")?.bestSimilarity ?? -Infinity,
    );
    expect(ranked.some((candidate) => candidate.graphId === "Python")).toBe(false);
  });
});
