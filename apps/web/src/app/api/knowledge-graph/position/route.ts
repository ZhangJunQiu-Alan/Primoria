import { NextResponse } from "next/server";
import { z } from "zod";

import { buildPositioningLog, logPositioning } from "@/lib/knowledge-graph/positioning-log";
import { planFromPositioning, positionLearningGoal } from "@/lib/knowledge-graph/position-learning-goal";
import { enrichBroadMenuReasons } from "@/lib/knowledge-graph/broad-menu-reasons";
import { detectKgLanguage } from "@/lib/knowledge-graph/display-name";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import { recordLearningEvent } from "@/lib/learning-events/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  query: z.string().min(1),
  graphId: z.string().min(1).optional(),
  topK: z.number().int().min(1).max(50).optional(),
  modelVersion: z.string().min(1).optional(),
  tau: z.number().min(0).max(1).optional(),
  floor: z.number().min(0).max(1).optional(),
  language: z.string().min(1).optional(),
});

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/Missing DATABASE_URL/i.test(message)) return "Knowledge graph database settings are missing.";
  if (/Missing OPENAI/i.test(message)) return "Embedding provider settings are missing.";
  if (/Embedding request failed|fetch failed|timeout|network/i.test(message)) {
    return "The embedding provider could not complete this search. Please retry.";
  }

  return "Knowledge graph positioning failed. Please retry.";
}

export async function POST(request: Request) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;
    const body = RequestSchema.parse(await request.json());
    const { result, search } = await positionLearningGoal(body);
    let plan = planFromPositioning(result);
    let responseResult = result;

    if (plan.branch === "broad") {
      const language = body.language ?? detectKgLanguage(body.query);
      const menu = await enrichBroadMenuReasons({
        query: body.query,
        language,
        menu: plan.menu,
      });
      plan = { branch: "broad", menu };
      responseResult = { ...result, menu };
    }

    logPositioning(buildPositioningLog({ encodedQuery: search.encodedQuery, search, result }));

    const user = await getCurrentUser().catch(() => null);
    if (user) {
      await recordLearningEvent({
        type: "position.computed",
        ownerId: user.id,
        graphId: search.graphId,
        conceptId: result.targetConceptId ?? null,
        rawQuery: search.encodedQuery.rawQuery,
        branch: result.branch,
        topTopicId: result.diagnostics.topicMass[0]?.topicId ?? null,
        maxSimilarity: result.diagnostics.maxSimilarity,
      });
    }

    return NextResponse.json({ encodedQuery: search.encodedQuery, ...responseResult, plan });
  } catch (error) {
    console.error("[knowledge-graph/position]", error);
    return NextResponse.json({ error: userFacingError(error) }, { status: 503 });
  }
}
