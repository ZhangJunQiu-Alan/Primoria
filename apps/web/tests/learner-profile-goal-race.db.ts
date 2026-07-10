#!/usr/bin/env tsx

import {
  finish,
  ok,
  resetTestDb,
  seedUser,
  setupTestDb,
  skipWithoutTestDb,
  teardownTestDb,
} from "./helpers/test-db";

const NAME = "learner-profile-goal-race.db";

async function main() {
  if (skipWithoutTestDb(NAME)) return;
  const sql = await setupTestDb();
  const store = await import("../src/lib/learner-profile/store");
  const ownerId = "goal_race_user";

  try {
    await resetTestDb(sql);
    await seedUser(sql, ownerId);

    const oldAttempt = await store.savePendingLearningGoal(ownerId, "old mechanics goal");
    const newAttempt = await store.savePendingLearningGoal(ownerId, "new Python goal");

    const stalePositioned = await store.savePositionedLearningGoalIfPending({
      ownerId,
      learningGoal: "old mechanics goal",
      attemptId: oldAttempt.attemptId,
      graphId: "physics",
      startTopicId: "mechanics",
      targetConceptId: null,
    });
    const staleClarification = await store.saveLearningGoalClarification({
      ownerId,
      learningGoal: "old mechanics goal",
      attemptId: oldAttempt.attemptId,
      message: "Choose a physics subject.",
      candidates: [{ graphId: "physics", subject: "Physics", startTopicId: "mechanics" }],
    });
    const staleFailure = await store.saveLearningGoalPositioningFailure({
      ownerId,
      learningGoal: "old mechanics goal",
      attemptId: oldAttempt.attemptId,
      message: "Could not locate that goal. Please retry.",
    });

    ok(stalePositioned === null, "stale positioned result affects zero rows");
    ok(staleClarification === null, "stale clarification affects zero rows");
    ok(staleFailure === null, "stale failure affects zero rows");

    const pending = await store.getLearnerProfile(ownerId);
    ok(pending?.learningGoal === "new Python goal", "newer goal remains current");
    ok(pending?.goalPositioningStatus === "pending", "newer goal remains pending");
    ok(pending?.goalGraphId === null, "stale result cannot attach its graph");

    const positioned = await store.savePositionedLearningGoalIfPending({
      ownerId,
      learningGoal: "new Python goal",
      attemptId: newAttempt.attemptId,
      graphId: "python_fundamentals",
      startTopicId: "pyf_topic_running_python_programs",
      targetConceptId: null,
    });
    ok(positioned?.goalPositioningStatus === "positioned", "current pending goal can be positioned");
    ok(positioned?.goalGraphId === "python_fundamentals", "current goal receives its own graph");

    const ambiguousAttempt = await store.savePendingLearningGoal(ownerId, "ambiguous science goal");
    const clarified = await store.saveLearningGoalClarification({
      ownerId,
      learningGoal: "ambiguous science goal",
      attemptId: ambiguousAttempt.attemptId,
      message: "Choose a subject.",
      candidates: [{ graphId: "physics", subject: "Physics", startTopicId: "mechanics" }],
    });
    ok(clarified?.goalPositioningStatus === "clarify", "current pending goal can request clarification");

    const selected = await store.saveLearningGoal({
      ownerId,
      learningGoal: "ambiguous science goal",
      graphId: "physics",
      startTopicId: "mechanics",
      targetConceptId: null,
    });
    ok(selected.goalPositioningStatus === "positioned", "explicit subject selection still commits");
    ok(selected.goalGraphId === "physics", "explicit subject selection keeps the chosen graph");

    const sameTextAttemptA = await store.savePendingLearningGoal(ownerId, "learn Python basics");
    await sql`update learner_profiles set goal_positioning_status = 'failed' where owner_id = ${ownerId}`;
    const sameTextAttemptB = await store.savePendingLearningGoal(ownerId, "learn Python basics");
    ok(sameTextAttemptA.attemptId !== sameTextAttemptB.attemptId, "same-text retries receive distinct attempt IDs");

    const staleSameTextResult = await store.savePositionedLearningGoalIfPending({
      ownerId,
      learningGoal: "learn Python basics",
      attemptId: sameTextAttemptA.attemptId,
      graphId: "physics",
      startTopicId: "mechanics",
      targetConceptId: null,
    });
    ok(staleSameTextResult === null, "attempt A cannot write after same-text attempt B starts");

    const currentSameTextResult = await store.savePositionedLearningGoalIfPending({
      ownerId,
      learningGoal: "learn Python basics",
      attemptId: sameTextAttemptB.attemptId,
      graphId: "python_fundamentals",
      startTopicId: "pyf_topic_running_python_programs",
      targetConceptId: null,
    });
    ok(currentSameTextResult?.goalGraphId === "python_fundamentals", "attempt B retains write authority");

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
