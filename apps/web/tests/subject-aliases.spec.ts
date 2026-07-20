import { describe, expect, it } from "vitest";

import {
  findExplicitSubjectGraphIds,
  findPrimarySubjectGraphId,
  getKnowledgeGraphSubjectLabel,
} from "../src/lib/knowledge-graph/subject-aliases";
import { listTopicGraphIds } from "../src/lib/knowledge-graph/topic-graph";

describe("knowledge graph subject aliases", () => {
  it("provides unique bilingual routing labels for every runtime graph", () => {
    const graphIds = listTopicGraphIds();
    const english = graphIds.map((graphId) => getKnowledgeGraphSubjectLabel(graphId, "en"));
    const chinese = graphIds.map((graphId) => getKnowledgeGraphSubjectLabel(graphId, "zh"));

    expect(new Set(english).size).toBe(graphIds.length);
    expect(new Set(chinese).size).toBe(graphIds.length);
  });

  it("keeps a bare shared subject ambiguous across curriculum systems", () => {
    expect(findExplicitSubjectGraphIds("I want to learn biology")).toEqual(
      expect.arrayContaining(["a_level_biology", "senior_secondary_biology", "singapore_h2_biology"]),
    );
  });

  it("ranks a curriculum-qualified label ahead of generic subject matches", () => {
    expect(findExplicitSubjectGraphIds("I want to learn Singapore H2 Biology")[0]).toBe("singapore_h2_biology");
    expect(findExplicitSubjectGraphIds("我想学习中国普通高中物理学")[0]).toBe("senior_secondary_physics");
  });

  it("resolves a curriculum-qualified primary subject in a purpose-scoped goal", () => {
    expect(findPrimarySubjectGraphId("I want to learn Singapore H2 Biology for medical school")).toBe(
      "singapore_h2_biology",
    );
    expect(findPrimarySubjectGraphId("我想学习为了工程应用的新加坡 H2 物理学")).toBe(
      "singapore_h2_physics",
    );
  });
});
