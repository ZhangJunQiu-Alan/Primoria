import { workspaces } from "../db/schema";
import type { WorkspaceSummary } from "./types";

export function rowToWorkspaceSummary(workspace: typeof workspaces.$inferSelect): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    inviteCode: workspace.inviteCode ?? undefined,
    createdAt: workspace.createdAt.getTime(),
    updatedAt: workspace.updatedAt.getTime(),
  };
}
