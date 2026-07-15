import { afterEach, describe, expect, it, vi } from "vitest";

import { generateTopicGraph } from "../src/lib/knowledge-graph/generated-graph";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("generated graph deadline", () => {
  it("aborts and returns null when the model never completes", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const invoker = vi.fn(({ signal }: { signal?: AbortSignal }) => new Promise<string>((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));

    const result = generateTopicGraph({ topic: "Chemistry" }, invoker, 90_000);
    await vi.advanceTimersByTimeAsync(90_000);

    await expect(result).resolves.toBeNull();
    expect(invoker.mock.calls[0][0].signal?.aborted).toBe(true);
  });
});
