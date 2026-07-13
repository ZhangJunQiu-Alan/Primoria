import { NextResponse } from "next/server";
import { checkKnowledgeGraphHealth, type KnowledgeGraphHealth } from "../knowledge-graph/health";
import { getKnowledgeGraphPool } from "../knowledge-graph/search";
import {
  checkJobQueueHealth,
  getQueueStallThresholdSeconds,
  getWorkerStaleThresholdSeconds,
  type JobQueueHealth,
} from "../courses/job-queue-health";

function emptyJobs(): JobQueueHealth {
  return {
    status: "unknown",
    stallThresholdSeconds: getQueueStallThresholdSeconds(),
    workerStaleThresholdSeconds: getWorkerStaleThresholdSeconds(),
    queues: {},
    workers: {},
    warnings: [],
  };
}

async function checkAgentReadiness() {
  const baseUrl = (process.env.PRIMORIA_AGENT_URL ?? "http://localhost:2024").replace(/\/$/, "");
  const startedAt = Date.now();
  try {
    const response = await fetch(`${baseUrl}/health/ready`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return { status: response.ok ? "ok" as const : "unavailable" as const, latencyMs: Date.now() - startedAt };
  } catch {
    return { status: "unavailable" as const, latencyMs: Date.now() - startedAt };
  }
}

export function readinessHttpStatus(
  health: KnowledgeGraphHealth,
  jobs: JobQueueHealth,
  agent: { status: "ok" | "unknown" | "unavailable" },
) {
  return health.status === "ok" && jobs.status === "ok" && agent.status === "ok" ? 200 : 503;
}

export async function readinessResponse(request?: Request) {
  const startedAt = Date.now();
  let health: KnowledgeGraphHealth;
  let jobs = emptyJobs();
  try {
    const pool = getKnowledgeGraphPool();
    const query = async (text: string, params?: unknown[]) => pool.query(text, params as never[]);
    health = await checkKnowledgeGraphHealth(query);
    if (health.database === "ok") jobs = await checkJobQueueHealth(query);
  } catch (error) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", message: "readiness check failed", error: String(error) }));
    health = { status: "unhealthy", database: "unavailable", kg: { schema: "unknown", embeddings: "unknown", modelVersion: null } };
  }
  const agent = await checkAgentReadiness();
  const httpStatus = readinessHttpStatus(health, jobs, agent);
  const ready = httpStatus === 200;
  const status = ready ? "ok" : "unhealthy";
  const requestId = request?.headers.get("x-request-id") ?? null;
  const body = { ...health, status, jobs, agent, requestId, durationMs: Date.now() - startedAt };
  if (!ready) console.warn(JSON.stringify({ ts: new Date().toISOString(), level: "warn", message: "service not ready", ...body }));
  return NextResponse.json(body, { status: httpStatus, headers: { "Cache-Control": "no-store" } });
}
