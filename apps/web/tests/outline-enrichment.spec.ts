import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Concept-frontier outlines name each lesson from a concept-name template. After
// a new course is created, one best-effort background LLM call rewrites each
// lesson's title AND description. Failures keep the templates; the per-lesson
// UPDATE is fenced on both the title and description read at enrich time.

const mockState = vi.hoisted(() => ({
  getCourse: vi.fn(),
  getCourseByScopeKey: vi.fn(),
  saveCourse: vi.fn(),
  updateLessonTitleAndDescriptionIfUnchanged: vi.fn(),
  invokeJson: vi.fn(),
  afterCallbacks: [] as Array<() => unknown>,
}));

vi.mock("@/lib/courses/store", () => ({
  getCourse: mockState.getCourse,
  getCourseByScopeKey: mockState.getCourseByScopeKey,
  saveCourse: mockState.saveCourse,
  updateLessonTitleAndDescriptionIfUnchanged: mockState.updateLessonTitleAndDescriptionIfUnchanged,
}));

vi.mock("@/lib/ai/course-generation/model-json", () => ({
  invokeJson: mockState.invokeJson,
}));

vi.mock("next/server", () => ({
  after: (callback: () => unknown) => {
    mockState.afterCallbacks.push(callback);
  },
}));

function course(lessonCount = 2) {
  return {
    id: "crs_1",
    topic: "Python Fundamentals",
    language: "en",
    lessons: Array.from({ length: lessonCount }, (_, index) => ({
      id: `lsn_${index + 1}`,
      title: `Lesson ${index + 1}`,
      description: `A planned lesson covering the core ideas, examples, and practice for Lesson ${index + 1}.`,
      sortKey: index + 1,
    })),
  };
}

describe("enrichCourseOutlineDescriptions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PRIMORIA_DISABLE_OUTLINE_ENRICHMENT;
    mockState.getCourse.mockResolvedValue(course());
    mockState.updateLessonTitleAndDescriptionIfUnchanged.mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("applies model title + description through the fenced per-lesson update", async () => {
    mockState.invokeJson.mockResolvedValue({
      items: [
        { order: 1, title: "Running Python", description: "Understand how Python runs a program." },
        { order: 2, title: "Values and Variables", description: "Use variables and types to model data." },
      ],
    });
    const { enrichCourseOutlineDescriptions } = await import("../src/lib/ai/course-generation/outline-enrichment");

    await enrichCourseOutlineDescriptions({ courseId: "crs_1", ownerId: "u1" });

    expect(mockState.updateLessonTitleAndDescriptionIfUnchanged).toHaveBeenCalledTimes(2);
    expect(mockState.updateLessonTitleAndDescriptionIfUnchanged).toHaveBeenCalledWith({
      lessonId: "lsn_1",
      courseId: "crs_1",
      ownerId: "u1",
      expectedTitle: "Lesson 1",
      title: "Running Python",
      expectedDescription: "A planned lesson covering the core ideas, examples, and practice for Lesson 1.",
      description: "Understand how Python runs a program.",
    });
  });

  it("skips out-of-range orders and lessons unchanged from the template", async () => {
    mockState.invokeJson.mockResolvedValue({
      items: [
        { order: 99, title: "Dangling", description: "Dangling item." },
        {
          order: 1,
          title: "Lesson 1",
          description: "A planned lesson covering the core ideas, examples, and practice for Lesson 1.",
        },
        { order: 2, title: "Values and Variables", description: "Use variables and types to model data." },
      ],
    });
    const { enrichCourseOutlineDescriptions } = await import("../src/lib/ai/course-generation/outline-enrichment");

    await enrichCourseOutlineDescriptions({ courseId: "crs_1", ownerId: "u1" });

    expect(mockState.updateLessonTitleAndDescriptionIfUnchanged).toHaveBeenCalledTimes(1);
    expect(mockState.updateLessonTitleAndDescriptionIfUnchanged).toHaveBeenCalledWith(
      expect.objectContaining({ lessonId: "lsn_2" }),
    );
  });

  it("collapses whitespace and truncates a long description to 160 characters", async () => {
    mockState.invokeJson.mockResolvedValue({
      items: [{ order: 1, title: "Running Python", description: `Multi\n line   ${"x".repeat(300)}` }],
    });
    const { enrichCourseOutlineDescriptions } = await import("../src/lib/ai/course-generation/outline-enrichment");

    await enrichCourseOutlineDescriptions({ courseId: "crs_1", ownerId: "u1" });

    const written = mockState.updateLessonTitleAndDescriptionIfUnchanged.mock.calls[0][0].description as string;
    expect(written.length).toBeLessThanOrEqual(160);
    expect(written.startsWith("Multi line x")).toBe(true);
    expect(written.endsWith("…")).toBe(true);
  });

  it("swallows model failures and writes nothing", async () => {
    mockState.invokeJson.mockRejectedValue(new Error("model timed out"));
    const { enrichCourseOutlineDescriptions } = await import("../src/lib/ai/course-generation/outline-enrichment");

    await expect(enrichCourseOutlineDescriptions({ courseId: "crs_1", ownerId: "u1" })).resolves.toBeUndefined();

    expect(mockState.updateLessonTitleAndDescriptionIfUnchanged).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("ignores an unusable response shape", async () => {
    mockState.invokeJson.mockResolvedValue({ items: [{ order: "one", title: 5, description: 5 }] });
    const { enrichCourseOutlineDescriptions } = await import("../src/lib/ai/course-generation/outline-enrichment");

    await enrichCourseOutlineDescriptions({ courseId: "crs_1", ownerId: "u1" });

    expect(mockState.updateLessonTitleAndDescriptionIfUnchanged).not.toHaveBeenCalled();
  });

  it("is a no-op when the kill switch is set", async () => {
    process.env.PRIMORIA_DISABLE_OUTLINE_ENRICHMENT = "1";
    const { enrichCourseOutlineDescriptions } = await import("../src/lib/ai/course-generation/outline-enrichment");

    await enrichCourseOutlineDescriptions({ courseId: "crs_1", ownerId: "u1" });

    expect(mockState.getCourse).not.toHaveBeenCalled();
    expect(mockState.invokeJson).not.toHaveBeenCalled();
  });

  it("caps the prompt at 40 lessons and leaves the tail untouched", async () => {
    mockState.getCourse.mockResolvedValue(course(45));
    mockState.invokeJson.mockImplementation(async (args: { user: string }) => {
      expect(args.user).toContain("40. concepts: Lesson 40");
      expect(args.user).not.toContain("41. concepts: Lesson 41");
      return { items: [{ order: 41, title: "Ignored", description: "Should be ignored." }] };
    });
    const { enrichCourseOutlineDescriptions } = await import("../src/lib/ai/course-generation/outline-enrichment");

    await enrichCourseOutlineDescriptions({ courseId: "crs_1", ownerId: "u1" });

    expect(mockState.updateLessonTitleAndDescriptionIfUnchanged).not.toHaveBeenCalled();
  });
});

describe("initializeCourseOutline enrichment scheduling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.afterCallbacks.length = 0;
    delete process.env.PRIMORIA_DISABLE_OUTLINE_ENRICHMENT;
    mockState.saveCourse.mockImplementation(async (value: unknown) => value);
    mockState.getCourse.mockResolvedValue(course());
    mockState.invokeJson.mockResolvedValue({ items: [] });
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules one background enrichment for a new course", async () => {
    mockState.getCourseByScopeKey.mockResolvedValue(undefined);
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");

    const result = await initializeCourseOutline({ ownerId: "u1", topic: "Quantum Basics" });

    expect(result.isNewCourse).toBe(true);
    expect(mockState.afterCallbacks).toHaveLength(1);
    await mockState.afterCallbacks[0]();
    expect(mockState.getCourse).toHaveBeenCalledWith(result.course.id, "u1");
    expect(mockState.invokeJson).toHaveBeenCalledTimes(1);
  });

  it("does not schedule enrichment when the course is reused", async () => {
    mockState.getCourseByScopeKey.mockResolvedValue({
      ...course(),
      graphId: "python_fundamentals",
      lessons: [
        {
          id: "lsn_1",
          title: "Lesson 1",
          description: "existing",
          sortKey: 1,
          topicId: "pyf_topic_1",
        },
      ],
    });
    const { initializeCourseOutline } = await import("../src/lib/ai/deepagent/course-generator");

    const result = await initializeCourseOutline({
      ownerId: "u1",
      topic: "Python",
      kgContext: {
        learningPathType: "linear",
        graphId: "python_fundamentals",
        startTopic: { topicId: "pyf_topic_1", name: "Running Python" },
        targetConceptId: null,
        nextTopic: null,
      } as never,
    });

    expect(result.isNewCourse).toBe(false);
    expect(mockState.afterCallbacks).toHaveLength(0);
  });
});
