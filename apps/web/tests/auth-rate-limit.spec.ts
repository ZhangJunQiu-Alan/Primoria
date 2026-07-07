import { describe, expect, it } from "vitest";
import { getAuthRateLimitConfig, getAuthRateLimitKeys, getClientIp } from "../src/lib/auth/rate-limit";

describe("auth rate limit helpers", () => {
  it("extracts the client IP from trusted proxy headers", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "203.0.113.10" }))).toBe("203.0.113.10");
    expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.11" }))).toBe("203.0.113.11");
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.12, 10.0.0.1" }))).toBe("203.0.113.12");
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
      },
    });

    expect(keys).toHaveLength(2);
    expect(keys.map((key) => key.scope)).toEqual(["auth:ip", "auth:account"]);
    expect(keys.every((key) => key.id.includes("@") === false)).toBe(true);
    expect(keys.every((key) => key.identifierHash.length === 64)).toBe(true);
  });

  it("uses conservative production defaults", () => {
    const config = getAuthRateLimitConfig();

    expect(config.enabled).toBe(true);
    expect(config.windowSeconds).toBeGreaterThanOrEqual(1);
    expect(config.ipMaxAttempts).toBeGreaterThanOrEqual(1);
    expect(config.accountMaxAttempts).toBeGreaterThanOrEqual(1);
  });
});
