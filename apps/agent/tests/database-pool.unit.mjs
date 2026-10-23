import assert from "node:assert/strict";
import { getAgentDatabasePoolMax, createAgentCheckpointer } from "../src/runtime/checkpointer.mjs";

const original = { DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX, AGENT_DATABASE_POOL_MAX: process.env.AGENT_DATABASE_POOL_MAX };
try {
  delete process.env.DATABASE_POOL_MAX;
  delete process.env.AGENT_DATABASE_POOL_MAX;
  assert.equal(getAgentDatabasePoolMax(), 1);
  process.env.DATABASE_POOL_MAX = "3";
  assert.equal(getAgentDatabasePoolMax(), 3);
  process.env.AGENT_DATABASE_POOL_MAX = "2";
  assert.equal(getAgentDatabasePoolMax(), 2);
  for (const invalid of ["", "0", "-1", "1.5", "invalid"]) {
    process.env.AGENT_DATABASE_POOL_MAX = invalid;
    assert.equal(getAgentDatabasePoolMax(), 1);
  }
  process.env.AGENT_DATABASE_POOL_MAX = "999";
  assert.equal(getAgentDatabasePoolMax(), 20);
  process.env.AGENT_DATABASE_POOL_MAX = "1";
  const saver = createAgentCheckpointer("postgresql://unused:unused@127.0.0.1:1/test");
  assert.equal(saver.pool.options.max, 1);
  await saver.end();
  console.log("[database-pool.unit] ALL CHECKS PASSED");
} finally {
  for (const [key, value] of Object.entries(original)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
}
