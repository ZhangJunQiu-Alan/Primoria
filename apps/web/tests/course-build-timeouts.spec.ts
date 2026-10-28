import { afterEach, describe, expect, it, vi } from "vitest";
import {
  COURSE_BUILD_TIMEOUT_MS,
  LEARNING_GOAL_POSITION_TIMEOUT_MS,
  PENDING_COURSE_BUILD_TIMEOUT_MS,
} from "../src/lib/courses/course-build-timeouts";
import { fetchWithTimeout, RequestTimeoutError } from "../src/lib/http/fetch-with-timeout";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("course preparation request deadlines", () => {
  it.each([
    { path: "/api/knowledge-graph/position", deadline: LEARNING_GOAL_POSITION_TIMEOUT_MS, elapsed: 100_000, oldDeadline: 45_000 },
    { path: "/api/learning/course", deadline: COURSE_BUILD_TIMEOUT_MS, elapsed: 150_000, oldDeadline: 100_000 },
  ])("accepts a slow but valid $path response after the old deadline", async ({ path, deadline, elapsed, oldDeadline }) => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_input, init) => new Promise<Response>((resolve, reject) => {
      signal = init.signal;
      const timer = setTimeout(() => resolve(new Response("{}", { status: 200 })), elapsed);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    })));

    const request = fetchWithTimeout(path, { method: "POST" }, deadline);
    await vi.advanceTimersByTimeAsync(oldDeadline + 1);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(elapsed - oldDeadline - 1);
    expect((await request).ok).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([LEARNING_GOAL_POSITION_TIMEOUT_MS, COURSE_BUILD_TIMEOUT_MS])("still aborts a stuck request after %i ms", async (deadline) => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    vi.stubGlobal("fetch", vi.fn((_input, init) => new Promise<Response>((_resolve, reject) => {
      signal = init.signal;
      signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })));

    const request = fetchWithTimeout("/stuck", {}, deadline);
    const rejection = expect(request).rejects.toMatchObject({ name: RequestTimeoutError.name, timeoutMs: deadline });
    await vi.advanceTimersByTimeAsync(deadline - 1);
    expect(signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await rejection;
    expect(signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the stale-state guard beyond the entire positioning and build window", () => {
    expect(LEARNING_GOAL_POSITION_TIMEOUT_MS).toBeGreaterThan(2 * 45_000);
    expect(COURSE_BUILD_TIMEOUT_MS).toBeGreaterThan(90_000);
    expect(PENDING_COURSE_BUILD_TIMEOUT_MS).toBeGreaterThan(LEARNING_GOAL_POSITION_TIMEOUT_MS + COURSE_BUILD_TIMEOUT_MS);
    expect(PENDING_COURSE_BUILD_TIMEOUT_MS).toBeLessThan(10 * 60_000);
  });
});
