import { TutorNavRail } from "@/components/tutor/nav-rail";
import { WorkspaceAgentManager } from "@/components/workspace/workspace-agent-manager";
import { getCurrentUser, isAuthEnabled } from "@/lib/auth/session";
import { getWorkspaceOwnerId } from "@/lib/workspaces/owner";
import { getWorkspaceView, listWorkspaceAgentTemplates } from "@/lib/workspaces/store";

export const dynamic = "force-dynamic";

export default async function WorkspaceAgentsPage() {
  const user = await getCurrentUser();
  const authEnabled = isAuthEnabled();
  const ownerId = await getWorkspaceOwnerId(user);
  const view = await getWorkspaceView(ownerId);
  const templates = listWorkspaceAgentTemplates();

  return (
    <main className="app-shell workspace-shell">
      <TutorNavRail initialAuthState={{ authEnabled, user }} />
      <WorkspaceAgentManager
        workspaceId={view.workspace.id}
        initialTemplates={templates}
        initialProfiles={view.agentProfiles}
        initialMembers={view.members.filter((member) => member.agentProfileId)}
      />
    </main>
  );
}
