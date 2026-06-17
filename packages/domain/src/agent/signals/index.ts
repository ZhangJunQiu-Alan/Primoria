import type { AgentEvent, AgentSignal } from "@primoria/contracts/agent";

export function signalFromAgentEvent(event: AgentEvent): AgentSignal | undefined {
  if (event.type === "runtime.started") {
    return { type: "runtime_started", label: "runtime_started", payload: event.payload };
  }
  if (event.type === "runtime.completed") {
    return { type: "runtime_completed", label: "runtime_completed", payload: event.result };
  }
  if (event.type === "runtime.failed") {
    return { type: "runtime_failed", label: "runtime_failed", payload: event.error };
  }
  if (event.type === "runtime.step") {
    return { type: "step_completed", label: event.label, payload: event.payload };
  }
  if (event.type === "tool.started" || event.type === "subagent.started") {
    return { type: "action_applied", label: event.type === "tool.started" ? event.toolName : event.name, payload: event };
  }
  if (event.type === "tool.completed" || event.type === "subagent.completed") {
    return { type: "action_applied", label: event.type === "tool.completed" ? event.toolName : event.name, payload: event };
  }
  if (event.type === "tool.failed") {
    return { type: "action_failed", label: event.toolName, payload: event.error ?? event.payload };
  }
  if (event.type === "tool.skipped") {
    return { type: "action_skipped", label: event.toolName, payload: event.reason ?? event.payload };
  }
  if (event.type === "memory.saved") {
    return { type: "memory_saved", label: "memory_saved", payload: event.memory };
  }
  return undefined;
}

export function withSignalEvent(event: AgentEvent): AgentEvent[] {
  const signal = signalFromAgentEvent(event);
  if (!signal) return [event];
  return [
    event,
    {
      type: "signal.emitted",
      runId: event.runId,
      workspaceId: event.workspaceId,
      threadId: event.threadId,
      createdAt: event.createdAt,
      signal,
    },
  ];
}
