import type { ExecutableToolManifest, ToolApproval, ToolRendererRegistration, ToolRisk } from "@primoria/contracts/agent";
import {
  WORKSPACE_INTERNAL_TOOL_POLICIES,
  type WorkspaceInternalToolName,
  type WorkspaceInternalToolPolicy,
} from "../workspaces/agent-tools";
import type { WorkspaceAgentConnection, WorkspaceAgentProfile } from "../workspaces/types";

export type WorkspaceToolActivationInput = {
  profile: WorkspaceAgentProfile;
  connections?: WorkspaceAgentConnection[];
  constraints?: {
    allowedToolNames?: string[];
    disabledToolNames?: string[];
    includeMcp?: boolean;
  };
};

export type WorkspaceActivatedToolManifest = ExecutableToolManifest & {
  capabilityId?: string;
  connectionId?: string;
  rawToolName?: string;
};

export function workspaceInternalToolPolicyToManifest(policy: WorkspaceInternalToolPolicy): ExecutableToolManifest {
  return {
    name: policy.toolName,
    description: policy.description,
    source: "internal",
    risk: policy.risk as ToolRisk,
    approval: policy.approval as ToolApproval,
    scopes: policy.scopes,
    sideEffects: workspaceToolSideEffects(policy.toolName as WorkspaceInternalToolName),
    available: true,
    execution: { available: true },
    inspector: {
      label: policy.visibleLabel,
      description: policy.description,
      fields: workspaceToolInspectorFields(policy.toolName as WorkspaceInternalToolName),
    },
    render: {
      inspector: policy.visibleLabel,
      renderer: workspaceToolRendererKey(policy.toolName as WorkspaceInternalToolName),
      artifactType: workspaceToolArtifactType(policy.toolName as WorkspaceInternalToolName),
      streaming: false,
      streamingRenderer: workspaceToolStreamingRendererKey(policy.toolName as WorkspaceInternalToolName),
    },
  };
}

export function listWorkspaceInternalToolManifests(): ExecutableToolManifest[] {
  return Object.values(WORKSPACE_INTERNAL_TOOL_POLICIES).map((policy) =>
    workspaceInternalToolPolicyToManifest(policy as WorkspaceInternalToolPolicy),
  );
}

export function createWorkspaceInternalToolRegistry() {
  return createLocalToolRegistry(listWorkspaceInternalToolManifests());
}

export function workspaceMcpToolManifest(input: {
  connection: WorkspaceAgentConnection;
  toolName: string;
  runtimeToolName?: string;
  description?: string;
}): ExecutableToolManifest {
  const runtimeToolName = input.runtimeToolName ?? workspaceMcpRuntimeToolName(input.connection.id, input.toolName);
  return {
    name: runtimeToolName,
    description: input.description || `Use ${input.toolName} through the ${input.connection.displayName} connection.`,
    source: "mcp",
    risk: "external",
    approval: "always",
    scopes: ["connections:use"],
    sideEffects: ["external_request"],
    available: input.connection.status !== "disabled" && input.connection.allowedToolNames.includes(input.toolName),
    execution: {
      available: input.connection.status !== "disabled",
      reason: input.connection.status === "disabled" ? "Connection is disabled." : undefined,
    },
    inspector: {
      label: `${input.connection.displayName}: ${input.toolName}`,
      description: `External connection tool through ${input.connection.displayName}.`,
      fields: ["connection", "input", "output", "error"],
    },
    render: {
      inspector: `${input.connection.displayName}: ${input.toolName}`,
      renderer: "workspace-tool-result",
      streaming: false,
    },
  };
}

export function workspaceMcpRuntimeToolName(connectionId: string, toolName: string) {
  return `mcp_${safeWorkspaceToolName(connectionId)}_${safeWorkspaceToolName(toolName)}`.slice(0, 120);
}

export function activateWorkspaceToolManifests(input: WorkspaceToolActivationInput): WorkspaceActivatedToolManifest[] {
  const allowed = input.constraints?.allowedToolNames ? new Set(input.constraints.allowedToolNames) : undefined;
  const disabled = new Set(input.constraints?.disabledToolNames ?? []);
  const internalByName = new Map(listWorkspaceInternalToolManifests().map((manifest) => [manifest.name, manifest]));
  const active: WorkspaceActivatedToolManifest[] = [];
  const seen = new Set<string>();

  for (const capability of input.profile.capabilities) {
    if (capability.kind === "internal_tool") {
      if (!capability.enabled || disabled.has(capability.toolName) || seen.has(capability.toolName)) continue;
      if (allowed && !allowed.has(capability.toolName)) continue;
      const manifest = internalByName.get(capability.toolName);
      if (!manifest?.available) continue;
      active.push({
        ...manifest,
        approval: capability.approval,
        capabilityId: capability.id,
      });
      seen.add(capability.toolName);
    }

    if (capability.kind === "mcp_tool" && input.constraints?.includeMcp !== false) {
      if (!capability.enabled) continue;
      const connection = (input.connections ?? []).find((entry) => entry.id === capability.connectionId);
      if (!connection || connection.status === "disabled" || !connection.allowedToolNames.includes(capability.toolName)) continue;
      const runtimeToolName = workspaceMcpRuntimeToolName(connection.id, capability.toolName);
      if (disabled.has(runtimeToolName) || seen.has(runtimeToolName)) continue;
      if (allowed && !allowed.has(runtimeToolName) && !allowed.has(capability.toolName)) continue;
      active.push({
        ...workspaceMcpToolManifest({ connection, toolName: capability.toolName, runtimeToolName }),
        approval: "always",
        capabilityId: capability.id,
        connectionId: connection.id,
        rawToolName: capability.toolName,
      });
      seen.add(runtimeToolName);
    }
  }

  return active;
}

export function createWorkspaceToolRendererRegistry() {
  return createLocalToolRendererRegistry(workspaceToolRendererRegistrations());
}

export function workspaceToolRendererRegistrations(): ToolRendererRegistration[] {
  return [
    { key: "workspace-tool-result", description: "Generic workspace tool result inspector." },
    { key: "workspace-task-card", toolName: "create_workspace_task", artifactType: "task", description: "Workspace task card renderer." },
    { key: "workspace-task-card-update", toolName: "update_workspace_task", artifactType: "task", description: "Workspace task update renderer." },
    { key: "workspace-app-card", toolName: "share_learning_app", artifactType: "app", description: "Learning app card renderer." },
    { key: "workspace-widget-card", toolName: "render_interactive_widget", artifactType: "app", streaming: true, description: "Interactive widget renderer." },
    { key: "workspace-course-card", toolName: "generate_course", artifactType: "course", description: "Course artifact renderer." },
    { key: "workspace-memory-card", toolName: "save_agent_memory", artifactType: "memory", description: "Agent memory review renderer." },
    { key: "workspace-artifact-card", toolName: "save_learning_artifact", artifactType: "saved_artifact", description: "Saved learning artifact renderer." },
  ];
}

function workspaceToolSideEffects(toolName: WorkspaceInternalToolName): string[] {
  if (toolName === "search_workspace_messages" || toolName === "summarize_thread") return [];
  if (toolName === "create_workspace_task" || toolName === "update_workspace_task") return ["task"];
  if (toolName === "save_agent_memory") return ["memory"];
  if (toolName === "generate_course") return ["course", "artifact"];
  if (toolName === "render_interactive_widget" || toolName === "share_learning_app") return ["artifact", "message"];
  if (toolName === "create_quiz" || toolName === "save_learning_artifact") return ["artifact"];
  return ["workspace"];
}

function workspaceToolArtifactType(toolName: WorkspaceInternalToolName): string | undefined {
  if (toolName === "create_workspace_task" || toolName === "update_workspace_task") return "task";
  if (toolName === "save_agent_memory") return "memory";
  if (toolName === "generate_course") return "course";
  if (toolName === "render_interactive_widget" || toolName === "share_learning_app") return "app";
  if (toolName === "save_learning_artifact") return "saved_artifact";
  if (toolName === "create_quiz") return "quiz";
  return undefined;
}

function workspaceToolRendererKey(toolName: WorkspaceInternalToolName): string {
  if (toolName === "create_workspace_task") return "workspace-task-card";
  if (toolName === "update_workspace_task") return "workspace-task-card-update";
  if (toolName === "share_learning_app") return "workspace-app-card";
  if (toolName === "render_interactive_widget") return "workspace-widget-card";
  if (toolName === "generate_course") return "workspace-course-card";
  if (toolName === "save_agent_memory") return "workspace-memory-card";
  if (toolName === "save_learning_artifact") return "workspace-artifact-card";
  return "workspace-tool-result";
}

function workspaceToolStreamingRendererKey(toolName: WorkspaceInternalToolName): string | undefined {
  return toolName === "render_interactive_widget" ? "workspace-widget-stream" : undefined;
}

function workspaceToolInspectorFields(toolName: WorkspaceInternalToolName): string[] {
  if (toolName === "search_workspace_messages" || toolName === "summarize_thread") return ["query", "sourceMessageIds", "summary"];
  if (toolName === "create_workspace_task" || toolName === "update_workspace_task") return ["task", "taskIds", "nextStep"];
  if (toolName === "save_agent_memory") return ["memory", "scope", "nextStep"];
  if (toolName === "generate_course") return ["topic", "moduleIds", "assessments"];
  if (toolName === "render_interactive_widget" || toolName === "share_learning_app") return ["appId", "title", "description"];
  return ["summary", "artifact"];
}

function safeWorkspaceToolName(value: string) {
  return value.replace(/[^a-zA-Z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "tool";
}

function createLocalToolRegistry(tools: ExecutableToolManifest[] = []) {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));
  return {
    get: (name: string) => byName.get(name),
    list: () => Array.from(byName.values()),
    select: (names: string[]) => names.flatMap((name) => {
      const tool = byName.get(name);
      return tool ? [tool] : [];
    }),
  };
}

function createLocalToolRendererRegistry(renderers: ToolRendererRegistration[] = []) {
  const byKey = new Map(renderers.map((renderer) => [renderer.key, renderer]));
  return {
    get: (key: string) => byKey.get(key),
    list: () => Array.from(byKey.values()),
    findForTool: (toolName: string) => Array.from(byKey.values()).find((renderer) => renderer.toolName === toolName),
    findForArtifact: (artifactType: string) => Array.from(byKey.values()).find((renderer) => renderer.artifactType === artifactType),
  };
}
