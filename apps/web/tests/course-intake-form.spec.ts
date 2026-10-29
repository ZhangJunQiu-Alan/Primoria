// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CourseIntakeForm } from "../src/components/tutor/course-intake-form";
import { fallbackIntakeQuestions, type CourseIntakeView } from "../src/lib/courses/course-intake";

vi.mock("../src/lib/i18n/client", () => ({ useT: () => ({ tutor: { intake: { title: "Your background", description: "Three questions", detail: "Optional detail", submit: "Build my course", saving: "Saving", error: "Please retry" } } }) }));

afterEach(() => vi.unstubAllGlobals());
describe("background options before course creation", () => {
  it("requires three choices, saves once and only continues after the server confirms", async () => {
    const intake: CourseIntakeView = { id: "intake_1", query: "Python", language: "en", ready: false, questions: fallbackIntakeQuestions("en"), answers: null, goal: "Python" };
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...intake, ready: true }) });
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onComplete = vi.fn();
    try {
      await act(async () => root.render(createElement(CourseIntakeForm, { intake, onComplete })));
      expect(container.querySelectorAll("fieldset")).toHaveLength(3);
      const button = container.querySelector("button")!;
      expect(button.disabled).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
      for (const fieldset of container.querySelectorAll("fieldset")) await act(async () => (fieldset.querySelector("input[type=radio]") as HTMLInputElement).click());
      expect(button.disabled).toBe(false);
      await act(async () => button.click());
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls[0][0]).toBe("/api/learning/intake");
      expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({ ready: true }));
      expect(button.disabled).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
