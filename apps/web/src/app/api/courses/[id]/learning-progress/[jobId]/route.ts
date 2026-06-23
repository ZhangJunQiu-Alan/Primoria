import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
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
    const denied = await requireAuth();
    if (denied) return denied;
    const ownerId = (await getCurrentUser())?.id;
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

    if (decision.kind === "goal_reached") {
      return NextResponse.json({ status: "accepted", kind: "goal_reached" }, { status: 200 });
    }

    if (decision.kind === "next") {
      const course = await getCourse(courseId, ownerId);
      const target = course?.lessons.find((l) => l.topicId === decision.targetTopicId && l.status !== "generated");
      if (!target) return NextResponse.json({ error: "Next lesson not found in outline" }, { status: 404 });
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
      role: "remediation",
      sortKey: decision.proposedSortKey ?? resolved.updatedAt,
      triggeredFrom: resolved.lessonId,
    });
    const result = await enqueueLessonGenerationJob({ ownerId, courseId, lessonId: lesson.id });
    const job = "job" in result && result.job ? toLessonGenerationJobSummary(result.job) : null;
    return NextResponse.json({ status: "accepted", kind: "remediation", lessonId: lesson.id, job }, { status: 202 });
  } catch (error) {
    console.error("[course/learning-progress/confirm]", error);
    const message = error instanceof Error ? error.message : "Failed to resolve recommendation";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
