import { describe, expect, it } from "vitest";

import { buildOnboardingFact } from "../src/lib/learner-facts/store";

describe("onboarding learner facts", () => {
  it("maps the learning goal into a goal fact", () => {
    expect(buildOnboardingFact({ kind: "learning_goal", value: "  学习线性代数  " })).toEqual({
      sourceId: "onboarding:learning_goal",
      text: "Wants to learn: 学习线性代数",
      category: "goal",
    });
  });

  it("maps knowledge background into prior knowledge", () => {
    expect(buildOnboardingFact({ kind: "knowledge_background", value: "undergraduate" })).toEqual({
      sourceId: "onboarding:knowledge_background",
      text: "Knowledge background: University",
      category: "prior_knowledge",
    });
  });

  it("does not create a fact for a skipped answer", () => {
    expect(buildOnboardingFact({ kind: "learning_goal", value: null })).toBeNull();
  });
});
