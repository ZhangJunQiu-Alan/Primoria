import { beforeEach, describe, expect, it, vi } from "vitest";

const routeState = vi.hoisted(() => ({
  requireConfiguredAuthUser: vi.fn(),
  getCourse: vi.fn(),
  markLessonProgress: vi.fn(),
  recordLearningEvent: vi.fn(),
  enqueueLearningProgressJob: vi.fn(),
  enqueueExtractorJob: vi.fn(),
  getDb: vi.fn(),
  hasDatabaseUrl: vi.fn(() => true),
}));

vi.mock("@/lib/auth/guard", () => ({
  requireConfiguredAuthUser: routeState.requireConfiguredAuthUser,
}));

vi.mock("@/lib/db/client", () => ({
  getDb: routeState.getDb,
  hasDatabaseUrl: routeState.hasDatabaseUrl,
}));

vi.mock("@/lib/courses/store", () => ({
  getCourse: routeState.getCourse,
  markLessonProgress: routeState.markLessonProgress,
}));

vi.mock("@/lib/learning-events/store", () => ({
  recordLearningEvent: routeState.recordLearningEvent,
}));

vi.mock("@/lib/courses/learning-progress-jobs", () => ({
  enqueueLearningProgressJob: routeState.enqueueLearningProgressJob,
}));

vi.mock("@/lib/courses/extractor-jobs", () => ({
  enqueueExtractorJob: routeState.enqueueExtractorJob,
}));

type TxOptions = {
  attemptedBlockIds?: string[];
  insertError?: Error;
  existingAttempt?: {
    id: string;
    answers: unknown;
    score: number;
    total: number;
  };
};

function makeTx(opts: TxOptions = {}) {
  const inserted: Array<Record<string, unknown>> = [];
  const tx = {
    insert: () => ({
      values: (row: Record<string, unknown>) => {
        const created = !opts.existingAttempt;
        if (created) inserted.push(row);
        return {
          onConflictDoNothing: () => ({
            returning: async () => {
              if (opts.insertError) throw opts.insertError;
              return created ? [{ id: row.id }] : [];
            },
          }),
        };
      },
    }),
    select: () => ({
      from: () => ({
        where: async () => opts.existingAttempt ? [opts.existingAttempt] : [],
      }),
    }),
    selectDistinct: () => ({
      from: () => ({
        where: async () => (opts.attemptedBlockIds ?? []).map((blockId) => ({ blockId })),
      }),
    }),
  };
  return { tx, inserted };
}

function installDb(opts: TxOptions = {}) {
  const { tx, inserted } = makeTx(opts);
  const transaction = vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(tx));
  routeState.getDb.mockReturnValue({ transaction });
  return { tx, inserted, transaction };
}

const courseFixture = {
  id: "c1",
  graphId: "g1",
  lessons: [
    {
      id: "l1",
      blocks: [
        {
          id: "b1",
          type: "quiz",
          questions: [
            { id: "q1", kind: "single", prompt: "?", options: [], correctId: "a" },
            { id: "q2", kind: "truefalse", prompt: "?", correct: true },
          ],
        },
        { id: "b2", type: "quiz", questions: [{ id: "q3", kind: "single", prompt: "?", options: [], correctId: "x" }] },
      ],
    },
  ],
};

const SUBMISSION_ID = "00000000-0000-4000-8000-000000000001";

function quizRequest(body: unknown) {
  return new Request("http://localhost/api/courses/c1/quiz", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function postQuiz(body: unknown) {
  const { POST } = await import("../src/app/api/courses/[id]/quiz/route");
  const requestBody = body && typeof body === "object" && !("submissionId" in body)
    ? { ...body, submissionId: SUBMISSION_ID }
    : body;
  return POST(quizRequest(requestBody), { params: Promise.resolve({ id: "c1" }) });
}

describe("quiz route server-authoritative grading", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    routeState.hasDatabaseUrl.mockReturnValue(true);
    routeState.requireConfiguredAuthUser.mockResolvedValue({ denied: null, user: { id: "u1" } });
    routeState.getCourse.mockResolvedValue(courseFixture);
    routeState.recordLearningEvent.mockResolvedValue(undefined);
    routeState.enqueueLearningProgressJob.mockResolvedValue({ kind: "queued", job: {} });
    routeState.enqueueExtractorJob.mockResolvedValue({ kind: "queued", job: {} });
  });

  it("recomputes score server-side and ignores client-sent score/total", async () => {
    const { inserted } = installDb({ attemptedBlockIds: ["b1"] }); // b2 unattempted → no completion

    const response = await postQuiz({
      blockId: "b1",
      answers: [
        { kind: "single", questionId: "q1", selectedId: "a" }, // correct
        { kind: "truefalse", questionId: "q2", selected: false }, // wrong
      ],
      score: 999,
      total: 1,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, persisted: true, score: 1, total: 2 });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ blockId: "b1", submissionId: SUBMISSION_ID, score: 1, total: 2, ownerId: "u1" });
    // Per-question evidence carries server-side grading.
    const events = routeState.recordLearningEvent.mock.calls.map(([event]) => event);
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: "quiz.submit", questionId: "q1", isCorrect: true });
    expect(events[1]).toMatchObject({ type: "quiz.submit", questionId: "q2", isCorrect: false });
    expect(routeState.markLessonProgress).not.toHaveBeenCalled();
    expect(routeState.enqueueLearningProgressJob).not.toHaveBeenCalled();
  });

  it("rejects an unknown block with 404 and never opens a transaction", async () => {
    const { transaction } = installDb();

    const response = await postQuiz({ blockId: "nope", answers: [] });

    expect(response.status).toBe(404);
    expect(transaction).not.toHaveBeenCalled();
    expect(routeState.recordLearningEvent).not.toHaveBeenCalled();
  });

  it("rejects unknown or duplicate questions with 400 before writing", async () => {
    const { transaction } = installDb();

    const unknown = await postQuiz({
      blockId: "b1",
      answers: [{ kind: "single", questionId: "zz", selectedId: "a" }],
    });
    expect(unknown.status).toBe(400);

    const duplicate = await postQuiz({
      blockId: "b1",
      answers: [
        { kind: "single", questionId: "q1", selectedId: "a" },
        { kind: "single", questionId: "q1", selectedId: "b" },
      ],
    });
    expect(duplicate.status).toBe(400);
    expect(transaction).not.toHaveBeenCalled();
    expect(routeState.recordLearningEvent).not.toHaveBeenCalled();
  });

  it("fails the whole submission when evidence recording fails (no swallowed writes)", async () => {
    installDb({ attemptedBlockIds: ["b1", "b2"] });
    routeState.recordLearningEvent.mockRejectedValue(new Error("evidence write failed"));

    const response = await postQuiz({
      blockId: "b1",
      answers: [{ kind: "single", questionId: "q1", selectedId: "a" }],
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to save quiz attempt.", code: "internal_error" });
    expect(routeState.markLessonProgress).not.toHaveBeenCalled();
    expect(routeState.enqueueLearningProgressJob).not.toHaveBeenCalled();
    expect(routeState.enqueueExtractorJob).not.toHaveBeenCalled();
  });

  it("fails the whole submission when transactional extractor enqueue fails", async () => {
    const { tx } = installDb({ attemptedBlockIds: ["b1", "b2"] });
    routeState.enqueueExtractorJob.mockRejectedValue(new Error("extractor enqueue failed"));

    const response = await postQuiz({
      blockId: "b1",
      answers: [{ kind: "single", questionId: "q1", selectedId: "a" }],
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to save quiz attempt.", code: "internal_error" });
    expect(routeState.enqueueExtractorJob).toHaveBeenCalledWith(
      { ownerId: "u1", courseId: "c1", lessonId: "l1", graphId: "g1" },
      tx,
    );
  });

  it("returns the original result without writing evidence for a repeated submission", async () => {
    const answers = [{ kind: "single" as const, questionId: "q1", selectedId: "a" }];
    installDb({
      existingAttempt: { id: "qa_original", answers, score: 1, total: 2 },
    });

    const response = await postQuiz({ blockId: "b1", answers });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      attemptId: "qa_original",
      score: 1,
      total: 2,
      deduplicated: true,
    });
    expect(routeState.recordLearningEvent).not.toHaveBeenCalled();
    expect(routeState.markLessonProgress).not.toHaveBeenCalled();
    expect(routeState.enqueueLearningProgressJob).not.toHaveBeenCalled();
    expect(routeState.enqueueExtractorJob).not.toHaveBeenCalled();
  });

  it("rejects reuse of a submission id with different answers", async () => {
    installDb({
      existingAttempt: {
        id: "qa_original",
        answers: [{ kind: "single", questionId: "q1", selectedId: "b" }],
        score: 0,
        total: 2,
      },
    });

    const response = await postQuiz({
      blockId: "b1",
      answers: [{ kind: "single", questionId: "q1", selectedId: "a" }],
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "idempotency_conflict" });
    expect(routeState.recordLearningEvent).not.toHaveBeenCalled();
  });

  it("commits completion, lesson.completed and the progress job in the same transaction", async () => {
    const { tx } = installDb({ attemptedBlockIds: ["b1", "b2"] });

    const response = await postQuiz({
      blockId: "b2",
      answers: [{ kind: "single", questionId: "q3", selectedId: "x" }],
    });

    expect(response.status).toBe(200);
    expect(routeState.markLessonProgress).toHaveBeenCalledWith("c1", "l1", "u1", "completed", tx);
    const completionEvent = routeState.recordLearningEvent.mock.calls.find(([event]) => event.type === "lesson.completed");
    expect(completionEvent?.[0]).toMatchObject({ lessonId: "l1", id: "lesson_completed_l1" });
    expect(completionEvent?.[1]).toBe(tx);
    expect(routeState.enqueueLearningProgressJob).toHaveBeenCalledWith(
      { ownerId: "u1", courseId: "c1", lessonId: "l1", graphId: "g1" },
      tx,
    );
    expect(routeState.enqueueExtractorJob).toHaveBeenCalledWith(
      { ownerId: "u1", courseId: "c1", lessonId: "l1", graphId: "g1" },
      tx,
    );
  });
});

describe("recordLearningEvent transactional contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    routeState.hasDatabaseUrl.mockReturnValue(true);
  });

  it("swallows errors on the best-effort path but propagates them inside a transaction", async () => {
    vi.resetModules();
    vi.doUnmock("@/lib/learning-events/store");
    const { recordLearningEvent } = await import("../src/lib/learning-events/store");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const failingInsert = {
      insert: () => ({
        values: () => ({
          onConflictDoNothing: () => Promise.reject(new Error("insert failed")),
        }),
      }),
    };
    const event = {
      type: "lesson.completed" as const,
      ownerId: "u1",
      courseId: "c1",
      lessonId: "l1",
    };

    // Best-effort path (no handle): swallowed and logged.
    routeState.getDb.mockReturnValue(failingInsert);
    await expect(recordLearningEvent(event)).resolves.toBeUndefined();
    expect(consoleError).toHaveBeenCalled();

    // Transactional path: the caller must see the failure.
    await expect(
      recordLearningEvent(event, failingInsert as unknown as Parameters<typeof recordLearningEvent>[1]),
    ).rejects.toThrow("insert failed");
  });
});
