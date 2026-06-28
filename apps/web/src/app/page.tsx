import { TutorWorkspaceClient } from "@/components/tutor/tutor-workspace-client";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { LandingPage } from "@/components/landing/landing-page";
import { OnboardingClient } from "@/components/onboarding/onboarding-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getLearnerOnboardingState } from "@/lib/learner-profile/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();

  if (authEnabled && !user) return <LandingPage />;
  if (authEnabled && user) {
    const onboarding = await getLearnerOnboardingState(user.id);
    if (!onboarding.complete) {
      return (
        <main className="app-shell onboarding-app-shell">
          <OnboardingClient initialState={onboarding} />
        </main>
      );
    }
  }

  return (
    <main className="app-shell">
      <CopilotKitProvider>
        <TutorWorkspaceClient initialAuthState={{ authEnabled, user, loaded: true }} />
      </CopilotKitProvider>
    </main>
  );
}
