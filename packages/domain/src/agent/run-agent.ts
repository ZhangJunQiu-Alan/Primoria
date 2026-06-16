import type { AgentEvent, RunAgentInput } from "@primoria/contracts/agent";
import type { AgentEngineAdapter } from "./engines";

export type RunAgentOptions = {
  engines: Record<string, AgentEngineAdapter>;
};

export async function* runAgent(input: RunAgentInput, options: RunAgentOptions): AsyncIterable<AgentEvent> {
  const engineName = input.engine ?? "deepagent";
  const engine = options.engines[engineName];
  if (!engine) {
    yield {
      type: "runtime.failed",
      runId: input.runId,
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      createdAt: Date.now(),
      error: {
        message: `Agent engine is not registered: ${engineName}`,
        code: "ENGINE_NOT_REGISTERED",
      },
    };
    return;
  }

  yield* engine.run(input);
}
