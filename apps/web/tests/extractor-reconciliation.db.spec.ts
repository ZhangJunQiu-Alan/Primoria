import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { reconcileMissingExtractorJobs } from "../src/lib/courses/extractor-jobs";
import { TEST_DB_AVAILABLE, resetTestDb, seedCourse, seedLesson, seedUser, setupTestDb, teardownTestDb } from "./helpers/test-db";

const suite = process.env.RUN_EXTRACTOR_DB === "1" && TEST_DB_AVAILABLE ? describe : describe.skip;

suite("extractor reconciliation with stale completion events", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;
  beforeAll(async () => { sql = await setupTestDb(); });
  beforeEach(async () => {
    await resetTestDb(sql);
    await seedUser(sql, "owner");
    await seedUser(sql, "other");
    await seedCourse(sql, { id: "course", ownerId: "owner" });
    await seedCourse(sql, { id: "other_course", ownerId: "other" });
    await seedLesson(sql, { id: "lesson", courseId: "course", ownerId: "owner" });
    await seedLesson(sql, { id: "other_lesson", courseId: "other_course", ownerId: "other" });
  });
  afterAll(async () => { if (sql) await teardownTestDb(sql); });

  it("skips deleted and mismatched references before applying the batch limit, and repairs valid work once", async () => {
    await seedCourse(sql, { id: "deleted_course", ownerId: "owner" });
    await seedLesson(sql, { id: "deleted_lesson", courseId: "deleted_course", ownerId: "owner" });
    await sql`insert into learning_events (id, owner_id, type, course_id, lesson_id, graph_id, created_at) values
      ('deleted_course_event', 'owner', 'lesson.completed', 'deleted_course', 'deleted_lesson', 'graph', now() - interval '6 hours'),
      ('deleted_lesson_event', 'owner', 'lesson.completed', 'course', 'missing_lesson', 'graph', now() - interval '5 hours'),
      ('wrong_course_event', 'owner', 'lesson.completed', 'course', 'other_lesson', 'graph', now() - interval '4 hours'),
      ('wrong_owner_event', 'other', 'lesson.completed', 'course', 'lesson', 'graph', now() - interval '3 hours'),
      ('not_completed', 'owner', 'quiz.submit', 'other_course', 'other_lesson', 'graph', now() - interval '2 hours'),
      ('valid_event', 'owner', 'lesson.completed', 'course', 'lesson', 'graph', now())`;
    await sql`delete from courses where id = 'deleted_course'`;

    expect(await reconcileMissingExtractorJobs(1)).toBe(1);
    expect(await reconcileMissingExtractorJobs(1)).toBe(0);
    const jobs = await sql`select owner_id, course_id, lesson_id, graph_id, status from extractor_jobs`;
    expect([...jobs]).toEqual([{ owner_id: "owner", course_id: "course", lesson_id: "lesson", graph_id: "graph", status: "queued" }]);
    const [{ count }] = await sql`select count(*)::int as count from learning_events`;
    expect(count).toBe(6);
  });
});
