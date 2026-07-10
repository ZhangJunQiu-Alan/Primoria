import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const RAW_SQL_MESSAGE = 'relation "public.courses" does not exist';

const mockState = vi.hoisted(() => ({
  requireAuthUser: vi.fn(),
  buildOnboardingCourse: vi.fn(),
  getLearnerOnboardingState: vi.fn(),
  getLearnerProfile: vi.fn(),
  saveOnboardingCourseStatus: vi.fn(),
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
  saveOnboardingCourseStatus: mockState.saveOnboardingCourseStatus,
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
    mockState.saveOnboardingCourseStatus.mockResolvedValue({ ownerId: "u1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
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
    expect(mockState.saveOnboardingCourseStatus.mock.calls).toEqual([
      [{ ownerId: "u1", status: "building" }],
      [{ ownerId: "u1", status: "ready" }],
    ]);
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
    expect(mockState.saveOnboardingCourseStatus).toHaveBeenLastCalledWith({
      ownerId: "u1",
      status: "failed",
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
    expect(mockState.saveOnboardingCourseStatus).not.toHaveBeenCalled();
  });
});
