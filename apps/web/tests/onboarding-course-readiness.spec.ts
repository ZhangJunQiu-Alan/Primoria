import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getLearnerProfile: vi.fn(),
  listActiveFacts: vi.fn(),
  resolveOnboardingGoalAnchor: vi.fn(),
  savePositionedLearningGoalFromFactsIfClarifying: vi.fn(),
  buildOnboardingCourseWithStatus: vi.fn(),
}));

vi.mock("@/lib/learner-profile/store", () => ({
  getLearnerProfile: state.getLearnerProfile,
  savePositionedLearningGoalFromFactsIfClarifying: state.savePositionedLearningGoalFromFactsIfClarifying,
}));

vi.mock("@/lib/learner-facts/store", () => ({
  listActiveFacts: state.listActiveFacts,
}));

vi.mock("@/lib/learner-profile/onboarding-positioning", () => ({
  resolveOnboardingGoalAnchor: state.resolveOnboardingGoalAnchor,
}));

vi.mock("@/lib/learner-profile/onboarding-course-build", () => ({
  buildOnboardingCourseWithStatus: state.buildOnboardingCourseWithStatus,
}));

describe("onboarding course readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.listActiveFacts.mockResolvedValue([]);
    state.buildOnboardingCourseWithStatus.mockResolvedValue({ courseId: "course-1" });
  });

  it.each(["completed", "skipped", "failed"] as const)(
    "builds after facts intake reaches %s",
    async (factsIntakeStatus) => {
      const profile = {
        ownerId: "u1",
        goalGraphId: "computer_science",
        goalStartTopicId: "algorithms",
        factsIntakeStatus,
      };
      state.getLearnerProfile.mockResolvedValue(profile);
      const { buildOnboardingCourseIfReady } = await import("../src/lib/learner-profile/onboarding-course-readiness");

      await expect(buildOnboardingCourseIfReady("u1")).resolves.toEqual({ courseId: "course-1" });
      expect(state.buildOnboardingCourseWithStatus).toHaveBeenCalledWith("u1", profile);
    },
  );

  it("does not build while facts intake is pending", async () => {
    state.getLearnerProfile.mockResolvedValue({
      ownerId: "u1",
      goalGraphId: "computer_science",
      goalStartTopicId: "algorithms",
      factsIntakeStatus: "pending",
    });
    const { buildOnboardingCourseIfReady } = await import("../src/lib/learner-profile/onboarding-course-readiness");

    await expect(buildOnboardingCourseIfReady("u1")).resolves.toBeNull();
    expect(state.buildOnboardingCourseWithStatus).not.toHaveBeenCalled();
  });

  it("does not build before goal positioning finishes", async () => {
    state.getLearnerProfile.mockResolvedValue({ ownerId: "u1", factsIntakeStatus: "completed" });
    const { buildOnboardingCourseIfReady } = await import("../src/lib/learner-profile/onboarding-course-readiness");

    await expect(buildOnboardingCourseIfReady("u1")).resolves.toBeNull();
    expect(state.buildOnboardingCourseWithStatus).not.toHaveBeenCalled();
  });

  it("keeps migrated profiles with an existing background terminal", async () => {
    state.getLearnerProfile.mockResolvedValue({
      ownerId: "u1",
      goalGraphId: "computer_science",
      goalStartTopicId: "algorithms",
      factsIntakeStatus: null,
      knowledgeBackground: "undergraduate",
    });
    const { buildOnboardingCourseIfReady } = await import("../src/lib/learner-profile/onboarding-course-readiness");

    await buildOnboardingCourseIfReady("u1");
    expect(state.buildOnboardingCourseWithStatus).toHaveBeenCalledOnce();
  });

  it("repositions an unresolved curriculum goal after facts intake, then builds", async () => {
    const clarifyingProfile = {
      ownerId: "u1",
      learningGoal: "我想学习高中数学",
      goalGraphId: null,
      goalStartTopicId: null,
      goalPositioningStatus: "clarify",
      factsIntakeStatus: "completed",
    };
    const positionedProfile = {
      ...clarifyingProfile,
      goalGraphId: "senior_secondary_mathematics",
      goalStartTopicId: "root",
      goalPositioningStatus: "positioned",
    };
    state.getLearnerProfile.mockResolvedValue(clarifyingProfile);
    state.listActiveFacts.mockResolvedValue([
      { text: "我目前在中国大陆读高中。", category: "profile_context" },
    ]);
    state.resolveOnboardingGoalAnchor.mockResolvedValue({
      kind: "anchor",
      anchor: {
        graphId: "senior_secondary_mathematics",
        startTopicId: "root",
        targetConceptId: null,
        targetConceptIds: [],
        scope: "canonical",
      },
    });
    state.savePositionedLearningGoalFromFactsIfClarifying.mockResolvedValue(positionedProfile);
    const { buildOnboardingCourseIfReady } = await import("../src/lib/learner-profile/onboarding-course-readiness");

    await expect(buildOnboardingCourseIfReady("u1")).resolves.toEqual({ courseId: "course-1" });
    expect(state.resolveOnboardingGoalAnchor).toHaveBeenCalledWith(
      "我想学习高中数学",
      { curriculumContext: { system: null, region: "mainland_china" } },
    );
    expect(state.savePositionedLearningGoalFromFactsIfClarifying).toHaveBeenCalledWith(
      expect.objectContaining({ graphId: "senior_secondary_mathematics" }),
    );
    expect(state.buildOnboardingCourseWithStatus).toHaveBeenCalledWith("u1", positionedProfile);
  });

  it("prefers the confirmed structured curriculum over extracted facts", async () => {
    const clarifyingProfile = {
      ownerId: "u1",
      learningGoal: "I want to learn high-school mathematics",
      goalGraphId: null,
      goalStartTopicId: null,
      goalPositioningStatus: "clarify",
      factsIntakeStatus: "skipped",
      curriculumSystem: "singapore_h2",
      educationContextConfirmedAt: "2026-07-20T00:00:00.000Z",
    };
    const positionedProfile = {
      ...clarifyingProfile,
      goalGraphId: "singapore_h2_mathematics",
      goalStartTopicId: "root",
      goalPositioningStatus: "positioned",
    };
    state.getLearnerProfile.mockResolvedValue(clarifyingProfile);
    state.resolveOnboardingGoalAnchor.mockResolvedValue({
      kind: "anchor",
      anchor: {
        graphId: "singapore_h2_mathematics",
        startTopicId: "root",
        targetConceptId: null,
        targetConceptIds: [],
        scope: "canonical",
      },
    });
    state.savePositionedLearningGoalFromFactsIfClarifying.mockResolvedValue(positionedProfile);
    const { buildOnboardingCourseIfReady } = await import("../src/lib/learner-profile/onboarding-course-readiness");

    await buildOnboardingCourseIfReady("u1");

    expect(state.resolveOnboardingGoalAnchor).toHaveBeenCalledWith(
      "I want to learn high-school mathematics",
      { curriculumContext: { system: "singapore_h2", region: "singapore" } },
    );
    expect(state.listActiveFacts).not.toHaveBeenCalled();
  });

  it("keeps asking when background only narrows Singapore mathematics to multiple stages", async () => {
    state.getLearnerProfile.mockResolvedValue({
      ownerId: "u1",
      learningGoal: "I want to learn mathematics",
      goalGraphId: null,
      goalStartTopicId: null,
      goalPositioningStatus: "clarify",
      factsIntakeStatus: "completed",
    });
    state.listActiveFacts.mockResolvedValue([
      { text: "I study in Singapore.", category: "profile_context" },
    ]);
    state.resolveOnboardingGoalAnchor.mockResolvedValue({ kind: "clarify", clarify: {} });
    const { buildOnboardingCourseIfReady } = await import("../src/lib/learner-profile/onboarding-course-readiness");

    await expect(buildOnboardingCourseIfReady("u1")).resolves.toBeNull();
    expect(state.savePositionedLearningGoalFromFactsIfClarifying).not.toHaveBeenCalled();
    expect(state.buildOnboardingCourseWithStatus).not.toHaveBeenCalled();
  });
});
