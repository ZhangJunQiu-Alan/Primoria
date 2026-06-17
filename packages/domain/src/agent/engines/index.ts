import type { AgentEvent, RunAgentInput } from "@primoria/contracts/agent";

export type AgentEngineRunResult = {
  content: string;
  status?: "completed" | "failed" | "cancelled" | "waiting_for_approval";
  error?: string;
};

export type AgentEngineAdapter = {
  name: string;
  run(input: RunAgentInput): AsyncIterable<AgentEvent>;
};

export async function collectAgentEvents(events: AsyncIterable<AgentEvent>): Promise<AgentEvent[]> {
  const collected: AgentEvent[] = [];
  for await (const event of events) collected.push(event);
  return collected;
}
