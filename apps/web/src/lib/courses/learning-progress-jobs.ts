import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb, hasDatabaseUrl, type DbOrTx } from "../db/client";
import { learningProgressJobs } from "../db/schema";
import type { GenerationErrorCategory } from "../ai/course-generation/generation-errors";
import type { LearningDecision } from "./learning-progress-decider";

// Recoverable post-lesson orchestration job store. One row per lesson (unique
// lesson_id), reused on re-run. Mirrors the lease/fencing model of
// lesson-generation-jobs.ts: every worker mutation is fenced by the active
// (status=running, lease_owner, lease_token, unexpired-lease) tuple, and lease
// comparisons use database time. The job is short (mastery update + decision)
// and fully re-runnable, so it carries no checkpoints.

export type LearningProgressJobStatus = "queued" | "running" | "completed" | "failed";
export type LearningProgressStage = "queued" | "mastery" | "deciding" | "completed" | "failed";
export type DecisionStatus = "none" | "pending" | "accepted" | "dismissed";

export type LearningProgressJob = {
  id: string;
  ownerId: string;
  courseId: string;
  lessonId: string;
  graphId: string | null;
  status: LearningProgressJobStatus;
  stage: LearningProgressStage;
  attempts: number;
  maxAttempts: number;
  decision: LearningDecision | null;
  decisionStatus: DecisionStatus;
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

/** Owner-facing projection: never exposes ownerId or lease internals. */
export type LearningProgressJobSummary = {
  id: string;
  courseId: string;
  lessonId: string;
  status: LearningProgressJobStatus;
  stage: LearningProgressStage;
  decision: LearningDecision | null;
  decisionStatus: DecisionStatus;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
};

export type LearningProgressClaim = {
  job: LearningProgressJob;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: number;
};

export type EnqueueLearningProgressJobInput = {
  ownerId: string;
  courseId: string;
  lessonId: string;
  graphId?: string | null;
};

export type EnqueueLearningProgressJobResult =
  | { kind: "queued" | "running" | "retried"; job: LearningProgressJob }
  | { kind: "completed"; job: LearningProgressJob };

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
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not configured. Learning-progress jobs require Postgres.");
}

// ── Enqueue ────────────────────────────────────────────────────────────────

/** Idempotently enqueue (or re-run) one orchestration job per lesson. When a
 * transaction handle is passed, the enqueue joins the caller's transaction so
 * evidence writes and the job commit or roll back together. */
export async function enqueueLearningProgressJob(
  input: EnqueueLearningProgressJobInput,
  db?: DbOrTx,
): Promise<EnqueueLearningProgressJobResult> {
  requireDatabase();
  const { ownerId, courseId, lessonId, graphId } = input;
  if (!ownerId || !courseId || !lessonId) throw new Error("ownerId, courseId and lessonId are required to enqueue a progress job.");

  const run = async (tx: DbOrTx): Promise<EnqueueLearningProgressJobResult> => {
    const existingRows = await tx.select().from(learningProgressJobs).where(eq(learningProgressJobs.lessonId, lessonId)).for("update");
    const existing = existingRows[0] ? rowToJob(existingRows[0]) : null;
    const now = new Date();

    if (existing && (existing.status === "queued" || existing.status === "running")) {
      return { kind: existing.status, job: existing };
    }
    // Already orchestrated — do not re-run (avoids duplicate recommendations).
    if (existing && existing.status === "completed") {
      return { kind: "completed", job: existing };
    }
    if (existing && existing.status === "failed") {
      const rows = await tx
        .update(learningProgressJobs)
        .set({
          status: "queued",
          stage: "queued",
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
        .where(eq(learningProgressJobs.id, existing.id))
        .returning();
      return { kind: "retried", job: rowToJob(rows[0]) };
    }

    const rows = await tx
      .insert(learningProgressJobs)
      .values({
        id: randomId("lpjob"),
        ownerId,
        courseId,
        lessonId,
        graphId: graphId ?? null,
        status: "queued",
        stage: "queued",
        attempts: 0,
        maxAttempts: MAX_WORKER_ATTEMPTS,
        decisionStatus: "none",
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return { kind: "queued", job: rowToJob(rows[0]) };
  };

  return db ? run(db) : getDb().transaction(run);
}

// ── Claim & lease ────────────────────────────────────────────────────────────

/** Atomically claim one eligible job with FOR UPDATE SKIP LOCKED. Eligible:
 * queued, or running with an expired lease and remaining attempts. */
export async function claimNextLearningProgressJob({ workerId }: { workerId: string }): Promise<LearningProgressClaim | undefined> {
  requireDatabase();

  // Fail any expired jobs that have exhausted their retry budget.
  await getDb().execute(sql`
    update learning_progress_jobs
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
    where status = 'running'
      and lease_expires_at is not null
      and lease_expires_at < now()
      and attempts >= max_attempts
  `);

  const leaseToken = newLeaseToken();
  const result = await getDb().execute(sql`
    with candidate as (
      select id
      from learning_progress_jobs
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
    update learning_progress_jobs as job
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

export async function renewLearningProgressLease(jobId: string, workerId: string, leaseToken: string): Promise<boolean> {
  requireDatabase();
  const rows = await getDb()
    .update(learningProgressJobs)
    .set({ leaseExpiresAt: leaseExpiryExpr, heartbeatAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(learningProgressJobs.id, jobId),
        eq(learningProgressJobs.status, "running"),
        eq(learningProgressJobs.leaseOwner, workerId),
        eq(learningProgressJobs.leaseToken, leaseToken),
        sql`${learningProgressJobs.leaseExpiresAt} > now()`,
      ),
    )
    .returning({ id: learningProgressJobs.id });
  return rows.length > 0;
}

// ── Fenced worker mutations ──────────────────────────────────────────────────

type Fence = { jobId: string; workerId: string; leaseToken: string };

function fencedWhere({ jobId, workerId, leaseToken }: Fence) {
  return and(
    eq(learningProgressJobs.id, jobId),
    eq(learningProgressJobs.status, "running"),
    eq(learningProgressJobs.leaseOwner, workerId),
    eq(learningProgressJobs.leaseToken, leaseToken),
    sql`${learningProgressJobs.leaseExpiresAt} > now()`,
  );
}

/** Fenced stage write. */
export async function updateLearningProgressStage(fence: Fence, stage: LearningProgressStage): Promise<boolean> {
  requireDatabase();
  const rows = await getDb()
    .update(learningProgressJobs)
    .set({ stage, updatedAt: sql`now()` })
    .where(fencedWhere(fence))
    .returning({ id: learningProgressJobs.id });
  return rows.length > 0;
}

export type FailLearningProgressJobResult = { ok: false } | { ok: true; status: "queued" | "failed" };

/** Fenced failure transition. Retryable failures with budget left requeue;
 * otherwise the job fails permanently. */
export async function failLearningProgressJob(
  fence: Fence,
  failure: { error: string; category: GenerationErrorCategory; retryable: boolean },
): Promise<FailLearningProgressJobResult> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const jobRows = await tx.select().from(learningProgressJobs).where(fencedWhere(fence)).for("update");
    const job = jobRows[0];
    if (!job) return { ok: false };

    const now = new Date();
    const lastError = failure.error.slice(0, 1_000);
    const willRetry = failure.retryable && job.attempts < job.maxAttempts;

    if (willRetry) {
      await tx
        .update(learningProgressJobs)
        .set({ status: "queued", stage: "queued", lastError, errorCategory: failure.category, leaseOwner: null, leaseToken: null, leaseExpiresAt: null, updatedAt: now })
        .where(eq(learningProgressJobs.id, job.id));
      return { ok: true, status: "queued" };
    }

    await tx
      .update(learningProgressJobs)
      .set({ status: "failed", stage: "failed", lastError, errorCategory: failure.category, leaseOwner: null, leaseToken: null, leaseExpiresAt: null, completedAt: now, updatedAt: now })
      .where(eq(learningProgressJobs.id, job.id));
    return { ok: true, status: "failed" };
  });
}

/** Fenced completion: persist the decision and mark it pending for the user. */
export async function completeLearningProgressJobWithDecision(
  fence: Fence,
  decision: LearningDecision,
  db: DbOrTx = getDb(),
): Promise<{ ok: boolean }> {
  requireDatabase();
  const now = new Date();
  const rows = await db
    .update(learningProgressJobs)
    .set({
      status: "completed",
      stage: "completed",
      decision: decision as object,
      decisionStatus: "pending",
      leaseOwner: null,
      leaseToken: null,
      leaseExpiresAt: null,
      completedAt: now,
      updatedAt: now,
    })
    .where(fencedWhere(fence))
    .returning({ id: learningProgressJobs.id });
  return { ok: rows.length > 0 };
}

// ── Owner-scoped reads / decision resolution ─────────────────────────────────

export async function getLearningProgressJob(jobId: string, ownerId?: string | null): Promise<LearningProgressJobSummary | undefined> {
  if (!ownerId || !hasDatabaseUrl()) return undefined;
  const rows = await getDb()
    .select()
    .from(learningProgressJobs)
    .where(and(eq(learningProgressJobs.id, jobId), eq(learningProgressJobs.ownerId, ownerId)))
    .limit(1);
  return rows[0] ? rowToSummary(rows[0]) : undefined;
}

/** Pending recommendations for a course (decisionStatus = 'pending'). */
export async function listPendingDecisionsByCourse(courseId: string, ownerId?: string | null): Promise<LearningProgressJobSummary[]> {
  if (!ownerId || !hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(learningProgressJobs)
    .where(
      and(
        eq(learningProgressJobs.courseId, courseId),
        eq(learningProgressJobs.ownerId, ownerId),
        eq(learningProgressJobs.decisionStatus, "pending"),
      ),
    );
  return rows.map(rowToSummary);
}

/** Owner-scoped decision resolution: flip a pending decision to accepted /
 * dismissed. Returns the job (with its decision) only when it was pending. */
export async function resolveLearningProgressDecision(
  jobId: string,
  ownerId: string,
  status: "accepted" | "dismissed",
  db: DbOrTx = getDb(),
): Promise<LearningProgressJob | undefined> {
  requireDatabase();
  const now = new Date();
  const rows = await db
    .update(learningProgressJobs)
    .set({ decisionStatus: status, updatedAt: now })
    .where(
      and(
        eq(learningProgressJobs.id, jobId),
        eq(learningProgressJobs.ownerId, ownerId),
        eq(learningProgressJobs.decisionStatus, "pending"),
      ),
    )
    .returning();
  return rows[0] ? rowToJob(rows[0]) : undefined;
}

// ── Row mappers ──────────────────────────────────────────────────────────────

function rowToJob(row: typeof learningProgressJobs.$inferSelect): LearningProgressJob {
  return {
    id: row.id,
    ownerId: row.ownerId,
    courseId: row.courseId,
    lessonId: row.lessonId,
    graphId: row.graphId,
    status: row.status as LearningProgressJobStatus,
    stage: row.stage as LearningProgressStage,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    decision: (row.decision as LearningDecision | null) ?? null,
    decisionStatus: row.decisionStatus as DecisionStatus,
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

function rowToSummary(row: typeof learningProgressJobs.$inferSelect): LearningProgressJobSummary {
  return {
    id: row.id,
    courseId: row.courseId,
    lessonId: row.lessonId,
    status: row.status as LearningProgressJobStatus,
    stage: row.stage as LearningProgressStage,
    decision: (row.decision as LearningDecision | null) ?? null,
    decisionStatus: row.decisionStatus as DecisionStatus,
    lastError: row.lastError,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function rawRowToJob(row: Record<string, unknown>): LearningProgressJob {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    courseId: String(row.course_id),
    lessonId: String(row.lesson_id),
    graphId: typeof row.graph_id === "string" ? row.graph_id : null,
    status: String(row.status) as LearningProgressJobStatus,
    stage: String(row.stage) as LearningProgressStage,
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? MAX_WORKER_ATTEMPTS),
    decision: (row.decision as LearningDecision | null) ?? null,
    decisionStatus: String(row.decision_status ?? "none") as DecisionStatus,
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
