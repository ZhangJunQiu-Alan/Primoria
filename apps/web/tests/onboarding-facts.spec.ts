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

  it("captures both the selected tutor and teaching preference", () => {
    expect(buildOnboardingFact({ kind: "tutor_style", value: "feynman" })).toEqual({
      sourceId: "onboarding:tutor_style",
      text: "Selected Richard Feynman as tutor; prefers intuition and analogies before formal details.",
      category: "preference",
    });
  });

  it("does not create a fact for a skipped answer", () => {
    expect(buildOnboardingFact({ kind: "learning_goal", value: null })).toBeNull();
  });
});
