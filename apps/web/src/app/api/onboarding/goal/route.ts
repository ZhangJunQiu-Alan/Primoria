import { after, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import { buildOnboardingCourse } from "@/lib/learner-profile/onboarding-course";
import { resolveOnboardingGoalAnchor } from "@/lib/learner-profile/onboarding-positioning";
import {
  getLearnerOnboardingState,
  getLearnerProfile,
  saveLearningGoal,
  saveLearningGoalClarification,
  saveLearningGoalPositioningFailure,
  savePendingLearningGoal,
  skipLearningGoal,
} from "@/lib/learner-profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  learningGoal: z.string().trim().min(1).max(300).optional(),
  // Set when a subject-clarification chip was picked: commit that graph directly.
  graphId: z.string().min(1).optional(),
  skip: z.boolean().optional(),
}).strict();

function goalStillPending(profile: Awaited<ReturnType<typeof getLearnerProfile>>, learningGoal: string) {
  return profile?.learningGoal === learningGoal && profile.goalPositioningStatus === "pending";
}

function profileHasCourseDepth(profile: Awaited<ReturnType<typeof getLearnerProfile>>) {
  return Boolean(profile?.knowledgeBackground || profile?.knowledgeBackgroundSkippedAt);
}

async function buildCourseIfReady(ownerId: string, profile: Awaited<ReturnType<typeof getLearnerProfile>>) {
  if (!profileHasCourseDepth(profile)) return;
  try {
    await buildOnboardingCourse(ownerId, profile);
  } catch (error) {
    console.warn("[onboarding] course prebuild failed:", error instanceof Error ? error.message : error);
  }
}

async function positionLearningGoalInBackground(ownerId: string, learningGoal: string) {
  if (!goalStillPending(await getLearnerProfile(ownerId), learningGoal)) return;

  try {
    const resolution = await resolveOnboardingGoalAnchor(learningGoal);
    if (!goalStillPending(await getLearnerProfile(ownerId), learningGoal)) return;

    if (resolution.kind === "clarify") {
      await saveLearningGoalClarification({
        ownerId,
        learningGoal,
        message: resolution.clarify.message,
        candidates: resolution.clarify.candidates,
      });
      return;
    }

    const { anchor } = resolution;
    const profile = await saveLearningGoal({
      ownerId,
      learningGoal,
      graphId: anchor.graphId,
      startTopicId: anchor.startTopicId,
      targetConceptId: anchor.targetConceptId,
    });
    await buildCourseIfReady(ownerId, profile);
  } catch (error) {
    if (!goalStillPending(await getLearnerProfile(ownerId), learningGoal)) return;
    await saveLearningGoalPositioningFailure({
      ownerId,
      learningGoal,
      message: error instanceof Error ? error.message : "Could not locate that goal.",
    });
  }
}

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

    if (!body.graphId) {
      const profile = await savePendingLearningGoal(user.id, body.learningGoal);
      after(() => positionLearningGoalInBackground(user.id, body.learningGoal!));
      return NextResponse.json({ ...(await getLearnerOnboardingState(user.id)), profile });
    }

    const resolution = await resolveOnboardingGoalAnchor(body.learningGoal, { graphId: body.graphId });

    // A selected subject chip should deterministically commit that graph. If a
    // stale or invalid graph sneaks through, fall back to the normal clarify path.
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
    const course = await buildOnboardingCourse(user.id, profile);

    return NextResponse.json({
      ...(await getLearnerOnboardingState(user.id)),
      profile,
      anchor,
      course,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid onboarding goal request." }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not locate that goal." }, { status: 422 });
  }
}
