import { NextResponse } from "next/server";

import { checkKnowledgeGraphHealth, type KnowledgeGraphHealth } from "@/lib/knowledge-graph/health";
import { getKnowledgeGraphPool } from "@/lib/knowledge-graph/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let health: KnowledgeGraphHealth;
  try {
    const pool = getKnowledgeGraphPool();
    health = await checkKnowledgeGraphHealth(async (text, params) => pool.query(text, params as never[]));
  } catch (error) {
    console.error("[health]", error);
    health = {
      status: "unhealthy",
      database: "unavailable",
      kg: { schema: "unknown", embeddings: "unknown", modelVersion: null },
    };
  }
  if (health.status !== "ok") {
    console.warn("[health] degraded or unhealthy:", health);
  }
  return NextResponse.json(health, { status: health.status === "unhealthy" ? 503 : 200 });
}
