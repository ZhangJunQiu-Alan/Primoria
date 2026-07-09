import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  KnowledgeGraphUnavailableError,
  LearningGoalUserMessageError,
} from "../src/lib/knowledge-graph/errors";

const RAW_SQL_MESSAGE = 'relation "public.kg_node_embeddings" does not exist';
const LEAK_MARKERS = ["relation", "public.", "kg_node_embeddings", "SQL", "Postgres"];

const mockState = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => unknown>,
  requireAuthUser: vi.fn(),
  buildOnboardingCourse: vi.fn(),
  resolveOnboardingGoalAnchor: vi.fn(),
  getLearnerOnboardingState: vi.fn(),
  getLearnerProfile: vi.fn(),
  saveLearningGoal: vi.fn(),
  saveLearningGoalClarification: vi.fn(),
  saveLearningGoalPositioningFailure: vi.fn(),
  savePendingLearningGoal: vi.fn(),
  skipLearningGoal: vi.fn(),
  saveKnowledgeBackground: vi.fn(),
  skipKnowledgeBackground: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (fn: () => unknown) => {
      mockState.afterCallbacks.push(fn);
    },
  };
});

vi.mock("@/lib/auth/guard", () => ({
  requireAuthUser: mockState.requireAuthUser,
}));

vi.mock("@/lib/learner-profile/onboarding-course", () => ({
  buildOnboardingCourse: mockState.buildOnboardingCourse,
}));

vi.mock("@/lib/learner-profile/onboarding-positioning", () => ({
  resolveOnboardingGoalAnchor: mockState.resolveOnboardingGoalAnchor,
}));

vi.mock("@/lib/learner-profile/store", () => ({
  getLearnerOnboardingState: mockState.getLearnerOnboardingState,
  getLearnerProfile: mockState.getLearnerProfile,
  saveLearningGoal: mockState.saveLearningGoal,
  saveLearningGoalClarification: mockState.saveLearningGoalClarification,
  saveLearningGoalPositioningFailure: mockState.saveLearningGoalPositioningFailure,
  savePendingLearningGoal: mockState.savePendingLearningGoal,
  skipLearningGoal: mockState.skipLearningGoal,
  saveKnowledgeBackground: mockState.saveKnowledgeBackground,
  skipKnowledgeBackground: mockState.skipKnowledgeBackground,
}));

vi.mock("@/lib/learner-profile/types", () => ({
  isKnowledgeBackground: (value: unknown) => value === "beginner",
}));

function postRequest(body: unknown) {
  return new Request("http://localhost/api/onboarding", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function expectNoLeak(text: string) {
  for (const marker of LEAK_MARKERS) {
    expect(text).not.toContain(marker);
  }
}

const infraError = () =>
  new KnowledgeGraphUnavailableError(
    "kg_schema_missing",
    Object.assign(new Error(RAW_SQL_MESSAGE), { code: "42P01" }),
  );

describe("onboarding route error safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.afterCallbacks.length = 0;
    mockState.requireAuthUser.mockResolvedValue({ denied: null, user: { id: "u1" } });
    mockState.getLearnerOnboardingState.mockResolvedValue({ step: "goal" });
    mockState.savePendingLearningGoal.mockResolvedValue({ ownerId: "u1" });
    mockState.saveLearningGoalPositioningFailure.mockResolvedValue({ ownerId: "u1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists a safe message when background positioning hits a KG infrastructure failure", async () => {
    const { POST } = await import("../src/app/api/onboarding/goal/route");
    mockState.getLearnerProfile.mockResolvedValue({
      learningGoal: "学习量子力学",
      goalPositioningStatus: "pending",
    });
    mockState.resolveOnboardingGoalAnchor.mockRejectedValue(infraError());

    const response = await POST(postRequest({ learningGoal: "学习量子力学" }));
    expect(response.status).toBe(200);
    expect(mockState.afterCallbacks).toHaveLength(1);

    await mockState.afterCallbacks[0]();

    expect(mockState.saveLearningGoalPositioningFailure).toHaveBeenCalledTimes(1);
    const saved = mockState.saveLearningGoalPositioningFailure.mock.calls[0][0];
    expectNoLeak(saved.message);
  });

  it("persists curated user-facing messages verbatim", async () => {
    const { POST } = await import("../src/app/api/onboarding/goal/route");
    mockState.getLearnerProfile.mockResolvedValue({
      learningGoal: "随便学点",
      goalPositioningStatus: "pending",
    });
    mockState.resolveOnboardingGoalAnchor.mockRejectedValue(
      new LearningGoalUserMessageError("请提供更具体的学习目标。"),
    );

    await POST(postRequest({ learningGoal: "随便学点" }));
    await mockState.afterCallbacks[0]();

    expect(mockState.saveLearningGoalPositioningFailure).toHaveBeenCalledWith(
      expect.objectContaining({ message: "请提供更具体的学习目标。" }),
    );
  });

  it("returns a safe 503 response when the sync graphId path hits a KG infrastructure failure", async () => {
    const { POST } = await import("../src/app/api/onboarding/goal/route");
    mockState.resolveOnboardingGoalAnchor.mockRejectedValue(infraError());

    const response = await POST(postRequest({ learningGoal: "学习量子力学", graphId: "physics" }));
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("knowledge_graph_unavailable");
    expectNoLeak(JSON.stringify(body));
  });

  it("returns a safe response when the background course build fails with a raw DB error", async () => {
    const { POST } = await import("../src/app/api/onboarding/background/route");
    mockState.buildOnboardingCourse.mockRejectedValue(Object.assign(new Error(RAW_SQL_MESSAGE), { code: "42P01" }));
    mockState.saveKnowledgeBackground.mockResolvedValue({ ownerId: "u1" });

    const response = await POST(postRequest({ knowledgeBackground: "beginner" }));
    expect(response.status).toBe(503);
    expectNoLeak(JSON.stringify(await response.json()));
  });
});
