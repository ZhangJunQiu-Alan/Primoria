import { randomUUID } from "node:crypto";
import { EventType } from "@ag-ui/core";

/** @param {unknown} content */
function textContent(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part && typeof part === "object" && part.type === "text")
    .map((part) => String(part.text ?? ""))
    .join("");
}

/**
 * @param {(event: Record<string, any>) => Promise<unknown>} emit
 */
export function createAguiEventMapper(emit) {
  const messages = new Map();
  const tools = new Map();

  /** @param {string} sourceRunId @param {string | undefined} messageId */
  async function startMessage(sourceRunId, messageId) {
    let message = messages.get(sourceRunId);
    if (message) return message;
    message = { id: messageId || `msg_${sourceRunId}`, started: false };
    messages.set(sourceRunId, message);
    return message;
  }

  /** @param {any} event */
  return async function mapLangGraphEvent(event) {
    if (event.event === "on_chat_model_stream") {
      const chunk = event.data?.chunk;
      const message = await startMessage(event.run_id, chunk?.id);
      const delta = textContent(chunk?.content);
      if (delta) {
        if (!message.started) {
          await emit({ type: EventType.TEXT_MESSAGE_START, messageId: message.id, role: "assistant" });
          message.started = true;
        }
        await emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: message.id, delta });
      }
      for (const toolChunk of chunk?.tool_call_chunks ?? []) {
        if (!toolChunk?.id) continue;
        let tool = tools.get(toolChunk.id);
        if (!tool) {
          tool = {
            id: toolChunk.id,
            name: toolChunk.name ?? "unknown",
            parentMessageId: message.id,
            argsEmitted: false,
            ended: false,
          };
          tools.set(tool.id, tool);
          await emit({
            type: EventType.TOOL_CALL_START,
            toolCallId: tool.id,
            toolCallName: tool.name,
            parentMessageId: tool.parentMessageId,
          });
        }
        if (toolChunk.args) {
          await emit({ type: EventType.TOOL_CALL_ARGS, toolCallId: tool.id, delta: toolChunk.args });
          tool.argsEmitted = true;
        }
      }
      return;
    }

    if (event.event === "on_chat_model_end") {
      const message = messages.get(event.run_id);
      if (message?.started) await emit({ type: EventType.TEXT_MESSAGE_END, messageId: message.id });
      const output = event.data?.output;
      for (const call of output?.tool_calls ?? []) {
        let tool = tools.get(call.id);
        if (!tool) {
          tool = {
            id: call.id,
            name: call.name,
            parentMessageId: message?.id ?? output?.id,
            argsEmitted: false,
            ended: false,
          };
          tools.set(tool.id, tool);
          await emit({
            type: EventType.TOOL_CALL_START,
            toolCallId: tool.id,
            toolCallName: tool.name,
            parentMessageId: tool.parentMessageId,
          });
        }
        if (!tool.argsEmitted) {
          await emit({ type: EventType.TOOL_CALL_ARGS, toolCallId: tool.id, delta: JSON.stringify(call.args ?? {}) });
          tool.argsEmitted = true;
        }
        if (!tool.ended) {
          await emit({ type: EventType.TOOL_CALL_END, toolCallId: tool.id });
          tool.ended = true;
        }
      }
      return;
    }

    if (event.event === "on_tool_end") {
      const output = event.data?.output;
      const toolCallId = output?.tool_call_id;
      if (!toolCallId) return;
      const tool = tools.get(toolCallId);
      if (tool && !tool.ended) {
        await emit({ type: EventType.TOOL_CALL_END, toolCallId });
        tool.ended = true;
      }
      await emit({
        type: EventType.TOOL_CALL_RESULT,
        messageId: output?.id ?? `tool_${randomUUID()}`,
        toolCallId,
        content: typeof output?.content === "string" ? output.content : JSON.stringify(output?.content ?? ""),
        role: "tool",
      });
      return;
    }

    if (event.event === "on_custom_event") {
      await emit({ type: EventType.CUSTOM, name: event.name, value: event.data });
    }
  };
}
