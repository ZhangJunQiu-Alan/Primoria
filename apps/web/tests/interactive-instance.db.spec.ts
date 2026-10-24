import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST_DB_AVAILABLE, setupTestDb, teardownTestDb, resetTestDb, seedUser } from "./helpers/test-db";
const suite = TEST_DB_AVAILABLE && process.env.RUN_INTERACTIVE_BUDGET_DB === "1" ? describe : describe.skip;
suite("durable interactive instance database contract", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;
  let store: typeof import("../src/lib/interactive/instance-store");
  beforeAll(async () => { sql = await setupTestDb(); await resetTestDb(sql); await seedUser(sql, "instance-owner"); await seedUser(sql, "other-owner"); store = await import("../src/lib/interactive/instance-store"); });
  afterAll(async () => { await teardownTestDb(sql); });
  it("isolates owners, preserves initial output and rejects stale or invalid updates", async () => {
    const created = await store.createInteractiveInstance({ ownerId: "instance-owner", instanceId: "tool-1", requestHash: "hash", componentId: "physics.lens-imaging", configVersion: 1, config: { focalLength: 10 } });
    expect(created?.revision).toBe(1);
    expect(await store.getInteractiveInstance("other-owner", "tool-1")).toBeNull();
    const updates = await Promise.all([store.updateInteractiveInstance("instance-owner", "tool-1", 1, { focalLength: 15 }), store.updateInteractiveInstance("instance-owner", "tool-1", 1, { focalLength: 20 })]);
    expect(updates.map((value) => value.kind).sort()).toEqual(["conflict", "updated"]);
    const current = await store.getInteractiveInstance("instance-owner", "tool-1");
    expect(current?.revision).toBe(2);
    expect(current?.initialConfig.focalLength).toBe(10);
    await expect(store.updateInteractiveInstance("instance-owner", "tool-1", 2, { focalLength: -10 })).rejects.toThrow();
    expect((await store.updateInteractiveInstance("other-owner", "tool-1", 2, {})).kind).toBe("not_found");
    const duplicate = await store.createInteractiveInstance({ ownerId: "instance-owner", instanceId: "tool-1", requestHash: "hash", componentId: "physics.lens-imaging", configVersion: 1, config: { focalLength: 25 } });
    expect(duplicate?.revision).toBe(2);
    expect(duplicate?.initialConfig.focalLength).toBe(10);
  });
  it("records the upgraded version on save and keeps only the most recently used instances per owner", async () => {
    const saved = await store.updateInteractiveInstance("instance-owner", "tool-1", 2, { focalLength: 12 }, 1);
    expect(saved.kind === "updated" && saved.instance.configVersion).toBe(1);
    for (const id of ["tool-2", "tool-3"]) {
      await store.createInteractiveInstance({ ownerId: "instance-owner", instanceId: id, requestHash: id, componentId: "physics.lens-imaging", configVersion: 1, config: { focalLength: 10 } });
    }
    await store.createInteractiveInstance({ ownerId: "other-owner", instanceId: "tool-1", requestHash: "other", componentId: "physics.lens-imaging", configVersion: 1, config: { focalLength: 10 } });
    await sql`update interactive_component_instances set updated_at = now() - interval '1 day' where owner_id = 'instance-owner' and instance_id = 'tool-2'`;
    await store.pruneInteractiveInstances("instance-owner", 2);
    const remaining = await sql<{ instance_id: string }[]>`select instance_id from interactive_component_instances where owner_id = 'instance-owner' order by instance_id`;
    expect(remaining.map((row) => row.instance_id)).toEqual(["tool-1", "tool-3"]);
    expect(await store.getInteractiveInstance("other-owner", "tool-1")).not.toBeNull();
  });
});
