import type { AgentEvent, AgentMemoryCandidate, AgentMemoryExtractionInput } from "@primoria/contracts/agent";
import { AgentMemoryCandidateSchema } from "../../../../contracts/src/agent/index";

export type AgentMemoryExtractor = (input: AgentMemoryExtractionInput) => Promise<AgentMemoryCandidate[]> | AgentMemoryCandidate[];

export type AgentMemoryGateKeeper = (
  candidate: AgentMemoryCandidate,
  input: AgentMemoryExtractionInput,
) => Promise<boolean> | boolean;

export type AgentMemoryPipelineOptions = {
  enabled?: boolean;
  extractor?: AgentMemoryExtractor;
  gateKeeper?: AgentMemoryGateKeeper;
};

export type AgentMemoryPipelineResult = {
  candidates: AgentMemoryCandidate[];
  events: AgentEvent[];
};

export async function runAgentMemoryPipeline(
  input: AgentMemoryExtractionInput,
  options: AgentMemoryPipelineOptions = {},
): Promise<AgentMemoryPipelineResult> {
  if (!options.enabled || !options.extractor) {
    return { candidates: [], events: [] };
  }

  const extracted = await options.extractor(input);
  const candidates: AgentMemoryCandidate[] = [];
  const events: AgentEvent[] = [];
  for (const rawCandidate of extracted) {
    const parsed = AgentMemoryCandidateSchema.safeParse(rawCandidate);
    if (!parsed.success) continue;
    const candidate = parsed.data;
    if (options.gateKeeper && !(await options.gateKeeper(candidate, input))) continue;
    candidates.push(candidate);
    events.push({
      type: "memory.candidate",
      runId: input.runId,
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      createdAt: Date.now(),
      memory: candidate,
    });
  }

  return { candidates, events };
}
