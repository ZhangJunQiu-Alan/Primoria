import { workspaceAgentCapabilities, workspaceAgentConnections, workspaceAgentProfiles } from "../db/schema";
import type { WorkspaceAgentCapability, WorkspaceAgentCapabilityInput, WorkspaceAgentConnection, WorkspaceAgentProfile } from "./types";

export function capabilityToDbRow(capability: WorkspaceAgentCapability, profile: WorkspaceAgentProfile) {
  const profileOwnerId = profile.ownerId;
  if (!profileOwnerId) throw new Error("Agent profile owner is required.");
  return {
    id: capability.id,
    profileId: capability.profileId,
    workspaceId: profile.workspaceId,
    ownerId: profileOwnerId,
    kind: capability.kind,
    source: capability.kind === "skill" ? capability.source : null,
    path: capability.kind === "skill" ? capability.path : null,
    toolName: capability.kind === "internal_tool" || capability.kind === "mcp_tool" ? capability.toolName : null,
    connectionId: capability.kind === "mcp_tool" ? capability.connectionId : null,
    agentProfileId: capability.kind === "subagent" ? capability.agentProfileId : null,
    approval: capability.kind === "internal_tool" || capability.kind === "mcp_tool" ? capability.approval : null,
    enabled: capability.enabled,
    createdAt: new Date(profile.createdAt),
  };
}

export function rowToWorkspaceAgentCapability(row: typeof workspaceAgentCapabilities.$inferSelect): WorkspaceAgentCapability | undefined {
  const base = { id: row.id, profileId: row.profileId, enabled: row.enabled };
  if (row.kind === "skill" && row.source && row.path) {
    return {
      ...base,
      kind: "skill",
      source: row.source as Extract<WorkspaceAgentCapability, { kind: "skill" }>["source"],
      path: row.path,
    };
  }
  if (row.kind === "internal_tool" && row.toolName && row.approval) {
    return {
      ...base,
      kind: "internal_tool",
      toolName: row.toolName,
      approval: row.approval as Extract<WorkspaceAgentCapability, { kind: "internal_tool" }>["approval"],
    };
  }
  if (row.kind === "mcp_tool" && row.connectionId && row.toolName && row.approval) {
    return {
      ...base,
      kind: "mcp_tool",
      connectionId: row.connectionId,
      toolName: row.toolName,
      approval: row.approval as Extract<WorkspaceAgentCapability, { kind: "mcp_tool" }>["approval"],
    };
  }
  if (row.kind === "subagent" && row.agentProfileId) {
    return { ...base, kind: "subagent", agentProfileId: row.agentProfileId };
  }
  return undefined;
}

export function groupAgentCapabilitiesByProfileId(rows: Array<typeof workspaceAgentCapabilities.$inferSelect>) {
  const grouped = new Map<string, WorkspaceAgentCapability[]>();
  for (const row of rows) {
    const capability = rowToWorkspaceAgentCapability(row);
    if (!capability) continue;
    grouped.set(row.profileId, [...(grouped.get(row.profileId) ?? []), capability]);
  }
  return grouped;
}

export function filterAgentCapabilitiesByVisibleConnections(
  capabilitiesByProfileId: Map<string, WorkspaceAgentCapability[]>,
  visibleConnections: WorkspaceAgentConnection[],
  visibleProfileIds?: Set<string>,
) {
  const visibleConnectionIds = new Set(visibleConnections.map((connection) => connection.id));
  const filtered = new Map<string, WorkspaceAgentCapability[]>();
  for (const [profileId, capabilities] of capabilitiesByProfileId) {
    filtered.set(
      profileId,
      capabilities.filter((capability) => {
        if (capability.kind === "mcp_tool") return visibleConnectionIds.has(capability.connectionId);
        if (capability.kind === "subagent" && visibleProfileIds) return visibleProfileIds.has(capability.agentProfileId);
        return true;
      }),
    );
  }
  return filtered;
}

export function hiddenReferenceCapabilityInputs(
  capabilities: WorkspaceAgentCapability[],
  visibleConnectionIds: Set<string>,
  visibleProfileIds: Set<string>,
) {
  return capabilities.flatMap((capability): WorkspaceAgentCapabilityInput[] => {
    if (capability.kind === "mcp_tool" && !visibleConnectionIds.has(capability.connectionId)) {
      return [{ kind: "mcp_tool", connectionId: capability.connectionId, toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled }];
    }
    if (capability.kind === "subagent" && !visibleProfileIds.has(capability.agentProfileId)) {
      return [{ kind: "subagent", agentProfileId: capability.agentProfileId, enabled: capability.enabled }];
    }
    return [];
  });
}

export function rowToWorkspaceAgentProfile(
  row: typeof workspaceAgentProfiles.$inferSelect,
  capabilitiesByProfileId: Map<string, WorkspaceAgentCapability[]>,
): WorkspaceAgentProfile {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    ownerId: row.ownerId,
    displayName: row.displayName,
    handle: row.handle,
    description: row.description,
    visibility: row.visibility as WorkspaceAgentProfile["visibility"],
    templateKey: row.templateKey ?? undefined,
    systemPrompt: row.systemPrompt,
    defaultModel: row.defaultModel ?? undefined,
    memoryScope: row.memoryScope as WorkspaceAgentProfile["memoryScope"],
    capabilities: capabilitiesByProfileId.get(row.id) ?? [],
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

export function rowToWorkspaceAgentConnection(row: typeof workspaceAgentConnections.$inferSelect): WorkspaceAgentConnection {
  return {
    id: row.id,
    workspaceId: row.workspaceId ?? undefined,
    ownerId: row.ownerId,
    scope: row.scope as WorkspaceAgentConnection["scope"],
    displayName: row.displayName,
    transport: row.transport as WorkspaceAgentConnection["transport"],
    configRef: row.configRef,
    allowedToolNames: Array.isArray(row.allowedToolNames) ? row.allowedToolNames.filter((entry): entry is string => typeof entry === "string") : [],
    status: row.status as WorkspaceAgentConnection["status"],
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}
