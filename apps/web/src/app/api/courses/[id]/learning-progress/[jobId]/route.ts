import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/auth/guard";
import { getCourse, insertPlannedLesson } from "@/lib/courses/store";
import { resolveLearningProgressDecision } from "@/lib/courses/learning-progress-jobs";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({ action: z.enum(["accept", "dismiss"]) });

// Confirm or dismiss a learning-progress recommendation. On accept we materialize
// the user's choice through the unified Lesson Job system: enqueue the next outline
// lesson, or create + enqueue a same-graph remediation lesson. The user is always
// in control — nothing is generated until they confirm here.
export async function POST(request: Request, context: { params: Promise<{ id: string; jobId: string }> }) {
  try {
    const { denied, user } = await requireAuthUser();
    if (denied) return denied;
    const ownerId = user?.id;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: courseId, jobId } = await context.params;
    const { action } = RequestSchema.parse(await request.json());

    const resolved = await resolveLearningProgressDecision(jobId, ownerId, action === "accept" ? "accepted" : "dismissed");
    if (!resolved) {
      // Not found, not owned, or no longer pending (already resolved).
      return NextResponse.json({ error: "Recommendation not found or already resolved" }, { status: 404 });
    }

    if (action === "dismiss") {
      return NextResponse.json({ status: "dismissed" }, { status: 200 });
    }

    const decision = resolved.decision;
    if (!decision) return NextResponse.json({ status: "accepted" }, { status: 200 });

    if (decision.kind === "course_complete") {
      return NextResponse.json({ status: "accepted", kind: "course_complete" }, { status: 200 });
    }

    if (decision.kind === "next") {
      const course = await getCourse(courseId, ownerId);
      // The next outline lesson may already be generated — preload warms it while
      // the learner studies the current lesson — so match on topic regardless of
      // status and treat an already-generated target as success (no re-enqueue).
      const target = [...(course?.lessons ?? [])]
        .sort((a, b) => a.sortKey - b.sortKey)
        .find((l) => l.topicId === decision.targetTopicId);
      if (!target) return NextResponse.json({ error: "Next lesson not found in outline" }, { status: 404 });
      if (target.status === "generated") {
        return NextResponse.json({ status: "accepted", kind: "next", lessonId: target.id, job: null }, { status: 200 });
      }
      const result = await enqueueLessonGenerationJob({ ownerId, courseId, lessonId: target.id });
      const job = "job" in result && result.job ? toLessonGenerationJobSummary(result.job) : null;
      return NextResponse.json({ status: "accepted", kind: "next", lessonId: target.id, job }, { status: 202 });
    }

    // remediation
    const lesson = await insertPlannedLesson({
      id: `rem_${jobId}`,
      courseId,
      ownerId,
      topicId: decision.targetTopicId,
      title: decision.proposedTitle ?? "补救练习",
      description: decision.reason ? `针对前一节练习结果补强：${decision.reason}` : "针对前一节练习暴露的问题补强关键概念。",
      role: "remediation",
      sortKey: decision.proposedSortKey ?? resolved.updatedAt,
      triggeredFrom: resolved.lessonId,
    });
    const result = await enqueueLessonGenerationJob({ ownerId, courseId, lessonId: lesson.id });
    const job = "job" in result && result.job ? toLessonGenerationJobSummary(result.job) : null;
    return NextResponse.json({ status: "accepted", kind: "remediation", lessonId: lesson.id, job }, { status: 202 });
  } catch (error) {
    console.error("[course/learning-progress/confirm]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid recommendation action", code: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to resolve recommendation. Please retry." }, { status: 500 });
  }
}
