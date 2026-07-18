import { buildOnboardingCourseWithStatus } from "./onboarding-course-build";
import { getLearnerProfile } from "./store";
import type { LearnerProfile } from "./types";

export function isFactsIntakeTerminal(profile: LearnerProfile | null): boolean {
  if (!profile) return false;
  if (profile.factsIntakeStatus) return profile.factsIntakeStatus !== "pending";
  return Boolean(profile.knowledgeBackground || profile.knowledgeBackgroundSkippedAt);
}

export async function buildOnboardingCourseIfReady(ownerId: string, candidate?: LearnerProfile | null) {
  const profile = candidate ?? await getLearnerProfile(ownerId);
  if (!profile?.goalGraphId || !profile.goalStartTopicId || !isFactsIntakeTerminal(profile)) return null;
  return buildOnboardingCourseWithStatus(ownerId, profile);
}
