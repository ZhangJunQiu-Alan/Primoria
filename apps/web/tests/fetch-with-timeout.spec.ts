import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithTimeout, RequestTimeoutError } from "../src/lib/http/fetch-with-timeout";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("fetchWithTimeout", () => {
  it("aborts a request at the configured deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));

    const request = fetchWithTimeout("/slow", {}, 45_000);
    const rejection = expect(request).rejects.toEqual(expect.objectContaining<RequestTimeoutError>({
      name: "RequestTimeoutError",
      timeoutMs: 45_000,
    }));
    await vi.advanceTimersByTimeAsync(45_000);
    await rejection;
  });
});
