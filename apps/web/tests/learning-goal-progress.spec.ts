import { describe, expect, it } from "vitest";
import { learningGoalProgressCopy } from "@/lib/ai/learning-goal-progress";

describe("learningGoalProgressCopy", () => {
  it("turns a Chinese learning request into learner-facing progress copy", () => {
    expect(learningGoalProgressCopy("我想要学习物理！")).toBe("我来帮你规划学习物理的路径！");
  });

  it("removes common English request prefixes", () => {
    expect(learningGoalProgressCopy("I wanna to learning python")).toBe(
      "I'll help you plan a learning path for python.",
    );
  });

  it("keeps a direct topic intact", () => {
    expect(learningGoalProgressCopy("MCP and Agent architecture")).toBe(
      "I'll help you plan a learning path for MCP and Agent architecture.",
    );
  });
});
