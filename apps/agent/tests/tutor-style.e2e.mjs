#!/usr/bin/env node

// Offline E2E for the learner-selected Tutor persona: invokes the REAL graph
// against a local fake OpenAI SSE endpoint and asserts, on the actual model
// requests, that the TUTOR STYLE section reaches the main Tutor's system prompt
// and the concept-agent subagent's system prompt (via forwarded run state), and
// that a missing style resolves to the shared default.
//
// Owns its env (createModel runs at module load), so it runs as its own process:
//   pnpm --filter @primoria/agent test:tutor-style-e2e

import { createServer } from "node:http";

const captured = [];
// "single": one task call; "parallel": two concept-agent task calls in one turn.
let taskMode = "single";

function systemText(body) {
  return (body?.messages ?? [])
    .filter((message) => message.role === "system" || message.role === "developer")
    .map((message) => (Array.isArray(message.content)
      ? message.content.map((part) => (typeof part === "string" ? part : String(part?.text ?? ""))).join("")
      : String(message.content ?? "")))
    .join("\n");
}

const server = createServer((req, res) => {
  let raw = "";
  req.on("data", (chunk) => (raw += chunk));
  req.on("end", () => {
    const body = JSON.parse(raw);
    captured.push(body);
    const chunk = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    const base = { id: "1", object: "chat.completion.chunk", created: 0, model: "test" };
    res.writeHead(200, { "content-type": "text/event-stream" });
    const isConcept = systemText(body).includes("Primoria's Concept agent");
    const hasToolResult = (body.messages ?? []).some((message) => message.role === "tool");
    if (isConcept || hasToolResult) {
      chunk({ ...base, choices: [{ index: 0, delta: { role: "assistant", content: "ok" }, finish_reason: null }] });
      chunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
    } else {
      const call = (index, description) => ({
        index,
        id: `call_task_${index}`,
        type: "function",
        function: { name: "task", arguments: JSON.stringify({ description, subagent_type: "concept-agent" }) },
      });
      const calls = taskMode === "parallel"
        ? [call(0, "Explain what a derivative is."), call(1, "Explain what an integral is.")]
        : [call(0, "Explain what a derivative is.")];
      chunk({ ...base, choices: [{ index: 0, delta: { role: "assistant", tool_calls: calls }, finish_reason: null }] });
      chunk({ ...base, choices: [{ index: 0, delta: {}, finish_reason: "tool_calls" }] });
    }
    chunk({ ...base, choices: [], usage: { prompt_tokens: 10, completion_tokens: 1, total_tokens: 11 } });
    res.end("data: [DONE]\n\n");
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));

process.env.AI_PROVIDER = "openai-compatible";
process.env.OPENAI_API_KEY = "fake";
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${server.address().port}/v1`;
process.env.OPENAI_MODEL = "test";
process.env.AI_MODEL_TUTOR = "deepseek-flash";

const { graph } = await import("../src/graph.mjs");
const { HumanMessage } = await import("@langchain/core/messages");

function assert(condition, message) {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

// Same state/context shape the runtime runner builds from the Web request.
async function run(style, threadId, mode = "single") {
  taskMode = mode;
  captured.length = 0;
  const origLog = console.log;
  console.log = () => {};
  try {
    await graph.invoke(
      { messages: [new HumanMessage("什么是导数？")], primoria_tutor_style: style, primoria_content_language: "en" },
      { configurable: { thread_id: threadId }, context: { primoria_tutor_style: style, primoria_content_language: "en" } },
    );
  } finally {
    console.log = origLog;
  }
  const main = captured.filter((body) => !systemText(body).includes("Primoria's Concept agent"));
  const concept = captured.filter((body) => systemText(body).includes("Primoria's Concept agent"));
  for (const body of [...main, ...concept]) {
    assert(systemText(body).includes("REPLY LANGUAGE: English"), "the resolved language overrides Chinese input on both main and concept agents");
    const latestUser = body.messages.findLast((message) => message.role === "user");
    assert(JSON.stringify(latestUser?.content).includes("Primoria response language: English"), "the language reminder follows the latest actual question without changing persisted state");
  }
  return { main, concept };
}

const headerCount = (text) => (text.match(/^TUTOR STYLE:/gm) ?? []).length;

const socratic = await run("socratic", "style-socratic");
assert(socratic.main.length >= 2, `main Tutor called the model before and after the task tool (got ${socratic.main.length})`);
assert(socratic.concept.length >= 1, "concept-agent subagent called the model");
for (const body of socratic.main) {
  const text = systemText(body);
  assert(text.includes("TUTOR STYLE: Socratic"), "main Tutor system prompt carries the Socratic persona");
  assert(headerCount(text) === 1, "main Tutor system prompt carries exactly one persona");
}
for (const body of socratic.concept) {
  const text = systemText(body);
  assert(text.includes("TUTOR STYLE: Socratic"), "concept-agent system prompt carries the Socratic persona");
  assert(headerCount(text) === 1, "concept-agent system prompt carries exactly one persona");
}

const fallback = await run(null, "style-default");
assert(fallback.concept.length >= 1, "concept-agent subagent called the model (default run)");
for (const body of [...fallback.main, ...fallback.concept]) {
  assert(systemText(body).includes("TUTOR STYLE: Feynman"), "a missing style resolves to the default Feynman persona");
}
for (const body of fallback.concept) {
  assert(!systemText(body).includes("Socratic"), "concept-agent carries no hard-coded Socratic style");
}

// Two concept-agent tasks in one model turn must not collide on parent state
// (each subagent returning the same keys in one superstep raises InvalidUpdateError).
const parallel = await run("euclid", "style-parallel", "parallel");
assert(parallel.concept.length >= 2, `both concept-agent tasks ran (got ${parallel.concept.length})`);
for (const body of parallel.concept) {
  assert(systemText(body).includes("TUTOR STYLE: Euclid"), "each parallel concept-agent call carries the persona");
}

server.close();
process.stdout.write("[tutor-style.e2e] ALL CHECKS PASSED\n");
