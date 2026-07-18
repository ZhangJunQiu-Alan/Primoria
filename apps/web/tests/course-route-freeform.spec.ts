import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockState = vi.hoisted(() => ({
  requireAuthUser: vi.fn(),
  getOrCreateGeneratedGraph: vi.fn(),
  initializeCourseOutline: vi.fn(),
  enqueueLessonGenerationJob: vi.fn(),
  toLessonGenerationJobSummary: vi.fn(),
  recordLearningEvent: vi.fn(),
}));

vi.mock("../src/lib/auth/guard", () => ({
  requireAuthUser: mockState.requireAuthUser,
}));

vi.mock("../src/lib/knowledge-graph/generated-graph", () => ({
  getOrCreateGeneratedGraph: mockState.getOrCreateGeneratedGraph,
}));

vi.mock("../src/lib/ai/deepagent/course-generator", () => ({
  initializeCourseOutline: mockState.initializeCourseOutline,
}));

vi.mock("../src/lib/courses/lesson-generation-jobs", () => ({
  enqueueLessonGenerationJob: mockState.enqueueLessonGenerationJob,
  toLessonGenerationJobSummary: mockState.toLessonGenerationJobSummary,
}));

vi.mock("../src/lib/learning-events/store", () => ({
  recordLearningEvent: mockState.recordLearningEvent,
}));

function request(body: unknown) {
  return new Request("http://primoria.test/api/learning/course", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("learning course route freeform topics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.requireAuthUser.mockResolvedValue({ denied: null, user: { id: "usr_1" } });
    mockState.initializeCourseOutline.mockResolvedValue({
      course: { id: "course_1" },
      firstLesson: { id: "lesson_1" },
      summary: { title: "MCP" },
      isNewCourse: true,
    });
    mockState.enqueueLessonGenerationJob.mockResolvedValue({
      kind: "queued",
      job: { id: "job_1" },
    });
    mockState.toLessonGenerationJobSummary.mockReturnValue({
      id: "job_1",
      courseId: "course_1",
      lessonId: "lesson_1",
      status: "queued",
      stage: "queued",
      attempts: 0,
      maxAttempts: 2,
      progressCompleted: 0,
      progressTotal: 1,
      lastError: null,
      createdAt: 1,
      updatedAt: 1,
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("stops instead of creating a freeform course when generated graph creation fails", async () => {
    mockState.getOrCreateGeneratedGraph.mockResolvedValue(null);
    const { POST } = await import("../src/app/api/learning/course/route");

    const response = await POST(request({ topic: "MCP 和 Agent 架构", language: "zh" }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error).toBe("Course creation failed. Please retry.");
    expect(mockState.getOrCreateGeneratedGraph).toHaveBeenCalledWith({
      topic: "MCP 和 Agent 架构",
      language: "zh",
    });
    expect(mockState.initializeCourseOutline).not.toHaveBeenCalled();
    expect(mockState.enqueueLessonGenerationJob).not.toHaveBeenCalled();
  });

  it("passes the generated graph into course initialization when graph creation succeeds", async () => {
    const graph = { graphId: "gen_mcp_agent_architecture_12345678", subject: "MCP Agent Architecture", topics: [] };
    mockState.getOrCreateGeneratedGraph.mockResolvedValue({ graph, created: true });
    const { POST } = await import("../src/app/api/learning/course/route");

    const response = await POST(request({ topic: "MCP 和 Agent 架构" }));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ courseId: "course_1", lessonId: "lesson_1" });
    expect(mockState.initializeCourseOutline).toHaveBeenCalledWith({
      ownerId: "usr_1",
      topic: "MCP 和 Agent 架构",
      source: "cold_start",
      language: null,
      generatedGraph: graph,
    });
    expect(mockState.enqueueLessonGenerationJob).toHaveBeenCalledWith({
      ownerId: "usr_1",
      courseId: "course_1",
      lessonId: "lesson_1",
    });
  });

  it("validates and forwards a goal-scoped curated concept set", async () => {
    const learningGoal = "我想要学习面向深度学习的线性代数";
    const targetConceptIds = ["c_mit1806_matrix_ops", "c_mit1806_linear_transformations"];
    const { POST } = await import("../src/app/api/learning/course/route");

    const response = await POST(
      request({
        graphId: "linear_algebra",
        startTopicId: "t_mit1806_linear_equations_mit1806_matrix_ops",
        targetConceptId: targetConceptIds[0],
        targetConceptIds,
        scope: "goal",
        learningGoal,
        language: "zh",
      }),
    );

    expect(response.status).toBe(202);
    expect(mockState.initializeCourseOutline).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: "usr_1",
        topic: learningGoal,
        language: "zh",
        kgContext: expect.objectContaining({
          graphId: "linear_algebra",
          scope: "goal",
          learningGoal,
          targetConceptIds,
        }),
      }),
    );
  });
});
