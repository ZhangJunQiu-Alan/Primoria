import type { AgentEvent, AgentMemoryCandidate, AgentMemoryExtractionInput } from "@primoria/contracts/agent";
import { AgentEventSchema, AgentMemoryCandidateSchema } from "../../../../../packages/contracts/src/agent/index";
import {
  runAgentMemoryPipeline,
  type AgentMemoryExtractor,
  type AgentMemoryGateKeeper,
} from "../../../../../packages/domain/src/agent/index";
import type { WorkspaceAgentRuntimeRunInput } from "../workspaces/agent-runtime";

export type WorkspaceAgentMemoryPipelineOptions = {
  enabled?: boolean;
  extractor?: AgentMemoryExtractor;
  gateKeeper?: AgentMemoryGateKeeper;
};

export function validateAgentMemoryCandidate(candidate: AgentMemoryCandidate) {
  return AgentMemoryCandidateSchema.parse(candidate);
}

export function validateAgentMemoryEvent(event: AgentEvent) {
  return AgentEventSchema.parse(event);
}

export async function runWorkspaceAgentMemoryPipeline(
  input: WorkspaceAgentRuntimeRunInput,
  result: { content?: string; status?: string },
  options: WorkspaceAgentMemoryPipelineOptions = {},
) {
  const extractionInput: AgentMemoryExtractionInput = {
    runId: input.runId,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    prompt: input.prompt,
    response: result.content ?? "",
    context: {
      workspaceName: input.workspaceName,
      thread: input.thread,
      recentMessages: input.recentMessages,
      visibleMessages: input.visibleMessages ?? [],
      tasks: input.openTasks,
      memories: input.agentMemories ?? [],
    },
    metadata: {
      status: result.status,
      profileId: input.profile.id,
      memberId: input.member.id,
      provider: "agent-os",
      integrationNotes: "Connect extractors to packages/memory providers, including mem0, behind explicit enablement and review policy.",
    },
  };
  return runAgentMemoryPipeline(extractionInput, options);
}
