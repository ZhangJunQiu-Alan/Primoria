import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ZodError } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthError, toSafeAuthError } from "../src/lib/auth/errors";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("auth API safe error handling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns typed public auth errors without rewriting the message", () => {
    const response = toSafeAuthError(
      new AuthError("invalid_credentials", "Invalid email or password.", 401),
      "sign-in",
    );

    expect(response).toEqual({
      status: 401,
      body: { error: "Invalid email or password.", code: "invalid_credentials" },
    });
  });

  it("hides unexpected internal error details from responses", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = toSafeAuthError(
      new Error('relation "identities" does not exist at 10.0.0.12'),
      "sign-in",
      "Sign in failed. Please try again.",
    );

    expect(response).toEqual({
      status: 500,
      body: { error: "Sign in failed. Please try again.", code: "internal_error" },
    });
    expect(JSON.stringify(response)).not.toContain("identities");
    expect(JSON.stringify(response)).not.toContain("10.0.0.12");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("maps dependency outage codes to a safe unavailable response", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = toSafeAuthError(
      Object.assign(new Error("connect ETIMEDOUT 10.0.0.12:5432"), { code: "ETIMEDOUT" }),
      "sign-up",
    );

    expect(response).toEqual({
      status: 503,
      body: { error: "Authentication is temporarily unavailable.", code: "auth_unavailable" },
    });
    expect(JSON.stringify(response)).not.toContain("10.0.0.12");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("does not expose schema parser diagnostics", () => {
    const response = toSafeAuthError(new ZodError([]), "sign-up");

    expect(response).toEqual({
      status: 400,
      body: { error: "Invalid request.", code: "invalid_request" },
    });
  });

  it("auth routes use the safe mapper instead of raw error messages or regex status parsing", () => {
    const files = [
      "src/app/api/auth/sign-in/route.ts",
      "src/app/api/auth/sign-up/route.ts",
      "src/app/api/auth/password-reset/request/route.ts",
      "src/app/api/auth/password-reset/confirm/route.ts",
    ];

    for (const file of files) {
      const source = read(file);
      expect(source, `${file} should use safe auth error mapping`).toContain("toSafeAuthError");
      expect(source, `${file} should not return raw error.message`).not.toContain("error.message");
      expect(source, `${file} should not derive status from DB wording`).not.toContain("timed out|database");
    }
  });
});
