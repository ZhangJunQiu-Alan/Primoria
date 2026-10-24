import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { FolderQuizError, submitFolderQuiz } from "@/lib/materials/folder-quiz-store";

export const runtime = "nodejs";

const RequestSchema = z.object({
  submissionId: z.string().uuid(),
  answers: z.array(z.object({ questionId: z.string().min(1).max(64), selectedId: z.string().min(1).max(8) }).strict()).max(40),
}).strict();

const ERROR_STATUS = {
  session_not_found: 404,
  already_submitted: 409,
  idempotency_conflict: 409,
  invalid_answers: 400,
} as const;

// Grade a folder quiz server-side and apply the rolling-window mastery rule.
// Idempotent on submissionId: a retry with the same answers replays the result.
export async function POST(request: Request, context: { params: Promise<{ id: string; sessionId: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, sessionId } = await context.params;

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid quiz submission.", code: "invalid_request" }, { status: 400 });
  }

  try {
    const { replayed, ...outcome } = await submitFolderQuiz({ ownerId: user.id, folderId: id, sessionId, ...body });
    return NextResponse.json({ outcome, deduplicated: replayed });
  } catch (error) {
    if (error instanceof FolderQuizError && error.code in ERROR_STATUS) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: ERROR_STATUS[error.code as keyof typeof ERROR_STATUS] });
    }
    console.error("[folders] quiz submit failed", error);
    return NextResponse.json({ error: "The quiz could not be saved. Please retry." }, { status: 503 });
  }
}
