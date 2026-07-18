import { describe, expect, it } from "vitest";

import { checkJobQueueHealth, summarizeJobQueues } from "../src/lib/courses/job-queue-health";

const queue = (overrides: Partial<Parameters<typeof summarizeJobQueues>[0]["lessonGeneration"]> = {}) => ({
  queued: 0,
  running: 0,
  failed: 0,
  oldestQueuedSeconds: null,
  oldestRunningSeconds: null,
  latestJobHeartbeatSeconds: null,
  expiredLeases: 0,
  ...overrides,
});

const workers = {
  lessonGeneration: { workerId: "lesson", ageSeconds: 1, stale: false },
  learningProgress: { workerId: "progress", ageSeconds: 1, stale: false },
  extractor: { workerId: "extractor", ageSeconds: 1, stale: false },
  profileFactIntake: { workerId: "extractor", ageSeconds: 1, stale: false },
};

describe("job queue health", () => {
  it("reports ok when no queued job exceeds the stall threshold", () => {
    const health = summarizeJobQueues(
      {
        lessonGeneration: queue({ queued: 3, running: 1, oldestQueuedSeconds: 120 }),
        extractor: queue({ failed: 2 }),
      },
      600,
      workers,
    );
    expect(health.status).toBe("ok");
  });

  it("reports stalled when one queue's oldest job waits past the threshold", () => {
    const health = summarizeJobQueues(
      {
        lessonGeneration: queue({ queued: 1, oldestQueuedSeconds: 601 }),
      },
      600,
      workers,
    );
    expect(health.status).toBe("stalled");
  });

  it("aggregates counts from all four job tables", async () => {
    const queried: string[] = [];
    const health = await checkJobQueueHealth(async (text) => {
      queried.push(text);
      if (text.includes("worker_heartbeats")) {
        return { rows: Object.entries(workers).map(([worker_type, value]) => ({ worker_type, worker_id: value.workerId, age_seconds: "1" })) };
      }
      return { rows: [{ queued: "2", running: "1", failed: "0", oldest_queued_seconds: "42", oldest_running_seconds: "12", latest_job_heartbeat_seconds: "3", expired_leases: "0" }] };
    }, 600);

    expect(queried).toHaveLength(5);
    expect(queried.join(" ")).toContain("lesson_generation_jobs");
    expect(queried.join(" ")).toContain("learning_progress_jobs");
    expect(queried.join(" ")).toContain("extractor_jobs");
    expect(queried.join(" ")).toContain("profile_fact_intake_jobs");
    expect(health.status).toBe("ok");
    expect(health.queues.lessonGeneration).toEqual({
      queued: 2,
      running: 1,
      failed: 0,
      oldestQueuedSeconds: 42,
      oldestRunningSeconds: 12,
      latestJobHeartbeatSeconds: 3,
      expiredLeases: 0,
    });
  });

  it("returns unknown instead of throwing when job tables are missing", async () => {
    const health = await checkJobQueueHealth(async () => {
      throw Object.assign(new Error('relation "public.lesson_generation_jobs" does not exist'), { code: "42P01" });
    }, 600);
    expect(health).toMatchObject({ status: "unknown", stallThresholdSeconds: 600, queues: {}, workers: {} });
  });

  it("fails readiness when a worker heartbeat is missing or stale", () => {
    const health = summarizeJobQueues({ lessonGeneration: queue() }, 600, {
      ...workers,
      extractor: { workerId: "extractor", ageSeconds: 31, stale: true },
    }, 30);
    expect(health.status).toBe("stalled");
  });

  it("reports failed backlog as a warning without failing readiness", () => {
    const health = summarizeJobQueues({ extractor: queue({ failed: 2 }) }, 600, workers, 30);
    expect(health.status).toBe("ok");
    expect(health.warnings).toEqual(["extractor:failed=2"]);
  });
});
