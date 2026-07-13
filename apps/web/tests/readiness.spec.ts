import { describe, expect, it } from "vitest";
import { readinessHttpStatus } from "../src/lib/health/readiness";
import type { KnowledgeGraphHealth } from "../src/lib/knowledge-graph/health";
import type { JobQueueHealth } from "../src/lib/courses/job-queue-health";

const healthy: KnowledgeGraphHealth = {
  status: "ok",
  database: "ok",
  kg: { schema: "ok", embeddings: "ok", modelVersion: "test" },
};
const jobs: JobQueueHealth = {
  status: "ok",
  stallThresholdSeconds: 600,
  workerStaleThresholdSeconds: 30,
  queues: {},
  workers: {},
  warnings: [],
};

describe("readiness HTTP contract", () => {
  it("returns 200 only when KG, queues, workers and Agent are ready", () => {
    expect(readinessHttpStatus(healthy, jobs, { status: "ok" })).toBe(200);
  });

  it.each(["unknown", "stalled"] as const)("returns 503 for %s queue health", (status) => {
    expect(readinessHttpStatus(healthy, { ...jobs, status }, { status: "ok" })).toBe(503);
  });

  it("returns 503 when Agent or database is unavailable", () => {
    expect(readinessHttpStatus(healthy, jobs, { status: "unavailable" })).toBe(503);
    expect(readinessHttpStatus({ ...healthy, status: "unhealthy", database: "unavailable" }, jobs, { status: "ok" })).toBe(503);
  });
});
