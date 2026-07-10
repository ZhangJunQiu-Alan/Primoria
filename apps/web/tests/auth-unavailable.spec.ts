import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthError, isAuthUnavailableError, toSafeAuthError } from "../src/lib/auth/errors";

const dbState = vi.hoisted(() => ({
  mode: "down" as "down" | "empty",
  errorCode: "ECONNREFUSED",
  hasSessionCookie: true,
  cookieSet: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (dbState.hasSessionCookie ? { value: "session-token" } : undefined),
    set: dbState.cookieSet,
  }),
}));

vi.mock("@/lib/db/client", () => {
  const chain = {
    select: () => chain,
    from: () => chain,
    innerJoin: () => chain,
    leftJoin: () => chain,
    where: () => chain,
    limit: async () => [],
    delete: () => chain,
  };
  return {
    hasDatabaseUrl: () => true,
    getDb: () => {
      if (dbState.mode === "down") {
        throw Object.assign(new Error("authentication dependency unavailable"), { code: dbState.errorCode });
      }
      return chain;
    },
  };
});

describe("isAuthUnavailableError", () => {
  it("matches structured connection and Postgres shutdown codes", () => {
    for (const code of [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "CONNECT_TIMEOUT",
      "CONNECTION_CLOSED",
      "CONNECTION_DESTROYED",
      "CONNECTION_ENDED",
      "08000",
      "08006",
      "57P01",
      "53300",
    ]) {
      expect(isAuthUnavailableError(Object.assign(new Error("db down"), { code }))).toBe(true);
    }
  });

  it("matches codes embedded in message text and nested causes", () => {
    expect(isAuthUnavailableError(new Error("connect ECONNREFUSED 127.0.0.1:5432"))).toBe(true);
    expect(
      isAuthUnavailableError(new Error("query failed", { cause: Object.assign(new Error("x"), { code: "57P03" }) })),
    ).toBe(true);
    const aggregate = Object.assign(new Error("aggregate"), {
      errors: [Object.assign(new Error("x"), { code: "EHOSTUNREACH" })],
    });
    expect(isAuthUnavailableError(aggregate)).toBe(true);
  });

  it("does not match ordinary errors", () => {
    expect(isAuthUnavailableError(new Error("duplicate key value violates unique constraint"))).toBe(false);
    expect(isAuthUnavailableError(null)).toBe(false);
    expect(isAuthUnavailableError("ECONNREFUSED")).toBe(false);
  });
});

describe("toSafeAuthError on database outage", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps raw connection errors to 503 auth_unavailable", () => {
    const safe = toSafeAuthError(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }), "test");
    expect(safe).toEqual({
      status: 503,
      body: { error: "Authentication is temporarily unavailable.", code: "auth_unavailable" },
    });
  });

  it("passes typed AuthError through", () => {
    const cause = Object.assign(new Error("connection closed"), { code: "CONNECTION_CLOSED" });
    const safe = toSafeAuthError(
      new AuthError("auth_unavailable", "Authentication is temporarily unavailable.", 503, cause),
      "test",
    );
    expect(safe.status).toBe(503);
    expect(safe.body.code).toBe("auth_unavailable");
    expect(console.error).toHaveBeenCalledWith("[auth/test] request failed", {
      code: "auth_unavailable",
      status: 503,
      causeCode: "CONNECTION_CLOSED",
      causeName: "Error",
    });
  });
});

describe("session and guard when the database is unreachable", () => {
  beforeEach(() => {
    dbState.mode = "down";
    dbState.errorCode = "ECONNREFUSED";
    dbState.hasSessionCookie = true;
    dbState.cookieSet.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getCurrentUser throws typed auth_unavailable instead of returning signed-out", async () => {
    const { getCurrentUser } = await import("../src/lib/auth/session");
    await expect(getCurrentUser()).rejects.toMatchObject({
      name: "AuthError",
      code: "auth_unavailable",
      status: 503,
    });
  });

  it("requireAuthUser returns 503 auth_unavailable, not 401", async () => {
    const { requireAuthUser } = await import("../src/lib/auth/guard");
    const { denied, user } = await requireAuthUser();
    expect(user).toBeNull();
    expect(denied?.status).toBe(503);
    const body = await denied?.json();
    expect(body).toEqual({ error: "Authentication is temporarily unavailable.", code: "auth_unavailable" });
  });

  it("maps a closed established postgres connection to the same safe 503", async () => {
    dbState.errorCode = "CONNECTION_CLOSED";
    const { requireAuthUser } = await import("../src/lib/auth/guard");
    const { denied } = await requireAuthUser("closed-pool");
    expect(denied?.status).toBe(503);
    expect(await denied?.json()).toEqual({
      error: "Authentication is temporarily unavailable.",
      code: "auth_unavailable",
    });
  });

  it("requireAuthUser still returns 401 for a plain signed-out request", async () => {
    dbState.mode = "empty";
    const { requireAuthUser } = await import("../src/lib/auth/guard");
    const { denied } = await requireAuthUser();
    expect(denied?.status).toBe(401);
  });

  it("optional auth returns a safe 503 when a session lookup dependency is down", async () => {
    const { getOptionalAuthUser } = await import("../src/lib/auth/guard");
    const { denied, user } = await getOptionalAuthUser("optional-test");
    expect(user).toBeNull();
    expect(denied?.status).toBe(503);
    expect(await denied?.json()).toEqual({
      error: "Authentication is temporarily unavailable.",
      code: "auth_unavailable",
    });
  });

  it("optional auth keeps a missing or invalid session anonymous", async () => {
    dbState.mode = "empty";
    const { getOptionalAuthUser } = await import("../src/lib/auth/guard");
    const { denied, user } = await getOptionalAuthUser("optional-test");
    expect(denied).toBeNull();
    expect(user).toBeNull();

    dbState.mode = "down";
    dbState.hasSessionCookie = false;
    const withoutCookie = await getOptionalAuthUser("optional-test");
    expect(withoutCookie.denied).toBeNull();
    expect(withoutCookie.user).toBeNull();
  });

  it("sign-out still clears the cookie when the database is down", async () => {
    const { signOutCurrentSession } = await import("../src/lib/auth/session");
    await expect(signOutCurrentSession()).resolves.toBeUndefined();
    expect(dbState.cookieSet).toHaveBeenCalledWith(
      expect.any(String),
      "",
      expect.objectContaining({ expires: new Date(0) }),
    );
  });
});
