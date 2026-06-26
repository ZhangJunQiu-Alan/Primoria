import { TutorWorkspaceClient } from "@/components/tutor/tutor-workspace-client";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { LandingPage } from "@/components/landing/landing-page";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();

  if (authEnabled && !user) return <LandingPage />;

  return (
    <main className="app-shell">
      <CopilotKitProvider>
        <TutorWorkspaceClient initialAuthState={{ authEnabled, user, loaded: true }} />
      </CopilotKitProvider>
    </main>
  );
}
