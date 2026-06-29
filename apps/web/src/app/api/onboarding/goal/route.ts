import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import { resolveOnboardingGoalAnchor } from "@/lib/learner-profile/onboarding-positioning";
import { getLearnerOnboardingState, saveLearningGoal, skipLearningGoal } from "@/lib/learner-profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  learningGoal: z.string().trim().min(1).max(300).optional(),
  // Set when a subject-clarification chip was picked: commit that graph directly.
  graphId: z.string().min(1).optional(),
  skip: z.boolean().optional(),
}).strict();

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    if (body.skip) {
      const profile = await skipLearningGoal(user.id);
      return NextResponse.json({ ...(await getLearnerOnboardingState(user.id)), profile });
    }

    if (!body.learningGoal) {
      return NextResponse.json({ error: "Learning goal is required." }, { status: 400 });
    }

    const resolution = await resolveOnboardingGoalAnchor(body.learningGoal, { graphId: body.graphId });

    // Ambiguous across subjects: surface chips, save nothing until the learner picks.
    if (resolution.kind === "clarify") {
      return NextResponse.json({
        ...(await getLearnerOnboardingState(user.id)),
        clarify: resolution.clarify,
      });
    }

    const { anchor } = resolution;
    const profile = await saveLearningGoal({
      ownerId: user.id,
      learningGoal: body.learningGoal,
      graphId: anchor.graphId,
      startTopicId: anchor.startTopicId,
      targetConceptId: anchor.targetConceptId,
    });

    return NextResponse.json({
      ...(await getLearnerOnboardingState(user.id)),
      profile,
      anchor,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid onboarding goal request." }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not locate that goal." }, { status: 422 });
  }
}
