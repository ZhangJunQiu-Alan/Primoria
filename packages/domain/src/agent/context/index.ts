import type { AgentContext, AgentContextMessage, AgentProfile } from "@primoria/contracts/agent";

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

export class AgentContextEngine {
  constructor(
    private readonly providers: AgentContextProvider[] = [],
    private readonly processors: AgentContextProcessor[] = [],
  ) {}

  async build(input: AgentContextProviderInput): Promise<AgentContext> {
    let context: AgentContext = {
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      surface: input.surface ?? "workspace",
      systemPrompt: input.profile.systemPrompt,
      messages: [{ role: "user", content: input.prompt }],
      memories: [],
      tasks: [],
      artifacts: [],
      metadata: input.metadata ?? {},
    };

    for (const provider of this.providers) {
      context = mergeAgentContext(context, await provider(input));
    }
    for (const processor of this.processors) {
      context = await processor(context);
    }
    return context;
  }
}

export function mergeAgentContext(base: AgentContext, patch: Partial<AgentContext>): AgentContext {
  return {
    ...base,
    ...patch,
    messages: mergeMessages(base.messages, patch.messages),
    memories: patch.memories ?? base.memories,
    tasks: patch.tasks ?? base.tasks,
    artifacts: patch.artifacts ?? base.artifacts,
    metadata: { ...base.metadata, ...(patch.metadata ?? {}) },
  };
}

function mergeMessages(base: AgentContextMessage[], patch?: AgentContextMessage[]) {
  if (!patch) return base;
  return patch;
}
