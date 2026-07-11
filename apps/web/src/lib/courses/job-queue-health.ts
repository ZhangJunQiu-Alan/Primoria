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
};

export type JobQueueHealth = {
  /** `stalled` = at least one queue has a job waiting past the threshold — the
   * usual cause is a dead worker. `unknown` = tables missing or unreadable. */
  status: "ok" | "stalled" | "unknown";
  stallThresholdSeconds: number;
  queues: Partial<Record<JobQueueName, JobQueueCounts>>;
};

export const DEFAULT_QUEUE_STALL_SECONDS = 600;

export function getQueueStallThresholdSeconds(): number {
  const configured = Number(process.env.PRIMORIA_HEALTH_QUEUE_STALL_SECONDS ?? "");
  if (Number.isFinite(configured) && configured > 0) return Math.floor(configured);
  return DEFAULT_QUEUE_STALL_SECONDS;
}

export function summarizeJobQueues(
  queues: Partial<Record<JobQueueName, JobQueueCounts>>,
  stallThresholdSeconds: number,
): JobQueueHealth {
  const stalled = Object.values(queues).some(
    (queue) => queue.oldestQueuedSeconds !== null && queue.oldestQueuedSeconds > stallThresholdSeconds,
  );
  return { status: stalled ? "stalled" : "ok", stallThresholdSeconds, queues };
}

function toCount(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function checkJobQueueHealth(
  query: HealthQuery,
  stallThresholdSeconds = getQueueStallThresholdSeconds(),
): Promise<JobQueueHealth> {
  try {
    const queues: Partial<Record<JobQueueName, JobQueueCounts>> = {};
    for (const [name, table] of Object.entries(JOB_QUEUE_TABLES) as Array<[JobQueueName, string]>) {
      const result = await query(
        `select
           count(*) filter (where status = 'queued')::int as queued,
           count(*) filter (where status = 'running')::int as running,
           count(*) filter (where status = 'failed')::int as failed,
           floor(extract(epoch from now() - min(updated_at) filter (where status = 'queued')))::int as oldest_queued_seconds
         from public.${table}`,
      );
      const row = result.rows[0] ?? {};
      queues[name] = {
        queued: toCount(row.queued),
        running: toCount(row.running),
        failed: toCount(row.failed),
        oldestQueuedSeconds: row.oldest_queued_seconds == null ? null : toCount(row.oldest_queued_seconds),
      };
    }
    return summarizeJobQueues(queues, stallThresholdSeconds);
  } catch {
    // Missing job tables (pre-migration) or a read error: report unknown
    // rather than failing the whole health endpoint.
    return { status: "unknown", stallThresholdSeconds, queues: {} };
  }
}
