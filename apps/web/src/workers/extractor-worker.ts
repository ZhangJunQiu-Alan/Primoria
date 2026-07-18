import { hostname } from "node:os";
import { randomBytes } from "node:crypto";
import { loadLocalEnv } from "../../scripts/load-local-env";

loadLocalEnv();

// Workers process one job at a time (plus a heartbeat), so they need very few
// connections. Default low to avoid exhausting the shared Postgres connection
// budget when web + agent + several workers run together locally. An explicit
// DATABASE_POOL_MAX still wins.
if (!process.env.DATABASE_POOL_MAX) process.env.DATABASE_POOL_MAX = "2";

import { hasDatabaseUrl } from "../lib/db/client";
import { classifyGenerationError } from "../lib/ai/course-generation/generation-errors";
import {
  claimNextExtractorJob,
  failExtractorJob,
  reconcileMissingExtractorJobs,
  renewExtractorLease,
  HEARTBEAT_INTERVAL_MS,
  WORKER_IDLE_POLL_MS,
  type ExtractorClaim,
} from "../lib/courses/extractor-jobs";
import { processExtractorJob } from "../lib/courses/extractor-processor";
import { recordWorkerHeartbeat } from "../lib/courses/worker-health";
import {
  claimNextProfileFactIntakeJob,
  failExhaustedProfileFactIntakeJobs,
  failProfileFactIntakeJob,
  renewProfileFactIntakeLease,
  PROFILE_INTAKE_HEARTBEAT_INTERVAL_MS,
  type ProfileFactIntakeClaim,
} from "../lib/learner-facts/intake-jobs";
import { processProfileFactIntakeJob } from "../lib/learner-facts/intake-processor";
import { buildOnboardingCourseIfReady } from "../lib/learner-profile/onboarding-course-readiness";

// Long-running recoverable Extractor Worker (web package). It prioritizes
// explicit profile-intake jobs, then distills lesson activity into durable
// learner_facts. Run with:
//   pnpm --filter @primoria/web worker:extractor
// A crashed worker's lease expires and another worker re-runs the (idempotent)
// job. Independent of the learning-progress worker so a slow/failing LLM
// distillation never blocks the next-step recommendation.

const WORKER_ID = `extractor_worker_${hostname()}_${process.pid}_${randomBytes(3).toString("hex")}`;
const SHUTDOWN_GRACE_MS = 10_000;
const RECONCILE_INTERVAL_MS = 15 * 60_000;
const RECONCILE_BATCH_SIZE = 100;
const PROFILE_INTAKE_RECONCILE_INTERVAL_MS = 60_000;

let running = true;
let lastReconciledAt = 0;
let lastProfileIntakeReconciledAt = 0;

function log(level: "info" | "warn" | "error", message: string, fields: Record<string, unknown> = {}) {
  const line = { ts: new Date().toISOString(), workerId: WORKER_ID, message, ...fields };
  const text = JSON.stringify(line);
  if (level === "error") console.error(text);
  else if (level === "warn") console.warn(text);
  else console.log(text);
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "unknown_error";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Non-overlapping recursive heartbeat: renews every 60s; on a failed renewal it
// stops (lease lost). Mirrors the learning-progress worker.
function startHeartbeat(claim: ExtractorClaim) {
  let stopped = false;
  let lost = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const tick = async () => {
    if (stopped) return;
    let ok = false;
    let queryFailed = false;
    try {
      ok = await renewExtractorLease(claim.job.id, claim.workerId, claim.leaseToken);
    } catch (error) {
      log("warn", "heartbeat renewal threw", { jobId: claim.job.id, error: String(error) });
      queryFailed = true;
    }
    if (queryFailed) {
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

function startProfileIntakeHeartbeat(claim: ProfileFactIntakeClaim) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = async () => {
    if (stopped) return;
    try {
      const ok = await renewProfileFactIntakeLease(claim.job.id, claim.workerId, claim.leaseToken);
      if (!ok) {
        log("warn", "profile intake lease lost; stopping heartbeat", { jobId: claim.job.id });
        return;
      }
    } catch (error) {
      log("warn", "profile intake heartbeat renewal threw", { jobId: claim.job.id, error: String(error) });
    }
    if (!stopped) timer = setTimeout(tick, PROFILE_INTAKE_HEARTBEAT_INTERVAL_MS);
  };
  timer = setTimeout(tick, PROFILE_INTAKE_HEARTBEAT_INTERVAL_MS);
  return {
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
    },
  };
}

async function processClaim(claim: ExtractorClaim) {
  const { id: jobId, ownerId, courseId, lessonId, attempts } = claim.job;
  const fence = { jobId, workerId: claim.workerId, leaseToken: claim.leaseToken };
  const startedAt = Date.now();
  log("info", "claimed job", { jobId, courseId, lessonId, ownerId, attempt: attempts });
  const heartbeat = startHeartbeat(claim);

  try {
    const outcome = await processExtractorJob(claim);
    log("info", "job completed", { jobId, lessonId, added: outcome.added, reinforced: outcome.reinforced, skipped: outcome.skipped, durationMs: Date.now() - startedAt });
  } catch (error) {
    const { category, retryable } = classifyGenerationError(error);
    const message = error instanceof Error ? error.message : String(error);
    if (category === "lease_lost") {
      log("warn", "job abandoned after lease loss", { jobId, lessonId, errorCategory: category });
      return;
    }
    log("error", "job attempt failed", { jobId, lessonId, errorCategory: category, retryable, error: message, durationMs: Date.now() - startedAt });
    const result = await failExtractorJob(fence, { error: message, category, retryable }).catch((failError) => {
      log("error", "failed to record job failure", { jobId, error: String(failError) });
      return { ok: false } as const;
    });
    if (result.ok) log("info", "job transition recorded", { jobId, status: result.status });
  } finally {
    heartbeat.stop();
  }
}

async function processProfileIntakeClaim(claim: ProfileFactIntakeClaim) {
  const { id: jobId, ownerId, sourceKind, attempts } = claim.job;
  const fence = { jobId, workerId: claim.workerId, leaseToken: claim.leaseToken };
  const startedAt = Date.now();
  log("info", "claimed profile intake job", { jobId, ownerId, sourceKind, attempt: attempts });
  const heartbeat = startProfileIntakeHeartbeat(claim);
  try {
    const outcome = await processProfileFactIntakeJob(claim);
    log("info", "profile intake job completed", {
      jobId,
      ownerId,
      sourceKind,
      added: outcome.added,
      reinforced: outcome.reinforced,
      skipped: outcome.skipped,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    const { category, retryable } = classifyGenerationError(error);
    const message = error instanceof Error ? error.message : String(error);
    if (category === "lease_lost") {
      log("warn", "profile intake abandoned after lease loss", { jobId, ownerId, sourceKind });
      return;
    }
    log("error", "profile intake attempt failed", {
      jobId,
      ownerId,
      sourceKind,
      errorCategory: category,
      retryable,
      durationMs: Date.now() - startedAt,
    });
    const result = await failProfileFactIntakeJob(fence, { error: message, category, retryable }).catch((failError) => {
      log("error", "failed to record profile intake failure", { jobId, ownerId, errorName: errorName(failError) });
      return { ok: false } as const;
    });
    if (result.ok) {
      log("info", "profile intake transition recorded", { jobId, status: result.status });
      if (result.status === "failed" && sourceKind === "onboarding") {
        await buildOnboardingCourseIfReady(ownerId).catch((buildError) => {
          log("error", "course build after profile intake failure failed", { jobId, ownerId, errorName: errorName(buildError) });
        });
      }
    }
  } finally {
    heartbeat.stop();
  }
}

async function loop() {
  log("info", "extractor worker started", { idlePollMs: WORKER_IDLE_POLL_MS });
  while (running) {
    if (Date.now() - lastProfileIntakeReconciledAt >= PROFILE_INTAKE_RECONCILE_INTERVAL_MS) {
      try {
        const failed = await failExhaustedProfileFactIntakeJobs(RECONCILE_BATCH_SIZE);
        for (const job of failed) {
          log("warn", "expired profile intake marked failed", {
            jobId: job.jobId,
            ownerId: job.ownerId,
            sourceKind: job.sourceKind,
          });
          if (job.sourceKind === "onboarding") {
            await buildOnboardingCourseIfReady(job.ownerId).catch((error) => {
              log("error", "course build after expired profile intake failed", {
                jobId: job.jobId,
                ownerId: job.ownerId,
                errorName: errorName(error),
              });
            });
          }
        }
      } catch (error) {
        log("error", "profile intake reconciliation failed", { errorName: errorName(error) });
      }
      lastProfileIntakeReconciledAt = Date.now();
    }
    if (Date.now() - lastReconciledAt >= RECONCILE_INTERVAL_MS) {
      try {
        const queued = await reconcileMissingExtractorJobs(RECONCILE_BATCH_SIZE);
        log("info", "extractor reconciliation completed", { queued });
      } catch (error) {
        log("error", "extractor reconciliation failed", { error: String(error) });
      }
      lastReconciledAt = Date.now();
    }
    let profileClaim: ProfileFactIntakeClaim | undefined;
    let claim: ExtractorClaim | undefined;
    try {
      profileClaim = await claimNextProfileFactIntakeJob({ workerId: WORKER_ID });
      if (!profileClaim) claim = await claimNextExtractorJob({ workerId: WORKER_ID });
      await Promise.all([
        recordWorkerHeartbeat("extractor", WORKER_ID),
        recordWorkerHeartbeat("profileFactIntake", WORKER_ID),
      ]).catch((error) => {
        log("warn", "worker heartbeat write failed", { error: String(error) });
      });
    } catch (error) {
      log("error", "claim query failed", { error: String(error) });
      await sleep(WORKER_IDLE_POLL_MS);
      continue;
    }
    if (profileClaim) {
      await processProfileIntakeClaim(profileClaim);
      continue;
    }
    if (!claim) {
      await sleep(WORKER_IDLE_POLL_MS);
      continue;
    }
    await processClaim(claim);
  }
  log("info", "extractor worker stopped");
}

function installSignalHandlers() {
  const shutdown = (signal: string) => {
    if (!running) return;
    log("info", "shutdown signal received; draining", { signal });
    running = false;
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
    log("error", "DATABASE_URL is not configured; extractor worker cannot start");
    process.exit(1);
  }
  installSignalHandlers();
  await loop();
  process.exit(0);
}

main().catch((error) => {
  log("error", "worker crashed", { error: String(error) });
  process.exit(1);
});
