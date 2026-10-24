// AG-UI's RunAgentInputSchema (zod 3 inside CopilotKit 1.55 / AG-UI 0.0.52)
// records an issue for every invalid element of an unbounded array and never
// stops early (GHSA-mrhx-c7xc-m3w5): ~3 MB of invalid messages costs ~800 MB of
// heap. Web and the Agent reject inputs above this many schema-validated array
// elements before AG-UI parses them.
export const AGENT_INPUT_MAX_ARRAY_ITEMS = 10_000;

/** @param {unknown} value */
const length = (value) => (Array.isArray(value) ? value.length : 0);

/**
 * Counts the elements RunAgentInputSchema validates one by one: messages,
 * tools, context, and each message's toolCalls and content parts.
 * @param {unknown} input
 */
export function exceedsAgentInputArrayLimit(input) {
  if (!input || typeof input !== "object") return false;
  const { messages, tools, context } = /** @type {Record<string, unknown>} */ (input);
  let count = length(messages) + length(tools) + length(context);
  for (const message of Array.isArray(messages) ? messages : []) {
    if (count > AGENT_INPUT_MAX_ARRAY_ITEMS) break;
    if (!message || typeof message !== "object") continue;
    const { toolCalls, content } = /** @type {Record<string, unknown>} */ (message);
    count += length(toolCalls) + length(content);
  }
  return count > AGENT_INPUT_MAX_ARRAY_ITEMS;
}
