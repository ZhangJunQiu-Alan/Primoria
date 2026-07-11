#!/usr/bin/env node

// Offline E2E for the primoria_tutor graph: invokes the REAL graph against a
// local fake OpenAI SSE endpoint and asserts, on the actual model request,
// that (a) the history-trim middleware drops a past turn's giant widget html
// while keeping its title and the current turn intact, and (b) one "llm usage"
// log line is emitted with cacheReadTokens extracted from the usage chunk.
//
// Requires env to be set BEFORE graph.mjs is imported (createModel runs at
// module load), so this file owns its env and must run as its own process:
//   pnpm --filter @primoria/agent test:graph-e2e

import { createServer } from "node:http";

const captured = [];
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    captured.push(JSON.parse(body));
    res.writeHead(200, { "content-type": "text/event-stream" });
    const chunk = (obj) => `data: ${JSON.stringify(obj)}\n\n`;
    res.write(chunk({ id: "1", object: "chat.completion.chunk", created: 0, model: "test", choices: [{ index: 0, delta: { role: "assistant", content: "ok" }, finish_reason: null }] }));
    res.write(chunk({ id: "1", object: "chat.completion.chunk", created: 0, model: "test", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }));
    res.write(chunk({ id: "1", object: "chat.completion.chunk", created: 0, model: "test", choices: [], usage: { prompt_tokens: 100, completion_tokens: 1, total_tokens: 101, prompt_cache_hit_tokens: 64 } }));
    res.write("data: [DONE]\n\n");
    res.end();
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));

process.env.AI_PROVIDER = "openai-compatible";
process.env.OPENAI_API_KEY = "fake";
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
process.env.OPENAI_MODEL = "test";

const { graph } = await import("../src/graph.mjs");
const { HumanMessage, AIMessage, ToolMessage } = await import("@langchain/core/messages");

const BIG = "z".repeat(9000);
const messages = [
  new HumanMessage("show me a pendulum widget"),
  new AIMessage({
    content: "Building it.",
    tool_calls: [{ id: "c1", name: "widgetRenderer", args: { title: "Pendulum", description: "demo", html: `<div>${BIG}</div>` } }],
  }),
  new ToolMessage({ tool_call_id: "c1", name: "widgetRenderer", content: JSON.stringify({ type: "html_widget", title: "Pendulum", html: `<div>${BIG}</div>` }) }),
  new HumanMessage("thanks! now explain the math CURRENT_TURN_MARKER"),
];

const logs = [];
const origLog = console.log;
console.log = (...args) => { logs.push(args.join(" ")); };
await graph.invoke({ messages }, { configurable: { thread_id: "t1" } });
console.log = origLog;
server.close();

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

assert(captured.length > 0, "model endpoint was called");
const payload = JSON.stringify(captured[0].messages);
assert(!payload.includes(BIG), "past-turn giant widget html is trimmed from the model request");
assert(payload.includes("Pendulum"), "compacted summary keeps the widget title");
assert(payload.includes("CURRENT_TURN_MARKER"), "current-turn user message is intact");
assert(payload.includes("show me a pendulum"), "past human text is kept");
const usageLine = logs.find((l) => l.includes('"llm usage"'));
assert(usageLine, "usage log line was emitted");
assert(usageLine.includes('"cacheReadTokens":64'), `cacheReadTokens extracted from provider usage (got: ${usageLine})`);
process.stdout.write("[graph-invoke.e2e] ALL CHECKS PASSED\n");
