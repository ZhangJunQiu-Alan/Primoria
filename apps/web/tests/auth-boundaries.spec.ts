import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const root = process.cwd();

const i18nState = vi.hoisted(() => ({
  cookieLanguage: null as string | null,
  acceptLanguage: "en-US,en;q=0.9",
  getCurrentUserForRsc: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "primoria_ui_language" && i18nState.cookieLanguage
        ? { value: i18nState.cookieLanguage }
        : undefined,
  }),
  headers: async () => ({
    get: (name: string) => (name.toLowerCase() === "accept-language" ? i18nState.acceptLanguage : null),
  }),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserForRsc: i18nState.getCurrentUserForRsc,
}));

vi.mock("@/lib/settings/user-settings", () => ({
  getUserPreferences: vi.fn(),
}));

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("root auth outage boundary", () => {
  beforeEach(() => {
    i18nState.cookieLanguage = null;
    i18nState.acceptLanguage = "en-US,en;q=0.9";
    i18nState.getCurrentUserForRsc.mockReset();
    i18nState.getCurrentUserForRsc.mockRejectedValue(new Error("database unavailable"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves the Root Layout language without reading the authenticated user", async () => {
    const { getCurrentUiLanguage } = await import("../src/lib/i18n/server");

    await expect(getCurrentUiLanguage()).resolves.toBe("en");
    expect(i18nState.getCurrentUserForRsc).not.toHaveBeenCalled();

    i18nState.cookieLanguage = "zh";
    await expect(getCurrentUiLanguage()).resolves.toBe("zh");
    expect(i18nState.getCurrentUserForRsc).not.toHaveBeenCalled();
  });

  it("provides a dependency-free global error boundary that replaces the root document", () => {
    const globalError = source("src/app/global-error.tsx");
    expect(globalError).toContain('"use client"');
    expect(globalError).toContain("<html");
    expect(globalError).toContain("<body");
    expect(globalError).not.toContain("I18nProvider");
    expect(globalError).not.toContain("getCurrentUser");
  });
});

describe("API auth contracts", () => {
  const optionalRoutes = [
    "src/app/api/copilot-threads/route.ts",
    "src/app/api/copilot-threads/[id]/messages/route.ts",
    "src/app/api/learner-facts/route.ts",
    "src/app/api/media/assets/[assetId]/route.ts",
    "src/app/api/settings/preferences/route.ts",
  ];

  const requiredRoutes = [
    "src/app/api/copilot-threads/route.ts",
    "src/app/api/copilot-threads/[id]/messages/route.ts",
    "src/app/api/courses/[id]/quiz/route.ts",
    "src/app/api/learner-facts/route.ts",
    "src/app/api/learner-facts/intake/route.ts",
    "src/app/api/learning-events/feedback/route.ts",
    "src/app/api/profile/route.ts",
  ];

  it("routes optional reads through the optional auth contract", () => {
    for (const path of optionalRoutes) {
      expect(source(path), path).toContain("getOptionalAuthUser");
    }
  });

  it("routes authenticated writes through the configured auth contract", () => {
    for (const path of requiredRoutes) {
      expect(source(path), path).toContain("requireConfiguredAuthUser");
    }
  });

  it("leaves direct session lookup only in the dedicated auth/me route", () => {
    const migratedRoutes = new Set([...optionalRoutes, ...requiredRoutes]);
    for (const path of migratedRoutes) {
      expect(source(path), path).not.toMatch(/\bgetCurrentUser\s*\(/);
    }
  });

  it("never returns raw quiz error messages", () => {
    const quizRoute = source("src/app/api/courses/[id]/quiz/route.ts");
    expect(quizRoute).toContain("toSafeAuthError");
    expect(quizRoute).not.toContain("error.message");
  });
});
