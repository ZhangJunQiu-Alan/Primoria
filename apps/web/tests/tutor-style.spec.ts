import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_TUTOR_STYLE,
  TUTOR_STYLES,
  formatTutorStylePrompt,
  isTutorStyle,
  resolveTutorStyle,
} from "@primoria/contracts/tutor-style";
import * as profileTypes from "../src/lib/learner-profile/types";

const mockState = vi.hoisted(() => ({
  requireAuthUser: vi.fn(),
  updateTutorStyle: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireAuthUser: mockState.requireAuthUser }));
vi.mock("@/lib/learner-profile/store", () => ({ updateTutorStyle: mockState.updateTutorStyle }));

const src = (path: string) => readFileSync(new URL(`../src/${path}`, import.meta.url), "utf8");

describe("tutor style contract", () => {
  it("resolves missing or unknown styles to the shared default", () => {
    expect(DEFAULT_TUTOR_STYLE).toBe("feynman");
    expect(resolveTutorStyle(null)).toBe("feynman");
    expect(resolveTutorStyle("plato")).toBe("feynman");
    expect(resolveTutorStyle("euclid")).toBe("euclid");
    expect(isTutorStyle("socratic")).toBe(true);
    expect(isTutorStyle("Socratic")).toBe(false);
  });

  it("renders exactly one persona plus the shared scope rule", () => {
    for (const style of TUTOR_STYLES) {
      const prompt = formatTutorStylePrompt(style);
      expect(prompt.match(/^TUTOR STYLE:/gm)).toHaveLength(1);
      expect(prompt.match(/^TUTOR PRESENTATION: structured cards/gm)).toHaveLength(1);
      expect(prompt).toContain("Scope of TUTOR STYLE and TUTOR PRESENTATION");
      expect(prompt).toContain("never change tool routing");
    }
    expect(formatTutorStylePrompt("socratic")).toMatch(/do not state the definition, the result, or the key insight/);
    expect(formatTutorStylePrompt("feynman")).toMatch(/everyday analogy[\s\S]*Teach-back[\s\S]*own words/);
    expect(formatTutorStylePrompt("euclid")).toMatch(/Length budget[\s\S]*precise definition[\s\S]*numbered one-line steps/);
    expect(formatTutorStylePrompt("euclid")).toMatch(/Follow-up turns[\s\S]*do not restate definitions/);
    expect(formatTutorStylePrompt(undefined)).toBe(formatTutorStylePrompt("feynman"));
  });

  it("is the only style list Web uses", () => {
    expect(profileTypes.TUTOR_STYLES).toBe(TUTOR_STYLES);
    expect(profileTypes.isTutorStyle).toBe(isTutorStyle);
    expect(profileTypes.DEFAULT_TUTOR_STYLE).toBe(DEFAULT_TUTOR_STYLE);
  });
});

describe("tutor style wiring", () => {
  it("sends the style as run state, not as hidden user-message text", () => {
    const route = src("app/api/copilotkit/route.ts");
    expect(route).toContain("primoria_tutor_style: this.learnerProfile?.tutorStyle ?? null");
    expect(route).not.toContain("tutorStyleDirective");
  });

  it("no longer mirrors the style into learner facts", () => {
    expect(src("app/api/onboarding/style/route.ts")).not.toContain("syncOnboardingFact");
    expect(src("lib/learner-facts/store.ts")).not.toContain("tutor_style");
  });
});

describe("PUT /api/settings/tutor-style", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.requireAuthUser.mockResolvedValue({ denied: null, user: { id: "user-1" } });
    mockState.updateTutorStyle.mockImplementation(async (_ownerId: string, tutorStyle: string) => ({ tutorStyle }));
  });

  const put = async (body: unknown) => {
    const { PUT } = await import("../src/app/api/settings/tutor-style/route");
    return PUT(new Request("http://localhost/api/settings/tutor-style", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }));
  };

  it("saves a valid style for the signed-in owner", async () => {
    const response = await put({ tutorStyle: "socratic" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, tutorStyle: "socratic" });
    expect(mockState.updateTutorStyle).toHaveBeenCalledWith("user-1", "socratic");
  });

  it("rejects unknown styles, extra fields, and malformed JSON without writing", async () => {
    expect((await put({ tutorStyle: "plato" })).status).toBe(400);
    expect((await put({ tutorStyle: "euclid", skip: true })).status).toBe(400);
    expect((await put("{")).status).toBe(400);
    expect(mockState.updateTutorStyle).not.toHaveBeenCalled();
  });

  it("returns the auth guard's denial unchanged", async () => {
    const denied = new Response(null, { status: 401 });
    mockState.requireAuthUser.mockResolvedValue({ denied, user: null });
    expect(await put({ tutorStyle: "socratic" })).toBe(denied);
    expect(mockState.updateTutorStyle).not.toHaveBeenCalled();
  });
});
