import { describe, expect, it } from "vitest";
import { getAuthRateLimitConfig, getAuthRateLimitKeys, getClientIp } from "../src/lib/auth/rate-limit";

describe("auth rate limit helpers", () => {
  it("does not trust proxy headers unless one exact header is configured", () => {
    expect(getClientIp(new Headers({ "cf-connecting-ip": "203.0.113.10" }))).toBe("unknown");
    expect(getClientIp(new Headers({ "x-real-ip": "203.0.113.11" }))).toBe("unknown");
    expect(getClientIp(new Headers({ "x-forwarded-for": "203.0.113.12, 10.0.0.1" }))).toBe("unknown");
  });

  it("extracts the client IP only from the configured proxy header", () => {
    expect(
      getClientIp(new Headers({ "cf-connecting-ip": "203.0.113.10", "x-real-ip": "203.0.113.99" }), {
        clientIpHeader: "cf-connecting-ip",
      }),
    ).toBe("203.0.113.10");
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "203.0.113.12, 10.0.0.1" }), {
        clientIpHeader: "x-forwarded-for",
      }),
    ).toBe("203.0.113.12");
    expect(
      getClientIp(new Headers({ forwarded: 'for="[2001:db8::1]:443";proto=https' }), {
        clientIpHeader: "forwarded",
      }),
    ).toBe("2001:db8::1");
  });

  it("ignores malformed trusted proxy IP values", () => {
    expect(
      getClientIp(new Headers({ "cf-connecting-ip": "not-an-ip" }), { clientIpHeader: "cf-connecting-ip" }),
    ).toBe("unknown");
    expect(
      getClientIp(new Headers({ "x-forwarded-for": "unknown, 203.0.113.12" }), {
        clientIpHeader: "x-forwarded-for",
      }),
    ).toBe("unknown");
  });

  it("skips the global IP bucket when no trusted client IP is available", () => {
    const first = getAuthRateLimitKeys({
      headers: new Headers({ "x-real-ip": "203.0.113.20" }),
      email: "User@Example.COM",
      config: {
        enabled: true,
        windowSeconds: 60,
        ipMaxAttempts: 5,
        accountMaxAttempts: 5,
        cleanupSampleRate: 0,
        clientIpHeader: null,
      },
    });
    const second = getAuthRateLimitKeys({
      headers: new Headers({ "x-real-ip": "203.0.113.20" }),
      email: "another@example.com",
      config: {
        enabled: true,
        windowSeconds: 60,
        ipMaxAttempts: 5,
        accountMaxAttempts: 5,
        cleanupSampleRate: 0,
        clientIpHeader: null,
      },
    });

    expect(first).toHaveLength(1);
    expect(first.map((key) => key.scope)).toEqual(["auth:account"]);
    expect(first[0]?.id).not.toBe(second[0]?.id);
    expect(first.every((key) => key.id.includes("@") === false)).toBe(true);
    expect(first.every((key) => key.identifierHash.length === 64)).toBe(true);
  });

  it("skips the IP bucket when the configured header is missing or malformed", () => {
    const config = {
      enabled: true,
      windowSeconds: 60,
      ipMaxAttempts: 5,
      accountMaxAttempts: 5,
      cleanupSampleRate: 0,
      clientIpHeader: "cf-connecting-ip" as const,
    };

    const missing = getAuthRateLimitKeys({
      headers: new Headers(),
      email: "user@example.com",
      config,
    });
    const malformed = getAuthRateLimitKeys({
      headers: new Headers({ "cf-connecting-ip": "not-an-ip" }),
      email: "user@example.com",
      config,
    });

    expect(missing.map((key) => key.scope)).toEqual(["auth:account"]);
    expect(malformed.map((key) => key.scope)).toEqual(["auth:account"]);
  });

  it("builds separate hashed keys when the configured client IP is valid", () => {
    const config = {
      enabled: true,
      windowSeconds: 60,
      ipMaxAttempts: 5,
      accountMaxAttempts: 5,
      cleanupSampleRate: 0,
      clientIpHeader: "x-forwarded-for" as const,
    };
    const keys = getAuthRateLimitKeys({
      headers: new Headers({ "x-forwarded-for": "203.0.113.10" }),
      email: "user@example.com",
      config,
    });

    expect(keys.map((key) => key.scope)).toEqual(["auth:ip", "auth:account"]);
  });

  it("uses conservative production defaults", () => {
    const original = process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER;
    delete process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER;
    const config = getAuthRateLimitConfig();
    if (original === undefined) delete process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER;
    else process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER = original;

    expect(config.enabled).toBe(true);
    expect(config.windowSeconds).toBeGreaterThanOrEqual(1);
    expect(config.ipMaxAttempts).toBeGreaterThanOrEqual(1);
    expect(config.accountMaxAttempts).toBeGreaterThanOrEqual(1);
    expect(config.clientIpHeader).toBeNull();
  });

  it("rejects an unsupported trusted client IP header", () => {
    const original = process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER;
    process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER = "x-client-controlled-ip";
    try {
      expect(() => getAuthRateLimitConfig()).toThrow(/Invalid AUTH_RATE_LIMIT_CLIENT_IP_HEADER/);
    } finally {
      if (original === undefined) delete process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER;
      else process.env.AUTH_RATE_LIMIT_CLIENT_IP_HEADER = original;
    }
  });
});
