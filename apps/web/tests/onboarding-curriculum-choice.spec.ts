// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { OnboardingClient } from "../src/components/onboarding/onboarding-client";
import { getDictionary } from "../src/lib/i18n/dictionaries";

describe("onboarding curriculum choices", () => {
  it("requires a school curriculum choice, clears it on stage change, and submits the selected A Level", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ profile: null, nextStep: "style", complete: false }),
    });
    vi.stubGlobal("fetch", fetch);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const copy = getDictionary("zh").onboarding;
    const radio = (name: string) => {
      const button = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
        .find((element) => element.textContent === name);
      expect(button, name).toBeDefined();
      return button!;
    };
    const curricula = () => container.querySelector('[aria-labelledby="onboarding-curriculum-label"]')!;
    try {
      await act(async () => root.render(createElement(OnboardingClient, {
        initialState: { profile: null, nextStep: "facts", complete: false },
      })));
      const continueButton = container.querySelector<HTMLButtonElement>(".onboarding-primary")!;
      await act(async () => radio(copy.stages.high_school).click());
      expect(curricula().querySelectorAll('[role="radio"]')).toHaveLength(4);
      expect(curricula().querySelector('[aria-checked="true"]')).toBeNull();
      expect(continueButton.disabled).toBe(true);
      for (const id of ["mainland_china_senior_high", "singapore_h2", "cambridge_international_a_level", "course_specific"] as const) {
        expect(radio(copy.curricula[id]).getAttribute("aria-checked")).toBe("false");
      }
      await act(async () => radio(copy.curricula.cambridge_international_a_level).click());
      expect(continueButton.disabled).toBe(false);
      await act(async () => radio(copy.stages.middle_school).click());
      expect(curricula().querySelectorAll('[role="radio"]')).toHaveLength(4);
      expect(curricula().querySelector('[aria-checked="true"]')).toBeNull();
      expect(continueButton.disabled).toBe(true);
      expect(curricula().textContent).not.toContain("A Level");
      await act(async () => radio(copy.stages.other).click());
      expect(curricula().querySelectorAll('[role="radio"]')).toHaveLength(2);
      expect(radio(copy.curricula.self_directed)).toBeDefined();
      expect(continueButton.disabled).toBe(true);
      await act(async () => radio(copy.stages.high_school).click());
      await act(async () => radio(copy.curricula.cambridge_international_a_level).click());
      expect(fetch).not.toHaveBeenCalled();
      await act(async () => continueButton.click());
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, request] = fetch.mock.calls[0];
      expect(url).toBe("/api/onboarding/facts");
      expect(JSON.parse(request.body)).toEqual({
        educationStage: "high_school",
        curriculumSystem: "cambridge_international_a_level",
        educationContextSource: "user_selected",
      });
      expect(container.querySelector(".onboarding-styles")).not.toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
      vi.unstubAllGlobals();
    }
  });
});
