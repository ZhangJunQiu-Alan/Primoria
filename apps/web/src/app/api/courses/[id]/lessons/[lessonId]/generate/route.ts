import { NextResponse } from "next/server";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { requireAuthUser } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

// Lazy lesson enqueue / manual retry (engineering doc §12.2). Idempotent: returns
// the existing queued/running job, manually retries a failed job, or reports an
// already-generated lesson. The model never runs in this route; no settings.
export async function POST(_request: Request, context: { params: Promise<{ id: string; lessonId: string }> }) {
  try {
    const { denied, user } = await requireAuthUser();
    if (denied) return denied;
    const ownerId = user?.id;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, lessonId } = await context.params;
    const result = await enqueueLessonGenerationJob({ ownerId, courseId: id, lessonId });

    if (result.kind === "already_generated") {
      return NextResponse.json(
        { status: "completed", job: result.job ? toLessonGenerationJobSummary(result.job) : null },
        { status: 200 },
      );
    }
    return NextResponse.json({ status: result.kind, job: toLessonGenerationJobSummary(result.job) }, { status: 202 });
  } catch (error) {
    console.error("[course/lesson/generate]", error);
    const message = error instanceof Error ? error.message : "Lesson generation failed";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
