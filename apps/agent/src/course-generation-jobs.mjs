// @ts-check

import postgres from "postgres";
import { generateCourse } from "./course-generator.mjs";

const DEFAULT_LEASE_MS = Number(process.env.PRIMORIA_COURSE_JOB_LEASE_MS ?? 5 * 60_000);
const DEFAULT_POLL_MS = Number(process.env.PRIMORIA_COURSE_JOB_POLL_MS ?? 2_500);
const DEFAULT_MAX_ATTEMPTS = Number(process.env.PRIMORIA_COURSE_JOB_MAX_ATTEMPTS ?? 2);
const workerId = `course_worker_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

let workerStarted = false;

const dbGlobalKey = "__primoria_agent_course_jobs_postgres__";
function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const globalAny = /** @type {any} */ (globalThis);
  if (!globalAny[dbGlobalKey]) {
    globalAny[dbGlobalKey] = postgres(url, { max: 1, prepare: false });
  }
  return /** @type {postgres.Sql} */ (globalAny[dbGlobalKey]);
}

/**
 * @param {string} prefix
 */
function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function requireSql() {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured. Course generation jobs require Postgres.");
  return sql;
}

/**
 * @param {{ ownerId?: string | null; topic: string; contextHint?: string | null; courseId?: string }} input
 */
export async function enqueueCourseGenerationJob(input) {
  if (!input.ownerId) throw new Error("Missing primoria_owner_id. Sign in before generating courses.");
  const topic = String(input.topic ?? "").trim();
  if (!topic) throw new Error("Course topic is required.");
  const sql = requireSql();
  const now = new Date();
  const rows = await sql`
    insert into course_generation_jobs (
      id, owner_id, course_id, topic, context_hint, status, attempts,
      created_at, updated_at
    ) values (
      ${randomId("cjob")}, ${input.ownerId}, ${input.courseId ?? randomId("crs")},
      ${topic}, ${input.contextHint?.trim() || null}, 'queued', 0,
      ${now}, ${now}
    )
    returning *
  `;
  return rowToJob(rows[0]);
}

/**
 * @param {{ workerId?: string; leaseMs?: number; maxAttempts?: number }} [options]
 */
export async function claimNextCourseGenerationJob(options = {}) {
  const sql = requireSql();
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + (options.leaseMs ?? DEFAULT_LEASE_MS));
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const rows = await sql`
    with candidate as (
      select id
      from course_generation_jobs
      where status = 'queued'
        or (
          status = 'running'
          and lease_expires_at is not null
          and lease_expires_at < ${now}
          and attempts < ${maxAttempts}
        )
      order by created_at asc
      for update skip locked
      limit 1
    )
    update course_generation_jobs as job
    set
      status = 'running',
      attempts = job.attempts + 1,
      lease_owner = ${options.workerId ?? workerId},
      lease_expires_at = ${leaseExpiresAt},
      updated_at = ${now}
    from candidate
    where job.id = candidate.id
    returning job.*
  `;
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

/**
 * @param {string} jobId
 * @param {string} courseId
 */
export async function completeCourseGenerationJob(jobId, courseId) {
  const sql = requireSql();
  const now = new Date();
  const rows = await sql`
    update course_generation_jobs
    set
      status = 'completed',
      course_id = ${courseId},
      lease_owner = null,
      lease_expires_at = null,
      completed_at = ${now},
      updated_at = ${now}
    where id = ${jobId}
    returning *
  `;
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

/**
 * @param {string} jobId
 * @param {unknown} error
 * @param {{ maxAttempts?: number }} [options]
 */
export async function failCourseGenerationJob(jobId, error, options = {}) {
  const sql = requireSql();
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const rows = await sql`select attempts from course_generation_jobs where id = ${jobId} limit 1`;
  const attempts = Number(rows[0]?.attempts ?? 0);
  const nextStatus = attempts >= maxAttempts ? "failed" : "queued";
  const now = new Date();
  const updated = await sql`
    update course_generation_jobs
    set
      status = ${nextStatus},
      last_error = ${String(error ?? "Course generation failed.").slice(0, 1000)},
      lease_owner = null,
      lease_expires_at = null,
      updated_at = ${now}
    where id = ${jobId}
    returning *
  `;
  return updated[0] ? rowToJob(updated[0]) : undefined;
}

/**
 * @param {() => { invoke: Function; withStructuredOutput?: Function }} modelFactory
 */
export function ensureCourseGenerationWorker(modelFactory) {
  if (workerStarted || !process.env.DATABASE_URL) return workerStarted;
  workerStarted = true;
  void workerLoop(modelFactory);
  return true;
}

/**
 * @param {() => { invoke: Function; withStructuredOutput?: Function }} modelFactory
 */
async function workerLoop(modelFactory) {
  while (workerStarted) {
    try {
      const didWork = await processNextJob(modelFactory);
      await sleep(didWork ? 250 : DEFAULT_POLL_MS);
    } catch (error) {
      console.error("[course-generation-worker] loop failed", error);
      await sleep(DEFAULT_POLL_MS);
    }
  }
}

/**
 * @param {() => { invoke: Function; withStructuredOutput?: Function }} modelFactory
 */
async function processNextJob(modelFactory) {
  const job = await claimNextCourseGenerationJob({ workerId });
  if (!job) return false;

  try {
    const { course } = await generateCourse(
      { topic: job.topic, contextHint: job.contextHint ?? undefined },
      modelFactory(),
      { ownerId: job.ownerId, courseId: job.courseId },
    );
    await completeCourseGenerationJob(job.id, course.id);
  } catch (error) {
    console.error("[course-generation-worker] job failed", job.id, error);
    await failCourseGenerationJob(job.id, error instanceof Error ? error.message : String(error));
  }
  return true;
}

/**
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {any} row
 */
function rowToJob(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    courseId: row.course_id,
    topic: row.topic,
    contextHint: row.context_hint,
    status: row.status,
    attempts: Number(row.attempts ?? 0),
    lastError: row.last_error,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}
