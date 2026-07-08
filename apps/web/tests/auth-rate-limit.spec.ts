import { describe, expect, it } from "vitest";
import { getAuthRateLimitConfig, getAuthRateLimitKeys, getClientIp } from "../src/lib/auth/rate-limit";

describe("auth rate limit helpers", () => {
  it("does not trust spoofable proxy headers unless configured", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "203.0.113.10" }))).toBe("unknown");
    expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.11" }))).toBe("unknown");
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.12, 10.0.0.1" }))).toBe("unknown");
  });

  it("extracts the client IP from trusted proxy headers when configured", () => {
    const options = { trustProxyHeaders: true };
    expect(getClientIp(new Headers({ "cf-connecting-ip": "203.0.113.10" }), options)).toBe("203.0.113.10");
    expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.11" }), options)).toBe("203.0.113.11");
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.12, 10.0.0.1" }), options)).toBe("203.0.113.12");
    expect(getClientIp(new Headers({ forwarded: 'for="[2001:db8::1]:443";proto=https' }), options)).toBe("2001:db8::1");
  });

  it("ignores malformed trusted proxy IP values", () => {
    const options = { trustProxyHeaders: true };
    expect(getClientIp(new Headers({ "cf-connecting-ip": "not-an-ip" }), options)).toBe("unknown");
    expect(getClientIp(new Headers({ "x-forwarded-for": "unknown, 203.0.113.12" }), options)).toBe("unknown");
  });

  it("builds separate hashed keys for IP and account scopes", () => {
    const keys = getAuthRateLimitKeys({
      headers: new Headers({ "x-real-ip": "203.0.113.20" }),
      email: "User@Example.COM",
      config: {
        enabled: true,
        windowSeconds: 60,
        ipMaxAttempts: 5,
        accountMaxAttempts: 5,
        cleanupSampleRate: 0,
        trustProxyHeaders: false,
      },
    });

    expect(keys).toHaveLength(2);
    expect(keys.map((key) => key.scope)).toEqual(["auth:ip", "auth:account"]);
    expect(keys.every((key) => key.id.includes("@") === false)).toBe(true);
    expect(keys.every((key) => key.identifierHash.length === 64)).toBe(true);
  });

  it("keeps spoofed proxy headers from changing the IP key by default", () => {
    const config = {
      enabled: true,
      windowSeconds: 60,
      ipMaxAttempts: 5,
      accountMaxAttempts: 5,
      cleanupSampleRate: 0,
      trustProxyHeaders: false,
    };
    const first = getAuthRateLimitKeys({
      headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
      email: "user@example.com",
      config,
    });
    const second = getAuthRateLimitKeys({
      headers: new Headers({ "x-forwarded-for": "203.0.113.99" }),
      email: "user@example.com",
      config,
    });

    expect(first[0]?.id).toBe(second[0]?.id);
  });

  it("uses conservative production defaults", () => {
    const config = getAuthRateLimitConfig();

    expect(config.enabled).toBe(true);
    expect(config.windowSeconds).toBeGreaterThanOrEqual(1);
    expect(config.ipMaxAttempts).toBeGreaterThanOrEqual(1);
    expect(config.accountMaxAttempts).toBeGreaterThanOrEqual(1);
    expect(config.trustProxyHeaders).toBe(false);
  });
});
