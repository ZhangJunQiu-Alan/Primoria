import { randomBytes } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { courseGenerationJobs } from "../db/schema";

export type CourseGenerationJobStatus = "queued" | "running" | "completed" | "failed";

export type CourseGenerationJob = {
  id: string;
  ownerId: string;
  courseId: string;
  topic: string;
  contextHint?: string | null;
  status: CourseGenerationJobStatus;
  attempts: number;
  lastError?: string | null;
  leaseOwner?: string | null;
  leaseExpiresAt?: number | null;
  completedAt?: number | null;
  createdAt: number;
  updatedAt: number;
};

export type CourseGenerationJobSummary = Omit<CourseGenerationJob, "ownerId" | "leaseOwner" | "leaseExpiresAt" | "completedAt">;

export type EnqueueCourseGenerationJobInput = {
  ownerId: string;
  topic: string;
  contextHint?: string | null;
  courseId?: string;
};

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_LEASE_MS = 5 * 60_000;

function randomId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}${Date.now().toString(36)}`;
}

function requireDatabase() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not configured. Course generation jobs require Postgres.");
}

export async function enqueueCourseGenerationJob(input: EnqueueCourseGenerationJobInput): Promise<CourseGenerationJob> {
  requireDatabase();
  const now = new Date();
  const topic = input.topic.trim();
  if (!input.ownerId) throw new Error("ownerId is required to enqueue a course generation job.");
  if (!topic) throw new Error("topic is required to enqueue a course generation job.");

  const rows = await getDb()
    .insert(courseGenerationJobs)
    .values({
      id: randomId("cjob"),
      ownerId: input.ownerId,
      courseId: input.courseId ?? randomId("crs"),
      topic,
      contextHint: input.contextHint?.trim() || null,
      status: "queued",
      attempts: 0,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return rowToJob(rows[0]);
}

export async function listCourseGenerationJobs(ownerId?: string | null): Promise<CourseGenerationJobSummary[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(courseGenerationJobs)
    .where(sql`${courseGenerationJobs.ownerId} = ${ownerId} and ${courseGenerationJobs.status} <> 'completed'`)
    .orderBy(desc(courseGenerationJobs.updatedAt));
  return rows.map(rowToSummary);
}

export async function claimNextCourseGenerationJob({
  workerId,
  leaseMs = DEFAULT_LEASE_MS,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
}: {
  workerId: string;
  leaseMs?: number;
  maxAttempts?: number;
}): Promise<CourseGenerationJob | undefined> {
  requireDatabase();
  const now = new Date();
  const leaseExpiresAt = new Date(now.getTime() + leaseMs);
  const result = await getDb().execute(sql`
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
      lease_owner = ${workerId},
      lease_expires_at = ${leaseExpiresAt},
      updated_at = ${now}
    from candidate
    where job.id = candidate.id
    returning job.*
  `);
  return rowsFromResult(result).map(rawRowToJob)[0];
}

export async function completeCourseGenerationJob(jobId: string, courseId: string): Promise<CourseGenerationJob | undefined> {
  requireDatabase();
  const now = new Date();
  const rows = await getDb()
    .update(courseGenerationJobs)
    .set({
      status: "completed",
      courseId,
      leaseOwner: null,
      leaseExpiresAt: null,
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(courseGenerationJobs.id, jobId))
    .returning();
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

export async function failCourseGenerationJob(
  jobId: string,
  error: string,
  options: { maxAttempts?: number } = {},
): Promise<CourseGenerationJob | undefined> {
  requireDatabase();
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const current = await getDb().select().from(courseGenerationJobs).where(eq(courseGenerationJobs.id, jobId)).limit(1);
  const job = current[0];
  if (!job) return undefined;
  const now = new Date();
  const status = (job.attempts ?? 0) >= maxAttempts ? "failed" : "queued";
  const rows = await getDb()
    .update(courseGenerationJobs)
    .set({
      status,
      lastError: error.slice(0, 1_000),
      leaseOwner: null,
      leaseExpiresAt: null,
      updatedAt: now,
    })
    .where(eq(courseGenerationJobs.id, jobId))
    .returning();
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

export async function getCourseGenerationJobByCourseId(courseId: string, ownerId?: string | null): Promise<CourseGenerationJob | undefined> {
  if (!ownerId || !hasDatabaseUrl()) return undefined;
  const rows = await getDb()
    .select()
    .from(courseGenerationJobs)
    .where(sql`${courseGenerationJobs.courseId} = ${courseId} and ${courseGenerationJobs.ownerId} = ${ownerId}`)
    .limit(1);
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

function rowToSummary(row: typeof courseGenerationJobs.$inferSelect): CourseGenerationJobSummary {
  const { ownerId: _ownerId, leaseOwner: _leaseOwner, leaseExpiresAt: _leaseExpiresAt, completedAt: _completedAt, ...job } = rowToJob(row);
  return job;
}

function rowToJob(row: typeof courseGenerationJobs.$inferSelect): CourseGenerationJob {
  return {
    id: row.id,
    ownerId: row.ownerId,
    courseId: row.courseId,
    topic: row.topic,
    contextHint: row.contextHint,
    status: row.status as CourseGenerationJobStatus,
    attempts: row.attempts ?? 0,
    lastError: row.lastError,
    leaseOwner: row.leaseOwner,
    leaseExpiresAt: row.leaseExpiresAt?.getTime() ?? null,
    completedAt: row.completedAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function rawRowToJob(row: Record<string, unknown>): CourseGenerationJob {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    courseId: String(row.course_id),
    topic: String(row.topic),
    contextHint: typeof row.context_hint === "string" ? row.context_hint : null,
    status: String(row.status) as CourseGenerationJobStatus,
    attempts: Number(row.attempts ?? 0),
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    leaseOwner: typeof row.lease_owner === "string" ? row.lease_owner : null,
    leaseExpiresAt: timestampToMs(row.lease_expires_at),
    completedAt: timestampToMs(row.completed_at),
    createdAt: timestampToMs(row.created_at) ?? Date.now(),
    updatedAt: timestampToMs(row.updated_at) ?? Date.now(),
  };
}

function timestampToMs(value: unknown) {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(String(value)).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function rowsFromResult(result: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(result)) return result as Array<Record<string, unknown>>;
  const rows = (result as { rows?: unknown })?.rows;
  return Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : [];
}
