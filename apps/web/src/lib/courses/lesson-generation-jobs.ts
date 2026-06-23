import { randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { courses as coursesTable, lessons as lessonsTable, lessonGenerationCheckpoints, lessonGenerationJobs } from "../db/schema";
import type { CourseBlock } from "./types";
import type { CheckpointVersions } from "../ai/course-generation/versions";
import type { GenerationErrorCategory } from "../ai/course-generation/generation-errors";

// Recoverable lesson-generation job store (engineering doc §5–§10). Every worker
// mutation is fenced by the active (status=running, lease_owner, lease_token,
// unexpired-lease) tuple so a worker that lost its lease can never publish.
// Lease comparisons use database time, never application process time.

export type LessonGenerationJobStatus = "queued" | "running" | "completed" | "failed";

export type LessonGenerationStage =
  | "queued"
  | "planning"
  | "writing"
  | "validating"
  | "saving"
  | "completed"
  | "failed";

export type LessonGenerationJob = {
  id: string;
  ownerId: string;
  courseId: string;
  lessonId: string;
  status: LessonGenerationJobStatus;
  stage: LessonGenerationStage;
  attempts: number;
  maxAttempts: number;
  progressCompleted: number;
  progressTotal: number;
  leaseOwner: string | null;
  leaseToken: string | null;
  leaseExpiresAt: number | null;
  heartbeatAt: number | null;
  lastError: string | null;
  errorCategory: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

/** Owner-facing projection (doc §5): never exposes ownerId, lease internals, or
 * checkpoint payloads. */
export type LessonGenerationJobSummary = {
  id: string;
  courseId: string;
  lessonId: string;
  status: LessonGenerationJobStatus;
  stage: LessonGenerationStage;
  attempts: number;
  maxAttempts: number;
  progressCompleted: number;
  progressTotal: number;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

export type LessonGenerationClaim = {
  job: LessonGenerationJob;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: number;
};

export type EnqueueLessonGenerationJobInput = {
  ownerId: string;
  courseId: string;
  lessonId: string;
};

export type EnqueueLessonGenerationJobResult =
  | { kind: "queued" | "running" | "retried"; job: LessonGenerationJob }
  | { kind: "already_generated"; job: LessonGenerationJob | null };

export type LessonGenerationCheckpoint = {
  checkpointKey: string;
  kind: "plan" | "batch";
  payload: unknown;
  versions: CheckpointVersions;
};

export const LEASE_DURATION_MS = 5 * 60_000;
export const HEARTBEAT_INTERVAL_MS = 60_000;
export const MAX_WORKER_ATTEMPTS = 2;
export const WORKER_IDLE_POLL_MS = 2_500;
const LEASE_SECONDS = LEASE_DURATION_MS / 1_000;

// Lease expiry is always derived from database time (doc §7.1).
const leaseExpiryExpr = sql.raw(`now() + interval '${LEASE_SECONDS} seconds'`);

function randomId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}${Date.now().toString(36)}`;
}

function newLeaseToken() {
  return randomBytes(24).toString("base64url");
}

function requireDatabase() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not configured. Lesson generation jobs require Postgres.");
}

// ── Enqueue ────────────────────────────────────────────────────────────────

/** Idempotently enqueue (or manually retry) a lesson job (doc §6). Runs in a
 * transaction that locks and ownership-validates the lesson. */
export async function enqueueLessonGenerationJob(
  input: EnqueueLessonGenerationJobInput,
): Promise<EnqueueLessonGenerationJobResult> {
  requireDatabase();
  const { ownerId, courseId, lessonId } = input;
  if (!ownerId || !courseId || !lessonId) throw new Error("ownerId, courseId and lessonId are required to enqueue a lesson job.");

  return getDb().transaction(async (tx) => {
    const lessonRows = await tx.select().from(lessonsTable).where(eq(lessonsTable.id, lessonId)).for("update");
    const lesson = lessonRows[0];
    if (!lesson || lesson.ownerId !== ownerId || lesson.courseId !== courseId) {
      throw new Error("Lesson not found");
    }

    const existingRows = await tx.select().from(lessonGenerationJobs).where(eq(lessonGenerationJobs.lessonId, lessonId)).for("update");
    const existing = existingRows[0] ? rowToJob(existingRows[0]) : null;

    if (lesson.status === "generated") {
      return { kind: "already_generated", job: existing };
    }

    if (existing && (existing.status === "queued" || existing.status === "running")) {
      return { kind: existing.status, job: existing };
    }

    const now = new Date();

    if (existing && existing.status === "failed") {
      // Manual retry: reuse the row, reset the attempt budget, clear visible
      // error and lease fields, preserve compatible checkpoints (doc §6/§10.5).
      const rows = await tx
        .update(lessonGenerationJobs)
        .set({
          status: "queued",
          stage: "queued",
          attempts: 0,
          progressCompleted: 0,
          progressTotal: 0,
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          heartbeatAt: null,
          lastError: null,
          errorCategory: null,
          completedAt: null,
          updatedAt: now,
        })
        .where(eq(lessonGenerationJobs.id, existing.id))
        .returning();
      await tx.update(lessonsTable).set({ status: "generating", updatedAt: now }).where(eq(lessonsTable.id, lessonId));
      return { kind: "retried", job: rowToJob(rows[0]) };
    }

    const rows = await tx
      .insert(lessonGenerationJobs)
      .values({
        id: randomId("ljob"),
        ownerId,
        courseId,
        lessonId,
        status: "queued",
        stage: "queued",
        attempts: 0,
        maxAttempts: MAX_WORKER_ATTEMPTS,
        progressCompleted: 0,
        progressTotal: 0,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    await tx.update(lessonsTable).set({ status: "generating", updatedAt: now }).where(eq(lessonsTable.id, lessonId));
    return { kind: "queued", job: rowToJob(rows[0]) };
  });
}

// ── Claim & lease ────────────────────────────────────────────────────────────

/** Atomically claim one eligible job with FOR UPDATE SKIP LOCKED (doc §7.1).
 * Eligible: queued, or running with an expired lease and remaining attempts. */
export async function claimNextLessonGenerationJob({ workerId }: { workerId: string }): Promise<LessonGenerationClaim | undefined> {
  requireDatabase();

  // Fail any expired jobs that have exhausted their retry budget.
  await getDb().execute(sql`
    with expired as (
      select id, lesson_id
      from lesson_generation_jobs
      where status = 'running'
        and lease_expires_at is not null
        and lease_expires_at < now()
        and attempts >= max_attempts
      for update
    ),
    failed_jobs as (
      update lesson_generation_jobs
      set
        status = 'failed',
        stage = 'failed',
        last_error = 'Lease expired and attempts exhausted.',
        error_category = 'lease_lost',
        lease_owner = null,
        lease_token = null,
        lease_expires_at = null,
        completed_at = now(),
        updated_at = now()
      where id in (select id from expired)
    )
    update lessons
    set status = 'planned', updated_at = now()
    where id in (select lesson_id from expired)
      and status = 'generating'
  `);

  const leaseToken = newLeaseToken();
  const result = await getDb().execute(sql`
    with candidate as (
      select id
      from lesson_generation_jobs
      where status = 'queued'
        or (
          status = 'running'
          and lease_expires_at is not null
          and lease_expires_at < now()
          and attempts < max_attempts
        )
      order by created_at asc
      for update skip locked
      limit 1
    )
    update lesson_generation_jobs as job
    set
      status = 'running',
      attempts = job.attempts + 1,
      lease_owner = ${workerId},
      lease_token = ${leaseToken},
      lease_expires_at = now() + interval '${sql.raw(String(LEASE_SECONDS))} seconds',
      heartbeat_at = now(),
      started_at = coalesce(job.started_at, now()),
      updated_at = now()
    from candidate
    where job.id = candidate.id
    returning job.*
  `);
  const row = rowsFromResult(result).map(rawRowToJob)[0];
  if (!row) return undefined;
  return { job: row, workerId, leaseToken, leaseExpiresAt: row.leaseExpiresAt ?? Date.now() + LEASE_DURATION_MS };
}

/** Renew the lease (doc §7.2). Returns true only when the fenced row updated. */
export async function renewLessonGenerationLease(jobId: string, workerId: string, leaseToken: string): Promise<boolean> {
  requireDatabase();
  const rows = await getDb()
    .update(lessonGenerationJobs)
    .set({ leaseExpiresAt: leaseExpiryExpr, heartbeatAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(lessonGenerationJobs.id, jobId),
        eq(lessonGenerationJobs.status, "running"),
        eq(lessonGenerationJobs.leaseOwner, workerId),
        eq(lessonGenerationJobs.leaseToken, leaseToken),
        sql`${lessonGenerationJobs.leaseExpiresAt} > now()`,
      ),
    )
    .returning({ id: lessonGenerationJobs.id });
  return rows.length > 0;
}

// ── Fenced worker mutations ──────────────────────────────────────────────────

type Fence = { jobId: string; workerId: string; leaseToken: string };

function fencedWhere({ jobId, workerId, leaseToken }: Fence) {
  return and(
    eq(lessonGenerationJobs.id, jobId),
    eq(lessonGenerationJobs.status, "running"),
    eq(lessonGenerationJobs.leaseOwner, workerId),
    eq(lessonGenerationJobs.leaseToken, leaseToken),
    sql`${lessonGenerationJobs.leaseExpiresAt} > now()`,
  );
}

/** Fenced stage / progress write (doc §7.3). */
export async function updateLessonGenerationStage(
  fence: Fence,
  patch: { stage?: LessonGenerationStage; progressCompleted?: number; progressTotal?: number },
): Promise<boolean> {
  requireDatabase();
  const set: Record<string, unknown> = { updatedAt: sql`now()` };
  if (patch.stage !== undefined) set.stage = patch.stage;
  if (patch.progressCompleted !== undefined) set.progressCompleted = patch.progressCompleted;
  if (patch.progressTotal !== undefined) set.progressTotal = patch.progressTotal;
  const rows = await getDb().update(lessonGenerationJobs).set(set).where(fencedWhere(fence)).returning({ id: lessonGenerationJobs.id });
  return rows.length > 0;
}

/** Fenced atomic progress increment (doc §9.3). */
export async function incrementLessonGenerationProgress(fence: Fence): Promise<boolean> {
  requireDatabase();
  const rows = await getDb()
    .update(lessonGenerationJobs)
    .set({ progressCompleted: sql`${lessonGenerationJobs.progressCompleted} + 1`, updatedAt: sql`now()` })
    .where(fencedWhere(fence))
    .returning({ id: lessonGenerationJobs.id });
  return rows.length > 0;
}

// ── Checkpoints ──────────────────────────────────────────────────────────────

/** Idempotent fenced checkpoint upsert (doc §9.3). The active lease is verified
 * (FOR UPDATE) in the same transaction before the write. */
export async function upsertLessonGenerationCheckpoint(
  fence: Fence,
  checkpoint: { checkpointKey: string; kind: "plan" | "batch"; payload: unknown; versions: CheckpointVersions },
): Promise<boolean> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select({ id: lessonGenerationJobs.id }).from(lessonGenerationJobs).where(fencedWhere(fence)).for("update");
    if (jobRows.length === 0) return false;
    const now = new Date();
    await tx
      .insert(lessonGenerationCheckpoints)
      .values({
        id: randomId("lck"),
        jobId: fence.jobId,
        checkpointKey: checkpoint.checkpointKey,
        kind: checkpoint.kind,
        payload: checkpoint.payload as object,
        irVersion: checkpoint.versions.irVersion,
        promptVersion: checkpoint.versions.promptVersion,
        compilerVersion: checkpoint.versions.compilerVersion,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [lessonGenerationCheckpoints.jobId, lessonGenerationCheckpoints.checkpointKey],
        set: {
          kind: checkpoint.kind,
          payload: checkpoint.payload as object,
          irVersion: checkpoint.versions.irVersion,
          promptVersion: checkpoint.versions.promptVersion,
          compilerVersion: checkpoint.versions.compilerVersion,
          updatedAt: now,
        },
      });
    return true;
  });
}

/** Read all checkpoints for a job (read-only, not fenced). */
export async function loadLessonGenerationCheckpoints(jobId: string): Promise<LessonGenerationCheckpoint[]> {
  requireDatabase();
  const rows = await getDb().select().from(lessonGenerationCheckpoints).where(eq(lessonGenerationCheckpoints.jobId, jobId));
  return rows.map((row) => ({
    checkpointKey: row.checkpointKey,
    kind: row.kind as "plan" | "batch",
    payload: row.payload,
    versions: { irVersion: row.irVersion, promptVersion: row.promptVersion, compilerVersion: row.compilerVersion },
  }));
}

/** Fenced deletion of specific checkpoint keys (doc §9.2/§9.4). */
export async function deleteLessonGenerationCheckpoints(fence: Fence, checkpointKeys: string[]): Promise<boolean> {
  requireDatabase();
  if (checkpointKeys.length === 0) return true;
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select({ id: lessonGenerationJobs.id }).from(lessonGenerationJobs).where(fencedWhere(fence)).for("update");
    if (jobRows.length === 0) return false;
    await tx
      .delete(lessonGenerationCheckpoints)
      .where(
        and(
          eq(lessonGenerationCheckpoints.jobId, fence.jobId),
          inArray(lessonGenerationCheckpoints.checkpointKey, checkpointKeys),
        ),
      );
    return true;
  });
}

/** Fenced deletion of all batch checkpoints, keeping the plan (doc §9.4). */
export async function deleteLessonGenerationBatchCheckpoints(fence: Fence): Promise<boolean> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select({ id: lessonGenerationJobs.id }).from(lessonGenerationJobs).where(fencedWhere(fence)).for("update");
    if (jobRows.length === 0) return false;
    await tx
      .delete(lessonGenerationCheckpoints)
      .where(and(eq(lessonGenerationCheckpoints.jobId, fence.jobId), eq(lessonGenerationCheckpoints.kind, "batch")));
    return true;
  });
}

/** Fenced deletion of the plan checkpoint and all dependent batch checkpoints,
 * forcing a fresh planner call on the next attempt (doc §9.2). */
export async function deleteLessonGenerationPlanAndDependents(fence: Fence): Promise<boolean> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select({ id: lessonGenerationJobs.id }).from(lessonGenerationJobs).where(fencedWhere(fence)).for("update");
    if (jobRows.length === 0) return false;
    await tx.delete(lessonGenerationCheckpoints).where(eq(lessonGenerationCheckpoints.jobId, fence.jobId));
    return true;
  });
}

// ── Fail / retry ─────────────────────────────────────────────────────────────

export type FailLessonGenerationJobResult = { ok: false } | { ok: true; status: "queued" | "failed" };

/** Fenced failure transition (doc §10.3/§10.4). Retryable failures with budget
 * left requeue (lesson stays generating); otherwise the job fails permanently
 * and the lesson returns to planned. */
export async function failLessonGenerationJob(
  fence: Fence,
  failure: { error: string; category: GenerationErrorCategory; retryable: boolean },
): Promise<FailLessonGenerationJobResult> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select().from(lessonGenerationJobs).where(fencedWhere(fence)).for("update");
    const job = jobRows[0];
    if (!job) return { ok: false };

    const now = new Date();
    const lastError = failure.error.slice(0, 1_000);
    const willRetry = failure.retryable && job.attempts < job.maxAttempts;

    if (willRetry) {
      await tx
        .update(lessonGenerationJobs)
        .set({
          status: "queued",
          stage: "queued",
          lastError,
          errorCategory: failure.category,
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          updatedAt: now,
        })
        .where(eq(lessonGenerationJobs.id, job.id));
      return { ok: true, status: "queued" };
    }

    await tx
      .update(lessonGenerationJobs)
      .set({
        status: "failed",
        stage: "failed",
        lastError,
        errorCategory: failure.category,
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(lessonGenerationJobs.id, job.id));
    // Only reset the lesson if it still exists and is mid-generation.
    await tx
      .update(lessonsTable)
      .set({ status: "planned", updatedAt: now })
      .where(and(eq(lessonsTable.id, job.lessonId), eq(lessonsTable.status, "generating")));
    return { ok: true, status: "failed" };
  });
}

// ── Atomic publish ───────────────────────────────────────────────────────────

export type PublishLessonInput = {
  title: string;
  blocks: CourseBlock[];
  estimatedMinutes: number;
};

/** Atomic publish (doc §9.5): fence-verify, publish the complete lesson, update
 * course minutes, and complete the job in one transaction. A stale worker (token
 * mismatch or expired lease) gets ok:false and writes nothing. */
export async function publishLessonAndCompleteJob(
  fence: Fence,
  lesson: PublishLessonInput,
): Promise<{ ok: boolean }> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select().from(lessonGenerationJobs).where(fencedWhere(fence)).for("update");
    const job = jobRows[0];
    if (!job) return { ok: false };

    const lessonRows = await tx.select().from(lessonsTable).where(eq(lessonsTable.id, job.lessonId)).for("update");
    const lessonRow = lessonRows[0];
    if (!lessonRow) return { ok: false };

    const now = new Date();
    await tx
      .update(lessonsTable)
      .set({
        title: lesson.title,
        status: "generated",
        blocks: lesson.blocks,
        estimatedMinutes: lesson.estimatedMinutes,
        version: sql`${lessonsTable.version} + 1`,
        updatedAt: now,
      })
      .where(eq(lessonsTable.id, job.lessonId));

    const sumResult = await tx
      .select({
        total: sql<number>`coalesce(sum(${lessonsTable.estimatedMinutes}), 0)`,
      })
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.courseId, job.courseId),
          eq(lessonsTable.status, "generated"),
        )
      );
    const totalMinutes = Number(sumResult[0]?.total || 0);

    await tx
      .update(coursesTable)
      .set({
        estimatedMinutes: totalMinutes,
        updatedAt: now,
      })
      .where(eq(coursesTable.id, job.courseId));

    await tx
      .update(lessonGenerationJobs)
      .set({
        status: "completed",
        stage: "completed",
        progressCompleted: sql`${lessonGenerationJobs.progressTotal}`,
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(eq(lessonGenerationJobs.id, job.id));

    return { ok: true };
  });
}

// ── Owner-scoped reads ───────────────────────────────────────────────────────

export async function getLessonGenerationJob(jobId: string, ownerId?: string | null): Promise<LessonGenerationJobSummary | undefined> {
  if (!ownerId || !hasDatabaseUrl()) return undefined;
  const rows = await getDb()
    .select()
    .from(lessonGenerationJobs)
    .where(and(eq(lessonGenerationJobs.id, jobId), eq(lessonGenerationJobs.ownerId, ownerId)))
    .limit(1);
  return rows[0] ? rowToSummary(rows[0]) : undefined;
}

export async function getLessonGenerationJobByLessonId(
  lessonId: string,
  ownerId?: string | null,
): Promise<LessonGenerationJobSummary | undefined> {
  if (!ownerId || !hasDatabaseUrl()) return undefined;
  const rows = await getDb()
    .select()
    .from(lessonGenerationJobs)
    .where(and(eq(lessonGenerationJobs.lessonId, lessonId), eq(lessonGenerationJobs.ownerId, ownerId)))
    .limit(1);
  return rows[0] ? rowToSummary(rows[0]) : undefined;
}

export async function listLessonGenerationJobsByCourse(
  courseId: string,
  ownerId?: string | null,
): Promise<LessonGenerationJobSummary[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(lessonGenerationJobs)
    .where(and(eq(lessonGenerationJobs.courseId, courseId), eq(lessonGenerationJobs.ownerId, ownerId)));
  return rows.map(rowToSummary);
}

/** Owner-scoped lesson jobs that still need attention (queued/running/failed) —
 * used by the Library to surface first/lazy lesson generation. Completed jobs are
 * omitted because the generated lesson is already visible on the course. */
export async function listActiveLessonGenerationJobsByOwner(ownerId?: string | null): Promise<LessonGenerationJobSummary[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(lessonGenerationJobs)
    .where(and(eq(lessonGenerationJobs.ownerId, ownerId), sql`${lessonGenerationJobs.status} <> 'completed'`));
  return rows.map(rowToSummary);
}

/** Full job row (worker-internal). */
export async function loadLessonGenerationJob(jobId: string): Promise<LessonGenerationJob | undefined> {
  requireDatabase();
  const rows = await getDb().select().from(lessonGenerationJobs).where(eq(lessonGenerationJobs.id, jobId)).limit(1);
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function rowToJob(row: typeof lessonGenerationJobs.$inferSelect): LessonGenerationJob {
  return {
    id: row.id,
    ownerId: row.ownerId,
    courseId: row.courseId,
    lessonId: row.lessonId,
    status: row.status as LessonGenerationJobStatus,
    stage: row.stage as LessonGenerationStage,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    progressCompleted: row.progressCompleted,
    progressTotal: row.progressTotal,
    leaseOwner: row.leaseOwner,
    leaseToken: row.leaseToken,
    leaseExpiresAt: row.leaseExpiresAt?.getTime() ?? null,
    heartbeatAt: row.heartbeatAt?.getTime() ?? null,
    lastError: row.lastError,
    errorCategory: row.errorCategory,
    startedAt: row.startedAt?.getTime() ?? null,
    completedAt: row.completedAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function rowToSummary(row: typeof lessonGenerationJobs.$inferSelect): LessonGenerationJobSummary {
  return {
    id: row.id,
    courseId: row.courseId,
    lessonId: row.lessonId,
    status: row.status as LessonGenerationJobStatus,
    stage: row.stage as LessonGenerationStage,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    progressCompleted: row.progressCompleted,
    progressTotal: row.progressTotal,
    lastError: row.lastError,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export function toLessonGenerationJobSummary(job: LessonGenerationJob): LessonGenerationJobSummary {
  return {
    id: job.id,
    courseId: job.courseId,
    lessonId: job.lessonId,
    status: job.status,
    stage: job.stage,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    progressCompleted: job.progressCompleted,
    progressTotal: job.progressTotal,
    lastError: job.lastError,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function rawRowToJob(row: Record<string, unknown>): LessonGenerationJob {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    courseId: String(row.course_id),
    lessonId: String(row.lesson_id),
    status: String(row.status) as LessonGenerationJobStatus,
    stage: String(row.stage) as LessonGenerationStage,
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? MAX_WORKER_ATTEMPTS),
    progressCompleted: Number(row.progress_completed ?? 0),
    progressTotal: Number(row.progress_total ?? 0),
    leaseOwner: typeof row.lease_owner === "string" ? row.lease_owner : null,
    leaseToken: typeof row.lease_token === "string" ? row.lease_token : null,
    leaseExpiresAt: timestampToMs(row.lease_expires_at),
    heartbeatAt: timestampToMs(row.heartbeat_at),
    lastError: typeof row.last_error === "string" ? row.last_error : null,
    errorCategory: typeof row.error_category === "string" ? row.error_category : null,
    startedAt: timestampToMs(row.started_at),
    completedAt: timestampToMs(row.completed_at),
    createdAt: timestampToMs(row.created_at) ?? Date.now(),
    updatedAt: timestampToMs(row.updated_at) ?? Date.now(),
  };
}

function timestampToMs(value: unknown): number | null {
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
