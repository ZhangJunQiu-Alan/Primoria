import { describe, expect, it } from "vitest";

import { DEFAULT_AUTH_REDIRECT, normalizeAuthRedirect } from "@/lib/auth/redirect";

describe("normalizeAuthRedirect", () => {
  it("falls back when the redirect target is missing or blank", () => {
    expect(normalizeAuthRedirect(null)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(normalizeAuthRedirect(undefined)).toBe(DEFAULT_AUTH_REDIRECT);
    expect(normalizeAuthRedirect("   ")).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("allows same-app relative paths", () => {
    expect(normalizeAuthRedirect("/")).toBe("/");
    expect(normalizeAuthRedirect("/library")).toBe("/library");
    expect(normalizeAuthRedirect("/course/abc?tab=outline#lesson-1")).toBe("/course/abc?tab=outline#lesson-1");
    expect(normalizeAuthRedirect(" /stats ")).toBe("/stats");
  });

  it("rejects executable and cross-origin redirect targets", () => {
    expect(normalizeAuthRedirect("javascript:alert(1)")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(normalizeAuthRedirect("stats")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(normalizeAuthRedirect("https://evil.example/phish")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(normalizeAuthRedirect("//evil.example/phish")).toBe(DEFAULT_AUTH_REDIRECT);
    expect(normalizeAuthRedirect("/\\evil.example/phish")).toBe(DEFAULT_AUTH_REDIRECT);
  });
});
