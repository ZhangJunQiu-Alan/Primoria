// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlockRenderer } from "@/components/course/block-renderer";
import type { QuizBlock } from "@/lib/courses/types";

const roots = new Set<Root>();
const block: QuizBlock = {
  id: "quiz-1",
  type: "quiz",
  title: "Retry check",
  questions: [{
    id: "q1",
    kind: "single",
    question: "Choose A",
    choices: [{ id: "a", text: "A" }, { id: "b", text: "B" }],
    correctId: "a",
  }],
};

async function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  await act(async () => root.render(createElement(BlockRenderer, { block, courseId: "course-1", contentLanguage: "en" })));
  return container;
}

async function click(element: Element | null) {
  expect(element).not.toBeNull();
  await act(async () => {
    (element as HTMLElement).click();
    await Promise.resolve();
  });
}

async function waitFor(assertion: () => void, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      assertion();
      return;
    } catch (error) {
      lastError = error;
    }
    await act(async () => new Promise((resolve) => setTimeout(resolve, 5)));
  }
  throw lastError;
}

beforeEach(() => {
  window.sessionStorage.clear();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "00000000-0000-4000-8000-000000000001") });
});

afterEach(async () => {
  for (const root of roots) await act(async () => root.unmount());
  roots.clear();
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("quiz persistence recovery", () => {
  it("retries with the same submission id and keeps the error visible until success", async () => {
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (requests.length === 1) throw new TypeError("response lost");
      return { ok: true, json: async () => ({ rewards: { xpAwarded: 0, levelUp: null, unlockedAchievements: [] } }) } as Response;
    }));

    const container = await mount();
    await click(container.querySelector(".course-quiz-choice"));
    await click(container.querySelector(".course-quiz-submit"));
    await waitFor(() => expect(container.querySelector(".course-quiz-save-error")).not.toBeNull());
    expect(window.sessionStorage.length).toBe(1);

    await click(container.querySelector(".course-quiz-retry"));
    await waitFor(() => expect(container.querySelector(".course-quiz-save-error")).toBeNull());

    expect(requests).toHaveLength(2);
    expect(requests[0].submissionId).toBe(requests[1].submissionId);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("reuses an unresolved submission id after a remount when the answers match", async () => {
    const requests: Array<Record<string, unknown>> = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      requests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      throw new TypeError("response lost");
    }));

    const first = await mount();
    await click(first.querySelector(".course-quiz-choice"));
    await click(first.querySelector(".course-quiz-submit"));
    await waitFor(() => expect(first.querySelector(".course-quiz-save-error")).not.toBeNull());

    for (const root of roots) await act(async () => root.unmount());
    roots.clear();
    document.body.replaceChildren();

    const second = await mount();
    await click(second.querySelector(".course-quiz-choice"));
    await click(second.querySelector(".course-quiz-submit"));
    await waitFor(() => expect(requests).toHaveLength(2));

    expect(requests[0].submissionId).toBe(requests[1].submissionId);
  });
});
