import { NextResponse } from "next/server";

import { checkKnowledgeGraphHealth, type KnowledgeGraphHealth } from "@/lib/knowledge-graph/health";
import { getKnowledgeGraphPool } from "@/lib/knowledge-graph/search";
import { checkJobQueueHealth, getQueueStallThresholdSeconds, type JobQueueHealth } from "@/lib/courses/job-queue-health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let health: KnowledgeGraphHealth;
  let jobs: JobQueueHealth = {
    status: "unknown",
    stallThresholdSeconds: getQueueStallThresholdSeconds(),
    queues: {},
  };
  try {
    const pool = getKnowledgeGraphPool();
    const query = async (text: string, params?: unknown[]) => pool.query(text, params as never[]);
    health = await checkKnowledgeGraphHealth(query);
    if (health.database === "ok") {
      jobs = await checkJobQueueHealth(query);
    }
  } catch (error) {
    console.error("[health]", error);
    health = {
      status: "unhealthy",
      database: "unavailable",
      kg: { schema: "unknown", embeddings: "unknown", modelVersion: null },
    };
  }
  // A stalled queue (job waiting past the threshold, usually a dead worker)
  // degrades an otherwise healthy report. Uptime probes should keyword-match
  // "status":"ok" so stalls trip the alarm without needing a 5xx.
  const status = health.status === "ok" && jobs.status === "stalled" ? "degraded" : health.status;
  if (status !== "ok") {
    console.warn("[health] degraded or unhealthy:", { ...health, status, jobs });
  }
  return NextResponse.json({ ...health, status, jobs }, { status: status === "unhealthy" ? 503 : 200 });
}
