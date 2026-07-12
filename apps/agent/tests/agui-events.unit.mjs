#!/usr/bin/env node

import assert from "node:assert/strict";
import { createAguiEventMapper } from "../src/runtime/agui-events.mjs";

const events = [];
const map = createAguiEventMapper(async (event) => events.push(event));

await map({
  event: "on_chat_model_stream",
  run_id: "model-1",
  data: { chunk: { id: "message-1", content: "Hello", tool_call_chunks: [] } },
});
await map({
  event: "on_chat_model_stream",
  run_id: "model-1",
  data: { chunk: { id: "message-1", content: "", tool_call_chunks: [{ id: "tool-1", name: "render_chart", args: "{\"title\":\"T\"}" }] } },
});
await map({
  event: "on_chat_model_end",
  run_id: "model-1",
  data: { output: { id: "message-1", content: "Hello", tool_calls: [{ id: "tool-1", name: "render_chart", args: { title: "T" } }] } },
});
await map({
  event: "on_tool_end",
  run_id: "tool-run-1",
  data: { output: { id: "tool-message-1", tool_call_id: "tool-1", content: "{\"type\":\"html_widget\"}" } },
});

assert.deepEqual(events.map((event) => event.type), [
  "TEXT_MESSAGE_START",
  "TEXT_MESSAGE_CONTENT",
  "TOOL_CALL_START",
  "TOOL_CALL_ARGS",
  "TEXT_MESSAGE_END",
  "TOOL_CALL_END",
  "TOOL_CALL_RESULT",
]);
assert.equal(events[2].parentMessageId, "message-1");
assert.equal(events.at(-1).toolCallId, "tool-1");
process.stdout.write("[agui-events.unit] ALL CHECKS PASSED\n");
