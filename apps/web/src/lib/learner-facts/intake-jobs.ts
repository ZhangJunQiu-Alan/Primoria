import { createHash, randomBytes } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";

import type { GenerationErrorCategory } from "../ai/course-generation/generation-errors";
import { getDb, hasDatabaseUrl, type DbOrTx } from "../db/client";
import { learnerProfiles, profileFactIntakeJobs } from "../db/schema";

export type ProfileFactIntakeSource = "onboarding" | "settings";
export type ProfileFactIntakeJobStatus = "queued" | "running" | "completed" | "failed";

export type ProfileFactIntakeResult = {
  added: number;
  reinforced: number;
  skipped: number;
};

export type ProfileFactIntakeJob = {
  id: string;
  ownerId: string;
  sourceKind: ProfileFactIntakeSource;
  sourceText: string | null;
  sourceHash: string;
  status: ProfileFactIntakeJobStatus;
  attempts: number;
  maxAttempts: number;
  leaseOwner: string | null;
  leaseToken: string | null;
  leaseExpiresAt: number | null;
  heartbeatAt: number | null;
  result: ProfileFactIntakeResult | null;
  lastError: string | null;
  errorCategory: string | null;
  startedAt: number | null;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type ProfileFactIntakeClaim = {
  job: ProfileFactIntakeJob;
  workerId: string;
  leaseToken: string;
  leaseExpiresAt: number;
};

export type ProfileFactIntakeFence = { jobId: string; workerId: string; leaseToken: string };

export class ProfileFactIntakeBusyError extends Error {
  constructor() {
    super("A profile fact intake is already running for this learner.");
    this.name = "ProfileFactIntakeBusyError";
  }
}

export const PROFILE_INTAKE_LEASE_DURATION_MS = 5 * 60_000;
export const PROFILE_INTAKE_HEARTBEAT_INTERVAL_MS = 60_000;
export const PROFILE_INTAKE_MAX_ATTEMPTS = 2;
export const PROFILE_INTAKE_STALE_MS = 5 * 60_000;

const ACTIVE_STATUSES: ProfileFactIntakeJobStatus[] = ["queued", "running"];
const LEASE_SECONDS = PROFILE_INTAKE_LEASE_DURATION_MS / 1_000;
const leaseExpiryExpr = sql.raw(`now() + interval '${LEASE_SECONDS} seconds'`);

function requireDatabase() {
  if (!hasDatabaseUrl()) throw new Error("DATABASE_URL is not configured. Profile fact intake requires Postgres.");
}

function randomId() {
  return `pfij_${randomBytes(9).toString("base64url")}${Date.now().toString(36)}`;
}

function sourceHash(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

function newLeaseToken() {
  return randomBytes(24).toString("base64url");
}

export async function enqueueProfileFactIntakeJob(input: {
  ownerId: string;
  sourceKind: ProfileFactIntakeSource;
  sourceText: string;
}): Promise<{ kind: "queued" | "running"; job: ProfileFactIntakeJob }> {
  requireDatabase();
  const cleanText = input.sourceText.trim();
  if (!input.ownerId || cleanText.length < 2 || cleanText.length > 2_000) {
    throw new Error("Profile fact intake text must contain 2–2000 characters.");
  }
  const hash = sourceHash(cleanText);

  return getDb().transaction(async (tx) => {
    const activeRows = await tx
      .select()
      .from(profileFactIntakeJobs)
      .where(and(eq(profileFactIntakeJobs.ownerId, input.ownerId), inArray(profileFactIntakeJobs.status, ACTIVE_STATUSES)))
      .for("update");
    let row = activeRows[0];

    if (row && (row.sourceHash !== hash || row.sourceKind !== input.sourceKind)) throw new ProfileFactIntakeBusyError();

    if (!row) {
      const rows = await tx
        .insert(profileFactIntakeJobs)
        .values({
          id: randomId(),
          ownerId: input.ownerId,
          sourceKind: input.sourceKind,
          sourceText: cleanText,
          sourceHash: hash,
          status: "queued",
          attempts: 0,
          maxAttempts: PROFILE_INTAKE_MAX_ATTEMPTS,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();
      row = rows[0];
      if (!row) {
        const concurrent = await tx
          .select()
          .from(profileFactIntakeJobs)
          .where(and(eq(profileFactIntakeJobs.ownerId, input.ownerId), inArray(profileFactIntakeJobs.status, ACTIVE_STATUSES)))
          .limit(1);
        row = concurrent[0];
        if (row && (row.sourceHash !== hash || row.sourceKind !== input.sourceKind)) {
          throw new ProfileFactIntakeBusyError();
        }
      }
    }
    if (!row) throw new Error("Could not enqueue profile fact intake job.");

    if (input.sourceKind === "onboarding") {
      const now = new Date();
      await tx
        .insert(learnerProfiles)
        .values({
          ownerId: input.ownerId,
          factsIntakeStatus: "pending",
          factsIntakeJobId: row.id,
          factsIntakeMessage: null,
          factsIntakeUpdatedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: learnerProfiles.ownerId,
          set: {
            factsIntakeStatus: "pending",
            factsIntakeJobId: row.id,
            factsIntakeMessage: null,
            factsIntakeUpdatedAt: now,
            updatedAt: now,
          },
        });
    }

    return { kind: row.status as "queued" | "running", job: rowToJob(row) };
  });
}

export async function getProfileFactIntakeJob(ownerId: string, jobId: string): Promise<ProfileFactIntakeJob | null> {
  if (!ownerId || !jobId || !hasDatabaseUrl()) return null;
  const rows = await getDb()
    .select()
    .from(profileFactIntakeJobs)
    .where(and(eq(profileFactIntakeJobs.ownerId, ownerId), eq(profileFactIntakeJobs.id, jobId)))
    .limit(1);
  return rows[0] ? rowToJob(rows[0]) : null;
}

export async function skipOnboardingProfileFactIntake(ownerId: string) {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(profileFactIntakeJobs)
      .set({
        status: "failed",
        sourceText: null,
        lastError: "Onboarding profile fact intake was skipped by the learner.",
        errorCategory: "cancelled",
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(profileFactIntakeJobs.ownerId, ownerId),
        eq(profileFactIntakeJobs.sourceKind, "onboarding"),
        inArray(profileFactIntakeJobs.status, ACTIVE_STATUSES),
      ));
    const rows = await tx
      .insert(learnerProfiles)
      .values({
        ownerId,
        factsIntakeStatus: "skipped",
        factsIntakeJobId: null,
        factsIntakeMessage: null,
        factsIntakeUpdatedAt: now,
        knowledgeBackground: null,
        knowledgeBackgroundSkippedAt: now,
        onboardingSkippedAt: null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: learnerProfiles.ownerId,
        set: {
          factsIntakeStatus: "skipped",
          factsIntakeJobId: null,
          factsIntakeMessage: null,
          factsIntakeUpdatedAt: now,
          knowledgeBackground: null,
          knowledgeBackgroundSkippedAt: now,
          onboardingSkippedAt: null,
          updatedAt: now,
        },
      })
      .returning();
    return rows[0];
  });
}

export async function claimNextProfileFactIntakeJob({ workerId }: { workerId: string }): Promise<ProfileFactIntakeClaim | undefined> {
  requireDatabase();
  const leaseToken = newLeaseToken();
  const result = await getDb().execute(sql`
    with candidate as (
      select id
      from profile_fact_intake_jobs
      where status = 'queued'
         or (status = 'running' and lease_expires_at < now() and attempts < max_attempts)
      order by created_at asc
      for update skip locked
      limit 1
    )
    update profile_fact_intake_jobs as job
    set status = 'running',
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
  const row = rowsFromResult(result)[0];
  if (!row) return undefined;
  const job = rawRowToJob(row);
  return { job, workerId, leaseToken, leaseExpiresAt: job.leaseExpiresAt ?? Date.now() + PROFILE_INTAKE_LEASE_DURATION_MS };
}

export async function renewProfileFactIntakeLease(jobId: string, workerId: string, leaseToken: string): Promise<boolean> {
  requireDatabase();
  const rows = await getDb()
    .update(profileFactIntakeJobs)
    .set({ leaseExpiresAt: leaseExpiryExpr, heartbeatAt: sql`now()`, updatedAt: sql`now()` })
    .where(fencedWhere({ jobId, workerId, leaseToken }))
    .returning({ id: profileFactIntakeJobs.id });
  return rows.length > 0;
}

export async function failExhaustedProfileFactIntakeJobs(
  limit = 100,
): Promise<Array<{ jobId: string; ownerId: string; sourceKind: ProfileFactIntakeSource }>> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const result = await tx.execute(sql`
      with exhausted as (
        select id
        from profile_fact_intake_jobs
        where status = 'running'
          and lease_expires_at < now()
          and attempts >= max_attempts
        order by updated_at asc
        for update skip locked
        limit ${limit}
      )
      update profile_fact_intake_jobs as job
      set status = 'failed',
          source_text = null,
          last_error = 'Profile fact intake exhausted its retry attempts after lease expiry.',
          error_category = 'timeout',
          lease_owner = null,
          lease_token = null,
          lease_expires_at = null,
          completed_at = now(),
          updated_at = now()
      from exhausted
      where job.id = exhausted.id
      returning job.id, job.owner_id, job.source_kind
    `);
    const failed = rowsFromResult(result).map((row) => ({
      jobId: String(row.id),
      ownerId: String(row.owner_id),
      sourceKind: String(row.source_kind) as ProfileFactIntakeSource,
    }));
    const onboardingJobIds = failed.filter((row) => row.sourceKind === "onboarding").map((row) => row.jobId);
    if (onboardingJobIds.length > 0) {
      const now = new Date();
      await tx
        .update(learnerProfiles)
        .set({
          factsIntakeStatus: "failed",
          factsIntakeMessage: "Personalization took too long, so we continued with the default background.",
          factsIntakeUpdatedAt: now,
          updatedAt: now,
        })
        .where(and(
          inArray(learnerProfiles.factsIntakeJobId, onboardingJobIds),
          eq(learnerProfiles.factsIntakeStatus, "pending"),
        ));
    }
    return failed;
  });
}

export async function completeProfileFactIntakeJobTx(
  executor: DbOrTx,
  fence: ProfileFactIntakeFence,
  result: ProfileFactIntakeResult,
): Promise<boolean> {
  const now = new Date();
  const rows = await executor
    .update(profileFactIntakeJobs)
    .set({
      status: "completed",
      sourceText: null,
      result,
      leaseOwner: null,
      leaseToken: null,
      leaseExpiresAt: null,
      completedAt: now,
      updatedAt: now,
    })
    .where(fencedWhere(fence))
    .returning({ id: profileFactIntakeJobs.id });
  return rows.length > 0;
}

export async function failProfileFactIntakeJob(
  fence: ProfileFactIntakeFence,
  failure: { error: string; category: GenerationErrorCategory; retryable: boolean },
): Promise<{ ok: false } | { ok: true; status: "queued" | "failed"; job: ProfileFactIntakeJob }> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const rows = await tx.select().from(profileFactIntakeJobs).where(fencedWhere(fence)).for("update");
    const row = rows[0];
    if (!row) return { ok: false } as const;
    const now = new Date();
    const willRetry = failure.retryable && row.attempts < row.maxAttempts;
    const safeError = `Profile fact intake failed (${failure.category}).`;
    const updates = willRetry
      ? {
          status: "queued" as const,
          lastError: safeError,
          errorCategory: failure.category,
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          updatedAt: now,
        }
      : {
          status: "failed" as const,
          sourceText: null,
          lastError: safeError,
          errorCategory: failure.category,
          leaseOwner: null,
          leaseToken: null,
          leaseExpiresAt: null,
          completedAt: now,
          updatedAt: now,
        };
    const updatedRows = await tx
      .update(profileFactIntakeJobs)
      .set(updates)
      .where(eq(profileFactIntakeJobs.id, row.id))
      .returning();
    const updated = updatedRows[0];

    if (!willRetry && row.sourceKind === "onboarding") {
      await tx
        .update(learnerProfiles)
        .set({
          factsIntakeStatus: "failed",
          factsIntakeMessage: "We couldn't personalize from that introduction, so we continued with the default background.",
          factsIntakeUpdatedAt: now,
          updatedAt: now,
        })
        .where(and(
          eq(learnerProfiles.ownerId, row.ownerId),
          eq(learnerProfiles.factsIntakeJobId, row.id),
          eq(learnerProfiles.factsIntakeStatus, "pending"),
        ));
    }
    return { ok: true, status: willRetry ? "queued" : "failed", job: rowToJob(updated) } as const;
  });
}

export async function failStaleProfileFactIntake(ownerId: string, jobId: string, cutoff: Date): Promise<boolean> {
  requireDatabase();
  return getDb().transaction(async (tx) => {
    const now = new Date();
    const rows = await tx
      .update(profileFactIntakeJobs)
      .set({
        status: "failed",
        sourceText: null,
        lastError: "Profile fact intake exceeded the onboarding recovery window.",
        errorCategory: "timeout",
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        completedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(profileFactIntakeJobs.id, jobId),
        eq(profileFactIntakeJobs.ownerId, ownerId),
        inArray(profileFactIntakeJobs.status, ACTIVE_STATUSES),
        sql`${profileFactIntakeJobs.updatedAt} <= ${cutoff}`,
      ))
      .returning({ id: profileFactIntakeJobs.id });
    if (!rows[0]) return false;
    await tx
      .update(learnerProfiles)
      .set({
        factsIntakeStatus: "failed",
        factsIntakeMessage: "Personalization took too long, so we continued with the default background.",
        factsIntakeUpdatedAt: now,
        updatedAt: now,
      })
      .where(and(
        eq(learnerProfiles.ownerId, ownerId),
        eq(learnerProfiles.factsIntakeJobId, jobId),
        eq(learnerProfiles.factsIntakeStatus, "pending"),
      ));
    return true;
  });
}

function fencedWhere({ jobId, workerId, leaseToken }: ProfileFactIntakeFence) {
  return and(
    eq(profileFactIntakeJobs.id, jobId),
    eq(profileFactIntakeJobs.status, "running"),
    eq(profileFactIntakeJobs.leaseOwner, workerId),
    eq(profileFactIntakeJobs.leaseToken, leaseToken),
    sql`${profileFactIntakeJobs.leaseExpiresAt} > now()`,
  );
}

function rowToJob(row: typeof profileFactIntakeJobs.$inferSelect): ProfileFactIntakeJob {
  const result = row.result && typeof row.result === "object" ? row.result as ProfileFactIntakeResult : null;
  return {
    id: row.id,
    ownerId: row.ownerId,
    sourceKind: row.sourceKind as ProfileFactIntakeSource,
    sourceText: row.sourceText,
    sourceHash: row.sourceHash,
    status: row.status as ProfileFactIntakeJobStatus,
    attempts: row.attempts,
    maxAttempts: row.maxAttempts,
    leaseOwner: row.leaseOwner,
    leaseToken: row.leaseToken,
    leaseExpiresAt: row.leaseExpiresAt?.getTime() ?? null,
    heartbeatAt: row.heartbeatAt?.getTime() ?? null,
    result,
    lastError: row.lastError,
    errorCategory: row.errorCategory,
    startedAt: row.startedAt?.getTime() ?? null,
    completedAt: row.completedAt?.getTime() ?? null,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

function rawRowToJob(row: Record<string, unknown>): ProfileFactIntakeJob {
  const result = row.result && typeof row.result === "object" ? row.result as ProfileFactIntakeResult : null;
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    sourceKind: String(row.source_kind) as ProfileFactIntakeSource,
    sourceText: typeof row.source_text === "string" ? row.source_text : null,
    sourceHash: String(row.source_hash),
    status: String(row.status) as ProfileFactIntakeJobStatus,
    attempts: Number(row.attempts ?? 0),
    maxAttempts: Number(row.max_attempts ?? PROFILE_INTAKE_MAX_ATTEMPTS),
    leaseOwner: typeof row.lease_owner === "string" ? row.lease_owner : null,
    leaseToken: typeof row.lease_token === "string" ? row.lease_token : null,
    leaseExpiresAt: timestampToMs(row.lease_expires_at),
    heartbeatAt: timestampToMs(row.heartbeat_at),
    result,
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
  return Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
}
