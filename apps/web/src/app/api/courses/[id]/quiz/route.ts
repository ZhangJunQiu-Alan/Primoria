import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { toSafeAuthError } from "@/lib/auth/errors";
import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { quizAttempts } from "@/lib/db/schema";
import { getCourse, markLessonProgress } from "@/lib/courses/store";
import { enqueueLearningProgressJob } from "@/lib/courses/learning-progress-jobs";
import { enqueueExtractorJob } from "@/lib/courses/extractor-jobs";
import type { QuizQuestion } from "@/lib/courses/types";
import { recordLearningEvent, type QuizSelected } from "@/lib/learning-events/store";
import { applyQuizProgression, currentRewardSnapshot } from "@/lib/gamification/store";
import { getUserPreferences } from "@/lib/settings/user-settings";

const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("single"), questionId: z.string(), selectedId: z.string() }),
  z.object({ kind: z.literal("multi"), questionId: z.string(), selectedIds: z.array(z.string()) }),
  z.object({ kind: z.literal("truefalse"), questionId: z.string(), selected: z.boolean() }),
]);

// score/total are computed server-side from the course's quiz block — the
// client never supplies them (a client-sent score would be unverifiable).
const RequestSchema = z.object({
  blockId: z.string(),
  submissionId: z.string().uuid(),
  answers: z.array(AnswerSchema),
});

type SubmittedAnswer = z.infer<typeof AnswerSchema>;

function randomId() {
  return `qa_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function answerFingerprint(answers: SubmittedAnswer[]) {
  return JSON.stringify(
    answers
      .map((answer) => answer.kind === "multi" ? { ...answer, selectedIds: [...answer.selectedIds].sort() } : answer)
      .sort((left, right) => left.questionId.localeCompare(right.questionId)),
  );
}

function gradeAnswer(question: QuizQuestion, answer: SubmittedAnswer): { selected: QuizSelected | null; isCorrect: boolean } {
  if (question.kind === "single" && answer.kind === "single") {
    return { selected: answer.selectedId, isCorrect: answer.selectedId === question.correctId };
  }
  if (question.kind === "multi" && answer.kind === "multi") {
    const got = [...answer.selectedIds].sort();
    const want = [...question.correctIds].sort();
    const isCorrect = got.length === want.length && got.every((v, i) => v === want[i]);
    return { selected: answer.selectedIds, isCorrect };
  }
  if (question.kind === "truefalse" && answer.kind === "truefalse") {
    return { selected: answer.selected, isCorrect: answer.selected === question.correct };
  }
  return { selected: null, isCorrect: false };
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: courseId } = await context.params;
    const body = RequestSchema.parse(await request.json());

    if (!hasDatabaseUrl()) {
      return NextResponse.json({ ok: true, persisted: false });
    }

    const { denied, user } = await requireConfiguredAuthUser("courses-quiz");
    if (denied) return denied;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Resolve the quiz block from the owner's course. An attempt is only valid
    // against a real quiz block — unknown course/block never writes anything.
    const [course, preferences] = await Promise.all([
      getCourse(courseId, user.id),
      getUserPreferences(user.id),
    ]);
    if (!course) {
      return NextResponse.json({ error: "Course not found.", code: "not_found" }, { status: 404 });
    }
    const lesson = course.lessons.find((l) => l.blocks?.some((b) => b.id === body.blockId));
    const block = lesson?.blocks?.find((b) => b.id === body.blockId);
    if (!lesson || !block || block.type !== "quiz") {
      return NextResponse.json({ error: "Quiz block not found.", code: "not_found" }, { status: 404 });
    }
    const lessonId = lesson.id;
    const questions = block.questions;
    if (questions.length === 0) {
      return NextResponse.json({ error: "Quiz block has no questions.", code: "invalid_request" }, { status: 400 });
    }

    // Every submitted answer must target a distinct, existing question.
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const seen = new Set<string>();
    for (const answer of body.answers) {
      if (!questionById.has(answer.questionId) || seen.has(answer.questionId)) {
        return NextResponse.json({ error: "Unknown or duplicate quiz question.", code: "invalid_request" }, { status: 400 });
      }
      seen.add(answer.questionId);
    }

    // Server-authoritative grading: score/total derive from the block's
    // questions; unanswered questions count as incorrect.
    const graded = body.answers.map((answer) => ({
      answer,
      ...gradeAnswer(questionById.get(answer.questionId)!, answer),
    }));
    const score = graded.filter((g) => g.isCorrect).length;
    const total = questions.length;

    const attemptId = randomId();
    const now = new Date();

    // One transaction: attempt row, per-question evidence, implicit lesson
    // completion, and the progress-job enqueue commit or roll back together —
    // the worker can never observe an attempt without its evidence, or a
    // completed lesson without its job.
    const result = await getDb().transaction(async (tx) => {
      const [inserted] = await tx
        .insert(quizAttempts)
        .values({
          id: attemptId,
          ownerId: user.id,
          courseId,
          lessonId,
          blockId: body.blockId,
          submissionId: body.submissionId,
          answers: body.answers,
          score,
          total,
          createdAt: now,
        })
        .onConflictDoNothing({
          target: [quizAttempts.ownerId, quizAttempts.blockId, quizAttempts.submissionId],
        })
        .returning({ id: quizAttempts.id });

      if (!inserted) {
        const [existing] = await tx
          .select({
            id: quizAttempts.id,
            answers: quizAttempts.answers,
            score: quizAttempts.score,
            total: quizAttempts.total,
          })
          .from(quizAttempts)
          .where(and(
            eq(quizAttempts.ownerId, user.id),
            eq(quizAttempts.blockId, body.blockId),
            eq(quizAttempts.submissionId, body.submissionId),
          ));
        if (!existing) throw new Error("Idempotent quiz attempt could not be loaded.");
        const existingAnswers = z.array(AnswerSchema).safeParse(existing.answers);
        if (!existingAnswers.success || answerFingerprint(existingAnswers.data) !== answerFingerprint(body.answers)) {
          return { kind: "conflict" as const };
        }
        return {
          kind: "replayed" as const,
          attemptId: existing.id,
          score: existing.score,
          total: existing.total,
          rewards: await currentRewardSnapshot(user.id, tx),
        };
      }

      // One learning_event per question so each row's concept attribution stays
      // clean (concept_id left null until quiz questions carry concept tags).
      for (const { answer, selected, isCorrect } of graded) {
        const question = questionById.get(answer.questionId)!;
        await recordLearningEvent(
          {
            type: "quiz.submit",
            ownerId: user.id,
            id: `${attemptId}__${answer.questionId}`,
            courseId,
            lessonId,
            blockId: body.blockId,
            conceptId: question.conceptId ?? null,
            questionId: answer.questionId,
            selected,
            isCorrect,
          },
          tx,
        );
      }

      // Implicit lesson completion: once every end-of-lesson quiz block has an
      // attempt, record lesson.completed (deduped by deterministic id) and
      // enqueue the learning-progress orchestration job (idempotent on lessonId).
      const quizBlockIds = (lesson.blocks ?? []).filter((b) => b.type === "quiz").map((b) => b.id);
      const attempted = await tx
        .selectDistinct({ blockId: quizAttempts.blockId })
        .from(quizAttempts)
        .where(and(eq(quizAttempts.ownerId, user.id), eq(quizAttempts.lessonId, lessonId)));
      const answered = new Set(attempted.map((row) => row.blockId));
      const complete = quizBlockIds.every((blockId) => answered.has(blockId));
      const lessonCompleted = complete && lesson.progress !== "completed";
      if (complete) {
        // Advance the resume pointer: a completed lesson is no longer the
        // course's first non-completed lesson, so Continue moves to the next.
        await markLessonProgress(courseId, lessonId, user.id, "completed", tx);
        await recordLearningEvent(
          {
            type: "lesson.completed",
            ownerId: user.id,
            id: `lesson_completed_${lessonId}`,
            courseId,
            lessonId,
            graphId: course.graphId ?? null,
          },
          tx,
        );
        await enqueueLearningProgressJob(
          {
            ownerId: user.id,
            courseId,
            lessonId,
            graphId: course.graphId ?? null,
          },
          tx,
        );
        await enqueueExtractorJob(
          {
            ownerId: user.id,
            courseId,
            lessonId,
            graphId: course.graphId ?? null,
          },
          tx,
        );
      }
      const rewards = await applyQuizProgression(tx, {
        ownerId: user.id,
        attemptId,
        blockId: body.blockId,
        score,
        total,
        questionIds: graded.map(({ answer }) => answer.questionId),
        conceptIds: graded.map(({ answer }) => questionById.get(answer.questionId)?.conceptId ?? null),
        lessonId,
        lessonRole: lesson.role ?? "new",
        lessonCompleted,
        courseId,
        timeZone: preferences.timeZone,
        now,
      });
      return { kind: "created" as const, attemptId, score, total, lessonCompleted, rewards };
    });

    if (result.kind === "conflict") {
      return NextResponse.json(
        { error: "Submission ID was already used for different answers.", code: "idempotency_conflict" },
        { status: 409 },
      );
    }

    if (result.kind === "replayed") {
      return NextResponse.json({
        ok: true,
        persisted: true,
        attemptId: result.attemptId,
        score: result.score,
        total: result.total,
        deduplicated: true,
        rewards: result.rewards,
      });
    }

    return NextResponse.json({
      ok: true,
      persisted: true,
      attemptId: result.attemptId,
      score,
      total,
      deduplicated: false,
      rewards: result.rewards,
    });
  } catch (error) {
    const safe = toSafeAuthError(error, "courses-quiz", "Failed to save quiz attempt.");
    return NextResponse.json(safe.body, { status: safe.status });
  }
}
