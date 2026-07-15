export type PendingCourseBuildStatus = "building" | "ready" | "failed";

export type PendingCourseBuildErrorCode =
  | "positioning_timeout"
  | "positioning_failed"
  | "course_build_timeout"
  | "course_build_failed";

export type PendingCourseBuild = {
  id: string;
  topic: string;
  status: PendingCourseBuildStatus;
  courseId: string | null;
  title: string | null;
  errorCode: PendingCourseBuildErrorCode | null;
  startedAt: number;
  updatedAt: number;
};

export const PENDING_COURSE_BUILDS_EVENT = "primoria:pending-course-builds-changed";
export const PENDING_COURSE_BUILDS_STORAGE_KEY = "primoria:pending-course-builds:v1";
export const SEEN_LESSON_FAILURES_STORAGE_KEY = "primoria:seen-lesson-failures:v1";

const PENDING_BUILD_TTL_MS = 10 * 60_000;
const PENDING_BUILD_STALE_MS = 110_000;
const MAX_PENDING_BUILDS = 10;
const MAX_SEEN_FAILURES = 100;

function canUseSessionStorage() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.sessionStorage);
  } catch {
    return false;
  }
}

function canUseLocalStorage() {
  if (typeof window === "undefined") return false;
  try {
    return Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function isPendingCourseBuild(value: unknown): value is PendingCourseBuild {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PendingCourseBuild>;
  return (
    typeof item.id === "string"
    && typeof item.topic === "string"
    && (item.status === "building" || item.status === "ready" || item.status === "failed")
    && typeof item.startedAt === "number"
    && typeof item.updatedAt === "number"
  );
}

function normalizePendingBuilds(value: unknown, now = Date.now()): PendingCourseBuild[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isPendingCourseBuild)
    .filter((build) => now - build.updatedAt <= PENDING_BUILD_TTL_MS)
    .map((build) => (
      build.status === "building" && now - build.startedAt > PENDING_BUILD_STALE_MS
        ? { ...build, status: "failed" as const, errorCode: "course_build_timeout" as const, updatedAt: now }
        : {
            ...build,
            courseId: typeof build.courseId === "string" ? build.courseId : null,
            title: typeof build.title === "string" ? build.title : null,
            errorCode: build.errorCode ?? null,
          }
    ))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, MAX_PENDING_BUILDS);
}

export function readPendingCourseBuilds(): PendingCourseBuild[] {
  if (!canUseSessionStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(PENDING_COURSE_BUILDS_STORAGE_KEY);
    return normalizePendingBuilds(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

function writePendingCourseBuilds(builds: PendingCourseBuild[]) {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(
      PENDING_COURSE_BUILDS_STORAGE_KEY,
      JSON.stringify(normalizePendingBuilds(builds)),
    );
    window.dispatchEvent(new Event(PENDING_COURSE_BUILDS_EVENT));
  } catch {
    // Storage may be disabled or full; the live Tutor card still reports state.
  }
}

export function beginPendingCourseBuild(input: { id: string; topic: string }) {
  const now = Date.now();
  const next: PendingCourseBuild = {
    id: input.id,
    topic: input.topic.trim() || "Course",
    status: "building",
    courseId: null,
    title: null,
    errorCode: null,
    startedAt: now,
    updatedAt: now,
  };
  writePendingCourseBuilds([next, ...readPendingCourseBuilds().filter((build) => build.id !== input.id)]);
}

export function markPendingCourseBuildReady(id: string, input: { courseId: string; title: string }) {
  const current = readPendingCourseBuilds();
  const existing = current.find((build) => build.id === id);
  if (!existing) return;
  writePendingCourseBuilds([
    {
      ...existing,
      status: "ready",
      courseId: input.courseId,
      title: input.title,
      errorCode: null,
      updatedAt: Date.now(),
    },
    ...current.filter((build) => build.id !== id),
  ]);
}

export function markPendingCourseBuildFailed(id: string, errorCode: PendingCourseBuildErrorCode) {
  const current = readPendingCourseBuilds();
  const existing = current.find((build) => build.id === id);
  if (!existing) return;
  writePendingCourseBuilds([
    { ...existing, status: "failed", errorCode, updatedAt: Date.now() },
    ...current.filter((build) => build.id !== id),
  ]);
}

export function removePendingCourseBuild(id: string) {
  writePendingCourseBuilds(readPendingCourseBuilds().filter((build) => build.id !== id));
}

export function clearPendingCourseBuilds() {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(PENDING_COURSE_BUILDS_STORAGE_KEY);
    window.dispatchEvent(new Event(PENDING_COURSE_BUILDS_EVENT));
  } catch {}
}

export function readSeenLessonFailureIds(): Set<string> {
  if (!canUseLocalStorage()) return new Set();
  try {
    const raw = window.localStorage.getItem(SEEN_LESSON_FAILURES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

export function markLessonFailureSeen(jobId: string) {
  if (!canUseLocalStorage()) return;
  try {
    const ids = [jobId, ...[...readSeenLessonFailureIds()].filter((id) => id !== jobId)].slice(0, MAX_SEEN_FAILURES);
    window.localStorage.setItem(SEEN_LESSON_FAILURES_STORAGE_KEY, JSON.stringify(ids));
  } catch {}
}
