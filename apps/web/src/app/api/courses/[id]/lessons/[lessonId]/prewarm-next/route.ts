import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/guard";
import { getCourse } from "@/lib/courses/store";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

// Speculative preload of the immediately-next outline lesson while the learner
// studies the current one (feature_specification.md §28). Fired when a generated
// lesson opens. Only the single next lesson by sortKey is warmed; if the current
// lesson is the last in the outline there is nothing to preload (structural
// course-end, decided without quiz evidence) and we skip. enqueue is idempotent,
// so a repeat call returns the existing/already-generated job. This never bypasses
// the post-lesson confirm gate — it only warms the cache so accept is instant.
export async function POST(_request: Request, context: { params: Promise<{ id: string; lessonId: string }> }) {
  try {
    const { denied, user } = await requireAuthUser();
    if (denied) return denied;
    const ownerId = user?.id;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: courseId, lessonId } = await context.params;
    const course = await getCourse(courseId, ownerId);
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

    const sorted = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
    const currentIndex = sorted.findIndex((lesson) => lesson.id === lessonId);
    if (currentIndex < 0) return NextResponse.json({ error: "Lesson not found in course" }, { status: 404 });

    const next = sorted[currentIndex + 1];
    if (!next) return NextResponse.json({ status: "skipped", reason: "no_next_lesson" }, { status: 200 });
    if (next.status === "generated") {
      return NextResponse.json({ status: "skipped", reason: "already_generated", lessonId: next.id }, { status: 200 });
    }

    const result = await enqueueLessonGenerationJob({ ownerId, courseId, lessonId: next.id });
    const job = "job" in result && result.job ? toLessonGenerationJobSummary(result.job) : null;
    return NextResponse.json({ status: result.kind, lessonId: next.id, job }, { status: 202 });
  } catch (error) {
    console.error("[course/lesson/prewarm-next]", error);
    const message = error instanceof Error ? error.message : "Prewarm failed";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
