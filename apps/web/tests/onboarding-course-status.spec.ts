import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LearnerProfile } from "../src/lib/learner-profile/types";

const RAW_SQL_MESSAGE = 'relation "public.courses" does not exist';
const COURSE_ATTEMPT_ID = "course-attempt-a";

const mockState = vi.hoisted(() => ({
  requireAuthUser: vi.fn(),
  buildOnboardingCourse: vi.fn(),
  getLearnerOnboardingState: vi.fn(),
  getLearnerProfile: vi.fn(),
  beginOnboardingCourseBuild: vi.fn(),
  completeOnboardingCourseBuild: vi.fn(),
  failOnboardingCourseBuild: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({
  requireAuthUser: mockState.requireAuthUser,
}));

vi.mock("@/lib/learner-profile/onboarding-course", () => ({
  buildOnboardingCourse: mockState.buildOnboardingCourse,
}));

vi.mock("@/lib/learner-profile/store", () => ({
  getLearnerOnboardingState: mockState.getLearnerOnboardingState,
  getLearnerProfile: mockState.getLearnerProfile,
  beginOnboardingCourseBuild: mockState.beginOnboardingCourseBuild,
  completeOnboardingCourseBuild: mockState.completeOnboardingCourseBuild,
  failOnboardingCourseBuild: mockState.failOnboardingCourseBuild,
}));

describe("onboarding course build status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.requireAuthUser.mockResolvedValue({ denied: null, user: { id: "u1" } });
    mockState.getLearnerProfile.mockResolvedValue({
      ownerId: "u1",
      goalGraphId: "physics",
      goalStartTopicId: "mechanics",
    });
    mockState.getLearnerOnboardingState.mockResolvedValue({
      profile: { ownerId: "u1", onboardingCourseStatus: "ready" },
      nextStep: "done",
      complete: true,
    });
    mockState.beginOnboardingCourseBuild.mockResolvedValue({
      attemptId: COURSE_ATTEMPT_ID,
      profile: { ownerId: "u1" },
    });
    mockState.completeOnboardingCourseBuild.mockResolvedValue({ ownerId: "u1" });
    mockState.failOnboardingCourseBuild.mockResolvedValue({ ownerId: "u1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists building then ready when retry succeeds", async () => {
    mockState.buildOnboardingCourse.mockResolvedValue({
      courseId: "crs_1",
      lessonId: "lsn_1",
      job: null,
      summary: null,
    });
    const { POST } = await import("../src/app/api/onboarding/course/route");

    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      complete: true,
      course: { courseId: "crs_1", lessonId: "lsn_1" },
    });
    expect(mockState.beginOnboardingCourseBuild).toHaveBeenCalledWith("u1");
    expect(mockState.completeOnboardingCourseBuild).toHaveBeenCalledWith({
      ownerId: "u1",
      attemptId: COURSE_ATTEMPT_ID,
    });
    expect(mockState.failOnboardingCourseBuild).not.toHaveBeenCalled();
  });

  it("persists only a safe failure and returns a retryable response", async () => {
    mockState.buildOnboardingCourse.mockRejectedValue(Object.assign(new Error(RAW_SQL_MESSAGE), { code: "42P01" }));
    const { POST } = await import("../src/app/api/onboarding/course/route");

    const response = await POST();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({
      error: "We couldn't prepare your course right now. Please retry.",
      code: "onboarding_course_failed",
    });
    expect(JSON.stringify(body)).not.toContain("public.courses");
    expect(mockState.failOnboardingCourseBuild).toHaveBeenLastCalledWith({
      ownerId: "u1",
      attemptId: COURSE_ATTEMPT_ID,
      message: "We couldn't prepare your course right now. Please retry.",
    });
    expect(console.error).toHaveBeenCalledWith(
      "[onboarding] course prebuild failed",
      expect.objectContaining({ ownerId: "u1", code: "onboarding_course_failed" }),
    );
  });

  it("rejects retry when no positioned goal exists", async () => {
    mockState.getLearnerProfile.mockResolvedValue({ ownerId: "u1", goalGraphId: null, goalStartTopicId: null });
    const { POST } = await import("../src/app/api/onboarding/course/route");

    const response = await POST();
    expect(response.status).toBe(409);
    expect(mockState.buildOnboardingCourse).not.toHaveBeenCalled();
    expect(mockState.beginOnboardingCourseBuild).not.toHaveBeenCalled();
    expect(mockState.completeOnboardingCourseBuild).not.toHaveBeenCalled();
    expect(mockState.failOnboardingCourseBuild).not.toHaveBeenCalled();
  });

  it("does not let an older failed build overwrite a newer successful build", async () => {
    let activeAttemptId: string | null = null;
    let courseStatus: "building" | "ready" | "failed" | null = null;
    let attemptSequence = 0;
    let rejectFirstBuild!: (reason: unknown) => void;

    mockState.beginOnboardingCourseBuild.mockImplementation(async () => {
      attemptSequence += 1;
      activeAttemptId = `course-attempt-${attemptSequence}`;
      courseStatus = "building";
      return { attemptId: activeAttemptId, profile: { ownerId: "u1" } };
    });
    mockState.completeOnboardingCourseBuild.mockImplementation(async ({ attemptId }: { attemptId: string }) => {
      if (attemptId !== activeAttemptId || courseStatus !== "building") return null;
      courseStatus = "ready";
      return { ownerId: "u1" };
    });
    mockState.failOnboardingCourseBuild.mockImplementation(async ({ attemptId }: { attemptId: string }) => {
      if (attemptId !== activeAttemptId || courseStatus !== "building") return null;
      courseStatus = "failed";
      return { ownerId: "u1" };
    });
    mockState.buildOnboardingCourse
      .mockImplementationOnce(
        () => new Promise((_, reject) => {
          rejectFirstBuild = reject;
        }),
      )
      .mockResolvedValueOnce({ courseId: "crs_1", lessonId: "lsn_1", job: null, summary: null });

    const { buildOnboardingCourseWithStatus, OnboardingCourseBuildError } = await import(
      "../src/lib/learner-profile/onboarding-course-build"
    );
    const profile = { goalGraphId: "physics", goalStartTopicId: "mechanics" } as LearnerProfile;
    const firstResult = buildOnboardingCourseWithStatus("u1", profile).catch((error) => error);
    await vi.waitFor(() => expect(mockState.buildOnboardingCourse).toHaveBeenCalledTimes(1));

    await buildOnboardingCourseWithStatus("u1", profile);
    rejectFirstBuild(Object.assign(new Error(RAW_SQL_MESSAGE), { code: "42P01" }));

    expect(await firstResult).toBeInstanceOf(OnboardingCourseBuildError);
    expect(courseStatus).toBe("ready");
    expect(mockState.failOnboardingCourseBuild).toHaveBeenCalledWith({
      ownerId: "u1",
      attemptId: "course-attempt-1",
      message: "We couldn't prepare your course right now. Please retry.",
    });
    expect(console.info).toHaveBeenCalledWith(
      "[onboarding] ignored stale course build failure",
      { ownerId: "u1", attemptId: "course-attempt-1" },
    );
  });
});
