import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { quizAttempts } from "@/lib/db/schema";
import { getCourse, markLessonProgress } from "@/lib/courses/store";
import { enqueueLearningProgressJob } from "@/lib/courses/learning-progress-jobs";
import { enqueueExtractorJob } from "@/lib/courses/extractor-jobs";
import type { QuizQuestion } from "@/lib/courses/types";
import { recordLearningEvent, type QuizSelected } from "@/lib/learning-events/store";

const AnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("single"), questionId: z.string(), selectedId: z.string() }),
  z.object({ kind: z.literal("multi"), questionId: z.string(), selectedIds: z.array(z.string()) }),
  z.object({ kind: z.literal("truefalse"), questionId: z.string(), selected: z.boolean() }),
]);

const RequestSchema = z.object({
  blockId: z.string(),
  answers: z.array(AnswerSchema),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
});

type SubmittedAnswer = z.infer<typeof AnswerSchema>;

function randomId() {
  return `qa_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
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

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve the lesson owning this quiz block so the attempt and per-question
    // events can be aggregated per lesson during distillation.
    const course = await getCourse(courseId, user.id);
    const lesson = course?.lessons.find((l) => l.blocks?.some((b) => b.id === body.blockId));
    const lessonId = lesson?.id ?? null;
    const block = lesson?.blocks?.find((b) => b.id === body.blockId);
    const questions = block && block.type === "quiz" ? block.questions : [];

    const db = getDb();
    const attemptId = randomId();
    await db.insert(quizAttempts).values({
      id: attemptId,
      ownerId: user.id,
      courseId,
      lessonId,
      blockId: body.blockId,
      answers: body.answers,
      score: body.score,
      total: body.total,
    });

    // One learning_event per question so each row's concept attribution stays
    // clean (concept_id left null until quiz questions carry concept tags).
    for (const answer of body.answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (!question) continue;
      const { selected, isCorrect } = gradeAnswer(question, answer);
      await recordLearningEvent({
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
      });
    }

    // Implicit lesson completion: once every end-of-lesson quiz block has an
    // attempt, record lesson.completed (deduped by deterministic id) and enqueue
    // the learning-progress orchestration job (idempotent on lessonId).
    if (lessonId && lesson) {
      const quizBlockIds = (lesson.blocks ?? []).filter((b) => b.type === "quiz").map((b) => b.id);
      if (quizBlockIds.length > 0) {
        const attempted = await db
          .selectDistinct({ blockId: quizAttempts.blockId })
          .from(quizAttempts)
          .where(and(eq(quizAttempts.ownerId, user.id), eq(quizAttempts.lessonId, lessonId)));
        const answered = new Set(attempted.map((row) => row.blockId));
        const complete = quizBlockIds.every((blockId) => answered.has(blockId));
        if (complete) {
          // Advance the resume pointer: a completed lesson is no longer the
          // course's first non-completed lesson, so Continue moves to the next.
          await markLessonProgress(courseId, lessonId, user.id, "completed");
          await recordLearningEvent({
            type: "lesson.completed",
            ownerId: user.id,
            id: `lesson_completed_${lessonId}`,
            courseId,
            lessonId,
            graphId: course?.graphId ?? null,
          });
          await enqueueLearningProgressJob({
            ownerId: user.id,
            courseId,
            lessonId,
            graphId: course?.graphId ?? null,
          }).catch((error) => {
            console.error("[courses/quiz] failed to enqueue progress job", error);
          });
          // Independent best-effort: distill durable learner facts from this
          // lesson's activity. Never blocks the response or the progress job.
          await enqueueExtractorJob({
            ownerId: user.id,
            courseId,
            lessonId,
            graphId: course?.graphId ?? null,
          }).catch((error) => {
            console.error("[courses/quiz] failed to enqueue extractor job", error);
          });
        }
      }
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    console.error("[courses/quiz]", error);
    const message = error instanceof Error ? error.message : "Failed to save quiz attempt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
