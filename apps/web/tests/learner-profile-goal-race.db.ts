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

    await store.savePendingLearningGoal(ownerId, "old mechanics goal");
    await store.savePendingLearningGoal(ownerId, "new Python goal");

    const stalePositioned = await store.savePositionedLearningGoalIfPending({
      ownerId,
      learningGoal: "old mechanics goal",
      graphId: "physics",
      startTopicId: "mechanics",
      targetConceptId: null,
    });
    const staleClarification = await store.saveLearningGoalClarification({
      ownerId,
      learningGoal: "old mechanics goal",
      message: "Choose a physics subject.",
      candidates: [{ graphId: "physics", subject: "Physics", startTopicId: "mechanics" }],
    });
    const staleFailure = await store.saveLearningGoalPositioningFailure({
      ownerId,
      learningGoal: "old mechanics goal",
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
      graphId: "python_fundamentals",
      startTopicId: "pyf_topic_running_python_programs",
      targetConceptId: null,
    });
    ok(positioned?.goalPositioningStatus === "positioned", "current pending goal can be positioned");
    ok(positioned?.goalGraphId === "python_fundamentals", "current goal receives its own graph");

    await store.savePendingLearningGoal(ownerId, "ambiguous science goal");
    const clarified = await store.saveLearningGoalClarification({
      ownerId,
      learningGoal: "ambiguous science goal",
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
