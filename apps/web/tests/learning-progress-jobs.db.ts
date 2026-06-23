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
import type { LearningDecision } from "../src/lib/courses/learning-progress-decider";

const NAME = "learning-progress-jobs.db";

function remediationDecision(): LearningDecision {
  return {
    kind: "remediation",
    reason: "weak concept",
    targetTopicId: "t1",
    targetConceptId: "c1",
    proposedSortKey: 1.5,
    proposedTitle: "补救：c1",
  };
}

async function main() {
  if (skipWithoutTestDb(NAME)) return;
  const sql = await setupTestDb();
  const store = await import("../src/lib/courses/learning-progress-jobs");
  const courseStore = await import("../src/lib/courses/store");
  const lessonJobs = await import("../src/lib/courses/lesson-generation-jobs");

  let seq = 0;
  async function freshLesson() {
    seq += 1;
    const ownerId = `pu_${seq}`;
    const courseId = `pcrs_${seq}`;
    const lessonId = `plsn_${seq}`;
    await seedUser(sql, ownerId);
    await seedCourse(sql, { id: courseId, ownerId, graphId: `pg_${seq}` });
    await seedLesson(sql, { id: lessonId, courseId, ownerId });
    return { ownerId, courseId, lessonId };
  }

  try {
    await resetTestDb(sql);

    // ── enqueue + idempotency + ownership ────────────────────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      const e1 = await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId, graphId: "g1" });
      ok(e1.kind === "queued", "enqueue creates one queued progress job");
      const e2 = await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId, graphId: "g1" });
      ok(e2.kind === "queued" && e2.job.id === e1.job.id, "repeated enqueue returns the same job");
      const denied = await store.getLearningProgressJob(e1.job.id, "intruder");
      ok(denied === undefined, "ownership check rejects another user");
    }

    // ── claim / lease / fencing / complete-with-decision ─────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId });

      const [c1, c2] = await Promise.all([
        store.claimNextLearningProgressJob({ workerId: "wa" }),
        store.claimNextLearningProgressJob({ workerId: "wb" }),
      ]);
      const winners = [c1, c2].filter((c) => c?.job.lessonId === lessonId);
      ok(winners.length === 1, "exactly one worker wins the concurrent claim");
      const claim1 = winners[0]!;
      ok(claim1.job.attempts === 1, "claim increments attempts to 1");

      const reclaimActive = await store.claimNextLearningProgressJob({ workerId: "wc" });
      ok(!reclaimActive || reclaimActive.job.id !== claim1.job.id, "active lease cannot be reclaimed");

      ok(await store.renewLearningProgressLease(claim1.job.id, claim1.workerId, claim1.leaseToken), "heartbeat renews active lease");

      // Expire + reclaim with a new token.
      await sql`update learning_progress_jobs set lease_expires_at = now() - interval '1 second' where id=${claim1.job.id}`;
      const claim2 = await store.claimNextLearningProgressJob({ workerId: "wd" });
      ok(claim2?.job.id === claim1.job.id, "expired lease can be reclaimed");
      ok(claim2!.leaseToken !== claim1.leaseToken, "reclaim generates a new lease token");
      ok(claim2!.job.attempts === 2, "reclaim increments attempts");

      // Stale token can do nothing.
      const stale = { jobId: claim1.job.id, workerId: claim1.workerId, leaseToken: claim1.leaseToken };
      ok(!(await store.renewLearningProgressLease(stale.jobId, stale.workerId, stale.leaseToken)), "old token cannot heartbeat");
      ok(!(await store.updateLearningProgressStage(stale, "mastery")), "old token cannot update stage");
      ok((await store.completeLearningProgressJobWithDecision(stale, remediationDecision())).ok === false, "old token cannot complete");

      // Active token completes with a pending decision.
      const fresh2 = { jobId: claim2!.job.id, workerId: "wd", leaseToken: claim2!.leaseToken };
      ok((await store.completeLearningProgressJobWithDecision(fresh2, remediationDecision())).ok === true, "active token records the decision");
      const summary = await store.getLearningProgressJob(claim2!.job.id, ownerId);
      ok(summary?.status === "completed" && summary?.decisionStatus === "pending", "completed job has a pending decision");
      ok(summary?.decision?.kind === "remediation", "decision round-trips");
      const reclaimCompleted = await store.claimNextLearningProgressJob({ workerId: "we" });
      ok(!reclaimCompleted || reclaimCompleted.job.id !== claim2!.job.id, "completed job cannot be reclaimed");

      // Re-enqueue of a completed lesson does not re-run.
      const reEnqueue = await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId });
      ok(reEnqueue.kind === "completed", "completed orchestration is not re-run on re-enqueue");
    }

    // ── pending list + decision resolution (accept / dismiss) ────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextLearningProgressJob({ workerId: "wp" });
      const fence = { jobId: claim!.job.id, workerId: claim!.workerId, leaseToken: claim!.leaseToken };
      await store.completeLearningProgressJobWithDecision(fence, remediationDecision());

      const pending = await store.listPendingDecisionsByCourse(courseId, ownerId);
      ok(pending.length === 1 && pending[0].id === claim!.job.id, "pending decision listed for the course");
      ok((await store.listPendingDecisionsByCourse(courseId, "intruder")).length === 0, "pending decisions are owner-scoped");

      ok((await store.resolveLearningProgressDecision(claim!.job.id, "intruder", "accepted")) === undefined, "another user cannot resolve");
      const resolved = await store.resolveLearningProgressDecision(claim!.job.id, ownerId, "accepted");
      ok(resolved?.decisionStatus === "accepted" && resolved?.decision?.kind === "remediation", "accept returns the job + decision");
      ok((await store.listPendingDecisionsByCourse(courseId, ownerId)).length === 0, "resolved decision leaves the pending list");
      ok((await store.resolveLearningProgressDecision(claim!.job.id, ownerId, "dismissed")) === undefined, "a non-pending decision cannot be resolved again");
    }

    // ── accept materialization: remediation lesson + lesson job (route logic) ─
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextLearningProgressJob({ workerId: "wm" });
      const fence = { jobId: claim!.job.id, workerId: claim!.workerId, leaseToken: claim!.leaseToken };
      await store.completeLearningProgressJobWithDecision(fence, remediationDecision());
      const resolved = await store.resolveLearningProgressDecision(claim!.job.id, ownerId, "accepted");

      const remId = `rem_${claim!.job.id}`;
      const l1 = await courseStore.insertPlannedLesson({
        id: remId,
        courseId,
        ownerId,
        topicId: resolved!.decision!.targetTopicId,
        title: resolved!.decision!.proposedTitle ?? "补救",
        role: "remediation",
        sortKey: resolved!.decision!.proposedSortKey ?? 99,
        triggeredFrom: lessonId,
      });
      const l2 = await courseStore.insertPlannedLesson({
        id: remId,
        courseId,
        ownerId,
        topicId: "t1",
        title: "补救",
        role: "remediation",
        sortKey: 1.5,
        triggeredFrom: lessonId,
      });
      ok(l1.id === remId && l2.id === remId, "insertPlannedLesson is idempotent on a deterministic id");
      const lessonCount = await sql`select count(*)::int n from lessons where id=${remId}`;
      ok(lessonCount[0].n === 1, "double-accept creates exactly one remediation lesson");
      ok(l1.role === "remediation" && l1.status === "planned", "remediation lesson is planned");

      const enq = await lessonJobs.enqueueLessonGenerationJob({ ownerId, courseId, lessonId: remId });
      ok(enq.kind === "queued", "remediation lesson is enqueued for generation");
      const genJob = await lessonJobs.getLessonGenerationJobByLessonId(remId, ownerId);
      ok(genJob?.lessonId === remId, "a lesson generation job exists for the remediation lesson");
    }

    // ── fail / retry ─────────────────────────────────────────────────────────
    {
      const { ownerId, courseId, lessonId } = await freshLesson();
      await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId });
      const claim = await store.claimNextLearningProgressJob({ workerId: "wf" });
      const fence = { jobId: claim!.job.id, workerId: claim!.workerId, leaseToken: claim!.leaseToken };
      await sql`update learning_progress_jobs set attempts = max_attempts where id=${fence.jobId}`;
      const failed = await store.failLearningProgressJob(fence, { error: "boom", category: "persistence", retryable: false });
      ok(failed.ok && failed.status === "failed", "non-retryable failure → failed");
      const retry = await store.enqueueLearningProgressJob({ ownerId, courseId, lessonId });
      ok(retry.kind === "retried", "re-enqueue of a failed job retries it");
      const jr = await sql`select status, attempts from learning_progress_jobs where id=${claim!.job.id}`;
      ok(jr[0].attempts === 0 && jr[0].status === "queued", "retry resets attempts/status");
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
