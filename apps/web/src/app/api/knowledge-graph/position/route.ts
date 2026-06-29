import { NextResponse } from "next/server";
import { z } from "zod";

import { buildPositioningLog, logPositioning } from "@/lib/knowledge-graph/positioning-log";
import { planFromPositioning, positionLearningGoal } from "@/lib/knowledge-graph/position-learning-goal";
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
    const plan = planFromPositioning(result);

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
        mode: result.mode ?? null,
        topTopicId: result.startTopicId ?? null,
        maxSimilarity: result.diagnostics.maxSimilarity,
      });
    }

    return NextResponse.json({ encodedQuery: search.encodedQuery, ...result, plan });
  } catch (error) {
    console.error("[knowledge-graph/position]", error);
    return NextResponse.json({ error: userFacingError(error) }, { status: 503 });
  }
}
