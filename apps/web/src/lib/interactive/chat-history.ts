import { OpenInteractiveComponentArgsSchema, PositionLearningGoalArgsSchema } from "@primoria/contracts/artifacts/schemas";

type Message = { id?: string; role?: string; content?: unknown; toolCalls?: unknown; toolCallId?: string; metadata?: unknown };
type Call = { id: string; type: "function"; function: { name: "open_interactive_component" | "request_course_intake" | "position_learning_goal"; arguments: string } };

function callsOf(value: unknown): Call[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((call) => {
    if (!call || typeof call.id !== "string" || call.type !== "function" || !["open_interactive_component", "request_course_intake", "position_learning_goal"].includes(call.function?.name)) return [];
    try {
      const schema = call.function.name === "open_interactive_component" ? OpenInteractiveComponentArgsSchema : PositionLearningGoalArgsSchema;
      schema.parse(JSON.parse(call.function.arguments));
      return [{ id: call.id, type: "function" as const, function: { name: call.function.name as Call["function"]["name"], arguments: call.function.arguments as string } }];
    } catch { return []; }
  });
}

export function interactiveHistoryMetadata(message: Message, completedToolIds: Set<string>) {
  if (message.role === "assistant") {
    const calls = callsOf(message.toolCalls).filter((call) => completedToolIds.has(call.id));
    return calls.length ? { source: "copilotkit", interactiveToolCalls: calls } : { source: "copilotkit" };
  }
  if (message.role === "tool" && message.toolCallId && completedToolIds.has(message.toolCallId)) {
    try {
      const result = JSON.parse(String(message.content));
      const interactive = result.type === "interactive_component_request" && result.instanceId === message.toolCallId;
      const intake = ["course_intake", "learning_goal_position"].includes(result.type) && typeof result.query === "string";
      if (!interactive && !intake) return null;
      return { source: "copilotkit", interactiveToolCallId: message.toolCallId };
    } catch { return null; }
  }
  return message.role === "user" ? { source: "copilotkit" } : null;
}

export function completedInteractiveToolIds(messages: readonly Message[]) {
  const called = new Set(messages.flatMap((message) => callsOf(message.toolCalls).map((call) => call.id)));
  return new Set(messages.filter((message) => message.role === "tool" && message.toolCallId && called.has(message.toolCallId)).map((message) => message.toolCallId!));
}

export function restoreInteractiveHistory(messages: readonly Message[]) {
  return messages.flatMap((message) => {
    const metadata = message.metadata as { interactiveToolCalls?: unknown; interactiveToolCallId?: string } | undefined;
    if (message.role === "user") return [{ id: message.id, role: "user", content: String(message.content ?? "") }];
    if (message.role === "assistant") {
      const toolCalls = callsOf(metadata?.interactiveToolCalls);
      return [{ id: message.id, role: "assistant", content: String(message.content ?? ""), ...(toolCalls.length ? { toolCalls } : {}) }];
    }
    if (message.role === "tool" && metadata?.interactiveToolCallId) return [{ id: message.id, role: "tool", content: String(message.content ?? ""), toolCallId: metadata.interactiveToolCallId }];
    return [];
  });
}
