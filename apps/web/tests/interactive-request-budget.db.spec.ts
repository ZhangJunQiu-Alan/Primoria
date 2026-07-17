import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  TEST_DB_AVAILABLE,
  resetTestDb,
  seedUser,
  setupTestDb,
  teardownTestDb,
} from "./helpers/test-db";

const enabled = TEST_DB_AVAILABLE && process.env.RUN_INTERACTIVE_BUDGET_DB === "1";
const suite = enabled ? describe : describe.skip;

suite("interactive request budget database contract", () => {
  let sql: Awaited<ReturnType<typeof setupTestDb>>;
  let budget: typeof import("../src/lib/interactive/request-budget");

  beforeAll(async () => {
    sql = await setupTestDb();
    await resetTestDb(sql);
    await Promise.all([seedUser(sql, "budget-owner"), seedUser(sql, "rate-owner")]);
    process.env.INTERACTIVE_COMPONENT_RATE_LIMIT_MAX = "10";
    process.env.INTERACTIVE_COMPONENT_CONCURRENCY_MAX = "1";
    budget = await import("../src/lib/interactive/request-budget");
  });

  afterAll(async () => {
    await teardownTestDb(sql);
  });

  it("isolates in-flight requests and returns cached idempotent results", async () => {
    const first = await budget.reserveInteractiveRequest({
      ownerId: "budget-owner",
      idempotencyKey: "tool-call-1",
      requestHash: "hash-1",
    });
    expect(first.kind).toBe("execute");

    await expect(
      budget.reserveInteractiveRequest({
        ownerId: "budget-owner",
        idempotencyKey: "tool-call-1",
        requestHash: "hash-1",
      }),
    ).resolves.toMatchObject({ kind: "in_progress" });
    await expect(
      budget.reserveInteractiveRequest({
        ownerId: "budget-owner",
        idempotencyKey: "tool-call-2",
        requestHash: "hash-2",
      }),
    ).resolves.toMatchObject({ kind: "concurrency_limited" });

    if (first.kind !== "execute") throw new Error("expected executable reservation");
    await budget.completeInteractiveRequest({
      requestId: first.requestId,
      ownerId: "budget-owner",
      status: 200,
      response: { ok: true, config: { value: 1 } },
    });
    await expect(
      budget.reserveInteractiveRequest({
        ownerId: "budget-owner",
        idempotencyKey: "tool-call-1",
        requestHash: "hash-1",
      }),
    ).resolves.toMatchObject({ kind: "cached", status: 200, response: { ok: true } });
    await expect(
      budget.reserveInteractiveRequest({
        ownerId: "budget-owner",
        idempotencyKey: "tool-call-1",
        requestHash: "different-hash",
      }),
    ).resolves.toEqual({ kind: "conflict" });
  });

  it("enforces the configured per-owner request window", async () => {
    process.env.INTERACTIVE_COMPONENT_RATE_LIMIT_MAX = "1";
    const first = await budget.reserveInteractiveRequest({
      ownerId: "rate-owner",
      idempotencyKey: "tool-call-rate-1",
      requestHash: "rate-hash-1",
    });
    expect(first.kind).toBe("execute");
    if (first.kind !== "execute") throw new Error("expected executable reservation");
    await budget.failInteractiveRequest(first.requestId, "rate-owner");

    await expect(
      budget.reserveInteractiveRequest({
        ownerId: "rate-owner",
        idempotencyKey: "tool-call-rate-2",
        requestHash: "rate-hash-2",
      }),
    ).resolves.toMatchObject({ kind: "rate_limited" });
  });
});
