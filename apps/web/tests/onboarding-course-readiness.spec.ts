import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  getLearnerProfile: vi.fn(),
  buildOnboardingCourseWithStatus: vi.fn(),
}));

vi.mock("@/lib/learner-profile/store", () => ({
  getLearnerProfile: state.getLearnerProfile,
}));

vi.mock("@/lib/learner-profile/onboarding-course-build", () => ({
  buildOnboardingCourseWithStatus: state.buildOnboardingCourseWithStatus,
}));

describe("onboarding course readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
