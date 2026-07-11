import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUserForRsc: vi.fn(),
  getLearnerOnboardingState: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getCurrentUserForRsc: mocks.getCurrentUserForRsc,
  isAuthEnabled: () => true,
}));

vi.mock("@/lib/learner-profile/store", () => ({
  getLearnerOnboardingState: mocks.getLearnerOnboardingState,
}));

vi.mock("@/components/landing/landing-page", () => ({
  LandingPage: function LandingPage() {
    return createElement("div", { "data-testid": "landing" }, "Landing");
  },
}));

vi.mock("@/components/onboarding/onboarding-client", () => ({
  OnboardingClient: function OnboardingClient() {
    return createElement("div", { "data-testid": "onboarding" }, "Onboarding");
  },
}));

vi.mock("@/components/tutor/tutor-workspace-client", () => ({
  TutorWorkspaceClient: function TutorWorkspaceClient() {
    return createElement("div", { "data-testid": "tutor" }, "Tutor");
  },
}));

describe("home session routing", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.getCurrentUserForRsc.mockReset();
    mocks.getLearnerOnboardingState.mockReset();
  });

  it("renders the landing page when no session exists", async () => {
    mocks.getCurrentUserForRsc.mockResolvedValue(null);
    const { default: HomePage } = await import("@/app/page");

    const result = await HomePage();

    expect(typeof result.type === "function" ? result.type.name : result.type).toBe("LandingPage");
    expect(mocks.getLearnerOnboardingState).not.toHaveBeenCalled();
  });

  it("routes a new signed-in account into onboarding", async () => {
    mocks.getCurrentUserForRsc.mockResolvedValue({ id: "usr_new" });
    mocks.getLearnerOnboardingState.mockResolvedValue({ complete: false });
    const { default: HomePage } = await import("@/app/page");

    const result = await HomePage();
    const child = result.props.children;

    expect(result.props.className).toContain("onboarding-app-shell");
    expect(typeof child.type === "function" ? child.type.name : child.type).toBe("OnboardingClient");
    expect(mocks.getLearnerOnboardingState).toHaveBeenCalledWith("usr_new");
  });

  it("routes a completed account into Messages", async () => {
    const user = { id: "usr_ready" };
    mocks.getCurrentUserForRsc.mockResolvedValue(user);
    mocks.getLearnerOnboardingState.mockResolvedValue({ complete: true });
    const { default: HomePage } = await import("@/app/page");

    const result = await HomePage();
    const child = result.props.children;

    expect(typeof child.type === "function" ? child.type.name : child.type).toBe("TutorWorkspaceClient");
    expect(child.props.initialAuthState).toEqual({ authEnabled: true, user, loaded: true });
  });
});
