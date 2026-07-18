import { beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  getCourseByScopeKey: vi.fn(),
  saveCourse: vi.fn(),
  enrichCourseOutlineDescriptions: vi.fn(),
  afterCallbacks: [] as Array<() => unknown>,
}));

vi.mock("@/lib/courses/store", () => ({
  getCourseByScopeKey: mockState.getCourseByScopeKey,
  saveCourse: mockState.saveCourse,
}));

vi.mock("@/lib/ai/course-generation/outline-enrichment", () => ({
  enrichCourseOutlineDescriptions: mockState.enrichCourseOutlineDescriptions,
}));

vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    mockState.afterCallbacks.push(callback);
  },
}));

function reusedCourse() {
  return {
    id: "crs_existing",
    title: "Python Fundamentals",
    topic: "Python Fundamentals",
    summary: "Existing course",
    estimatedMinutes: 0,
    anchorConceptId: null,
    graphId: "python_fundamentals",
    language: "en",
    lessons: [
      {
        id: "lsn_existing",
        title: "Running Python Programs",
        description: "A template captured before enrichment.",
        role: "new",
        progress: "not_started",
        status: "planned",
        sortKey: 1,
        topicId: "pyf_topic_running_python_programs",
        triggeredFrom: null,
        blocks: null,
        estimatedMinutes: null,
        version: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    archivedAt: null,
    version: 1,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("initializeCourseOutline reuse persistence", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockState.afterCallbacks.length = 0;
    mockState.saveCourse.mockImplementation(async (course: unknown) => course);
  });

  it("returns an unchanged reused course without aggregate persistence", async () => {
    const existing = reusedCourse();
    mockState.getCourseByScopeKey.mockResolvedValue(existing);
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");

    const result = await initializeCourseOutline({
      ownerId: "u1",
      topic: "Python",
      kgContext: {
        learningPathType: "linear",
        graphId: "python_fundamentals",
        startTopic: {
          topicId: "pyf_topic_running_python_programs",
          name: "Running Python Programs",
        },
        targetConceptId: null,
        nextTopic: null,
      } as never,
    });

    expect(result).toMatchObject({ course: existing, isNewCourse: false });
    expect(mockState.saveCourse).not.toHaveBeenCalled();
    expect(mockState.afterCallbacks).toHaveLength(0);
  });

  it("still persists and schedules enrichment for a new freeform course", async () => {
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");

    const result = await initializeCourseOutline({ ownerId: "u1", topic: "Quantum Basics" });

    expect(result.isNewCourse).toBe(true);
    expect(mockState.saveCourse).toHaveBeenCalledTimes(1);
    expect(mockState.afterCallbacks).toHaveLength(1);
  });

  it("uses distinct stable identities for canonical and goal-scoped courses on the same KG", async () => {
    const { buildCourseScopeKey } = await import("../src/lib/ai/deepagent/course-generator");
    const canonical = buildCourseScopeKey({ graphId: "linear_algebra" });
    const tailored = buildCourseScopeKey({
      graphId: "linear_algebra",
      targetConceptIds: ["c_mit1806_linear_transformations", "c_mit1806_matrix_ops"],
      scope: "goal",
      learningGoal: "linear algebra for deep learning",
    });
    const reordered = buildCourseScopeKey({
      graphId: "linear_algebra",
      targetConceptIds: ["c_mit1806_matrix_ops", "c_mit1806_linear_transformations"],
      scope: "goal",
      learningGoal: "linear algebra for deep learning",
    });

    expect(canonical).toBe("graph:linear_algebra:full");
    expect(tailored).toBe(reordered);
    expect(tailored).not.toBe(canonical);
  });
});
