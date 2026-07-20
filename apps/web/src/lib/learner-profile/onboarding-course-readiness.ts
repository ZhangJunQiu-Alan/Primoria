import { resolveLearnerCurriculumContext } from "@/lib/knowledge-graph/curriculum-routing";
import { listActiveFacts } from "@/lib/learner-facts/store";
import { buildOnboardingCourseWithStatus } from "./onboarding-course-build";
import { resolveOnboardingGoalAnchor } from "./onboarding-positioning";
import { getLearnerProfile, savePositionedLearningGoalFromFactsIfClarifying } from "./store";
import type { LearnerProfile } from "./types";
import { curriculumContextFromProfile } from "./education-context";

export function isFactsIntakeTerminal(profile: LearnerProfile | null): boolean {
  if (!profile) return false;
  if (profile.factsIntakeStatus) return profile.factsIntakeStatus !== "pending";
  return Boolean(profile.knowledgeBackground || profile.knowledgeBackgroundSkippedAt);
}

export async function buildOnboardingCourseIfReady(ownerId: string, candidate?: LearnerProfile | null) {
  let profile = candidate ?? await getLearnerProfile(ownerId);
  if (!profile || !isFactsIntakeTerminal(profile)) return null;

  if (
    !profile.goalGraphId &&
    profile.goalPositioningStatus === "clarify" &&
    profile.learningGoal
  ) {
    const confirmedContext = curriculumContextFromProfile(profile);
    const curriculumContext = confirmedContext === undefined
      ? resolveLearnerCurriculumContext(await listActiveFacts(ownerId))
      : confirmedContext;
    if (!curriculumContext) return null;
    const resolution = await resolveOnboardingGoalAnchor(profile.learningGoal, { curriculumContext });
    if (resolution.kind === "clarify") return null;
    const { anchor } = resolution;
    profile = await savePositionedLearningGoalFromFactsIfClarifying({
      ownerId,
      learningGoal: profile.learningGoal,
      graphId: anchor.graphId,
      startTopicId: anchor.startTopicId,
      targetConceptId: anchor.targetConceptId,
      targetConceptIds: anchor.targetConceptIds,
      scope: anchor.scope,
    });
  }

  if (!profile?.goalGraphId || !profile.goalStartTopicId) return null;
  return buildOnboardingCourseWithStatus(ownerId, profile);
}
