#!/usr/bin/env tsx
import {
  TEST_DB_AVAILABLE,
  finish,
  ok,
  resetTestDb,
  seedCourse,
  seedLesson,
  seedUser,
  setupTestDb,
  skipWithoutTestDb,
  teardownTestDb,
} from "./helpers/test-db";
import { CURRENT_CHECKPOINT_VERSIONS } from "../src/lib/ai/course-generation/versions";

const NAME = "lesson-generation-store.db";

async function main() {
  if (skipWithoutTestDb(NAME)) return;
  const sql = await setupTestDb();
  const store = await import("../src/lib/courses/lesson-generation-jobs");

  let seq = 0;
  // Fresh isolated owner/course; returns a brand-new planned lesson id per call.
  async function freshLesson(): Promise<{ ownerId: string; courseId: string; lessonId: string }> {
    seq += 1;
    const ownerId = `u_${seq}`;
    const courseId = `crs_${seq}`;
    const lessonId = `lsn_${seq}`;
    await seedUser(sql, ownerId);
    await seedCourse(sql, { id: courseId, ownerId });
    await seedLesson(sql, { id: lessonId, courseId, ownerId });
    return { ownerId, courseId, lessonId };
  }

  try {
    await resetTestDb(sql);

    // ── §17.1 enqueue + ownership ────────────────────────────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      const e1 = await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      ok(e1.kind === "queued", "enqueue creates one queued job");
      const lr = await sql`select status from lessons where id=${lessonId}`;
      ok(lr[0].status === "generating", "enqueue sets lesson generating");
      const e2 = await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      ok(e2.kind === "queued" && e2.job?.id === e1.job?.id, "repeated enqueue returns the same job");
      const denied = await store.getLessonGenerationJob(e1.job!.id, "intruder");
      ok(denied === undefined, "ownership check rejects another user");
    }

    // ── §17.1 claim / lease / fencing ────────────────────────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });

      // One worker wins a concurrent claim.
      const [c1, c2] = await Promise.all([
        store.claimNextLessonGenerationJob({ workerId: "wa" }),
        store.claimNextLessonGenerationJob({ workerId: "wb" }),
      ]);
      const winners = [c1, c2].filter((c) => c?.job.lessonId === lessonId);
      ok(winners.length === 1, "exactly one worker wins the concurrent claim");
      const claim1 = winners[0]!;
      const worker1 = claim1.workerId;
      ok(claim1.job.attempts === 1, "claim increments attempts to 1");

      // Active lease cannot be reclaimed.
      const reclaimActive = await store.claimNextLessonGenerationJob({ workerId: "wc" });
      ok(!reclaimActive || reclaimActive.job.id !== claim1.job.id, "active lease cannot be reclaimed");

      // Heartbeat extends the lease.
      await sql`update lesson_generation_jobs set lease_expires_at = now() + interval '60 seconds' where id=${claim1.job.id}`;
      const before = (await sql`select lease_expires_at from lesson_generation_jobs where id=${claim1.job.id}`)[0].lease_expires_at;
      ok(await store.renewLessonGenerationLease(claim1.job.id, worker1, claim1.leaseToken), "heartbeat renews active lease");
      const after = (await sql`select lease_expires_at from lesson_generation_jobs where id=${claim1.job.id}`)[0].lease_expires_at;
      ok(new Date(after).getTime() > new Date(before).getTime(), "heartbeat extends lease expiry");

      // Expire the lease, then a second worker reclaims with a NEW token.
      await sql`update lesson_generation_jobs set lease_expires_at = now() - interval '1 second' where id=${claim1.job.id}`;
      const claim2 = await store.claimNextLessonGenerationJob({ workerId: "wd" });
      ok(claim2?.job.id === claim1.job.id, "expired lease can be reclaimed");
      ok(claim2!.leaseToken !== claim1.leaseToken, "reclaim generates a new lease token");
      ok(claim2!.job.attempts === 2, "reclaim increments attempts");

      // Stale (old) token can do nothing.
      const stale = { jobId: claim1.job.id, workerId: worker1, leaseToken: claim1.leaseToken };
      ok(!(await store.renewLessonGenerationLease(stale.jobId, stale.workerId, stale.leaseToken)), "old token cannot heartbeat");
      ok(!(await store.updateLessonGenerationStage(stale, { stage: "writing" })), "old token cannot update stage");
      ok(!(await store.incrementLessonGenerationProgress(stale)), "old token cannot update progress");
      ok(
        !(await store.upsertLessonGenerationCheckpoint(stale, { checkpointKey: "x", kind: "batch", payload: [], versions: CURRENT_CHECKPOINT_VERSIONS })),
        "old token cannot write checkpoint",
      );
      ok((await store.failLessonGenerationJob(stale, { error: "e", category: "provider", retryable: true })).ok === false, "old token cannot fail job");
      ok((await store.publishLessonAndCompleteJob(stale, { title: "T", blocks: [], estimatedMinutes: 1 })).ok === false, "old token cannot publish");

      // Active (new) token can publish; completed job is not reclaimable.
      const fresh2 = { jobId: claim2!.job.id, workerId: "wd", leaseToken: claim2!.leaseToken };
      ok((await store.publishLessonAndCompleteJob(fresh2, { title: "Final", blocks: [], estimatedMinutes: 9 })).ok === true, "active token publishes atomically");
      const reclaimCompleted = await store.claimNextLessonGenerationJob({ workerId: "we" });
      ok(!reclaimCompleted || reclaimCompleted.job.id !== claim2!.job.id, "completed job cannot be reclaimed");
    }

    // ── §17.1 manual retry resets attempts ───────────────────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextLessonGenerationJob({ workerId: "wf" });
      const fence = { jobId: claim!.job.id, workerId: "wf", leaseToken: claim!.leaseToken };
      // Exhaust attempts → permanent failure.
      await sql`update lesson_generation_jobs set attempts = max_attempts where id=${fence.jobId}`;
      const failed = await store.failLessonGenerationJob(fence, { error: "boom", category: "writer", retryable: true });
      ok(failed.ok && failed.status === "failed", "exhausted attempts → failed");
      const lr = await sql`select status from lessons where id=${lessonId}`;
      ok(lr[0].status === "planned", "permanent failure resets lesson to planned");
      const retry = await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      ok(retry.kind === "retried", "manual retry reuses the row");
      const jr = await sql`select status, stage, attempts from lesson_generation_jobs where id=${claim!.job.id}`;
      ok(jr[0].attempts === 0 && jr[0].status === "queued" && jr[0].stage === "queued", "manual retry resets attempts/status/stage");
    }

    // ── §17.2 checkpoint idempotency + version roundtrip ──────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLessonGenerationJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextLessonGenerationJob({ workerId: "wg" });
      const fence = { jobId: claim!.job.id, workerId: "wg", leaseToken: claim!.leaseToken };

      await store.upsertLessonGenerationCheckpoint(fence, { checkpointKey: "plan:v1", kind: "plan", payload: { a: 1 }, versions: CURRENT_CHECKPOINT_VERSIONS });
      await store.upsertLessonGenerationCheckpoint(fence, { checkpointKey: "plan:v1", kind: "plan", payload: { a: 2 }, versions: CURRENT_CHECKPOINT_VERSIONS });
      await store.upsertLessonGenerationCheckpoint(fence, { checkpointKey: "batch:quiz:14", kind: "batch", payload: [{ order: 14 }], versions: CURRENT_CHECKPOINT_VERSIONS });
      await store.upsertLessonGenerationCheckpoint(fence, { checkpointKey: "batch:quiz:14", kind: "batch", payload: [{ order: 14 }], versions: CURRENT_CHECKPOINT_VERSIONS });
      const cps = await store.loadLessonGenerationCheckpoints(fence.jobId);
      ok(cps.length === 2, "idempotent upserts keep one row per key");
      const plan = cps.find((c) => c.checkpointKey === "plan:v1");
      ok(plan?.kind === "plan" && (plan?.payload as { a: number }).a === 2, "checkpoint upsert overwrites payload");
      ok(
        plan?.versions.irVersion === CURRENT_CHECKPOINT_VERSIONS.irVersion && plan?.versions.promptVersion === CURRENT_CHECKPOINT_VERSIONS.promptVersion,
        "checkpoint versions round-trip",
      );

      // Fenced deletion helpers.
      ok(await store.deleteLessonGenerationBatchCheckpoints(fence), "batch checkpoints deletable (fenced)");
      const afterBatch = await store.loadLessonGenerationCheckpoints(fence.jobId);
      ok(afterBatch.length === 1 && afterBatch[0].kind === "plan", "batch delete keeps the plan checkpoint");
      ok(await store.deleteLessonGenerationPlanAndDependents(fence), "plan+dependents deletable (fenced)");
      ok((await store.loadLessonGenerationCheckpoints(fence.jobId)).length === 0, "plan+dependents delete clears all checkpoints");
    }

    await resetTestDb(sql);
  } finally {
    await teardownTestDb(sql);
  }

  finish(NAME);
}

main().catch((error) => {
  process.stderr.write(`${error}\n`);
  process.exit(1);
});
