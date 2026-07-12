#!/usr/bin/env node

import assert from "node:assert/strict";
import { createRunWorker } from "../src/runtime/runner.mjs";

let releaseStarted;
const started = new Promise((resolve) => {
  releaseStarted = resolve;
});
let claimed = false;
let failCalls = 0;
let finishCalls = 0;

const run = {
  id: "shutdown-run",
  lease_token: "shutdown-lease",
  input: {
    runId: "shutdown-run",
    threadId: "shutdown-run",
    messages: [{ id: "user-1", role: "user", content: "wait" }],
    state: {},
    forwardedProps: {},
  },
};

const store = {
  async recoverStaleRuns() {},
  async claimNext() {
    if (claimed) return null;
    claimed = true;
    return run;
  },
  async listEvents() {
    return [];
  },
  async appendEvent() {},
  async heartbeat() {
    return { active: true, cancelRequested: false };
  },
  async finish() {
    finishCalls += 1;
  },
  async markCancelled() {},
  async fail() {
    failCalls += 1;
  },
};

const graph = {
  async *streamEvents(_state, config) {
    releaseStarted();
    await new Promise((resolve) => config.signal.addEventListener("abort", resolve, { once: true }));
    throw new DOMException("Agent run aborted", "AbortError");
  },
};

const worker = createRunWorker({ store, graph, concurrency: 1, leaseMs: 30_000, pollMs: 5 });
await worker.start();
await started;
await worker.stop(5);

assert.equal(failCalls, 0, "shutdown must leave the lease for stale-run recovery");
assert.equal(finishCalls, 0);
assert.equal(worker.activeCount(), 0);
process.stdout.write("[runtime-worker.unit] ALL CHECKS PASSED\n");
