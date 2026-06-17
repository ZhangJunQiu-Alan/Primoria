import { TutorWorkspaceClient } from "@/components/tutor/tutor-workspace-client";
import { CopilotKitProvider } from "@/components/copilot-provider";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();
  const copilotEnabled = !authEnabled || Boolean(user);

  return (
    <main className="app-shell">
      <CopilotKitProvider enabled={copilotEnabled}>
        <TutorWorkspaceClient initialAuthState={{ authEnabled, user, loaded: true }} />
      </CopilotKitProvider>
    </main>
  );
}
