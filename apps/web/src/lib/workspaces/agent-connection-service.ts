import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { workspaceAgentConnections } from "../db/schema";
import { rowToWorkspaceAgentConnection } from "./agent-profile-persistence";
import type { WorkspaceAgentCapabilityInput, WorkspaceAgentConnection, WorkspaceView } from "./types";

export type WorkspaceAgentConnectionServiceContext = {
  usesDatabase(ownerId?: string | null): ownerId is string;
  getLocalViews(ownerId?: string | null): WorkspaceView[];
  ensureSeedWorkspace(ownerId: string): Promise<void>;
  requireDbWorkspace(ownerId: string, workspaceId: string): Promise<void>;
};

export function normalizeConnectionToolNames(toolNames: string[]) {
  return Array.from(new Set(toolNames.map((toolName) => toolName.trim()).filter(Boolean))).slice(0, 80);
}

export function isAgentConnectionVisibleToWorkspace(connection: WorkspaceAgentConnection, ownerId: string | null | undefined, workspaceId: string) {
  if (connection.status === "disabled") return false;
  return isAgentConnectionManageableInWorkspace(connection, ownerId, workspaceId);
}

export function isAgentConnectionManageableInWorkspace(connection: WorkspaceAgentConnection, ownerId: string | null | undefined, workspaceId: string) {
  if (connection.scope === "workspace") return connection.workspaceId === workspaceId;
  return Boolean(ownerId && connection.ownerId === ownerId);
}

export async function requireWorkspaceAgentConnection(
  context: WorkspaceAgentConnectionServiceContext,
  ownerId: string | null | undefined,
  workspaceId: string,
  connectionId: string,
  options: { includeDisabled?: boolean } = {},
) {
  if (!context.usesDatabase(ownerId)) {
    const connection = context
      .getLocalViews(ownerId)
      .flatMap((view) => view.agentConnections)
      .find((entry) =>
        entry.id === connectionId &&
        (options.includeDisabled
          ? isAgentConnectionManageableInWorkspace(entry, ownerId, workspaceId)
          : isAgentConnectionVisibleToWorkspace(entry, ownerId, workspaceId))
      );
    if (!connection) throw new Error("Agent connection not found.");
    return connection;
  }

  await context.ensureSeedWorkspace(ownerId);
  await context.requireDbWorkspace(ownerId, workspaceId);
  const rows = await getDb().select().from(workspaceAgentConnections).where(eq(workspaceAgentConnections.id, connectionId)).limit(1);
  const connection = rows[0] ? rowToWorkspaceAgentConnection(rows[0]) : undefined;
  if (
    !connection ||
    !(options.includeDisabled
      ? isAgentConnectionManageableInWorkspace(connection, ownerId, workspaceId)
      : isAgentConnectionVisibleToWorkspace(connection, ownerId, workspaceId))
  ) throw new Error("Agent connection not found.");
  return connection;
}

export async function assertAgentCapabilityConnections(
  context: WorkspaceAgentConnectionServiceContext,
  ownerId: string | null | undefined,
  workspaceId: string,
  capabilities: WorkspaceAgentCapabilityInput[],
) {
  for (const capability of capabilities) {
    if (capability.kind !== "mcp_tool" || !capability.enabled) continue;
    const connection = await requireWorkspaceAgentConnection(context, ownerId, workspaceId, capability.connectionId);
    if (!connection.allowedToolNames.includes(capability.toolName)) throw new Error("Agent connection tool is not allowed.");
  }
}
