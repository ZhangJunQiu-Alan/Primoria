import { hostname } from "node:os";
import { randomBytes } from "node:crypto";
import { loadLocalEnv } from "../../scripts/load-local-env";

loadLocalEnv();

import { hasDatabaseUrl } from "../lib/db/client";
import { classifyGenerationError } from "../lib/ai/course-generation/generation-errors";
import { recordLearningEvent } from "../lib/learning-events/store";
import {
  claimNextLessonGenerationJob,
  failLessonGenerationJob,
  renewLessonGenerationLease,
  HEARTBEAT_INTERVAL_MS,
  WORKER_IDLE_POLL_MS,
  type LessonGenerationClaim,
} from "../lib/courses/lesson-generation-jobs";
import { processLessonGenerationJob, type ProcessLessonJobOutcome } from "../lib/courses/lesson-generation-processor";

// Long-running recoverable Lesson Worker (engineering doc §8). Owned by the web
// package; uses platform/server model configuration only (no BYOK). Run with:
//   pnpm --filter @primoria/web worker:lesson-generation
// Closing a browser page never stops generation; a crashed worker's lease
// expires and another worker resumes from existing checkpoints.

const WORKER_ID = `lesson_worker_${hostname()}_${process.pid}_${randomBytes(3).toString("hex")}`;
const SHUTDOWN_GRACE_MS = 10_000;

// Concurrent claim loops in this process (multi-lesson parallelism). Claims use
// FOR UPDATE SKIP LOCKED and every claim carries its own lease token, so loops
// can safely share one WORKER_ID.
const rawWorkerConcurrency = Number(process.env.LESSON_WORKER_CONCURRENCY ?? "");
const WORKER_CONCURRENCY =
  Number.isInteger(rawWorkerConcurrency) && rawWorkerConcurrency >= 1 && rawWorkerConcurrency <= 4
    ? rawWorkerConcurrency
    : 2;

let running = true;

function log(level: "info" | "warn" | "error", message: string, fields: Record<string, unknown> = {}) {
  const line = { ts: new Date().toISOString(), workerId: WORKER_ID, message, ...fields };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Non-overlapping recursive heartbeat (doc §7.2). Renews every 60s; on a failed
// renewal it marks the claim lost and stops — it never overlaps with itself.
function startHeartbeat(claim: LessonGenerationClaim) {
  let stopped = false;
  let lost = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;
    let ok = false;
    let queryFailed = false;
    try {
      ok = await renewLessonGenerationLease(claim.job.id, claim.workerId, claim.leaseToken);
    } catch (error) {
      log("warn", "heartbeat renewal threw", { jobId: claim.job.id, error: String(error) });
      queryFailed = true;
    }
    if (queryFailed) {
      // Query failed (network glitch). Do not stop the heartbeat or mark it lost yet;
      // try again in the next interval since our lease token might still be valid.
      if (!stopped) timer = setTimeout(tick, HEARTBEAT_INTERVAL_MS);
      return;
    }
    if (!ok) {
      lost = true;
      log("warn", "lease lost; stopping heartbeat", { jobId: claim.job.id });
      return;
    }
    if (!stopped) timer = setTimeout(tick, HEARTBEAT_INTERVAL_MS);
  };

  timer = setTimeout(tick, HEARTBEAT_INTERVAL_MS);

  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
    isLost() {
      return lost;
    },
  };
}

// course.generated is emitted exactly once per new Course after its first lesson
// is published (doc §14). A deterministic event id + ON CONFLICT DO NOTHING makes
// it idempotent. Best-effort: logging must never roll back a published lesson.
async function emitCourseGeneratedOnce(outcome: ProcessLessonJobOutcome) {
  try {
    await recordLearningEvent({
      type: "course.generated",
      id: `course_generated_${outcome.courseId}`,
      ownerId: outcome.ownerId,
      courseId: outcome.courseId,
      graphId: outcome.graphId,
      topic: outcome.topic,
      source: "cold_start",
    });
  } catch (error) {
    log("warn", "course.generated emission failed", { courseId: outcome.courseId, error: String(error) });
  }
}

async function processClaim(claim: LessonGenerationClaim) {
  const { id: jobId, ownerId, courseId, lessonId, attempts } = claim.job;
  const fence = { jobId, workerId: claim.workerId, leaseToken: claim.leaseToken };
  const startedAt = Date.now();
  log("info", "claimed job", { jobId, courseId, lessonId, attempt: attempts });
  const heartbeat = startHeartbeat(claim);

  try {
    const outcome = await processLessonGenerationJob(claim);
    log("info", "job completed", { jobId, courseId, lessonId, durationMs: Date.now() - startedAt });
    await emitCourseGeneratedOnce(outcome);
  } catch (error) {
    const { category, retryable } = classifyGenerationError(error);
    const message = error instanceof Error ? error.message : String(error);
    if (category === "lease_lost") {
      // Claim lost: do not write anything (doc §7.2). Expiry enables recovery.
      log("warn", "job abandoned after lease loss", { jobId, courseId, lessonId, errorCategory: category });
      return;
    }
    log("error", "job attempt failed", { jobId, courseId, lessonId, errorCategory: category, retryable, error: message, durationMs: Date.now() - startedAt });
    const result = await failLessonGenerationJob(fence, { error: message, category, retryable }).catch((failError) => {
      log("error", "failed to record job failure", { jobId, error: String(failError) });
      return { ok: false } as const;
    });
    if (result.ok) log("info", "job transition recorded", { jobId, status: result.status });
  } finally {
    heartbeat.stop();
  }
}

async function loop(slot: number) {
  while (running) {
    let claim: LessonGenerationClaim | undefined;
    try {
      claim = await claimNextLessonGenerationJob({ workerId: WORKER_ID });
    } catch (error) {
      log("error", "claim query failed", { slot, error: String(error) });
      await sleep(WORKER_IDLE_POLL_MS);
      continue;
    }
    if (!claim) {
      await sleep(WORKER_IDLE_POLL_MS);
      continue;
    }
    await processClaim(claim);
  }
  log("info", "claim loop stopped", { slot });
}

function installSignalHandlers() {
  const shutdown = (signal: string) => {
    if (!running) return;
    log("info", "shutdown signal received; draining", { signal });
    running = false;
    // Stop claiming; allow a short grace window for an in-flight job, then exit.
    // We never release in-flight leases on forced shutdown — expiry recovers them.
    setTimeout(() => {
      log("info", "grace window elapsed; exiting");
      process.exit(0);
    }, SHUTDOWN_GRACE_MS).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

async function main() {
  if (!hasDatabaseUrl()) {
    log("error", "DATABASE_URL is not configured; lesson worker cannot start");
    process.exit(1);
  }
  installSignalHandlers();
  log("info", "lesson generation worker started", {
    idlePollMs: WORKER_IDLE_POLL_MS,
    concurrency: WORKER_CONCURRENCY,
  });
  await Promise.all(Array.from({ length: WORKER_CONCURRENCY }, (_, slot) => loop(slot)));
  log("info", "lesson generation worker stopped");
  process.exit(0);
}

main().catch((error) => {
  log("error", "worker crashed", { error: String(error) });
  process.exit(1);
});
