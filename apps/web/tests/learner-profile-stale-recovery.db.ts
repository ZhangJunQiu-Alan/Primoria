#!/usr/bin/env tsx

// N-3: after() background work has no persistence. These checks run against a
// real Postgres to prove the stale-pending repair UPDATEs fence correctly and
// never clobber fresh in-flight work.

import {
  finish,
  ok,
  resetTestDb,
  seedUser,
  setupTestDb,
  skipWithoutTestDb,
  teardownTestDb,
} from "./helpers/test-db";

const NAME = "learner-profile-stale-recovery.db";

async function main() {
  if (skipWithoutTestDb(NAME)) return;
  const sql = await setupTestDb();
  const store = await import("../src/lib/learner-profile/store");
  const ownerId = "stale_recovery_user";

  try {
    await resetTestDb(sql);
    await seedUser(sql, ownerId);

    // Fresh pending goal is left alone.
    const pendingAttempt = await store.savePendingLearningGoal(ownerId, "learn python");
    let state = await store.getLearnerOnboardingState(ownerId);
    ok(state.profile?.goalPositioningStatus === "pending", "fresh pending goal positioning is not repaired");

    // Backdate the pending goal past the timeout → repaired to failed.
    await sql`update learner_profiles set goal_positioning_updated_at = now() - interval '10 minutes'
              where owner_id = ${ownerId}`;
    state = await store.getLearnerOnboardingState(ownerId);
    ok(state.profile?.goalPositioningStatus === "failed", "stale pending goal positioning is repaired to failed");
    ok(
      state.profile?.goalPositioningMessage === store.GOAL_POSITIONING_INTERRUPTED_MESSAGE,
      "repair writes the curated interruption message",
    );
    ok(state.profile?.learningGoal === "learn python", "repair keeps the learner's goal text for retry");

    // A zombie background callback that finishes after the repair is fenced out.
    const zombie = await store.savePositionedLearningGoalIfPending({
      ownerId,
      learningGoal: "learn python",
      attemptId: pendingAttempt.attemptId,
      graphId: "python_fundamentals",
      startTopicId: "pyf_topic_running_python_programs",
      targetConceptId: null,
    });
    ok(zombie === null, "zombie positioning result after repair affects zero rows");

    // Stale building course → repaired to failed; positioned goal untouched.
    await store.saveLearningGoal({
      ownerId,
      learningGoal: "learn python",
      graphId: "python_fundamentals",
      startTopicId: "pyf_topic_running_python_programs",
      targetConceptId: null,
    });
    const staleCourseAttempt = await store.beginOnboardingCourseBuild(ownerId);
    state = await store.getLearnerOnboardingState(ownerId);
    ok(state.profile?.onboardingCourseStatus === "building", "fresh building course is not repaired");

    await sql`update learner_profiles set onboarding_course_updated_at = now() - interval '10 minutes'
              where owner_id = ${ownerId}`;
    state = await store.getLearnerOnboardingState(ownerId);
    ok(state.profile?.onboardingCourseStatus === "failed", "stale building course is repaired to failed");
    ok(
      state.profile?.onboardingCourseMessage === store.COURSE_BUILD_INTERRUPTED_MESSAGE,
      "course repair writes the curated interruption message",
    );
    ok(state.profile?.goalPositioningStatus === "positioned", "course repair leaves the positioned goal intact");
    ok(state.complete === false, "repaired failed course keeps onboarding incomplete");

    const zombieCompletion = await store.completeOnboardingCourseBuild({
      ownerId,
      attemptId: staleCourseAttempt.attemptId,
    });
    ok(zombieCompletion === null, "timed-out build cannot complete after stale recovery");

    const retryCourseAttempt = await store.beginOnboardingCourseBuild(ownerId);
    const retryCompletion = await store.completeOnboardingCourseBuild({
      ownerId,
      attemptId: retryCourseAttempt.attemptId,
    });
    ok(retryCompletion?.onboardingCourseStatus === "ready", "current retry can transition building to ready");

    const zombieFailure = await store.failOnboardingCourseBuild({
      ownerId,
      attemptId: staleCourseAttempt.attemptId,
      message: "stale failure",
    });
    ok(zombieFailure === null, "older failed build cannot overwrite a newer successful build");
    state = await store.getLearnerOnboardingState(ownerId);
    ok(state.profile?.onboardingCourseStatus === "ready", "newer successful build remains ready");

    await resetTestDb(sql);
  } finally {
    await teardownTestDb(sql);
  }

  finish(NAME);
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
