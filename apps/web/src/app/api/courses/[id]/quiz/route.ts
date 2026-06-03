import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, hasDatabaseUrl } from "@/lib/db/client";
import { quizAttempts } from "@/lib/db/schema";

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

function randomId() {
  return `qa_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
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
    await db.insert(quizAttempts).values({
      id: randomId(),
      ownerId: user.id,
      courseId,
      blockId: body.blockId,
      answers: body.answers,
      score: body.score,
      total: body.total,
    });

    return NextResponse.json({ ok: true, persisted: true });
  } catch (error) {
    console.error("[courses/quiz]", error);
    const message = error instanceof Error ? error.message : "Failed to save quiz attempt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
