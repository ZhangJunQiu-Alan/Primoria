import type { AgentEvent, ExternalAgentSessionEvent, GroupSupervisorAction } from "@primoria/contracts/agent";
import {
  ExternalAgentSessionEventSchema,
  GroupSupervisorActionSchema,
} from "../../../../../packages/contracts/src/agent/index";

export function validateGroupSupervisorAction(action: GroupSupervisorAction): GroupSupervisorAction {
  return GroupSupervisorActionSchema.parse(action);
}

export function externalAgentSessionEventToAgentEvent(
  event: ExternalAgentSessionEvent,
  envelope: { runId: string; workspaceId?: string; threadId?: string; createdAt?: number },
): AgentEvent {
  const parsed = ExternalAgentSessionEventSchema.parse(event);
  const base = {
    runId: envelope.runId,
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    createdAt: envelope.createdAt ?? Date.now(),
  };
  if (parsed.type === "started") {
    return { ...base, type: "runtime.started", engine: parsed.engine ?? "external", model: parsed.model, payload: parsed.payload };
  }
  if (parsed.type === "message.delta") {
    return { ...base, type: "message.delta", text: parsed.text, content: parsed.content };
  }
  if (parsed.type === "subagent.started") {
    return { ...base, type: "subagent.started", name: parsed.name, input: parsed.input };
  }
  if (parsed.type === "subagent.completed") {
    return { ...base, type: "subagent.completed", name: parsed.name, output: parsed.output };
  }
  if (parsed.type === "ask_user.requested") {
    return { ...base, type: "ask_user.requested", question: parsed.question };
  }
  if (parsed.type === "failed") {
    return { ...base, type: "runtime.failed", error: parsed.error };
  }
  if (parsed.type === "cancelled") {
    return { ...base, type: "runtime.completed", result: { status: "cancelled", reason: parsed.reason } };
  }
  return { ...base, type: "runtime.completed", result: parsed.result };
}

export function deepAgentSubagentRuntimeEventToSupervisorAction(input: {
  name: string;
  task?: string;
  output?: unknown;
  completed?: boolean;
}): GroupSupervisorAction {
  if (input.completed) {
    return validateGroupSupervisorAction({
      type: "speak",
      from: input.name,
      message: typeof input.output === "string" ? input.output : JSON.stringify(input.output ?? ""),
    });
  }
  return validateGroupSupervisorAction({
    type: "delegate",
    agentId: input.name,
    task: input.task ?? "Delegated DeepAgent task",
  });
}
