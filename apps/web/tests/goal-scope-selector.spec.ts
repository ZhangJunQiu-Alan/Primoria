import { describe, expect, it } from "vitest";

import { parseGoalScopeSelection, selectGoalScope } from "../src/lib/knowledge-graph/goal-scope-selector";
import { selectDeterministicGoalTargets } from "../src/lib/knowledge-graph/cross-subject-edges";
import { findPrimarySubjectGraphId } from "../src/lib/knowledge-graph/subject-aliases";

const GRAPH_ID = "linear_algebra";

describe("goal scope selector", () => {
  it("separates the primary subject from an application context", () => {
    expect(findPrimarySubjectGraphId("我想要学习面向深度学习的线性代数")).toBe("linear_algebra");
    expect(findPrimarySubjectGraphId("I want to learn linear algebra for understanding deep learning")).toBe(
      "linear_algebra",
    );
  });

  it("derives a minimal deep-learning scope from approved cross-subject edges", () => {
    expect(selectDeterministicGoalTargets("linear_algebra", ["deep_learning"])).toEqual([
      "c_mit1806_matrix_ops",
      "c_mit1806_linear_transformations",
    ]);
  });

  it("keeps only real, unique target concept ids", () => {
    const result = parseGoalScopeSelection(
      JSON.stringify({
        coverage: "full",
        targetConceptIds: [
          "c_mit1806_matrix_ops",
          "made_up",
          "c_mit1806_linear_transformations",
          "c_mit1806_matrix_ops",
        ],
        reason: "Deep-learning-oriented matrix foundations",
      }),
      GRAPH_ID,
    );

    expect(result).toEqual({
      coverage: "full",
      targetConceptIds: ["c_mit1806_matrix_ops", "c_mit1806_linear_transformations"],
      reason: "Deep-learning-oriented matrix foundations",
    });
  });

  it("rejects a full-coverage answer without a valid target", () => {
    expect(
      parseGoalScopeSelection(
        JSON.stringify({ coverage: "full", targetConceptIds: ["made_up"], reason: "invalid" }),
        GRAPH_ID,
      ),
    ).toBeNull();
  });

  it("keeps partial coverage so the caller can switch to a hybrid graph", async () => {
    const result = await selectGoalScope(
      { query: "LLM architecture and AI applications", graphId: "deep_learning", language: "en" },
      async () => JSON.stringify({ coverage: "partial", targetConceptIds: ["dl_transformer"], reason: "Apps are missing" }),
    );

    expect(result).toEqual({ coverage: "partial", targetConceptIds: ["dl_transformer"], reason: "Apps are missing" });
  });
});
