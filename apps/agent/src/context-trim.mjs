import { AIMessage, ToolMessage } from "@langchain/core/messages";

// History trimming for the tutor agent (prompt-cache aware).
//
// Two deterministic passes over the per-request message list (state is never
// mutated — only the model request):
//
// 1. compactPastMessages — messages BEFORE the latest human message are "past
//    turns": bulky tool-call args and tool results (widget HTML, STEM code,
//    algorithm steps, skill/API docs) are replaced with a compact summary.
//    Messages from the latest human message onward stay intact because the
//    model may still need them inside the current run.
//    A past turn's compacted form never changes on later requests, so the
//    request prefix stays byte-stable turn over turn and provider prompt
//    caches keep hitting.
//
// 2. capHistoryMessages — when the (compacted) history still exceeds
//    HISTORY_MAX_CHARS, whole oldest turns are dropped at human-message
//    boundaries down to HISTORY_TRIM_TO_CHARS. The wide hysteresis band makes
//    trims rare, so the prefix is stable between trims and each trim costs at
//    most one cache miss.

export const HISTORY_MAX_CHARS = 48_000;
export const HISTORY_TRIM_TO_CHARS = 24_000;
const TOOL_PAYLOAD_KEEP_CHARS = 700;
const SUMMARY_FIELD_KEEP_CHARS = 200;

/** @param {unknown} msg */
function messageType(msg) {
  const m = /** @type {any} */ (msg);
  if (typeof m?.getType === "function") return m.getType();
  if (typeof m?._getType === "function") return m._getType();
  return String(m?.type ?? "");
}

/** @param {unknown} content */
function contentToString(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String(/** @type {any} */ (part).text ?? "");
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

/** @param {unknown} msg */
function messageSize(msg) {
  const m = /** @type {any} */ (msg);
  let size = contentToString(m?.content).length;
  if (Array.isArray(m?.tool_calls) && m.tool_calls.length) {
    try {
      size += JSON.stringify(m.tool_calls).length;
    } catch {
      // unmeasurable tool calls count as content only
    }
  }
  return size;
}

/** @param {string} text @param {number} max */
function truncate(text, max) {
  return text.length <= max ? text : `${text.slice(0, max)}…[trimmed]`;
}

const SUMMARY_KEYS = ["type", "title", "description", "subject", "scene", "algorithm", "technology", "approach"];

/** Compact summary of a large tool payload: keep the small identifying fields,
 * drop the bulk (html/code/steps/scene/option/...).
 * @param {Record<string, unknown>} obj */
function summarizePayload(obj) {
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of SUMMARY_KEYS) {
    const value = obj[key];
    if (typeof value === "string" && value) out[key] = truncate(value, SUMMARY_FIELD_KEEP_CHARS);
  }
  out.trimmed = "large payload omitted from history";
  return out;
}

/** @param {string} text */
function compactPayloadText(text) {
  if (text.length <= TOOL_PAYLOAD_KEEP_CHARS) return text;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return JSON.stringify(summarizePayload(/** @type {Record<string, unknown>} */ (parsed)));
    }
  } catch {
    // not JSON — plain truncation below
  }
  return truncate(text, TOOL_PAYLOAD_KEEP_CHARS);
}

/** @param {any} msg */
function compactToolMessage(msg) {
  const text = contentToString(msg.content);
  const compacted = compactPayloadText(text);
  if (compacted === text) return msg;
  return new ToolMessage({
    tool_call_id: msg.tool_call_id,
    name: msg.name,
    content: compacted,
  });
}

/** @param {any} msg */
function compactAiMessage(msg) {
  const toolCalls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];
  let changed = false;
  const compactedCalls = toolCalls.map((/** @type {any} */ call) => {
    let serialized;
    try {
      serialized = JSON.stringify(call?.args ?? {});
    } catch {
      return call;
    }
    if (serialized.length <= TOOL_PAYLOAD_KEEP_CHARS) return call;
    changed = true;
    return { ...call, args: summarizePayload(/** @type {Record<string, unknown>} */ (call.args ?? {})) };
  });
  if (!changed) return msg;
  return new AIMessage({
    content: msg.content,
    tool_calls: compactedCalls,
    name: msg.name,
  });
}

/** Compact bulky payloads in past turns (everything before the latest human
 * message). Returns the SAME array instance when nothing changed.
 * @param {unknown[]} messages */
export function compactPastMessages(messages) {
  let boundary = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messageType(messages[i]) === "human") {
      boundary = i;
      break;
    }
  }
  if (boundary <= 0) return messages;

  let changed = false;
  const out = messages.map((msg, index) => {
    if (index >= boundary) return msg;
    const type = messageType(msg);
    const compacted =
      type === "tool" ? compactToolMessage(msg) : type === "ai" ? compactAiMessage(msg) : msg;
    if (compacted !== msg) changed = true;
    return compacted;
  });
  return changed ? out : messages;
}

/** Drop whole oldest turns (at human-message boundaries) once the history
 * exceeds maxChars, down to trimToChars. The latest turn is always kept.
 * Returns the SAME array instance when under budget.
 * @param {unknown[]} messages
 * @param {{ maxChars?: number, trimToChars?: number }} [opts] */
export function capHistoryMessages(messages, opts = {}) {
  const maxChars = opts.maxChars ?? HISTORY_MAX_CHARS;
  const trimToChars = opts.trimToChars ?? HISTORY_TRIM_TO_CHARS;
  const sizes = messages.map(messageSize);
  let total = sizes.reduce((sum, size) => sum + size, 0);
  if (total <= maxChars) return messages;

  const humanIndices = [];
  for (let i = 0; i < messages.length; i += 1) {
    if (messageType(messages[i]) === "human") humanIndices.push(i);
  }
  if (humanIndices.length <= 1) return messages;

  let start = 0;
  for (let k = 1; k < humanIndices.length && total > trimToChars; k += 1) {
    for (let i = start; i < humanIndices[k]; i += 1) total -= sizes[i];
    start = humanIndices[k];
  }
  return start > 0 ? messages.slice(start) : messages;
}

/** Full per-request history pass: compact past payloads, then cap total size.
 * @param {unknown[]} messages */
export function trimAgentHistory(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return messages;
  return capHistoryMessages(compactPastMessages(messages));
}
