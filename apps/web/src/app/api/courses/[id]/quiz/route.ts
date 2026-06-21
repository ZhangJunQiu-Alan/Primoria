import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { quizAttempts } from "@/lib/db/schema";
import { getCourse } from "@/lib/courses/store";
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

    const db = getDb();
    const attemptId = randomId();
    await db.insert(quizAttempts).values({
      id: attemptId,
      ownerId: user.id,
      courseId,
      blockId: body.blockId,
      answers: body.answers,
      score: body.score,
      total: body.total,
    });

    // One learning_event per question so each row's concept attribution stays
    // clean (concept_id left null until quiz questions carry concept tags).
    const course = await getCourse(courseId, user.id);
    const block = course?.blocks.find((b) => b.id === body.blockId);
    const questions = block && block.type === "quiz" ? block.questions : [];
    for (const answer of body.answers) {
      const question = questions.find((q) => q.id === answer.questionId);
      if (!question) continue;
      const { selected, isCorrect } = gradeAnswer(question, answer);
      await recordLearningEvent({
        type: "quiz.submit",
        ownerId: user.id,
        id: `${attemptId}__${answer.questionId}`,
        courseId,
        blockId: body.blockId,
        questionId: answer.questionId,
        selected,
        isCorrect,
      });
    }

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    console.error("[courses/quiz]", error);
    const message = error instanceof Error ? error.message : "Failed to save quiz attempt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
