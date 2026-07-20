import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  requireAuthUser: vi.fn(),
  getLearningProgressJob: vi.fn(),
  resolveLearningProgressDecision: vi.fn(),
  getCourse: vi.fn(),
  insertPlannedLesson: vi.fn(),
  enqueueLessonGenerationJob: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({ requireAuthUser: state.requireAuthUser }));
vi.mock("@/lib/db/client", () => ({ getDb: () => ({ transaction: state.transaction }) }));
vi.mock("@/lib/courses/store", () => ({ getCourse: state.getCourse, insertPlannedLesson: state.insertPlannedLesson }));
vi.mock("@/lib/courses/learning-progress-jobs", () => ({
  getLearningProgressJob: state.getLearningProgressJob,
  resolveLearningProgressDecision: state.resolveLearningProgressDecision,
}));
vi.mock("@/lib/courses/lesson-generation-jobs", () => ({
  enqueueLessonGenerationJob: state.enqueueLessonGenerationJob,
  toLessonGenerationJobSummary: (job: unknown) => job,
}));

function request(action: "accept" | "dismiss" = "accept") {
  return new Request("http://localhost/api/courses/c1/learning-progress/j1", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action }),
  });
}

async function post(action: "accept" | "dismiss" = "accept") {
  const { POST } = await import("../src/app/api/courses/[id]/learning-progress/[jobId]/route");
  return POST(request(action), { params: Promise.resolve({ id: "c1", jobId: "j1" }) });
}

const lessons = [
  { id: "l1", topicId: "topic-a", sortKey: 1, status: "generated" },
  { id: "l2", topicId: "topic-a", sortKey: 2, status: "planned" },
  { id: "l3", topicId: "topic-b", sortKey: 3, status: "planned" },
];

describe("learning-progress resolution route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    state.requireAuthUser.mockResolvedValue({ denied: null, user: { id: "u1" } });
    state.transaction.mockImplementation(async (run: (tx: object) => Promise<unknown>) => run({ tx: true }));
    state.getCourse.mockResolvedValue({ id: "c1", lessons });
    state.resolveLearningProgressDecision.mockResolvedValue({ id: "j1", lessonId: "l1", updatedAt: 10 });
    state.enqueueLessonGenerationJob.mockResolvedValue({ kind: "queued", job: { id: "lesson-job" } });
  });

  it("materializes the exact target lesson inside the same transaction as acceptance", async () => {
    state.getLearningProgressJob.mockResolvedValue({
      id: "j1",
      lessonId: "l1",
      decisionStatus: "pending",
      decision: {
        kind: "next",
        reason: "next",
        targetLessonId: "l2",
        targetTopicId: "topic-b",
        targetConceptId: null,
        proposedSortKey: null,
        proposedTitle: null,
        nextLessonTitle: "Second bundle",
      },
    });

    const response = await post();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ lessonId: "l2" });
    expect(state.resolveLearningProgressDecision).toHaveBeenCalledWith("j1", "u1", "accepted", expect.anything());
    expect(state.enqueueLessonGenerationJob).toHaveBeenCalledWith(
      { ownerId: "u1", courseId: "c1", lessonId: "l2" },
      expect.anything(),
    );
  });

  it("uses the immediate next lesson for a legacy decision without targetLessonId", async () => {
    state.getLearningProgressJob.mockResolvedValue({
      id: "j1",
      lessonId: "l1",
      decisionStatus: "pending",
      decision: {
        kind: "next",
        reason: "legacy",
        targetTopicId: "topic-b",
        targetConceptId: null,
        proposedSortKey: null,
        proposedTitle: null,
        nextLessonTitle: "Old title",
      },
    });

    const response = await post();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({ lessonId: "l2" });
  });

  it("does not accept a recommendation when its target is missing", async () => {
    state.getLearningProgressJob.mockResolvedValue({
      id: "j1",
      lessonId: "l1",
      decisionStatus: "pending",
      decision: {
        kind: "next",
        reason: "missing",
        targetLessonId: "missing",
        targetTopicId: null,
        targetConceptId: null,
        proposedSortKey: null,
        proposedTitle: null,
        nextLessonTitle: "Missing",
      },
    });

    const response = await post();
    expect(response.status).toBe(404);
    expect(state.resolveLearningProgressDecision).not.toHaveBeenCalled();
    expect(state.enqueueLessonGenerationJob).not.toHaveBeenCalled();
  });
});
