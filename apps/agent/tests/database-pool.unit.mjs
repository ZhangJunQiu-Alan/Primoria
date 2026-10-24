import assert from "node:assert/strict";
import { getAgentDatabasePoolMax, createAgentCheckpointer, isSupabaseSessionPooler } from "../src/runtime/checkpointer.mjs";

const session = "postgresql://role.ref:pw@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
const transaction = "postgresql://role.ref:pw@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
const local = "postgresql://primoria:pw@127.0.0.1:5432/primoria";
const original = { DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX, AGENT_DATABASE_POOL_MAX: process.env.AGENT_DATABASE_POOL_MAX };
try {
  delete process.env.DATABASE_POOL_MAX;
  delete process.env.AGENT_DATABASE_POOL_MAX;
  assert.equal(isSupabaseSessionPooler(session), true);
  assert.equal(isSupabaseSessionPooler(transaction), false);
  assert.equal(isSupabaseSessionPooler(local), false);
  assert.equal(isSupabaseSessionPooler("not a url"), false);
  // The session pooler keeps one connection per client; others are sized for run concurrency.
  assert.equal(getAgentDatabasePoolMax(session), 1);
  assert.equal(getAgentDatabasePoolMax(transaction), 4);
  assert.equal(getAgentDatabasePoolMax(local), 4);
  process.env.DATABASE_POOL_MAX = "3";
  assert.equal(getAgentDatabasePoolMax(session), 3);
  process.env.AGENT_DATABASE_POOL_MAX = "2";
  assert.equal(getAgentDatabasePoolMax(transaction), 2);
  for (const invalid of ["0", "-1", "1.5", "invalid"]) {
    process.env.AGENT_DATABASE_POOL_MAX = invalid;
    assert.equal(getAgentDatabasePoolMax(session), 1);
  }
  process.env.AGENT_DATABASE_POOL_MAX = "999";
  assert.equal(getAgentDatabasePoolMax(transaction), 20);
  process.env.AGENT_DATABASE_POOL_MAX = "";
  delete process.env.DATABASE_POOL_MAX;
  assert.equal(getAgentDatabasePoolMax(transaction), 4, "an empty Compose variable falls back to the URL-based default");
  const saver = createAgentCheckpointer(session.replace("aws-1-ap-southeast-1.pooler.supabase.com", "unused.pooler.supabase.com"));
  assert.equal(saver.pool.options.max, 1);
  await saver.end();
  console.log("[database-pool.unit] ALL CHECKS PASSED");
} finally {
  for (const [key, value] of Object.entries(original)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
}
