import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateRequestOrigin } from "../src/lib/auth/origin";

function request(pathname: string, init: { method?: string; origin?: string | null; headers?: Record<string, string> } = {}) {
  const headers = new Headers({
    host: "primoria.test",
    ...(init.headers ?? {}),
  });
  if (init.origin !== undefined && init.origin !== null) headers.set("origin", init.origin);
  return {
    method: init.method ?? "GET",
    pathname,
    url: `https://primoria.test${pathname}`,
    headers,
  };
}

describe("state-changing request origin validation", () => {
  it("allows same-origin state-changing API requests", () => {
    expect(validateRequestOrigin(request("/api/profile", { method: "PATCH", origin: "https://primoria.test" }))).toEqual({
      ok: true,
    });
  });

  it("rejects cross-origin state-changing API requests", () => {
    expect(validateRequestOrigin(request("/api/profile", { method: "PATCH", origin: "https://attacker.test" }))).toEqual({
      ok: false,
      status: 403,
      message: "Cross-origin requests are not allowed.",
    });
  });

  it("rejects missing Origin on protected state-changing requests", () => {
    expect(validateRequestOrigin(request("/api/profile", { method: "PATCH" }))).toEqual({
      ok: false,
      status: 403,
      message: "Missing Origin header.",
    });
    expect(validateRequestOrigin(request("/auth/signout/", { method: "POST" }))).toEqual({
      ok: false,
      status: 403,
      message: "Missing Origin header.",
    });
  });

  it("uses forwarded host/proto and configured app origins as trusted origins", () => {
    expect(
      validateRequestOrigin(
        request("/api/profile", {
          method: "PATCH",
          origin: "https://app.primoria.test",
          headers: {
            host: "127.0.0.1:3000",
            "x-forwarded-host": "app.primoria.test",
            "x-forwarded-proto": "https",
          },
        }),
      ),
    ).toEqual({ ok: true });

    expect(
      validateRequestOrigin(
        request("/api/profile", { method: "PATCH", origin: "https://configured.primoria.test" }),
        { appBaseUrl: "https://configured.primoria.test" },
      ),
    ).toEqual({ ok: true });
  });

  it("does not require Origin on safe or unprotected requests", () => {
    expect(validateRequestOrigin(request("/api/profile"))).toEqual({ ok: true });
    expect(validateRequestOrigin(request("/library", { method: "POST" }))).toEqual({ ok: true });
  });

  it("runs for API routes through the app proxy", () => {
    const source = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
    expect(source).toContain('"/api/:path*"');
    expect(source).toContain("validateRequestOrigin");
  });
});
