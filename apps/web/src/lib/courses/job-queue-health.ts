import type { HealthQuery } from "@/lib/knowledge-graph/health";

/** Job tables share the status contract: queued | running | completed | failed. */
const JOB_QUEUE_TABLES = {
  lessonGeneration: "lesson_generation_jobs",
  learningProgress: "learning_progress_jobs",
  extractor: "extractor_jobs",
} as const;

export type JobQueueName = keyof typeof JOB_QUEUE_TABLES;

export type JobQueueCounts = {
  queued: number;
  running: number;
  failed: number;
  /** Age of the oldest job still in `queued`, from its last status write. */
  oldestQueuedSeconds: number | null;
  oldestRunningSeconds: number | null;
  latestJobHeartbeatSeconds: number | null;
  expiredLeases: number;
};

export type WorkerHeartbeatHealth = {
  workerId: string;
  ageSeconds: number;
  stale: boolean;
};

export type JobQueueHealth = {
  /** `stalled` = at least one queue has a job waiting past the threshold — the
   * usual cause is a dead worker. `unknown` = tables missing or unreadable. */
  status: "ok" | "stalled" | "unknown";
  stallThresholdSeconds: number;
  workerStaleThresholdSeconds: number;
  queues: Partial<Record<JobQueueName, JobQueueCounts>>;
  workers: Partial<Record<JobQueueName, WorkerHeartbeatHealth>>;
  warnings: string[];
};

export const DEFAULT_QUEUE_STALL_SECONDS = 600;
export const DEFAULT_WORKER_STALE_SECONDS = 30;

export function getQueueStallThresholdSeconds(): number {
  const configured = Number(process.env.PRIMORIA_HEALTH_QUEUE_STALL_SECONDS ?? "");
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
  return DEFAULT_QUEUE_STALL_SECONDS;
}

export function getWorkerStaleThresholdSeconds(): number {
  const configured = Number(process.env.PRIMORIA_HEALTH_WORKER_STALE_SECONDS ?? "");
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
  return DEFAULT_WORKER_STALE_SECONDS;
}

export function summarizeJobQueues(
  queues: Partial<Record<JobQueueName, JobQueueCounts>>,
  stallThresholdSeconds: number,
  workers: Partial<Record<JobQueueName, WorkerHeartbeatHealth>> = {},
  workerStaleThresholdSeconds = getWorkerStaleThresholdSeconds(),
): JobQueueHealth {
  const stalledQueue = Object.values(queues).some((queue) =>
    (queue.oldestQueuedSeconds !== null && queue.oldestQueuedSeconds > stallThresholdSeconds)
    || (queue.oldestRunningSeconds !== null && queue.oldestRunningSeconds > stallThresholdSeconds)
    || queue.expiredLeases > 0,
  );
  const workerUnready = (Object.keys(JOB_QUEUE_TABLES) as JobQueueName[]).some((name) => !workers[name] || workers[name]?.stale);
  const warnings = Object.entries(queues)
    .filter(([, queue]) => queue.failed > 0)
    .map(([name, queue]) => `${name}:failed=${queue.failed}`);
  return {
    status: stalledQueue || workerUnready ? "stalled" : "ok",
    stallThresholdSeconds,
    workerStaleThresholdSeconds,
    queues,
    workers,
    warnings,
  };
}

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function checkJobQueueHealth(
  query: HealthQuery,
  stallThresholdSeconds = getQueueStallThresholdSeconds(),
  workerStaleThresholdSeconds = getWorkerStaleThresholdSeconds(),
): Promise<JobQueueHealth> {
  try {
    const queues: Partial<Record<JobQueueName, JobQueueCounts>> = {};
    for (const [name, table] of Object.entries(JOB_QUEUE_TABLES) as Array<[JobQueueName, string]>) {
      const result = await query(
        `select
           count(*) filter (where status = 'queued')::int as queued,
           count(*) filter (where status = 'running')::int as running,
           count(*) filter (where status = 'failed')::int as failed,
           floor(extract(epoch from now() - min(updated_at) filter (where status = 'queued')))::int as oldest_queued_seconds,
           floor(extract(epoch from now() - min(started_at) filter (where status = 'running')))::int as oldest_running_seconds,
           floor(extract(epoch from now() - max(heartbeat_at) filter (where status = 'running')))::int as latest_job_heartbeat_seconds,
           count(*) filter (where status = 'running' and lease_expires_at < now())::int as expired_leases
         from public.${table}`,
      );
      const row = result.rows[0] ?? {};
      queues[name] = {
        queued: toCount(row.queued),
        running: toCount(row.running),
        failed: toCount(row.failed),
        oldestQueuedSeconds: row.oldest_queued_seconds == null ? null : toCount(row.oldest_queued_seconds),
        oldestRunningSeconds: row.oldest_running_seconds == null ? null : toCount(row.oldest_running_seconds),
        latestJobHeartbeatSeconds: row.latest_job_heartbeat_seconds == null ? null : toCount(row.latest_job_heartbeat_seconds),
        expiredLeases: toCount(row.expired_leases),
      };
    }
    const heartbeatRows = await query(`select worker_type, worker_id, floor(extract(epoch from now() - heartbeat_at))::int as age_seconds from public.worker_heartbeats`);
    const workers: Partial<Record<JobQueueName, WorkerHeartbeatHealth>> = {};
    for (const row of heartbeatRows.rows) {
      const workerType = String(row.worker_type) as JobQueueName;
      if (!(workerType in JOB_QUEUE_TABLES)) continue;
      const ageSeconds = toCount(row.age_seconds);
      workers[workerType] = { workerId: String(row.worker_id), ageSeconds, stale: ageSeconds > workerStaleThresholdSeconds };
    }
    return summarizeJobQueues(queues, stallThresholdSeconds, workers, workerStaleThresholdSeconds);
  } catch {
    // Missing job tables (pre-migration) or a read error: report unknown
    // rather than failing the whole health endpoint.
    return { status: "unknown", stallThresholdSeconds, workerStaleThresholdSeconds, queues: {}, workers: {}, warnings: [] };
  }
}
