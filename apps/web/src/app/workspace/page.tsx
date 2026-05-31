import { TutorNavRail } from "@/components/tutor/nav-rail";
import { WorkspaceClient } from "@/components/workspace/workspace-client";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { createWorkspacePlaceholderView } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  const authEnabled = isAuthEnabled();
  const view = createWorkspacePlaceholderView();

  return (
    <main className="app-shell workspace-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <WorkspaceClient initialView={view} />
    </main>
  );
}
