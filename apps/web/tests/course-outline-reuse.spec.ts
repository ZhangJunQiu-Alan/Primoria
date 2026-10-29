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

vi.mock("@/lib/mastery/owner-store", () => ({ listConceptMasteryByOwner: vi.fn(async () => []) }));

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

  it("reuses the concurrent winner when saving loses the owner+scope race behind a Drizzle error", async () => {
    const existing = reusedCourse();
    // drizzle-orm wraps the postgres-js error; SQLSTATE and constraint sit on `cause`.
    const raced = Object.assign(new Error("Failed query: insert into \"courses\" ..."), {
      cause: Object.assign(new Error("duplicate key value"), { code: "23505", constraint_name: "courses_owner_scope_uidx" }),
    });
    mockState.getCourseByScopeKey.mockResolvedValueOnce(undefined).mockResolvedValueOnce(existing);
    mockState.saveCourse.mockRejectedValueOnce(raced);
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");
    const input = {
      ownerId: "u1",
      topic: "Python",
      kgContext: {
        learningPathType: "linear",
        graphId: "python_fundamentals",
        startTopic: { topicId: "pyf_topic_running_python_programs", name: "Running Python Programs" },
        targetConceptId: null,
        nextTopic: null,
      } as never,
    };

    const result = await initializeCourseOutline(input);
    expect(result).toMatchObject({ course: existing, isNewCourse: false });
    expect(mockState.afterCallbacks).toHaveLength(0);

    const other = Object.assign(new Error("Failed query"), { cause: { code: "23505", constraint_name: "lessons_pkey" } });
    mockState.getCourseByScopeKey.mockResolvedValueOnce(undefined);
    mockState.saveCourse.mockRejectedValueOnce(other);
    await expect(initializeCourseOutline(input)).rejects.toBe(other);
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

  it.each([["en", "Shannon Entropy"], ["zh", "香农熵"]])("names a single-concept %s course after its actual scope", async (language, title) => {
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");
    const result = await initializeCourseOutline({ ownerId: "u1", topic: "the intuition behind information entropy", language, kgContext: {
      learningPathType: "linear", graphId: "information_theory", startTopic: { topicId: "t_infotheory_basics", name: "Entropy and Information Measures", concepts: [] },
      targetConceptId: "c_infotheory_entropy", targetConceptIds: ["c_infotheory_entropy"], nextTopic: null,
    } });
    expect(result.course.title).toBe(title);
    expect(result.course.lessons).toHaveLength(1);
    expect(result.course.summary).toContain(title);
  });

  it("preserves the full subject title and five lessons for a complete information-theory course", async () => {
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");
    const result = await initializeCourseOutline({ ownerId: "u1", topic: "Information Theory and Entropy", language: "en", kgContext: {
      learningPathType: "linear", graphId: "information_theory", startTopic: { topicId: "t_infotheory_basics", name: "Entropy and Information Measures", concepts: [] },
      targetConceptId: null, nextTopic: null,
    } });
    expect(result.course.title).toBe("Information Theory and Entropy");
    expect(result.course.lessons).toHaveLength(5);
    expect(result.course.summary).toBe("A personalized learning path for Information Theory and Entropy.");
  });

  it.each(["en", "zh-CN"])("localizes canonical and goal-scoped summaries for %s and preserves explicit summaries", async (language) => {
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");
    const chinese = language.startsWith("zh");
    const input = { ownerId: "u1", topic: "Information Theory and Entropy", language, kgContext: {
      learningPathType: "linear" as const, graphId: "information_theory", startTopic: { topicId: "t_infotheory_basics", name: "Entropy and Information Measures", concepts: [] }, targetConceptId: null, nextTopic: null,
    } };
    const canonical = await initializeCourseOutline(input);
    expect(canonical.course.summary).toBe(chinese ? "Information Theory and Entropy的个性化学习路径" : "A personalized learning path for Information Theory and Entropy.");
    const scoped = await initializeCourseOutline({ ...input, kgContext: { ...input.kgContext, learningGoal: chinese ? "理解信息熵" : "understand entropy", scope: "goal" } });
    expect(scoped.course.summary).toBe(chinese ? "Information Theory and Entropy：围绕「理解信息熵」的定制学习路径" : 'Information Theory and Entropy: a learning path focused on "understand entropy".');
    const explicit = await initializeCourseOutline({ ...input, summary: "An author-provided summary." });
    expect(explicit.course.summary).toBe("An author-provided summary.");
  });
});
