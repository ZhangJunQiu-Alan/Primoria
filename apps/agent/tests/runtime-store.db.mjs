#!/usr/bin/env node

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { migrateAgentRuntime } from "../src/runtime/migrate.mjs";
import { createRunStore } from "../src/runtime/run-store.mjs";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";
if (!databaseUrl || !/test/i.test(databaseName) || databaseUrl === process.env.DATABASE_URL) {
  process.stderr.write("[runtime-store.db] TEST_DATABASE_URL must be an isolated test database\n");
  process.exit(1);
}

await migrateAgentRuntime(databaseUrl);
const store = createRunStore(databaseUrl);
const sql = postgres(databaseUrl, { prepare: false, onnotice: () => {} });
const runId = `run_${randomUUID()}`;
const input = {
  threadId: `thread_${randomUUID()}`,
  runId,
  state: { primoria_owner_id: "runtime_test_owner" },
  messages: [{ id: "message-1", role: "user", content: "hello" }],
  tools: [],
  context: [],
  forwardedProps: {},
};

try {
  const created = await store.ensureRun(input);
  assert.equal(created.status, "queued");
  assert.equal((await store.ensureRun(input)).id, runId);
  await assert.rejects(() => store.ensureRun({ ...input, messages: [{ ...input.messages[0], content: "different" }] }), /different request/);

  const claimed = await store.claimNext("runtime-test-worker", 30_000);
  assert.equal(claimed.id, runId);
  await store.appendEvent(runId, claimed.lease_token, { type: "RUN_STARTED", threadId: input.threadId, runId });
  assert.equal((await store.heartbeat(runId, claimed.lease_token, 30_000)).active, true);
  await store.finish(runId, claimed.lease_token, { type: "RUN_FINISHED", threadId: input.threadId, runId });
  assert.equal((await store.getRun(runId)).status, "completed");
  assert.deepEqual((await store.listEvents(runId)).map((row) => row.event.type), ["RUN_STARTED", "RUN_FINISHED"]);

  const cancelledId = `run_${randomUUID()}`;
  await store.ensureRun({ ...input, runId: cancelledId });
  assert.equal(await store.cancel(cancelledId), true);
  assert.equal((await store.getRun(cancelledId)).status, "cancelled");
  const cancelledRetryId = await store.retry(cancelledId);
  assert.notEqual(cancelledRetryId, cancelledId);
  assert.equal((await store.getRun(cancelledId)).status, "cancelled");
  assert.equal((await store.getRun(cancelledRetryId)).status, "queued");
  assert.equal((await store.getRun(cancelledRetryId)).input.runId, cancelledRetryId);
  assert.equal((await store.listEvents(cancelledRetryId)).length, 0);
  await sql`update agent_runtime.runs set next_attempt_at = now() + interval '1 hour' where id = ${cancelledRetryId}`;

  const retryId = `run_${randomUUID()}`;
  await store.ensureRun({ ...input, runId: retryId });
  const retryClaim = await store.claimNext("runtime-test-worker", 30_000);
  assert.equal(retryClaim.id, retryId);
  assert.equal(await store.fail(retryId, retryClaim.lease_token, new Error("temporary timeout"), true), "queued");
  assert.equal((await store.getRun(retryId)).status, "queued");

  const sideEffectId = `run_${randomUUID()}`;
  await store.ensureRun({ ...input, runId: sideEffectId });
  await sql`update agent_runtime.runs set next_attempt_at = now() + interval '1 hour' where id = ${retryId}`;
  const sideEffectClaim = await store.claimNext("runtime-test-worker", 30_000);
  assert.equal(sideEffectClaim.id, sideEffectId);
  await store.appendEvent(sideEffectId, sideEffectClaim.lease_token, { type: "TOOL_CALL_START", toolCallId: "tool-side-effect" });
  assert.equal(await store.fail(sideEffectId, sideEffectClaim.lease_token, new Error("connection reset"), true), "failed");
  assert.equal((await store.getRun(sideEffectId)).status, "failed");

  const recoverableId = `run_${randomUUID()}`;
  await store.ensureRun({ ...input, runId: recoverableId });
  const recoverableClaim = await store.claimNext("runtime-test-worker", 30_000);
  assert.equal(recoverableClaim.id, recoverableId);
  await store.appendEvent(recoverableId, recoverableClaim.lease_token, { type: "RUN_STARTED", threadId: input.threadId, runId: recoverableId });
  await sql`update agent_runtime.runs set lease_expires_at = now() - interval '1 second' where id = ${recoverableId}`;
  await store.recoverStaleRuns();
  assert.equal((await store.getRun(recoverableId)).status, "queued");

  const interruptedId = `run_${randomUUID()}`;
  await store.ensureRun({ ...input, runId: interruptedId });
  await sql`update agent_runtime.runs set next_attempt_at = now() + interval '1 hour' where id in (${retryId}, ${recoverableId})`;
  const interruptedClaim = await store.claimNext("runtime-test-worker", 30_000);
  assert.equal(interruptedClaim.id, interruptedId);
  await store.appendEvent(interruptedId, interruptedClaim.lease_token, { type: "TEXT_MESSAGE_CONTENT", messageId: "m", delta: "partial" });
  await sql`update agent_runtime.runs set lease_expires_at = now() - interval '1 second' where id = ${interruptedId}`;
  await store.recoverStaleRuns();
  assert.equal((await store.getRun(interruptedId)).status, "failed");
  assert.equal((await store.listEvents(interruptedId)).at(-1).event.code, "interrupted");
  process.stdout.write("[runtime-store.db] ALL CHECKS PASSED\n");
} finally {
  await sql.end({ timeout: 5 });
  await store.close();
}
