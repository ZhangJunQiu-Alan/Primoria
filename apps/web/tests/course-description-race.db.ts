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

const NAME = "course-description-race.db";

async function main() {
  if (skipWithoutTestDb(NAME)) return;
  const sql = await setupTestDb();
  const store = await import("../src/lib/courses/store");
  const ownerId = "course_description_race_user";
  const template = "Template description captured by a stale aggregate.";
  const enriched = "Enriched description written through the fenced update.";

  try {
    await resetTestDb(sql);
    await seedUser(sql, ownerId);

    await store.saveCourse(
      {
        id: "crs_description_race",
        title: "Concurrency",
        topic: "Concurrency",
        summary: "Initial summary",
        estimatedMinutes: 0,
        anchorConceptId: null,
        graphId: null,
        language: "en",
        lessons: [
          {
            id: "lsn_description_race",
            title: "Lost updates",
            description: template,
            role: "new",
            progress: "not_started",
            status: "planned",
            sortKey: 1,
            topicId: null,
            triggeredFrom: null,
            blocks: null,
            estimatedMinutes: null,
            version: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        ],
        archivedAt: null,
        version: 1,
        createdAt: 1,
        updatedAt: 1,
      },
      ownerId,
    );

    const staleCourse = await store.getCourse("crs_description_race", ownerId);
    ok(staleCourse?.lessons[0]?.description === template, "stale aggregate captured the template description");

    const applied = await store.updateLessonDescriptionIfUnchanged({
      lessonId: "lsn_description_race",
      courseId: "crs_description_race",
      ownerId,
      expectedDescription: template,
      description: enriched,
    });
    ok(applied, "enrichment writes the improved description");

    if (!staleCourse) throw new Error("expected stale course snapshot");
    await store.saveCourse(
      {
        ...staleCourse,
        summary: "Summary changed by the stale aggregate",
        version: staleCourse.version + 1,
        updatedAt: staleCourse.updatedAt + 1,
      },
      ownerId,
    );

    const reloaded = await store.getCourse("crs_description_race", ownerId);
    ok(reloaded?.summary === "Summary changed by the stale aggregate", "aggregate save still persists unrelated course fields");
    ok(reloaded?.lessons[0]?.description === enriched, "stale aggregate cannot restore the template description");

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
