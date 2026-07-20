import { NextResponse } from "next/server";
import { z } from "zod";

import { logKnowledgeGraphError, toSafeKnowledgeGraphError } from "@/lib/knowledge-graph/errors";
import { resolveLearnerCurriculumContext } from "@/lib/knowledge-graph/curriculum-routing";
import { buildPositioningLog, logPositioning } from "@/lib/knowledge-graph/positioning-log";
import { planFromPositioning, positionLearningGoal } from "@/lib/knowledge-graph/position-learning-goal";
import { requireAuthUser } from "@/lib/auth/guard";
import { listActiveFacts } from "@/lib/learner-facts/store";
import { curriculumContextFromProfile } from "@/lib/learner-profile/education-context";
import { getLearnerProfile } from "@/lib/learner-profile/store";
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

export async function POST(request: Request) {
  try {
    const { denied, user } = await requireAuthUser();
    if (denied) return denied;
    const body = RequestSchema.parse(await request.json());
    const [profile, facts] = user
      ? await Promise.all([getLearnerProfile(user.id), listActiveFacts(user.id)])
      : [null, []] as const;
    const confirmedContext = curriculumContextFromProfile(profile);
    const curriculumContext = confirmedContext === undefined
      ? resolveLearnerCurriculumContext(facts)
      : confirmedContext;
    const { result, search } = await positionLearningGoal({ ...body, curriculumContext });
    const plan = planFromPositioning(result);

    logPositioning(buildPositioningLog({ encodedQuery: search.encodedQuery, search, result }));

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
    logKnowledgeGraphError("knowledge-graph/position", error);
    const safe = toSafeKnowledgeGraphError(error, {
      message: "Knowledge graph positioning failed. Please retry.",
    });
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
