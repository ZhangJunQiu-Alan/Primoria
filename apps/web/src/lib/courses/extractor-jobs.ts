import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb, hasDatabaseUrl, type DbOrTx } from "../db/client";
import { extractorJobs } from "../db/schema";
import type { GenerationErrorCategory } from "../ai/course-generation/generation-errors";

// Recoverable post-lesson Extractor job store. One row per lesson (unique
// lesson_id), reused on re-run. Mirrors the lease/fencing model of
// learning-progress-jobs.ts, but simpler: a single LLM distillation step, no
// stage and no decision gate (extracted facts auto-apply). Every worker mutation
// is fenced by the active (status=running, lease_owner, lease_token,
// unexpired-lease) tuple, and lease comparisons use database time.

export type ExtractorJobStatus = "queued" | "running" | "completed" | "failed";

export type ExtractorJob = {
  id: string;
  ownerId: string;
  courseId: string;
  lessonId: string;
  graphId: string | null;
  status: ExtractorJobStatus;
  attempts: number;
  maxAttempts: number;
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

export type ExtractorClaim = {
  job: ExtractorJob;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: number;
};

export type EnqueueExtractorJobInput = {
  ownerId: string;
  courseId: string;
  lessonId: string;
  graphId?: string | null;
};

export type EnqueueExtractorJobResult =
  | { kind: "queued" | "running" | "retried"; job: ExtractorJob }
  | { kind: "completed"; job: ExtractorJob };

export const LEASE_DURATION_MS = 5 * 60_000;
export const HEARTBEAT_INTERVAL_MS = 60_000;
export const MAX_WORKER_ATTEMPTS = 2;
export const WORKER_IDLE_POLL_MS = 2_500;
const LEASE_SECONDS = LEASE_DURATION_MS / 1_000;

const leaseExpiryExpr = sql.raw(`now() + interval '${LEASE_SECONDS} seconds'`);

function randomId(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}${Date.now().toString(36)}`;
}

function newLeaseToken() {
  return randomBytes(24).toString("base64url");
}

function requireDatabase() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not configured. Extractor jobs require Postgres.");
}

// ── Enqueue ──────────────────────────────────────────────────────────────────

/** Idempotently enqueue (or re-run) one extraction job per lesson. */
export async function enqueueExtractorJob(input: EnqueueExtractorJobInput): Promise<EnqueueExtractorJobResult> {
  requireDatabase();
  const { ownerId, courseId, lessonId, graphId } = input;
  if (!ownerId || !courseId || !lessonId) throw new Error("ownerId, courseId and lessonId are required to enqueue an extractor job.");

  return getDb().transaction(async (tx) => {
    const existingRows = await tx.select().from(extractorJobs).where(eq(extractorJobs.lessonId, lessonId)).for("update");
    const existing = existingRows[0] ? rowToJob(existingRows[0]) : null;
    const now = new Date();

    if (existing && (existing.status === "queued" || existing.status === "running")) {
      return { kind: existing.status, job: existing };
    }
    // Already extracted — do not re-run automatically (the worker is idempotent,
    // but a completed lesson's window does not change).
    if (existing && existing.status === "completed") {
      return { kind: "completed", job: existing };
    }
    if (existing && existing.status === "failed") {
      const rows = await tx
        .update(extractorJobs)
        .set({
          status: "queued",
          attempts: 0,
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          heartbeatAt: null,
          lastError: null,
          errorCategory: null,
          completedAt: null,
          updatedAt: now,
        })
        .where(eq(extractorJobs.id, existing.id))
        .returning();
      return { kind: "retried", job: rowToJob(rows[0]) };
    }

    const rows = await tx
      .insert(extractorJobs)
      .values({
        id: randomId("exjob"),
        ownerId,
        courseId,
        lessonId,
        graphId: graphId ?? null,
        status: "queued",
        attempts: 0,
        maxAttempts: MAX_WORKER_ATTEMPTS,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { kind: "queued", job: rowToJob(rows[0]) };
  });
}

// ── Claim & lease ──────────────────────────────────────────────────────────────

/** Atomically claim one eligible job with FOR UPDATE SKIP LOCKED. Eligible:
 * queued, or running with an expired lease and remaining attempts. */
export async function claimNextExtractorJob({ workerId }: { workerId: string }): Promise<ExtractorClaim | undefined> {
  requireDatabase();

  // Fail any expired jobs that have exhausted their retry budget.
  await getDb().execute(sql`
    update extractor_jobs
    set
      status = 'failed',
      last_error = 'Lease expired and attempts exhausted.',
      error_category = 'lease_lost',
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      completed_at = now(),
      updated_at = now()
    where status = 'running'
      and lease_expires_at is not null
      and lease_expires_at < now()
      and attempts >= max_attempts
  `);

  const leaseToken = newLeaseToken();
  const result = await getDb().execute(sql`
    with candidate as (
      select id
      from extractor_jobs
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
    update extractor_jobs as job
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

export async function renewExtractorLease(jobId: string, workerId: string, leaseToken: string): Promise<boolean> {
  requireDatabase();
  const rows = await getDb()
    .update(extractorJobs)
    .set({ leaseExpiresAt: leaseExpiryExpr, heartbeatAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(extractorJobs.id, jobId),
        eq(extractorJobs.status, "running"),
        eq(extractorJobs.leaseOwner, workerId),
        eq(extractorJobs.leaseToken, leaseToken),
        sql`${extractorJobs.leaseExpiresAt} > now()`,
      ),
    )
    .returning({ id: extractorJobs.id });
  return rows.length > 0;
}

// ── Fenced worker mutations ────────────────────────────────────────────────────

export type Fence = { jobId: string; workerId: string; leaseToken: string };

function fencedWhere({ jobId, workerId, leaseToken }: Fence) {
  return and(
    eq(extractorJobs.id, jobId),
    eq(extractorJobs.status, "running"),
    eq(extractorJobs.leaseOwner, workerId),
    eq(extractorJobs.leaseToken, leaseToken),
    sql`${extractorJobs.leaseExpiresAt} > now()`,
  );
}

export type FailExtractorJobResult = { ok: false } | { ok: true; status: "queued" | "failed" };

/** Fenced failure transition. Retryable failures with budget left requeue;
 * otherwise the job fails permanently. */
export async function failExtractorJob(
  fence: Fence,
  failure: { error: string; category: GenerationErrorCategory; retryable: boolean },
): Promise<FailExtractorJobResult> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select().from(extractorJobs).where(fencedWhere(fence)).for("update");
    const job = jobRows[0];
    if (!job) return { ok: false };

    const now = new Date();
    const lastError = failure.error.slice(0, 1_000);
    const willRetry = failure.retryable && job.attempts < job.maxAttempts;

    if (willRetry) {
      await tx
        .update(extractorJobs)
        .set({ status: "queued", lastError, errorCategory: failure.category, leaseOwner: null, leaseToken: null, leaseExpiresAt: null, updatedAt: now })
        .where(eq(extractorJobs.id, job.id));
      return { ok: true, status: "queued" };
    }

    await tx
      .update(extractorJobs)
      .set({ status: "failed", lastError, errorCategory: failure.category, leaseOwner: null, leaseToken: null, leaseExpiresAt: null, completedAt: now, updatedAt: now })
      .where(eq(extractorJobs.id, job.id));
    return { ok: true, status: "failed" };
  });
}

/** Fenced completion within a caller-supplied executor (use {@link getDb} or a
 * transaction handle). Returns true only when this worker still owns the lease —
 * so a caller can write the distilled facts in the SAME transaction and have the
 * whole thing roll back if the lease was lost. */
export async function completeExtractorJobTx(executor: DbOrTx, fence: Fence): Promise<boolean> {
  const now = new Date();
  const rows = await executor
    .update(extractorJobs)
    .set({
      status: "completed",
      leaseOwner: null,
      leaseToken: null,
      leaseExpiresAt: null,
      completedAt: now,
      updatedAt: now,
    })
    .where(fencedWhere(fence))
    .returning({ id: extractorJobs.id });
  return rows.length > 0;
}

/** Fenced completion (no facts). Used when there is nothing to distill. */
export async function completeExtractorJob(fence: Fence): Promise<{ ok: boolean }> {
  requireDatabase();
  return { ok: await completeExtractorJobTx(getDb(), fence) };
}

// ── Row mappers ────────────────────────────────────────────────────────────────

function rowToJob(row: typeof extractorJobs.$inferSelect): ExtractorJob {
  return {
    id: row.id,
    ownerId: row.ownerId,
    courseId: row.courseId,
    lessonId: row.lessonId,
    graphId: row.graphId,
    status: row.status as ExtractorJobStatus,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
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

function rawRowToJob(row: Record<string, unknown>): ExtractorJob {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    courseId: String(row.course_id),
    lessonId: String(row.lesson_id),
    graphId: typeof row.graph_id === "string" ? row.graph_id : null,
    status: String(row.status) as ExtractorJobStatus,
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? MAX_WORKER_ATTEMPTS),
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
