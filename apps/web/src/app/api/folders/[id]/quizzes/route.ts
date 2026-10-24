import { NextResponse } from "next/server";
import { z } from "zod";

import { requireConfiguredAuthUser } from "@/lib/auth/guard";
import { FOLDER_QUIZ_SIZES } from "@/lib/materials/folder-quiz";
import { FolderQuizError, startFolderQuiz } from "@/lib/materials/folder-quiz-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  size: z.union([z.literal(FOLDER_QUIZ_SIZES[0]), z.literal(FOLDER_QUIZ_SIZES[1])]).default(FOLDER_QUIZ_SIZES[0]),
}).strict();

const ERROR_STATUS = { folder_not_found: 404, no_graph: 409, generation_failed: 503 } as const;

// Start a weakness-weighted multiple-choice quiz over the folder's whole KG
// (docs/product/subject-folders.md §4.5). Answers stay on the server.
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { denied, user } = await requireConfiguredAuthUser("folders");
  if (denied || !user) return denied ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Quiz size must be 10 or 20.", code: "invalid_request" }, { status: 400 });
  }

  try {
    const quiz = await startFolderQuiz({ ownerId: user.id, folderId: id, size: body.size });
    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    if (error instanceof FolderQuizError && error.code in ERROR_STATUS) {
      const code = error.code === "generation_failed" ? "quiz_generation_failed" : error.code;
      return NextResponse.json({ error: error.message, code }, { status: ERROR_STATUS[error.code as keyof typeof ERROR_STATUS] });
    }
    console.error("[folders] quiz start failed", error);
    return NextResponse.json({ error: "The quiz could not be started. Please retry." }, { status: 503 });
  }
}
