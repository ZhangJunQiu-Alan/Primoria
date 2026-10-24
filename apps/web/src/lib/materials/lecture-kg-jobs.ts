import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";

import type { GenerationErrorCategory } from "../ai/course-generation/generation-errors";
import { getDb, type DbOrTx } from "../db/client";
import { learningMaterials, materialKgJobs, type MaterialKgJobRow } from "../db/schema";

// Recoverable per-lecture KG jobs (docs/product/subject-folders.md §4.1).
// Lease/fencing mirrors profile_fact_intake_jobs. The claim skips any folder
// that already has a live running job, so a lecture's concept merging always
// reads the folder graph the previous lecture produced.

export const LECTURE_KG_LEASE_DURATION_MS = 5 * 60_000;
export const LECTURE_KG_HEARTBEAT_INTERVAL_MS = 60_000;
export const LECTURE_KG_MAX_ATTEMPTS = 2;
const LEASE_SECONDS = LECTURE_KG_LEASE_DURATION_MS / 1_000;

export type LectureKgClaim = { job: MaterialKgJobRow; workerId: string; leaseToken: string };
export type LectureKgFence = { jobId: string; workerId: string; leaseToken: string };

function randomJobId() {
  return `mkgj_${randomBytes(9).toString("base64url")}${Date.now().toString(36)}`;
}

function fencedWhere(fence: LectureKgFence) {
  return and(
    eq(materialKgJobs.id, fence.jobId),
    eq(materialKgJobs.leaseOwner, fence.workerId),
    eq(materialKgJobs.leaseToken, fence.leaseToken),
    eq(materialKgJobs.status, "running"),
  );
}

/** Queue (or re-queue) a lecture's KG build and mark the file pending. */
export async function enqueueLectureKgJob(db: DbOrTx, input: { ownerId: string; materialId: string; folderId: string }): Promise<void> {
  const now = new Date();
  await db
    .insert(materialKgJobs)
    .values({ id: randomJobId(), ownerId: input.ownerId, materialId: input.materialId, folderId: input.folderId, maxAttempts: LECTURE_KG_MAX_ATTEMPTS, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({
      target: materialKgJobs.materialId,
      set: {
        folderId: input.folderId,
        status: "queued",
        attempts: 0,
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        heartbeatAt: null,
        lastError: null,
        errorCategory: null,
        startedAt: null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  await setMaterialKgStatus(db, input.ownerId, input.materialId, "pending");
}

export async function setMaterialKgStatus(
  db: DbOrTx,
  ownerId: string,
  materialId: string,
  status: "pending" | "processing" | "ready" | "failed" | "skipped",
): Promise<void> {
  await db
    .update(learningMaterials)
    .set({ kgStatus: status, updatedAt: new Date() })
    .where(and(eq(learningMaterials.ownerId, ownerId), eq(learningMaterials.id, materialId)));
}

export async function claimNextLectureKgJob({ workerId }: { workerId: string }): Promise<LectureKgClaim | undefined> {
  const leaseToken = randomBytes(24).toString("base64url");
  const result = (await getDb().execute(sql`
    with candidate as (
      select job.id
      from material_kg_jobs job
      where (job.status = 'queued' or (job.status = 'running' and job.lease_expires_at < now() and job.attempts < job.max_attempts))
        and not exists (
          select 1 from material_kg_jobs other
          where other.folder_id = job.folder_id
            and other.id <> job.id
            and other.status = 'running'
            and other.lease_expires_at >= now()
        )
      order by job.created_at asc
      for update skip locked
      limit 1
    )
    update material_kg_jobs as job
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
    returning job.id
  `)) as unknown as { id: string }[];
  const id = result[0]?.id;
  if (!id) return undefined;
  const [job] = await getDb().select().from(materialKgJobs).where(eq(materialKgJobs.id, id)).limit(1);
  if (!job) return undefined;
  await setMaterialKgStatus(getDb(), job.ownerId, job.materialId, "processing");
  return { job, workerId, leaseToken };
}

export async function renewLectureKgLease(fence: LectureKgFence): Promise<boolean> {
  const rows = await getDb()
    .update(materialKgJobs)
    .set({
      leaseExpiresAt: sql`now() + interval '${sql.raw(String(LEASE_SECONDS))} seconds'`,
      heartbeatAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(fencedWhere(fence))
    .returning({ id: materialKgJobs.id });
  return rows.length > 0;
}

/** Fenced completion inside the caller's transaction (with the subgraph write
 * and the folder rebuild), so a worker that lost its lease publishes nothing. */
export async function completeLectureKgJobTx(db: DbOrTx, fence: LectureKgFence): Promise<boolean> {
  const now = new Date();
  const rows = await db
    .update(materialKgJobs)
    .set({ status: "completed", leaseOwner: null, leaseToken: null, leaseExpiresAt: null, completedAt: now, updatedAt: now })
    .where(fencedWhere(fence))
    .returning({ id: materialKgJobs.id });
  return rows.length > 0;
}

export async function failLectureKgJob(
  fence: LectureKgFence,
  failure: { category: GenerationErrorCategory; retryable: boolean },
): Promise<{ ok: false } | { ok: true; status: "queued" | "failed" }> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select().from(materialKgJobs).where(fencedWhere(fence)).for("update");
    if (!row) return { ok: false } as const;
    const now = new Date();
    const willRetry = failure.retryable && row.attempts < row.maxAttempts;
    await tx
      .update(materialKgJobs)
      .set({
        status: willRetry ? "queued" : "failed",
        lastError: `Lecture knowledge graph failed (${failure.category}).`,
        errorCategory: failure.category,
        leaseOwner: null,
        leaseToken: null,
        leaseExpiresAt: null,
        ...(willRetry ? {} : { completedAt: now }),
        updatedAt: now,
      })
      .where(eq(materialKgJobs.id, row.id));
    await setMaterialKgStatus(tx, row.ownerId, row.materialId, willRetry ? "pending" : "failed");
    return { ok: true, status: willRetry ? "queued" : "failed" } as const;
  });
}

/** Expired leases with no attempts left become failed (a crashed worker). */
export async function failExhaustedLectureKgJobs(limit = 100): Promise<number> {
  return getDb().transaction(async (tx) => {
    const rows = (await tx.execute(sql`
      with exhausted as (
        select id from material_kg_jobs
        where status = 'running' and lease_expires_at < now() and attempts >= max_attempts
        order by updated_at asc
        for update skip locked
        limit ${limit}
      )
      update material_kg_jobs as job
      set status = 'failed',
          last_error = 'Lecture knowledge graph exhausted its retry attempts after lease expiry.',
          error_category = 'provider',
          lease_owner = null,
          lease_token = null,
          lease_expires_at = null,
          completed_at = now(),
          updated_at = now()
      from exhausted
      where job.id = exhausted.id
      returning job.owner_id, job.material_id
    `)) as unknown as { owner_id: string; material_id: string }[];
    for (const row of rows) await setMaterialKgStatus(tx, row.owner_id, row.material_id, "failed");
    return rows.length;
  });
}
