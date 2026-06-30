#!/usr/bin/env tsx
import {
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

const NAME = "extractor-jobs.db";

async function main() {
  if (skipWithoutTestDb(NAME)) return;
  const sql = await setupTestDb();
  const store = await import("../src/lib/courses/extractor-jobs");

  let seq = 0;
  async function freshLesson() {
    seq += 1;
    const ownerId = `eu_${seq}`;
    const courseId = `ecrs_${seq}`;
    const lessonId = `elsn_${seq}`;
    await seedUser(sql, ownerId);
    await seedCourse(sql, { id: courseId, ownerId, graphId: `eg_${seq}` });
    await seedLesson(sql, { id: lessonId, courseId, ownerId });
    return { ownerId, courseId, lessonId };
  }

  try {
    await resetTestDb(sql);

    // ── enqueue + idempotency ────────────────────────────────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      const e1 = await store.enqueueExtractorJob({ ownerId, courseId, lessonId, graphId: "g1" });
      ok(e1.kind === "queued", "enqueue creates one queued extractor job");
      const e2 = await store.enqueueExtractorJob({ ownerId, courseId, lessonId, graphId: "g1" });
      ok(e2.kind === "queued" && e2.job.id === e1.job.id, "repeated enqueue returns the same job");
    }

    // ── claim / lease / fencing / complete ───────────────────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueExtractorJob({ ownerId, courseId, lessonId });

      const [c1, c2] = await Promise.all([
        store.claimNextExtractorJob({ workerId: "wa" }),
        store.claimNextExtractorJob({ workerId: "wb" }),
      ]);
      const winners = [c1, c2].filter((c) => c?.job.lessonId === lessonId);
      ok(winners.length === 1, "exactly one worker wins the concurrent claim");
      const claim1 = winners[0]!;
      ok(claim1.job.attempts === 1, "claim increments attempts to 1");

      const reclaimActive = await store.claimNextExtractorJob({ workerId: "wc" });
      ok(!reclaimActive || reclaimActive.job.id !== claim1.job.id, "active lease cannot be reclaimed");

      ok(await store.renewExtractorLease(claim1.job.id, claim1.workerId, claim1.leaseToken), "heartbeat renews active lease");

      // Expire + reclaim with a new token.
      await sql`update extractor_jobs set lease_expires_at = now() - interval '1 second' where id=${claim1.job.id}`;
      const claim2 = await store.claimNextExtractorJob({ workerId: "wd" });
      ok(claim2?.job.id === claim1.job.id, "expired lease can be reclaimed");
      ok(claim2!.leaseToken !== claim1.leaseToken, "reclaim generates a new lease token");
      ok(claim2!.job.attempts === 2, "reclaim increments attempts");

      // Stale token can do nothing.
      const stale = { jobId: claim1.job.id, workerId: claim1.workerId, leaseToken: claim1.leaseToken };
      ok(!(await store.renewExtractorLease(stale.jobId, stale.workerId, stale.leaseToken)), "old token cannot heartbeat");
      ok((await store.completeExtractorJob(stale)).ok === false, "old token cannot complete");

      // Active token completes.
      const fresh2 = { jobId: claim2!.job.id, workerId: "wd", leaseToken: claim2!.leaseToken };
      ok((await store.completeExtractorJob(fresh2)).ok === true, "active token completes the job");
      const [doneRow] = await sql`select status, completed_at from extractor_jobs where id=${claim2!.job.id}`;
      ok(doneRow.status === "completed" && doneRow.completed_at !== null, "completed job is marked done");
      const reclaimCompleted = await store.claimNextExtractorJob({ workerId: "we" });
      ok(!reclaimCompleted || reclaimCompleted.job.id !== claim2!.job.id, "completed job cannot be reclaimed");

      // Re-enqueue of a completed lesson does not re-run.
      const reEnqueue = await store.enqueueExtractorJob({ ownerId, courseId, lessonId });
      ok(reEnqueue.kind === "completed", "completed extraction is not re-run on re-enqueue");
    }

    // ── retryable failure requeues; exhausted budget fails permanently ────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueExtractorJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextExtractorJob({ workerId: "wf" });
      const fence = { jobId: claim!.job.id, workerId: claim!.workerId, leaseToken: claim!.leaseToken };
      const r1 = await store.failExtractorJob(fence, { error: "boom", category: "provider", retryable: true });
      ok(r1.ok && r1.status === "queued", "retryable failure with budget requeues");

      const claim2 = await store.claimNextExtractorJob({ workerId: "wg" });
      ok(claim2?.job.id === claim!.job.id && claim2!.job.attempts === 2, "requeued job is re-claimable at attempt 2");
      const fence2 = { jobId: claim2!.job.id, workerId: claim2!.workerId, leaseToken: claim2!.leaseToken };
      const r2 = await store.failExtractorJob(fence2, { error: "boom again", category: "provider", retryable: true });
      ok(r2.ok && r2.status === "failed", "retryable failure with no budget fails permanently");
    }

    finish(NAME);
  } finally {
    await teardownTestDb(sql);
  }
}

main();
