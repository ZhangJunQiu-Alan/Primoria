import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  KnowledgeGraphUnavailableError,
  LearningGoalUserMessageError,
} from "../src/lib/knowledge-graph/errors";

const RAW_SQL_MESSAGE = 'relation "public.kg_node_embeddings" does not exist';
const LEAK_MARKERS = ["relation", "public.", "kg_node_embeddings", "SQL", "Postgres"];
const GOAL_ATTEMPT_ID = "goal-attempt-a";
const COURSE_ATTEMPT_ID = "course-attempt-a";

const mockState = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => unknown>,
  requireAuthUser: vi.fn(),
  buildOnboardingCourse: vi.fn(),
  resolveOnboardingGoalAnchor: vi.fn(),
  getLearnerOnboardingState: vi.fn(),
  getLearnerProfile: vi.fn(),
  isLearningGoalPositioningAttemptPending: vi.fn(),
  saveLearningGoal: vi.fn(),
  saveLearningGoalClarification: vi.fn(),
  saveLearningGoalPositioningFailure: vi.fn(),
  savePendingLearningGoal: vi.fn(),
  savePositionedLearningGoalIfPending: vi.fn(),
  skipLearningGoal: vi.fn(),
  saveKnowledgeBackground: vi.fn(),
  beginOnboardingCourseBuild: vi.fn(),
  completeOnboardingCourseBuild: vi.fn(),
  failOnboardingCourseBuild: vi.fn(),
  skipKnowledgeBackground: vi.fn(),
  enqueueProfileFactIntakeJob: vi.fn(),
  skipFactsIntake: vi.fn(),
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
  isLearningGoalPositioningAttemptPending: mockState.isLearningGoalPositioningAttemptPending,
  saveLearningGoal: mockState.saveLearningGoal,
  saveLearningGoalClarification: mockState.saveLearningGoalClarification,
  saveLearningGoalPositioningFailure: mockState.saveLearningGoalPositioningFailure,
  savePendingLearningGoal: mockState.savePendingLearningGoal,
  savePositionedLearningGoalIfPending: mockState.savePositionedLearningGoalIfPending,
  skipLearningGoal: mockState.skipLearningGoal,
  saveKnowledgeBackground: mockState.saveKnowledgeBackground,
  beginOnboardingCourseBuild: mockState.beginOnboardingCourseBuild,
  completeOnboardingCourseBuild: mockState.completeOnboardingCourseBuild,
  failOnboardingCourseBuild: mockState.failOnboardingCourseBuild,
  skipKnowledgeBackground: mockState.skipKnowledgeBackground,
  skipFactsIntake: mockState.skipFactsIntake,
}));

vi.mock("@/lib/learner-facts/intake-jobs", () => ({
  enqueueProfileFactIntakeJob: mockState.enqueueProfileFactIntakeJob,
  ProfileFactIntakeBusyError: class ProfileFactIntakeBusyError extends Error {},
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
    mockState.isLearningGoalPositioningAttemptPending.mockResolvedValue(true);
    mockState.savePendingLearningGoal.mockResolvedValue({
      profile: { ownerId: "u1" },
      attemptId: GOAL_ATTEMPT_ID,
    });
    mockState.savePositionedLearningGoalIfPending.mockResolvedValue({ ownerId: "u1" });
    mockState.saveLearningGoalPositioningFailure.mockResolvedValue({ ownerId: "u1" });
    mockState.beginOnboardingCourseBuild.mockResolvedValue({
      attemptId: COURSE_ATTEMPT_ID,
      profile: { ownerId: "u1" },
    });
    mockState.completeOnboardingCourseBuild.mockResolvedValue({ ownerId: "u1" });
    mockState.failOnboardingCourseBuild.mockResolvedValue({ ownerId: "u1" });
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
    expect(saved.attemptId).toBe(GOAL_ATTEMPT_ID);
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

  it("keeps the positioned goal when background course creation fails", async () => {
    const { POST } = await import("../src/app/api/onboarding/goal/route");
    mockState.getLearnerProfile.mockResolvedValue({
      learningGoal: "learn mechanics",
      goalPositioningStatus: "pending",
    });
    mockState.resolveOnboardingGoalAnchor.mockResolvedValue({
      kind: "anchor",
      anchor: {
        graphId: "physics",
        startTopicId: "mechanics",
        targetConceptId: null,
      },
    });
    mockState.savePositionedLearningGoalIfPending.mockResolvedValue({
      ownerId: "u1",
      learningGoal: "learn mechanics",
      goalGraphId: "physics",
      goalStartTopicId: "mechanics",
      goalTargetConceptId: null,
      knowledgeBackground: "undergraduate",
    });
    mockState.buildOnboardingCourse.mockRejectedValue(Object.assign(new Error(RAW_SQL_MESSAGE), { code: "42P01" }));

    const response = await POST(postRequest({ learningGoal: "learn mechanics" }));
    expect(response.status).toBe(200);
    await mockState.afterCallbacks[0]();

    expect(mockState.savePositionedLearningGoalIfPending).toHaveBeenCalledTimes(1);
    expect(mockState.saveLearningGoalPositioningFailure).not.toHaveBeenCalled();
    expect(mockState.failOnboardingCourseBuild).toHaveBeenLastCalledWith({
      ownerId: "u1",
      attemptId: COURSE_ATTEMPT_ID,
      message: "We couldn't prepare your course right now. Please retry.",
    });
  });

  it("abandons a stale background result after the user submits a newer goal", async () => {
    const { POST } = await import("../src/app/api/onboarding/goal/route");
    mockState.getLearnerProfile.mockResolvedValue({
      learningGoal: "learn mechanics",
      goalPositioningStatus: "pending",
    });
    mockState.resolveOnboardingGoalAnchor.mockResolvedValue({
      kind: "anchor",
      anchor: {
        graphId: "physics",
        startTopicId: "mechanics",
        targetConceptId: null,
      },
    });
    mockState.savePositionedLearningGoalIfPending.mockResolvedValue(null);

    await POST(postRequest({ learningGoal: "learn mechanics" }));
    await mockState.afterCallbacks[0]();

    expect(mockState.savePositionedLearningGoalIfPending).toHaveBeenCalledWith({
      ownerId: "u1",
      learningGoal: "learn mechanics",
      attemptId: GOAL_ATTEMPT_ID,
      graphId: "physics",
      startTopicId: "mechanics",
      targetConceptId: null,
    });
    expect(mockState.buildOnboardingCourse).not.toHaveBeenCalled();
    expect(mockState.saveLearningGoalPositioningFailure).not.toHaveBeenCalled();
  });

  it("abandons attempt A before resolving when same-text attempt B is current", async () => {
    const { POST } = await import("../src/app/api/onboarding/goal/route");
    mockState.isLearningGoalPositioningAttemptPending.mockResolvedValue(false);

    await POST(postRequest({ learningGoal: "learn mechanics" }));
    await mockState.afterCallbacks[0]();

    expect(mockState.isLearningGoalPositioningAttemptPending).toHaveBeenCalledWith("u1", GOAL_ATTEMPT_ID);
    expect(mockState.resolveOnboardingGoalAnchor).not.toHaveBeenCalled();
    expect(mockState.savePositionedLearningGoalIfPending).not.toHaveBeenCalled();
    expect(mockState.saveLearningGoalPositioningFailure).not.toHaveBeenCalled();
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

  it("returns a safe response when facts intake enqueue fails with a raw DB error", async () => {
    const { POST } = await import("../src/app/api/onboarding/facts/route");
    mockState.enqueueProfileFactIntakeJob.mockRejectedValue(Object.assign(new Error(RAW_SQL_MESSAGE), { code: "42P01" }));

    const response = await POST(postRequest({ text: "I study algorithms" }));
    expect(response.status).toBe(503);
    expectNoLeak(JSON.stringify(await response.json()));
    expect(mockState.buildOnboardingCourse).not.toHaveBeenCalled();
  });

  it("queues facts and advances immediately without scheduling model work in the request", async () => {
    mockState.enqueueProfileFactIntakeJob.mockResolvedValue({
      kind: "queued",
      job: { id: "facts-job-1", status: "queued" },
    });
    mockState.getLearnerOnboardingState.mockResolvedValue({ nextStep: "style", complete: false });
    const { POST } = await import("../src/app/api/onboarding/facts/route");

    const response = await POST(postRequest({ text: "I study algorithms" }));

    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      nextStep: "style",
      intake: { jobId: "facts-job-1", status: "queued" },
    });
    expect(mockState.afterCallbacks).toHaveLength(0);
    expect(mockState.buildOnboardingCourse).not.toHaveBeenCalled();
  });

  it("skips facts without creating an intake job", async () => {
    mockState.skipFactsIntake.mockResolvedValue({ ownerId: "u1", factsIntakeStatus: "skipped" });
    mockState.getLearnerOnboardingState.mockResolvedValue({ nextStep: "style", complete: false });
    const { POST } = await import("../src/app/api/onboarding/facts/route");

    const response = await POST(postRequest({ skip: true }));

    expect(response.status).toBe(200);
    expect(mockState.skipFactsIntake).toHaveBeenCalledWith("u1");
    expect(mockState.enqueueProfileFactIntakeJob).not.toHaveBeenCalled();
  });
});
