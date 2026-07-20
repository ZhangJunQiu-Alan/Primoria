import { getCurrentUserForRsc, isAuthEnabled } from "@/lib/auth/session";
import { LandingPage } from "@/components/landing/landing-page";
import { getSuggestedCurriculumRegion } from "@/lib/learner-profile/curriculum-suggestion";
import { getLearnerOnboardingState } from "@/lib/learner-profile/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUserForRsc();

  if (authEnabled && !user) return <LandingPage />;

  if (authEnabled && user) {
    const onboarding = await getLearnerOnboardingState(user.id);
    if (!onboarding.complete) {
      const { OnboardingClient } = await import("@/components/onboarding/onboarding-client");
      const curriculumRegion = await getSuggestedCurriculumRegion();
      return (
        <main className="app-shell onboarding-app-shell">
          <OnboardingClient initialState={onboarding} suggestedRegion={curriculumRegion} />
        </main>
      );
    }
  }

  const { TutorWorkspaceClient } = await import("@/components/tutor/tutor-workspace-client");

  return (
    <main className="app-shell">
      <TutorWorkspaceClient initialAuthState={{ authEnabled, user, loaded: true }} />
    </main>
  );
}
