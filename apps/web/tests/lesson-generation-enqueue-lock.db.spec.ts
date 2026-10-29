import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { enqueueLessonGenerationJob, claimNextLessonGenerationJob } from "../src/lib/courses/lesson-generation-jobs";
import { resetTestDb, seedCourse, seedLesson, seedUser, setupTestDb, teardownTestDb, TEST_DB_AVAILABLE } from "./helpers/test-db";

const suite = process.env.RUN_LESSON_ENQUEUE_LOCK_DB === "1" && TEST_DB_AVAILABLE ? describe : describe.skip;

suite("lesson enqueue during worker publication", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;
  const input = { ownerId: "enqueue_lock_owner", courseId: "enqueue_lock_course", lessonId: "enqueue_lock_lesson" };

  beforeAll(async () => { sql = await setupTestDb(); });
  beforeEach(async () => {
    await resetTestDb(sql);
    await seedUser(sql, input.ownerId);
    await seedCourse(sql, { id: input.courseId, ownerId: input.ownerId });
    await seedLesson(sql, { id: input.lessonId, courseId: input.courseId, ownerId: input.ownerId });
  });
  afterAll(async () => {
    await resetTestDb(sql);
    await teardownTestDb(sql);
  });

  it.each(["queued", "running"] as const)("reuses a %s job while the worker holds its row lock", async (status) => {
    const initial = await enqueueLessonGenerationJob(input);
    if (status === "running") await claimNextLessonGenerationJob({ workerId: "enqueue_lock_worker" });
    let releaseWorker!: () => void;
    let locked!: () => void;
    const held = new Promise<void>((resolve) => { locked = resolve; });
    const release = new Promise<void>((resolve) => { releaseWorker = resolve; });
    const worker = sql.begin(async (tx) => {
      await tx`select id from lesson_generation_jobs where lesson_id=${input.lessonId} for update`;
      locked();
      await release;
      await tx`update lessons set blocks='[]'::jsonb where id=${input.lessonId}`;
    });
    await held;
    const enqueue = enqueueLessonGenerationJob(input);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        enqueue,
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Active enqueue waited for the worker job lock")), 2_000); }),
      ]);
      expect(result.kind).toBe(status);
      expect(result.job?.id).toBe(initial.job?.id);
    } finally {
      clearTimeout(timer);
      releaseWorker();
      await Promise.allSettled([worker, enqueue]);
    }
    const [count] = await sql`select count(*)::int n from lesson_generation_jobs where lesson_id=${input.lessonId}`;
    expect(count.n).toBe(1);
  });
});
