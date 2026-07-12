#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";
if (!databaseUrl || !/test/i.test(databaseName) || databaseUrl === process.env.DATABASE_URL) {
  process.stderr.write("[runtime-server.db.e2e] TEST_DATABASE_URL must be an isolated test database\n");
  process.exit(1);
}

const modelServer = createServer((req, res) => {
  req.resume();
  req.on("end", () => {
    res.writeHead(200, { "content-type": "text/event-stream" });
    const send = (value) => res.write(`data: ${JSON.stringify(value)}\n\n`);
    send({ id: "runtime-test-message", object: "chat.completion.chunk", created: 0, model: "test", choices: [{ index: 0, delta: { role: "assistant", content: "runtime ok" }, finish_reason: null }] });
    send({ id: "runtime-test-message", object: "chat.completion.chunk", created: 0, model: "test", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
    send({ id: "runtime-test-message", object: "chat.completion.chunk", created: 0, model: "test", choices: [], usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12 } });
    res.end("data: [DONE]\n\n");
  });
});
const modelSockets = new Set();
modelServer.on("connection", (socket) => {
  modelSockets.add(socket);
  socket.on("close", () => modelSockets.delete(socket));
});
await new Promise((resolve) => modelServer.listen(0, "127.0.0.1", resolve));

process.env.DATABASE_URL = databaseUrl;
process.env.PORT = "3214";
process.env.HOST = "127.0.0.1";
process.env.AI_PROVIDER = "openai-compatible";
process.env.OPENAI_API_KEY = "fake";
process.env.OPENAI_BASE_URL = `http://127.0.0.1:${modelServer.address().port}/v1`;
process.env.OPENAI_MODEL = "test";

const { migrateAgentRuntime } = await import("../src/runtime/migrate.mjs");
await migrateAgentRuntime(databaseUrl);
const { startAgentServer } = await import("../src/server.mjs");
const runtime = await startAgentServer();
const runId = `run_${randomUUID()}`;

try {
  const response = await fetch("http://127.0.0.1:3214/agent", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({
      threadId: `thread_${randomUUID()}`,
      runId,
      state: {},
      messages: [{ id: "user-message-1", role: "user", content: "hello" }],
      tools: [],
      context: [],
      forwardedProps: {},
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.text();
  const events = body.split("\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)));
  assert.deepEqual(events.map((event) => event.type), [
    "RUN_STARTED",
    "TEXT_MESSAGE_START",
    "TEXT_MESSAGE_CONTENT",
    "TEXT_MESSAGE_END",
    "RUN_FINISHED",
  ]);
  assert.equal((await runtime.store.getRun(runId)).status, "completed");
  process.stdout.write("[runtime-server.db.e2e] ALL CHECKS PASSED\n");
} finally {
  await runtime.close("test complete");
  modelServer.close();
  for (const socket of modelSockets) socket.destroy();
}
process.exit(0);
