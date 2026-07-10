// @vitest-environment jsdom

import { createElement, type ReactElement } from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CourseOutlineView } from "../src/components/course/course-outline-view";
import { CourseLibraryGrid } from "../src/components/library/course-library-grid";
import type { LessonGenerationJobSummary } from "../src/lib/courses/lesson-generation-jobs";
import type { Course } from "../src/lib/courses/types";

const mockState = vi.hoisted(() => ({
  outlineJobs: [] as LessonGenerationJobSummary[],
  routerPush: vi.fn(),
  setJobs: vi.fn(),
  refreshJobs: vi.fn(),
}));

vi.mock("next/link", async () => {
  const { createElement } = await import("react");
  return {
    default: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) =>
      createElement("a", { ...props, href: String(href) }, children),
  };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockState.routerPush }),
}));

vi.mock("@/hooks/use-lesson-generation-jobs", () => ({
  useLessonGenerationJobs: () => ({
    jobsByLessonId: new Map(mockState.outlineJobs.map((job) => [job.lessonId, job])),
    setJobs: mockState.setJobs,
    refresh: mockState.refreshJobs,
  }),
}));

type MountedView = {
  container: HTMLDivElement;
  rerender: (element: ReactElement) => Promise<void>;
  unmount: () => Promise<void>;
};

const mountedRoots = new Set<Root>();

async function mount(element: ReactElement): Promise<MountedView> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  mountedRoots.add(root);
  await act(async () => {
    root.render(element);
  });
  return {
    container,
    rerender: async (next) => {
      await act(async () => {
        root.render(next);
      });
    },
    unmount: async () => {
      if (!mountedRoots.delete(root)) return;
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
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
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });
  }
  throw lastError;
}

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: async () => body,
  } as Response;
}

function lessonJob(status: LessonGenerationJobSummary["status"]): LessonGenerationJobSummary {
  return {
    id: "job-1",
    courseId: "course-1",
    lessonId: "lesson-1",
    status,
    stage: status === "completed" ? "completed" : "writing",
    attempts: 1,
    maxAttempts: 2,
    progressCompleted: status === "completed" ? 1 : 0,
    progressTotal: 1,
    lastError: null,
    createdAt: 1,
    updatedAt: 2,
  };
}

function course(title: string, lessonStatus: "generating" | "generated" = "generating"): Course {
  return {
    id: "course-1",
    title,
    topic: "Testing",
    summary: "Course summary",
    estimatedMinutes: 10,
    lessons: [
      {
        id: "lesson-1",
        title: "Recovery lesson",
        description: "Lesson description",
        role: "new",
        progress: "not_started",
        status: lessonStatus,
        sortKey: 1,
        blocks: lessonStatus === "generated" ? [] : null,
        estimatedMinutes: 10,
        version: 1,
        createdAt: 1,
        updatedAt: 2,
      },
    ],
    version: 1,
    createdAt: 1,
    updatedAt: 2,
  };
}

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mockState.outlineJobs = [];
  vi.clearAllMocks();
});

afterEach(async () => {
  for (const root of [...mountedRoots]) {
    mountedRoots.delete(root);
    await act(async () => {
      root.unmount();
    });
  }
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("Library empty recovery states", () => {
  it("shows onboarding copy and CTA for an empty incomplete library", async () => {
    const view = await mount(
      createElement(CourseLibraryGrid, { initialCourses: [], onboardingIncomplete: true }),
    );

    expect(view.container.textContent).toContain("先完成入门设置");
    expect(view.container.textContent).toContain("继续入门设置");
    expect(view.container.querySelector("a")?.getAttribute("href")).toBe("/");
  });

  it("keeps the create-first-course state for completed onboarding", async () => {
    const view = await mount(
      createElement(CourseLibraryGrid, { initialCourses: [], onboardingIncomplete: false }),
    );

    expect(view.container.textContent).toContain("还没有课程");
    expect(view.container.textContent).toContain("从 Tutor 创建第一门课程");
    expect(view.container.textContent).not.toContain("继续入门设置");
  });

  it("keeps checking-builds copy ahead of onboarding after an active job disappears", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      return url === "/api/courses"
        ? jsonResponse({ courses: [] })
        : jsonResponse({ jobs: [] });
    });
    vi.stubGlobal("fetch", fetchMock);
    const view = await mount(
      createElement(CourseLibraryGrid, {
        initialCourses: [],
        initialLessonJobs: [lessonJob("running")],
        onboardingIncomplete: true,
      }),
    );

    await waitFor(() => expect(view.container.textContent).toContain("正在检查课程生成任务"));
    expect(view.container.textContent).not.toContain("先完成入门设置");
    expect(fetchMock).toHaveBeenCalledWith("/api/courses", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("/api/lesson-generation-jobs", { cache: "no-store" });
  });
});

describe("Outline completed-job refresh recovery", () => {
  it("retries after a failed course fetch and marks the lesson refreshed only after success", async () => {
    mockState.outlineJobs = [lessonJob("completed")];
    const initialCourse = course("Original course");
    const refreshedCourse = course("Refreshed course", "generated");
    const onCourseUpdated = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, false))
      .mockResolvedValueOnce(jsonResponse({ course: refreshedCourse }));
    vi.stubGlobal("fetch", fetchMock);
    const element = () =>
      createElement(CourseOutlineView, { course: initialCourse, onCourseUpdated });
    const view = await mount(element());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(onCourseUpdated).not.toHaveBeenCalled();
    expect(view.container.textContent).toContain("Original course");

    await view.rerender(element());
    await waitFor(() => expect(onCourseUpdated).toHaveBeenCalledWith(refreshedCourse));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(view.container.textContent).toContain("Refreshed course");

    await view.rerender(element());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("ignores a successful course response that arrives after unmount", async () => {
    mockState.outlineJobs = [lessonJob("completed")];
    const refreshedCourse = course("Late course", "generated");
    const onCourseUpdated = vi.fn();
    let resolveFetch!: (response: Response) => void;
    const fetchMock = vi.fn(
      () => new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const view = await mount(
      createElement(CourseOutlineView, { course: course("Original course"), onCourseUpdated }),
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await view.unmount();
    await act(async () => {
      resolveFetch(jsonResponse({ course: refreshedCourse }));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(onCourseUpdated).not.toHaveBeenCalled();
  });
});
