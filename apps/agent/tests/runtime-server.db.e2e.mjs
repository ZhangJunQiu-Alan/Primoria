#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { startScriptedOpenAIServer } from "./helpers/scripted-openai-server.mjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";
if (!databaseUrl || !/test/i.test(databaseName) || databaseUrl === process.env.DATABASE_URL) {
  process.stderr.write("[runtime-server.db.e2e] TEST_DATABASE_URL must be an isolated test database\n");
  process.exit(1);
}

const modelServer = await startScriptedOpenAIServer();

process.env.DATABASE_URL = databaseUrl;
process.env.PORT = "3214";
process.env.HOST = "127.0.0.1";
process.env.AI_PROVIDER = "openai-compatible";
process.env.OPENAI_API_KEY = "fake";
process.env.OPENAI_BASE_URL = modelServer.baseUrl;
process.env.OPENAI_MODEL = "test";
process.env.PRIMORIA_AGENT_INTERNAL_SECRET = "runtime-test-secret";

const { migrateAgentRuntime } = await import("../src/runtime/migrate.mjs");
await migrateAgentRuntime(databaseUrl);
const { startAgentServer } = await import("../src/server.mjs");
const runtime = await startAgentServer();
const runId = `run_${randomUUID()}`;
const ownerId = "runtime-test-owner";
const requestBody = {
  threadId: `thread_${randomUUID()}`,
  runId,
  state: { primoria_owner_id: ownerId, user_id: ownerId },
  messages: [{ id: "user-message-1", role: "user", content: "hello" }],
  tools: [],
  context: [],
  forwardedProps: {
    config: {
      configurable: { primoria_owner_id: ownerId },
      metadata: { primoria_owner_id: ownerId },
    },
  },
};

async function runAgent(marker) {
  const runId = `run_${randomUUID()}`;
  const response = await fetch("http://127.0.0.1:3214/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-primoria-agent-token": "runtime-test-secret",
      "x-primoria-owner-id": ownerId,
    },
    body: JSON.stringify({
      ...requestBody,
      runId,
      threadId: `thread_${randomUUID()}`,
      messages: [{ id: `message_${randomUUID()}`, role: "user", content: marker }],
    }),
  });
  assert.equal(response.status, 200);
  const body = await response.text();
  const events = body.split("\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)));
  return { runId, events, run: await runtime.store.getRun(runId, ownerId) };
}

try {
  const unauthorized = await fetch("http://127.0.0.1:3214/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  assert.equal(unauthorized.status, 401);

  const response = await fetch("http://127.0.0.1:3214/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-primoria-agent-token": "runtime-test-secret",
      "x-primoria-owner-id": ownerId,
    },
    body: JSON.stringify(requestBody),
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
  const conflictingOwnerId = "other-owner";
  const conflictingOwnerBody = {
    ...requestBody,
    state: { primoria_owner_id: conflictingOwnerId, user_id: conflictingOwnerId },
    forwardedProps: {
      config: {
        configurable: { primoria_owner_id: conflictingOwnerId },
        metadata: { primoria_owner_id: conflictingOwnerId },
      },
    },
  };
  const hiddenRunIdConflict = await fetch("http://127.0.0.1:3214/agent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "text/event-stream",
      "x-primoria-agent-token": "runtime-test-secret",
      "x-primoria-owner-id": conflictingOwnerId,
    },
    body: JSON.stringify(conflictingOwnerBody),
  });
  assert.equal(hiddenRunIdConflict.status, 404);
  const hiddenFromOtherOwner = await fetch(`http://127.0.0.1:3214/runs/${runId}`, {
    headers: {
      "x-primoria-agent-token": "runtime-test-secret",
      "x-primoria-owner-id": "other-owner",
    },
  });
  assert.equal(hiddenFromOtherOwner.status, 404);
  const visibleToOwner = await fetch(`http://127.0.0.1:3214/runs/${runId}`, {
    headers: {
      "x-primoria-agent-token": "runtime-test-secret",
      "x-primoria-owner-id": ownerId,
    },
  });
  assert.equal(visibleToOwner.status, 200);
  assert.equal((await runtime.store.getRun(runId)).status, "completed");

  const retry = await runAgent("PRE_OUTPUT_RETRY_MARKER");
  assert.equal(retry.run.status, "completed");
  assert.equal(retry.run.attempts, 1);
  assert.equal(modelServer.attemptCount("pre-output"), 2);
  assert.ok(retry.events.some((event) => event.type === "TEXT_MESSAGE_CONTENT" && event.delta === "recovered after retry"));

  const noReplay = await runAgent("POST_OUTPUT_FAILURE_MARKER");
  assert.equal(noReplay.run.status, "failed");
  assert.equal(noReplay.run.attempts, 1);
  assert.equal(modelServer.attemptCount("post-output"), 1);
  assert.ok(noReplay.events.some((event) => event.type === "TEXT_MESSAGE_CONTENT" && event.delta === "visible partial output"));
  assert.ok(noReplay.events.some((event) => event.type === "RUN_ERROR"));
  process.stdout.write("[runtime-server.db.e2e] ALL CHECKS PASSED\n");
} finally {
  await runtime.close("test complete");
  await modelServer.close();
}
process.exit(0);
