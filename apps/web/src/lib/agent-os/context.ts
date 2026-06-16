import type { AgentContext, AgentProfile } from "@primoria/contracts/agent";
import { workspaceAgentProfileToAgentProfile } from "./workspace";
import type {
  WorkspaceAgentRuntimeContext,
  WorkspaceAgentRuntimeRunInput,
} from "../workspaces/agent-runtime";
import type { WorkspaceAgentProfile } from "../workspaces/types";

export type AgentContextProviderInput = {
  profile: AgentProfile;
  prompt: string;
  surface?: AgentContext["surface"];
  workspaceId?: string;
  threadId?: string;
  metadata?: Record<string, unknown>;
};

export type AgentContextProvider = (input: AgentContextProviderInput) => Promise<Partial<AgentContext>> | Partial<AgentContext>;
export type AgentContextProcessor = (context: AgentContext) => Promise<AgentContext> | AgentContext;

export type BuildAgentContextInput = AgentContextProviderInput & {
  providers?: AgentContextProvider[];
  processors?: AgentContextProcessor[];
};

export async function buildAgentContext(input: BuildAgentContextInput): Promise<AgentContext> {
  let context: AgentContext = {
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    surface: input.surface ?? "workspace",
    prompt: input.prompt,
    systemPrompt: input.profile.systemPrompt,
    messages: [{ role: "user", content: input.prompt }],
    memories: [],
    tasks: [],
    artifacts: [],
    metadata: input.metadata ?? {},
  };
  for (const provider of input.providers ?? []) {
    context = mergeAgentContext(context, await provider(input));
  }
  for (const processor of input.processors ?? []) {
    context = await processor(context);
  }
  return context;
}

export function createWorkspaceAgentContextProvider(input: WorkspaceAgentRuntimeContext): AgentContextProvider {
  return (providerInput) => ({
    messages: [
      ...input.recentMessages.map((content) => ({ role: "assistant" as const, content })),
      { role: "user" as const, content: providerInput.prompt },
    ],
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
      connections: input.agentConnections ?? [],
      delegateProfiles: input.delegateProfiles ?? [],
    },
  });
}

export function createTokenAccountingProcessor(tokenBudget?: number): AgentContextProcessor {
  return (context) => {
    const tokenEstimate = estimateAgentContextTokens(context);
    return {
      ...context,
      tokenBudget,
      tokenEstimate,
      metadata: {
        ...context.metadata,
        tokenEstimate,
        ...(tokenBudget !== undefined ? { tokenBudget } : {}),
      },
    };
  };
}

export async function buildWorkspaceAgentContext(
  input: WorkspaceAgentRuntimeRunInput,
  options: { processors?: AgentContextProcessor[]; tokenBudget?: number } = {},
): Promise<AgentContext> {
  const processors = [
    createTokenAccountingProcessor(options.tokenBudget),
    ...(options.processors ?? []),
  ];
  return buildAgentContext({
    profile: workspaceAgentProfileToAgentProfile(input.profile),
    prompt: input.prompt,
    surface: "workspace",
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    metadata: {
      workspaceName: input.workspaceName,
      threadId: input.thread.id,
      agentMemberId: input.member.id,
    },
    providers: [createWorkspaceAgentContextProvider(input)],
    processors,
  });
}

export function workspaceAgentProfileToContextProfile(profile: WorkspaceAgentProfile): AgentProfile {
  return workspaceAgentProfileToAgentProfile(profile);
}

function mergeAgentContext(base: AgentContext, patch: Partial<AgentContext>): AgentContext {
  return {
    ...base,
    ...patch,
    messages: patch.messages ?? base.messages,
    memories: patch.memories ?? base.memories,
    tasks: patch.tasks ?? base.tasks,
    artifacts: patch.artifacts ?? base.artifacts,
    metadata: { ...base.metadata, ...(patch.metadata ?? {}) },
  };
}

function estimateAgentContextTokens(context: AgentContext) {
  const text = [
    context.systemPrompt,
    context.prompt,
    ...context.messages.map((message) => message.content),
    ...context.memories.map((memory) => JSON.stringify(memory)),
    ...context.tasks.map((task) => JSON.stringify(task)),
    ...context.artifacts.map((artifact) => JSON.stringify(artifact)),
  ].join("\n");
  return Math.ceil(text.length / 4);
}
