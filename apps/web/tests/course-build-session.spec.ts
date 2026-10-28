// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  COURSE_BUILD_TIMEOUT_MS,
  LEARNING_GOAL_POSITION_TIMEOUT_MS,
  PENDING_COURSE_BUILD_TIMEOUT_MS,
} from "../src/lib/courses/course-build-timeouts";

import {
  PENDING_COURSE_BUILDS_EVENT,
  beginPendingCourseBuild,
  clearPendingCourseBuilds,
  markLessonFailureSeen,
  markPendingCourseBuildFailed,
  markPendingCourseBuildReady,
  readPendingCourseBuilds,
  readSeenLessonFailureIds,
} from "../src/lib/courses/course-build-session";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("pending course build session state", () => {
  afterEach(() => vi.useRealTimers());

  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });
    Object.defineProperty(window, "sessionStorage", { value: new MemoryStorage(), configurable: true });
    clearPendingCourseBuilds();
    vi.useRealTimers();
  });

  it("tracks building, ready, and failed states while emitting updates", () => {
    const changed = vi.fn();
    window.addEventListener(PENDING_COURSE_BUILDS_EVENT, changed);

    beginPendingCourseBuild({ id: "build-1", topic: "Chemistry" });
    expect(readPendingCourseBuilds()).toMatchObject([{ id: "build-1", status: "building", topic: "Chemistry" }]);

    markPendingCourseBuildReady("build-1", { courseId: "course-1", title: "Chemistry Foundations" });
    expect(readPendingCourseBuilds()).toMatchObject([{
      id: "build-1",
      status: "ready",
      courseId: "course-1",
      title: "Chemistry Foundations",
    }]);

    markPendingCourseBuildFailed("build-1", "course_build_failed");
    expect(readPendingCourseBuilds()[0]).toMatchObject({ status: "failed", errorCode: "course_build_failed" });
    expect(changed).toHaveBeenCalledTimes(3);

    window.removeEventListener(PENDING_COURSE_BUILDS_EVENT, changed);
  });

  it("turns abandoned builds into a safe timeout state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T00:00:00Z"));
    beginPendingCourseBuild({ id: "build-stale", topic: "Chemistry" });
    vi.setSystemTime(Date.now() + PENDING_COURSE_BUILD_TIMEOUT_MS + 1);

    expect(readPendingCourseBuilds()[0]).toMatchObject({
      status: "failed",
      errorCode: "course_build_timeout",
    });
  });

  it("keeps a freeform build pending across both request budgets and accepts its result", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
    beginPendingCourseBuild({ id: "build-freeform", topic: "A new subject" });
    const startedAt = Date.now();

    vi.setSystemTime(startedAt + 40_000 + 80_000);
    expect(readPendingCourseBuilds()[0].status).toBe("building");

    vi.setSystemTime(startedAt + LEARNING_GOAL_POSITION_TIMEOUT_MS + COURSE_BUILD_TIMEOUT_MS);
    expect(readPendingCourseBuilds()[0].status).toBe("building");
    markPendingCourseBuildReady("build-freeform", { courseId: "course-freeform", title: "A new subject" });

    vi.setSystemTime(startedAt + PENDING_COURSE_BUILD_TIMEOUT_MS + 1);
    expect(readPendingCourseBuilds()[0]).toMatchObject({ status: "ready", courseId: "course-freeform" });
  });

  it("allows an eventual server success to replace a stale timeout", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T00:00:00Z"));
    beginPendingCourseBuild({ id: "build-late", topic: "Chemistry" });
    vi.setSystemTime(Date.now() + PENDING_COURSE_BUILD_TIMEOUT_MS + 1);
    expect(readPendingCourseBuilds()[0].status).toBe("failed");

    markPendingCourseBuildReady("build-late", { courseId: "course-late", title: "Chemistry" });
    expect(readPendingCourseBuilds()[0]).toMatchObject({ status: "ready", courseId: "course-late", errorCode: null });
  });

  it("remembers a failed lesson job once without duplicating ids", () => {
    markLessonFailureSeen("job-3");
    markLessonFailureSeen("job-3");
    expect([...readSeenLessonFailureIds()]).toEqual(["job-3"]);
  });
});
