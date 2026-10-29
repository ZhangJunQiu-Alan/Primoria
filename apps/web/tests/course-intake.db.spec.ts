import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupTestDb, teardownTestDb, resetTestDb, seedUser, seedCourse, TEST_DB_AVAILABLE } from "./helpers/test-db";
import { prepareCourseIntake, submitCourseIntake, getCourseIntake, attachCourseIntake, courseIntakeTeachingContext, courseIntakePreparationKey } from "../src/lib/courses/course-intake-store";
import { invokeJson } from "../src/lib/ai/course-generation/model-json";
import { fallbackIntakeQuestions } from "../src/lib/courses/course-intake";

vi.mock("../src/lib/ai/course-generation/model-json", () => ({ invokeJson: vi.fn().mockRejectedValue(new Error("offline")) }));
const suite = process.env.RUN_COURSE_INTAKE_DB === "1" && TEST_DB_AVAILABLE ? describe : describe.skip;
suite("durable owner-scoped course background", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;
  beforeAll(async () => { sql = await setupTestDb(); });
  beforeEach(async () => { await resetTestDb(sql); await seedUser(sql, "intake_owner"); await seedUser(sql, "other_owner"); });
  afterAll(async () => { if (sql) await teardownTestDb(sql); });

  it("restores questions, enforces ownership, validates answers and freezes the first submission", async () => {
    const first = await prepareCourseIntake("intake_owner", "I want to learn Python");
    expect(first.ready).toBe(false);
    expect(first.language).toBe("en");
    expect(first.questions).toHaveLength(3);
    expect((await prepareCourseIntake("intake_owner", first.query)).id).toBe(first.id);
    expect(await getCourseIntake("other_owner", first.id)).toBeNull();
    expect(await submitCourseIntake("other_owner", first.id, {})).toBeNull();
    await expect(submitCourseIntake("intake_owner", first.id, {})).rejects.toThrow("invalid_intake_answers");
    const answers = Object.fromEntries(first.questions.map((q) => [q.id, { option: 0, detail: q.id === "background" ? "I have never programmed" : "" }]));
    const submitted = await submitCourseIntake("intake_owner", first.id, answers);
    expect(submitted?.ready).toBe(true);
    const retry = await submitCourseIntake("intake_owner", first.id, { ...answers, background: { option: 2, detail: "changed" } });
    expect(retry?.answers).toEqual(answers);
    const saved = (await getCourseIntake("intake_owner", first.id))!;
    expect(courseIntakePreparationKey(saved.row)).toBe(courseIntakePreparationKey(saved.row));
    await seedCourse(sql, { id: "intake_course", ownerId: "intake_owner" });
    await attachCourseIntake("intake_owner", first.id, "intake_course");
    expect(await courseIntakeTeachingContext("intake_owner", "intake_course")).toContain("I have never programmed");
    expect(await courseIntakeTeachingContext("other_owner", "intake_course")).toBeNull();
    const [{ count }] = await sql`select count(*)::int as count from user_concept_mastery where owner_id = 'intake_owner'`;
    expect(count).toBe(0);
  });
  it("allows sufficient explicit background through the same durable gate", async () => {
    vi.mocked(invokeJson).mockResolvedValueOnce({ backgroundEvidence: "new to programming", purposeEvidence: "for work", targetEvidence: "process CSV files", questions: fallbackIntakeQuestions("en") });
    const intake = await prepareCourseIntake("intake_owner", "I am new to programming and want Python for work to process CSV files");
    expect(intake.ready).toBe(true);
    expect(intake.answers).toEqual({});
    expect((await getCourseIntake("intake_owner", intake.id))?.intake.ready).toBe(true);
  });
  it("falls back to English questions without auto-building when the model returns Chinese", async () => {
    vi.mocked(invokeJson).mockResolvedValueOnce({ backgroundEvidence: "new to programming", purposeEvidence: "for work", targetEvidence: "process CSV files", questions: fallbackIntakeQuestions("zh") });
    const intake = await prepareCourseIntake("intake_owner", "I am new to programming and want Python for work to process CSV files");
    expect(intake.ready).toBe(false);
    expect(intake.questions).toEqual(fallbackIntakeQuestions("en"));
  });
});
