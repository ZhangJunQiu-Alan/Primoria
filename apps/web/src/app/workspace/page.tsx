import { TutorNavRail } from "@/components/tutor/nav-rail";
import { WorkspaceClient } from "@/components/workspace/workspace-client";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceView } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  const view = await getWorkspaceView(user?.id);

  return (
    <main className="app-shell">
      <TutorNavRail />
      <WorkspaceClient initialView={view} />
    </main>
  );
}
