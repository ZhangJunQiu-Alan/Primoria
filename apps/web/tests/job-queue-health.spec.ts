import { describe, expect, it } from "vitest";

import { checkJobQueueHealth, summarizeJobQueues } from "../src/lib/courses/job-queue-health";

describe("job queue health", () => {
  it("reports ok when no queued job exceeds the stall threshold", () => {
    const health = summarizeJobQueues(
      {
        lessonGeneration: { queued: 3, running: 1, failed: 0, oldestQueuedSeconds: 120 },
        extractor: { queued: 0, running: 0, failed: 2, oldestQueuedSeconds: null },
      },
      600,
    );
    expect(health.status).toBe("ok");
  });

  it("reports stalled when one queue's oldest job waits past the threshold", () => {
    const health = summarizeJobQueues(
      {
        lessonGeneration: { queued: 1, running: 0, failed: 0, oldestQueuedSeconds: 601 },
      },
      600,
    );
    expect(health.status).toBe("stalled");
  });

  it("aggregates counts from all three job tables", async () => {
    const queried: string[] = [];
    const health = await checkJobQueueHealth(async (text) => {
      queried.push(text);
      return { rows: [{ queued: "2", running: "1", failed: "0", oldest_queued_seconds: "42" }] };
    }, 600);

    expect(queried).toHaveLength(3);
    expect(queried.join(" ")).toContain("lesson_generation_jobs");
    expect(queried.join(" ")).toContain("learning_progress_jobs");
    expect(queried.join(" ")).toContain("extractor_jobs");
    expect(health.status).toBe("ok");
    expect(health.queues.lessonGeneration).toEqual({
      queued: 2,
      running: 1,
      failed: 0,
      oldestQueuedSeconds: 42,
    });
  });

  it("returns unknown instead of throwing when job tables are missing", async () => {
    const health = await checkJobQueueHealth(async () => {
      throw Object.assign(new Error('relation "public.lesson_generation_jobs" does not exist'), { code: "42P01" });
    }, 600);
    expect(health).toEqual({ status: "unknown", stallThresholdSeconds: 600, queues: {} });
  });
});
