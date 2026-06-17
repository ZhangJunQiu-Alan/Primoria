import type { AgentEvent } from "@primoria/contracts/agent";
import type { AgentSignal } from "@primoria/contracts/agent";
import type { WorkspaceAgentRuntimeEvent } from "../workspaces/agent-runtime";

export type WorkspaceAgentEventEnvelope = {
  runId: string;
  workspaceId: string;
  threadId: string;
  createdAt?: number;
};

export function workspaceRuntimeEventToAgentEvent(
  event: WorkspaceAgentRuntimeEvent & { createdAt?: number },
  envelope: WorkspaceAgentEventEnvelope,
): AgentEvent {
  const base = {
    runId: envelope.runId,
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    createdAt: event.createdAt ?? envelope.createdAt ?? Date.now(),
  };

  if (event.type === "message_delta") {
    const payload = readObject(event.payload);
    const text = typeof payload.text === "string" ? payload.text : "";
    const content = typeof payload.content === "string" ? payload.content : undefined;
    return { ...base, type: "message.delta", text, content };
  }

  if (event.type === "status" && event.label === "started") {
    const payload = readObject(event.payload);
    return {
      ...base,
      type: "runtime.started",
      engine: typeof payload.engine === "string" ? payload.engine : "deepagent",
      model: typeof payload.model === "string" ? payload.model : undefined,
      payload: event.payload,
    };
  }

  if (event.type === "tool_start") {
    return { ...base, type: "tool.started", toolName: event.label, input: readObject(event.payload).input };
  }

  if (event.type === "tool_end") {
    const payload = readObject(event.payload);
    const status = typeof payload.status === "string" ? payload.status : undefined;
    if (status === "failed" || "error" in payload) {
      return {
        ...base,
        type: "tool.failed",
        toolName: event.label,
        error: readAgentError(payload.error),
        payload,
      };
    }
    if (status === "skipped" || "skipReason" in payload) {
      return {
        ...base,
        type: "tool.skipped",
        toolName: event.label,
        reason: typeof payload.skipReason === "string" ? payload.skipReason : typeof payload.reason === "string" ? payload.reason : undefined,
        payload,
      };
    }
    return { ...base, type: "tool.completed", toolName: event.label, output: payload.output };
  }

  if (event.type === "subagent_start") {
    return { ...base, type: "subagent.started", name: event.label, input: readObject(event.payload).input };
  }

  if (event.type === "subagent_end") {
    return { ...base, type: "subagent.completed", name: event.label, output: readObject(event.payload).output };
  }

  if (event.type === "approval_request") {
    const payload = readObject(event.payload);
    return {
      ...base,
      type: "approval.requested",
      approval: {
        toolName: event.label,
        input: "input" in payload ? payload.input : stripApprovalEnvelope(payload),
        policy: buildAgentApprovalPolicyPayload(payload),
        resumeToken: typeof payload.deepAgentThreadId === "string" ? payload.deepAgentThreadId : undefined,
      },
    };
  }

  if (event.type === "ask_user_request") {
    const payload = readObject(event.payload);
    return {
      ...base,
      type: "ask_user.requested",
      question: {
        questionId: typeof payload.questionId === "string" ? payload.questionId : undefined,
        prompt: typeof payload.prompt === "string" ? payload.prompt : "",
        options: Array.isArray(payload.options)
          ? payload.options
              .map((option) => {
                const item = readObject(option);
                return {
                  label: typeof item.label === "string" ? item.label : "",
                  value: typeof item.value === "string" ? item.value : typeof item.label === "string" ? item.label : "",
                  description: typeof item.description === "string" ? item.description : undefined,
                };
              })
              .filter((option) => option.label && option.value)
          : undefined,
        resumeToken: typeof payload.resumeToken === "string" ? payload.resumeToken : undefined,
      },
    };
  }

  if (event.type === "artifact") {
    return { ...base, type: "artifact.created", artifact: event.payload };
  }

  return { ...base, type: "runtime.step", label: event.label, payload: event.payload };
}

export function workspaceRuntimeEventsToAgentEvents(
  events: Array<WorkspaceAgentRuntimeEvent & { createdAt?: number }>,
  envelope: WorkspaceAgentEventEnvelope,
): AgentEvent[] {
  return events.map((event) => workspaceRuntimeEventToAgentEvent(event, envelope));
}

export function workspaceAgentEventsToAgentSignals(events: AgentEvent[]): AgentSignal[] {
  return events.flatMap((event) => {
    const signal = workspaceAgentSignalFromAgentEvent(event);
    return signal ? [signal] : [];
  });
}

export function workspaceAgentSignalFromAgentEvent(event: AgentEvent): AgentSignal | undefined {
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

export function workspaceRuntimeResultToTerminalAgentEvent(input: {
  runId: string;
  workspaceId: string;
  threadId: string;
  content?: string;
  status?: "completed" | "failed" | "cancelled" | "waiting_for_approval";
  error?: string;
  createdAt?: number;
}): AgentEvent {
  if (input.status === "waiting_for_approval") {
    return {
      type: "runtime.step",
      runId: input.runId,
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      createdAt: input.createdAt ?? Date.now(),
      label: "waiting_for_approval",
      payload: { status: "waiting_for_approval" },
    };
  }
  if (input.error || input.status === "failed") {
    return {
      type: "runtime.failed",
      runId: input.runId,
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      createdAt: input.createdAt ?? Date.now(),
      error: { message: input.error ?? "Agent run failed." },
    };
  }
  return {
    type: "runtime.completed",
    runId: input.runId,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    createdAt: input.createdAt ?? Date.now(),
    result: {
      content: input.content ?? "",
      status: input.status ?? "completed",
    },
  };
}

function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readAgentError(value: unknown) {
  if (value instanceof Error) return { message: value.message };
  if (typeof value === "string") return { message: value };
  const error = readObject(value);
  const message = typeof error.message === "string" ? error.message : "Tool failed.";
  return {
    message,
    code: typeof error.code === "string" ? error.code : undefined,
    retryable: typeof error.retryable === "boolean" ? error.retryable : undefined,
  };
}

function buildAgentApprovalPolicyPayload(payload: Record<string, unknown>) {
  const basePolicy = readObject(payload.policy);
  const reviewConfig = readObject(payload.reviewConfig);
  const actionDescription = typeof payload.actionDescription === "string" ? payload.actionDescription.trim() : "";
  const hasReviewConfig = Object.keys(reviewConfig).length > 0;
  if (!hasReviewConfig && !actionDescription) return Object.keys(basePolicy).length ? basePolicy : undefined;
  return {
    ...basePolicy,
    ...(hasReviewConfig ? { reviewConfig } : {}),
    ...(actionDescription ? { actionDescription } : {}),
  };
}

function stripApprovalEnvelope(payload: Record<string, unknown>) {
  const {
    policy: _policy,
    deepAgentThreadId: _deepAgentThreadId,
    reviewConfig: _reviewConfig,
    actionDescription: _actionDescription,
    ...input
  } = payload;
  return Object.keys(input).length ? input : undefined;
}
