import { workspaceMembers } from "../db/schema";
import type { WorkspaceMember } from "./types";

export function rowToWorkspaceMember(member: typeof workspaceMembers.$inferSelect): WorkspaceMember {
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    displayName: member.displayName,
    role: member.role,
    status: member.status ?? undefined,
    agentProfileId: member.agentProfileId ?? undefined,
  };
}
