import { TutorNavRail } from "@/components/tutor/nav-rail";
import { WorkspaceClient } from "@/components/workspace/workspace-client";
import { getCurrentUser } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const user = await getCurrentUser();
  const ownerId = await getWorkspaceOwnerId(user);
  const view = await getWorkspaceView(ownerId);

  return (
    <main className="app-shell workspace-shell">
      <TutorNavRail />
      <WorkspaceClient initialView={view} />
    </main>
  );
}
