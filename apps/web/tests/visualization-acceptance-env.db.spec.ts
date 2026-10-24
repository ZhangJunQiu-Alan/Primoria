import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DB_AVAILABLE, setupTestDb, teardownTestDb, resetTestDb, seedUser } from "./helpers/test-db";
import { ACCEPTANCE_OWNER_PREFIX, removeAcceptanceOwners, sweepStaleAcceptanceOwners, isIsolatedTestDatabase } from "../scripts/visualization-acceptance-env";

const suite = TEST_DB_AVAILABLE && process.env.RUN_INTERACTIVE_BUDGET_DB === "1" ? describe : describe.skip;

it("only treats databases named as tests as isolated", () => {
  expect(isIsolatedTestDatabase("postgresql://u:p@127.0.0.1:5432/primoria_regression_test_1")).toBe(true);
  expect(isIsolatedTestDatabase("postgresql://u:p@aws-1.pooler.supabase.com:6543/postgres")).toBe(false);
  expect(isIsolatedTestDatabase(undefined)).toBe(false);
});

suite("visualization acceptance cleanup", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;
  beforeAll(async () => {
    sql = await setupTestDb();
    await resetTestDb(sql);
    // The isolated template already has the Agent schema; a bare test database gets it here.
    const [{ present }] = await sql<{ present: boolean }[]>`select to_regclass('agent_runtime.runs') is not null as present`;
    if (!present) for (const file of ["0001_runtime.sql", "0002_owner_required.sql"]) await sql.unsafe(await readFile(new URL(`../../agent/db/migrations/${file}`, import.meta.url), "utf8"));
    await sql`delete from agent_runtime.runs`;
    await sql`create table if not exists agent_runtime.checkpoints (thread_id text not null, checkpoint_ns text not null default '', checkpoint_id text not null, checkpoint jsonb not null)`;
  });
  afterAll(async () => { await teardownTestDb(sql); });

  async function seedOwnerWithRun(ownerId: string, createdAt: string) {
    await seedUser(sql, ownerId);
    await sql`update users set created_at = ${createdAt}::timestamptz where id = ${ownerId}`;
    await sql`insert into agent_runtime.runs (id, thread_id, owner_id, input, input_hash) values (${`run-${ownerId}`}, ${`thread-${ownerId}`}, ${ownerId}, '{}'::jsonb, 'h')`;
    await sql`insert into agent_runtime.checkpoints (thread_id, checkpoint_id, checkpoint) values (${`thread-${ownerId}`}, 'c1', '{}'::jsonb)`;
  }

  it("removes a synthetic owner with its Agent runs and checkpoints, and sweeps only stale synthetic owners", async () => {
    const current = `${ACCEPTANCE_OWNER_PREFIX}current`;
    const stale = `${ACCEPTANCE_OWNER_PREFIX}stale`;
    const recent = `${ACCEPTANCE_OWNER_PREFIX}recent`;
    await seedOwnerWithRun(current, new Date().toISOString());
    await seedOwnerWithRun(stale, "2026-01-01T00:00:00Z");
    await seedOwnerWithRun(recent, new Date().toISOString());
    await seedUser(sql, "real-learner");
    await sql`update users set created_at = '2026-01-01T00:00:00Z' where id = 'real-learner'`;

    await removeAcceptanceOwners(sql, [current]);
    expect(await sql`select 1 from users where id = ${current}`).toHaveLength(0);
    expect(await sql`select 1 from agent_runtime.runs where owner_id = ${current}`).toHaveLength(0);
    expect(await sql`select 1 from agent_runtime.checkpoints where thread_id = ${`thread-${current}`}`).toHaveLength(0);

    expect(await sweepStaleAcceptanceOwners(sql)).toBe(1);
    expect((await sql<{ id: string }[]>`select id from users order by id`).map((row) => row.id)).toEqual([recent, "real-learner"].sort());
    expect(await sql`select 1 from agent_runtime.runs where owner_id = ${stale}`).toHaveLength(0);
    expect(await sql`select 1 from agent_runtime.runs where owner_id = ${recent}`).toHaveLength(1);
  });
});
