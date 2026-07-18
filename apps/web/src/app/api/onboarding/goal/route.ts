import { after, NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import { logKnowledgeGraphError, toSafeKnowledgeGraphError } from "@/lib/knowledge-graph/errors";
import { createServerTiming } from "@/lib/observability/server-timing";
import { syncOnboardingFact } from "@/lib/learner-facts/store";
import {
  OnboardingCourseBuildError,
} from "@/lib/learner-profile/onboarding-course-build";
import { buildOnboardingCourseIfReady } from "@/lib/learner-profile/onboarding-course-readiness";
import { resolveOnboardingGoalAnchor } from "@/lib/learner-profile/onboarding-positioning";
import {
  getLearnerOnboardingState,
  isLearningGoalPositioningAttemptPending,
  saveLearningGoal,
  saveLearningGoalClarification,
  saveLearningGoalPositioningFailure,
  savePendingLearningGoal,
  savePositionedLearningGoalIfPending,
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

async function positionLearningGoalInBackground(ownerId: string, learningGoal: string, attemptId: string) {
  if (!(await isLearningGoalPositioningAttemptPending(ownerId, attemptId))) return;
  // The learner polls until this finishes, so its duration is the real wait.
  const timing = createServerTiming();

  try {
    const resolution = await timing.time("resolve_anchor", () => resolveOnboardingGoalAnchor(learningGoal));

    if (resolution.kind === "clarify") {
      await timing.time("save_clarify", () =>
        saveLearningGoalClarification({
          ownerId,
          learningGoal,
          attemptId,
          message: resolution.clarify.message,
          candidates: resolution.clarify.candidates,
        }),
      );
      timing.log("onboarding/goal:background");
      return;
    }

    const { anchor } = resolution;
    const profile = await timing.time("save_positioned", () =>
      savePositionedLearningGoalIfPending({
        ownerId,
        learningGoal,
        attemptId,
        graphId: anchor.graphId,
        startTopicId: anchor.startTopicId,
        targetConceptId: anchor.targetConceptId,
        targetConceptIds: anchor.targetConceptIds,
        scope: anchor.scope,
      }),
    );
    if (profile) await timing.time("build_course", () => buildOnboardingCourseIfReady(ownerId, profile));
    timing.log("onboarding/goal:background");
  } catch (error) {
    timing.log("onboarding/goal:background");
    if (error instanceof OnboardingCourseBuildError) return;
    logKnowledgeGraphError("onboarding/goal:background", error);
    // Never persist raw error.message: SQL/table names must not reach profiles.
    const safe = toSafeKnowledgeGraphError(error, { message: "Could not locate that goal. Please retry." });
    await saveLearningGoalPositioningFailure({
      ownerId,
      learningGoal,
      attemptId,
      message: safe.message,
    });
  }
}

export async function POST(request: Request) {
  const timing = createServerTiming();
  const respond = (body: unknown, init?: { status?: number }) => {
    timing.log("onboarding/goal");
    return NextResponse.json(body, { status: init?.status, headers: { "Server-Timing": timing.header() } });
  };

  const { denied, user } = await timing.time("auth", () => requireAuthUser());
  if (denied) return denied;
  if (!user) return respond({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    if (body.skip) {
      const profile = await timing.time("save_skip", () => skipLearningGoal(user.id));
      await timing.time("sync_fact", () => syncOnboardingFact(user.id, { kind: "learning_goal", value: null }));
      return respond({ ...(await timing.time("state", () => getLearnerOnboardingState(user.id))), profile });
    }

    if (!body.learningGoal) {
      return respond({ error: "Learning goal is required." }, { status: 400 });
    }

    if (!body.graphId) {
      const pending = await timing.time("save_pending", () => savePendingLearningGoal(user.id, body.learningGoal!));
      const { profile, attemptId } = pending;
      await timing.time("sync_fact", () =>
        syncOnboardingFact(user.id, { kind: "learning_goal", value: body.learningGoal! }),
      );
      after(() => positionLearningGoalInBackground(user.id, body.learningGoal!, attemptId));
      return respond({ ...(await timing.time("state", () => getLearnerOnboardingState(user.id))), profile });
    }

    const resolution = await timing.time("resolve_anchor", () =>
      resolveOnboardingGoalAnchor(body.learningGoal!, { graphId: body.graphId }),
    );

    // A selected subject chip should deterministically commit that graph. If a
    // stale or invalid graph sneaks through, fall back to the normal clarify path.
    if (resolution.kind === "clarify") {
      return respond({
        ...(await timing.time("state", () => getLearnerOnboardingState(user.id))),
        clarify: resolution.clarify,
      });
    }

    const { anchor } = resolution;
    const profile = await timing.time("save_goal", () =>
      saveLearningGoal({
        ownerId: user.id,
        learningGoal: body.learningGoal!,
        graphId: anchor.graphId,
        startTopicId: anchor.startTopicId,
        targetConceptId: anchor.targetConceptId,
        targetConceptIds: anchor.targetConceptIds,
        scope: anchor.scope,
      }),
    );
    await timing.time("sync_fact", () =>
      syncOnboardingFact(user.id, { kind: "learning_goal", value: body.learningGoal! }),
    );
    const course = await timing.time("build_course", () => buildOnboardingCourseIfReady(user.id, profile));

    return respond({
      ...(await timing.time("state", () => getLearnerOnboardingState(user.id))),
      anchor,
      course,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return respond({ error: "Invalid onboarding goal request." }, { status: 400 });
    }
    if (error instanceof OnboardingCourseBuildError) {
      return respond({ error: error.message, code: error.code }, { status: error.status });
    }
    logKnowledgeGraphError("onboarding/goal", error);
    const safe = toSafeKnowledgeGraphError(error, {
      status: 422,
      code: "onboarding_goal_failed",
      message: "Could not locate that goal. Please retry.",
    });
    return respond({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
