import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// N-3: after() background work has no persistence. If the process dies before
// the callback finishes, goalPositioningStatus stays "pending" (or the course
// stays "pending"/"building") forever and the done-page poll never ends.
// getLearnerOnboardingState must repair stale in-flight states to "failed".

const dbState = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  updates: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/db/client", () => {
  const selectChain = {
    select: () => selectChain,
    from: () => selectChain,
    where: () => selectChain,
    limit: async () => (dbState.row ? [dbState.row] : []),
  };
  return {
    hasDatabaseUrl: () => true,
    getDb: () => ({
      ...selectChain,
      update: () => ({
        set: (patch: Record<string, unknown>) => ({
          where: () => ({
            returning: async () => {
              dbState.updates.push(patch);
              dbState.row = { ...dbState.row, ...patch };
              return [dbState.row];
            },
          }),
        }),
      }),
    }),
  };
});

function profileRow(overrides: Record<string, unknown>) {
  return {
    ownerId: "u1",
    learningGoal: "learn python",
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: null,
    goalPositioningMessage: null,
    goalPositioningCandidates: null,
    goalPositioningUpdatedAt: null,
    onboardingCourseStatus: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    knowledgeBackground: null,
    knowledgeBackgroundSkippedAt: null,
    tutorStyle: null,
    tutorStyleSkippedAt: null,
    onboardingCompletedAt: null,
    onboardingSkippedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const TEN_MINUTES_AGO = () => new Date(Date.now() - 10 * 60 * 1000);
const JUST_NOW = () => new Date(Date.now() - 5 * 1000);

describe("stale onboarding background work recovery", () => {
  beforeEach(() => {
    dbState.row = null;
    dbState.updates = [];
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("repairs goal positioning stuck in pending past the timeout to failed", async () => {
    dbState.row = profileRow({
      goalPositioningStatus: "pending",
      goalPositioningUpdatedAt: TEN_MINUTES_AGO(),
    });
    const { getLearnerOnboardingState, GOAL_POSITIONING_INTERRUPTED_MESSAGE } = await import(
      "../src/lib/learner-profile/store"
    );

    const state = await getLearnerOnboardingState("u1");

    expect(dbState.updates).toHaveLength(1);
    expect(state.profile?.goalPositioningStatus).toBe("failed");
    expect(state.profile?.goalPositioningMessage).toBe(GOAL_POSITIONING_INTERRUPTED_MESSAGE);
    expect(state.profile?.learningGoal).toBe("learn python");
    expect(state.profile?.goalPositioningMessage).not.toMatch(/relation|sql|ECONN/i);
  });

  it("leaves a fresh pending goal positioning untouched", async () => {
    dbState.row = profileRow({
      goalPositioningStatus: "pending",
      goalPositioningUpdatedAt: JUST_NOW(),
    });
    const { getLearnerOnboardingState } = await import("../src/lib/learner-profile/store");

    const state = await getLearnerOnboardingState("u1");

    expect(dbState.updates).toHaveLength(0);
    expect(state.profile?.goalPositioningStatus).toBe("pending");
  });

  it("treats an in-flight status with a missing timestamp as stale", async () => {
    dbState.row = profileRow({
      goalPositioningStatus: "pending",
      goalPositioningUpdatedAt: null,
    });
    const { getLearnerOnboardingState } = await import("../src/lib/learner-profile/store");

    const state = await getLearnerOnboardingState("u1");

    expect(dbState.updates).toHaveLength(1);
    expect(state.profile?.goalPositioningStatus).toBe("failed");
  });

  it("repairs a course build stuck in building past the timeout to failed", async () => {
    dbState.row = profileRow({
      goalGraphId: "python_fundamentals",
      goalStartTopicId: "pyf_topic_1",
      goalPositioningStatus: "positioned",
      goalPositioningUpdatedAt: TEN_MINUTES_AGO(),
      onboardingCourseStatus: "building",
      onboardingCourseUpdatedAt: TEN_MINUTES_AGO(),
    });
    const { getLearnerOnboardingState, COURSE_BUILD_INTERRUPTED_MESSAGE } = await import(
      "../src/lib/learner-profile/store"
    );

    const state = await getLearnerOnboardingState("u1");

    expect(dbState.updates).toHaveLength(1);
    expect(state.profile?.onboardingCourseStatus).toBe("failed");
    expect(state.profile?.onboardingCourseMessage).toBe(COURSE_BUILD_INTERRUPTED_MESSAGE);
    expect(state.profile?.goalPositioningStatus).toBe("positioned");
    expect(state.complete).toBe(false);
  });

  it("repairs a course stuck in pending past the timeout to failed", async () => {
    dbState.row = profileRow({
      goalGraphId: "python_fundamentals",
      goalStartTopicId: "pyf_topic_1",
      goalPositioningStatus: "positioned",
      goalPositioningUpdatedAt: TEN_MINUTES_AGO(),
      onboardingCourseStatus: "pending",
      onboardingCourseUpdatedAt: TEN_MINUTES_AGO(),
    });
    const { getLearnerOnboardingState } = await import("../src/lib/learner-profile/store");

    const state = await getLearnerOnboardingState("u1");

    expect(state.profile?.onboardingCourseStatus).toBe("failed");
  });

  it("leaves a fresh building course untouched", async () => {
    dbState.row = profileRow({
      goalGraphId: "python_fundamentals",
      goalStartTopicId: "pyf_topic_1",
      goalPositioningStatus: "positioned",
      goalPositioningUpdatedAt: JUST_NOW(),
      onboardingCourseStatus: "building",
      onboardingCourseUpdatedAt: JUST_NOW(),
    });
    const { getLearnerOnboardingState } = await import("../src/lib/learner-profile/store");

    const state = await getLearnerOnboardingState("u1");

    expect(dbState.updates).toHaveLength(0);
    expect(state.profile?.onboardingCourseStatus).toBe("building");
  });

  it("does not touch terminal states regardless of age", async () => {
    dbState.row = profileRow({
      goalGraphId: "python_fundamentals",
      goalStartTopicId: "pyf_topic_1",
      goalPositioningStatus: "positioned",
      goalPositioningUpdatedAt: TEN_MINUTES_AGO(),
      onboardingCourseStatus: "ready",
      onboardingCourseUpdatedAt: TEN_MINUTES_AGO(),
    });
    const { getLearnerOnboardingState } = await import("../src/lib/learner-profile/store");

    const state = await getLearnerOnboardingState("u1");

    expect(dbState.updates).toHaveLength(0);
    expect(state.profile?.onboardingCourseStatus).toBe("ready");
    expect(state.complete).toBe(false);
  });
});
