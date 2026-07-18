import { notFound } from "next/navigation";

import { OnboardingClient } from "@/components/onboarding/onboarding-client";
import type { LearnerOnboardingState } from "@/lib/learner-profile/types";

export const dynamic = "force-dynamic";

const DEBUG_ONBOARDING_STATE: LearnerOnboardingState = {
  profile: {
    ownerId: "debug-user",
    learningGoal: null,
    goalGraphId: null,
    goalStartTopicId: null,
    goalTargetConceptId: null,
    goalSkippedAt: null,
    goalPositioningStatus: null,
    goalPositioningMessage: null,
    goalPositioningCandidates: [],
    goalPositioningUpdatedAt: null,
    onboardingCourseStatus: null,
    onboardingCourseMessage: null,
    onboardingCourseUpdatedAt: null,
    factsIntakeStatus: null,
    factsIntakeJobId: null,
    factsIntakeMessage: null,
    factsIntakeUpdatedAt: null,
    knowledgeBackground: null,
    knowledgeBackgroundSkippedAt: null,
    tutorStyle: null,
    tutorStyleSkippedAt: null,
    onboardingCompletedAt: null,
    onboardingSkippedAt: null,
    createdAt: null,
    updatedAt: null,
  },
  nextStep: "goal",
  complete: false,
};

export default function DevOnboardingPage() {
  if (process.env.NODE_ENV === "production" && process.env.PRIMORIA_ENABLE_QA_ROUTES !== "1") {
    notFound();
  }

  return (
    <main className="app-shell onboarding-app-shell">
      <OnboardingClient initialState={DEBUG_ONBOARDING_STATE} debugMode />
    </main>
  );
}
