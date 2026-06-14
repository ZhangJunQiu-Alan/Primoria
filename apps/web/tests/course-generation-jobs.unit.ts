#!/usr/bin/env tsx

import { eq, inArray } from "drizzle-orm";
import { hasDatabaseUrl, getDb } from "../src/lib/db/client.ts";
import { courseGenerationJobs, users } from "../src/lib/db/schema.ts";
import {
  claimNextCourseGenerationJob,
  completeCourseGenerationJob,
  enqueueCourseGenerationJob,
  failCourseGenerationJob,
  listCourseGenerationJobs,
} from "../src/lib/courses/generation-jobs.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

async function main() {
  if (!hasDatabaseUrl()) {
    process.stdout.write("[course-generation-jobs.unit] SKIPPED: DATABASE_URL is not configured\n");
    return;
  }

  const ownerA = id("owner_a");
  const ownerB = id("owner_b");
  const jobIds: string[] = [];

  await getDb().insert(users).values([
    { id: ownerA, displayName: "Course Job Owner A", createdAt: new Date(), updatedAt: new Date() },
    { id: ownerB, displayName: "Course Job Owner B", createdAt: new Date(), updatedAt: new Date() },
  ]);

  try {
    const first = await enqueueCourseGenerationJob({
      ownerId: ownerA,
      courseId: id("crs_fixed"),
      topic: "Information entropy intuition",
      contextHint: "Generated from the main tutor.",
    });
    jobIds.push(first.id);

    assert(first.status === "queued", "new job starts queued");
    assert(first.ownerId === ownerA, "new job records owner");
    assert(first.courseId.startsWith("crs_fixed"), "new job preserves fixed course id");

    const visibleToA = await listCourseGenerationJobs(ownerA);
    const visibleToB = await listCourseGenerationJobs(ownerB);
    assert(visibleToA.some((job) => job.id === first.id), "owner can list own active job");
    assert(!visibleToB.some((job) => job.id === first.id), "other owner cannot list job");

    const claimed = await claimNextCourseGenerationJob({ workerId: "worker-a", leaseMs: 30_000 });
    assert(claimed?.id === first.id, "worker claims queued job");
    assert(claimed.status === "running", "claimed job is running");
    assert(claimed.attempts === 1, "first claim increments attempts");

    const locked = await claimNextCourseGenerationJob({ workerId: "worker-b", leaseMs: 30_000 });
    assert(!locked || locked.id !== first.id, "leased job is not claimed by a second worker");

    await getDb()
      .update(courseGenerationJobs)
      .set({ leaseExpiresAt: new Date(Date.now() - 1_000) })
      .where(eq(courseGenerationJobs.id, first.id));

    const reclaimed = await claimNextCourseGenerationJob({ workerId: "worker-b", leaseMs: 30_000 });
    assert(reclaimed?.id === first.id, "expired running job can be reclaimed");
    assert(reclaimed.attempts === 2, "reclaim increments attempts");

    await completeCourseGenerationJob(first.id, first.courseId);
    const activeAfterComplete = await listCourseGenerationJobs(ownerA);
    assert(!activeAfterComplete.some((job) => job.id === first.id), "completed job is hidden from active job list");

    const failing = await enqueueCourseGenerationJob({
      ownerId: ownerA,
      topic: "Retryable course generation",
    });
    jobIds.push(failing.id);

    const firstTry = await claimNextCourseGenerationJob({ workerId: "worker-a", leaseMs: 30_000 });
    assert(firstTry?.id === failing.id, "worker claims second job");
    await failCourseGenerationJob(failing.id, "provider timed out", { maxAttempts: 2 });

    const afterRetryableFailure = await listCourseGenerationJobs(ownerA);
    const retryable = afterRetryableFailure.find((job) => job.id === failing.id);
    assert(retryable?.status === "queued", "job is requeued before max attempts");
    assert(retryable.lastError === "provider timed out", "retryable failure records last error");

    const secondTry = await claimNextCourseGenerationJob({ workerId: "worker-a", leaseMs: 30_000 });
    assert(secondTry?.id === failing.id && secondTry.attempts === 2, "worker can claim retry");
    await failCourseGenerationJob(failing.id, "invalid JSON", { maxAttempts: 2 });

    const afterFinalFailure = await listCourseGenerationJobs(ownerA);
    const failed = afterFinalFailure.find((job) => job.id === failing.id);
    assert(failed?.status === "failed", "job becomes failed at max attempts");
    assert(failed.lastError === "invalid JSON", "final failure records last error");

    process.stdout.write("[course-generation-jobs.unit] ALL CHECKS PASSED\n");
  } finally {
    if (jobIds.length > 0) {
      await getDb().delete(courseGenerationJobs).where(inArray(courseGenerationJobs.id, jobIds));
    }
    await getDb().delete(users).where(inArray(users.id, [ownerA, ownerB]));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
