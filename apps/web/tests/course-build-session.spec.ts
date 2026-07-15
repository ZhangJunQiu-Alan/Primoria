// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.setSystemTime(new Date("2026-07-14T00:02:00Z"));

    expect(readPendingCourseBuilds()[0]).toMatchObject({
      status: "failed",
      errorCode: "course_build_timeout",
    });
  });

  it("remembers a failed lesson job once without duplicating ids", () => {
    markLessonFailureSeen("job-3");
    markLessonFailureSeen("job-3");
    expect([...readSeenLessonFailureIds()]).toEqual(["job-3"]);
  });
});
