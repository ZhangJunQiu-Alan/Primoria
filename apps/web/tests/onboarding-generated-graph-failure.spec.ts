import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  positionLearningGoal: vi.fn(),
  planFromPositioning: vi.fn(),
  getOrCreateGeneratedGraph: vi.fn(),
}));

vi.mock("../src/lib/knowledge-graph/position-learning-goal", () => ({
  positionLearningGoal: mockState.positionLearningGoal,
  planFromPositioning: mockState.planFromPositioning,
}));

vi.mock("../src/lib/knowledge-graph/generated-graph", () => ({
  getOrCreateGeneratedGraph: mockState.getOrCreateGeneratedGraph,
}));

describe("onboarding generated graph failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.positionLearningGoal.mockResolvedValue({
      result: {
        branch: "out_of_library",
        graphId: "",
        freeformTopic: "MCP 和 Agent 架构",
        message: "为你定制课程",
      },
      search: {},
    });
    mockState.planFromPositioning.mockReturnValue({
      branch: "out_of_library",
      topic: "MCP 和 Agent 架构",
      message: "为你定制课程",
    });
    mockState.getOrCreateGeneratedGraph.mockResolvedValue(null);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects out-of-library onboarding goals when generated graph creation fails", async () => {
    const { resolveOnboardingGoalAnchor } = await import("../src/lib/learner-profile/onboarding-positioning");

    await expect(resolveOnboardingGoalAnchor("MCP 和 Agent 架构")).rejects.toThrow(
      "暂时无法为这个主题生成课程图谱，请换个具体说法再试一次。",
    );

    expect(mockState.getOrCreateGeneratedGraph).toHaveBeenCalledWith({
      topic: "MCP 和 Agent 架构",
      language: "zh",
    });
    expect(mockState.planFromPositioning).toHaveBeenCalled();
  });
});
