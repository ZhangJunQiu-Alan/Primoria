import { TutorWorkspaceClient } from "@/components/tutor/tutor-workspace-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const authEnabled = isAuthEnabled();
  const user = await getCurrentUser();

  return (
    <main className="app-shell">
      <TutorWorkspaceClient initialAuthState={{ authEnabled, user, loaded: true }} />
    </main>
  );
}
