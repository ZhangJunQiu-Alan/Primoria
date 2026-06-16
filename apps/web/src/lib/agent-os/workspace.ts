import type { AgentEvent, AgentProfile, RunAgentInput } from "@primoria/contracts/agent";
import type {
  WorkspaceAgentRuntimeContext,
  WorkspaceAgentRuntimeEvent,
  WorkspaceAgentRuntimeRunInput,
} from "../workspaces/agent-runtime";
import type { WorkspaceAgentProfile } from "../workspaces/types";
import {
  workspaceRuntimeEventToAgentEvent,
  workspaceRuntimeResultToTerminalAgentEvent,
  type WorkspaceAgentEventEnvelope,
} from "./events";

export function workspaceAgentProfileToAgentProfile(profile: WorkspaceAgentProfile): AgentProfile {
  return {
    id: profile.id,
    workspaceId: profile.workspaceId,
    ownerId: profile.ownerId,
    displayName: profile.displayName,
    handle: profile.handle,
    description: profile.description,
    visibility: profile.visibility,
    templateKey: profile.templateKey,
    systemPrompt: profile.systemPrompt,
    defaultModel: profile.defaultModel,
    memoryScope: profile.memoryScope,
    capabilities: profile.capabilities.map((capability) => {
      if (capability.kind === "skill") {
        return {
          kind: "skill",
          id: capability.id,
          source: capability.source,
          path: capability.path,
          enabled: capability.enabled,
        };
      }
      if (capability.kind === "internal_tool") {
        return {
          kind: "internal_tool",
          id: capability.id,
          toolName: capability.toolName,
          approval: capability.approval,
          enabled: capability.enabled,
        };
      }
      if (capability.kind === "mcp_tool") {
        return {
          kind: "mcp_tool",
          id: capability.id,
          connectionId: capability.connectionId,
          toolName: capability.toolName,
          approval: capability.approval,
          enabled: capability.enabled,
        };
      }
      return {
        kind: "subagent",
        id: capability.id,
        agentProfileId: capability.agentProfileId,
        enabled: capability.enabled,
      };
    }),
  };
}

export function workspaceRuntimeInputToRunAgentInput(
  input: WorkspaceAgentRuntimeRunInput & { context?: RunAgentInput["context"] },
): RunAgentInput {
  const context = input.context;
  return {
    runId: input.runId,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    userId: input.profile.ownerId,
    surface: "workspace",
    engine: "deepagent",
    profile: workspaceAgentProfileToAgentProfile(input.profile),
    prompt: input.prompt,
    context: context ?? {
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      surface: "workspace",
      systemPrompt: input.profile.systemPrompt,
      messages: workspaceContextMessages(input),
      memories: input.agentMemories ?? [],
      tasks: input.openTasks,
      artifacts: [],
      metadata: {
        workspaceName: input.workspaceName,
        threadName: input.thread.name,
        threadType: input.thread.type,
        agentMemberId: input.member.id,
        visibleMessages: input.visibleMessages ?? [],
        agentConnectionCount: input.agentConnections?.length ?? 0,
        delegateProfileCount: input.delegateProfiles?.length ?? 0,
      },
    },
    metadata: {
      workspaceName: input.workspaceName,
      threadId: input.thread.id,
      agentMemberId: input.member.id,
    },
  };
}

export function workspaceRuntimeEventsToAgentEventsWithTerminal(input: {
  events: WorkspaceAgentRuntimeEvent[];
  envelope: WorkspaceAgentEventEnvelope;
  content?: string;
  status?: "completed" | "failed" | "cancelled" | "waiting_for_approval";
  error?: string;
}): AgentEvent[] {
  return [
    ...input.events.map((event) => workspaceRuntimeEventToAgentEvent(event, input.envelope)),
    workspaceRuntimeResultToTerminalAgentEvent({
      runId: input.envelope.runId,
      workspaceId: input.envelope.workspaceId,
      threadId: input.envelope.threadId,
      content: input.content,
      status: input.status,
      error: input.error,
      createdAt: input.envelope.createdAt,
    }),
  ];
}

function workspaceContextMessages(input: WorkspaceAgentRuntimeContext & { prompt: string }) {
  return [
    ...input.recentMessages.map((content) => ({
      role: "assistant" as const,
      content,
    })),
    {
      role: "user" as const,
      content: input.prompt,
    },
  ];
}
