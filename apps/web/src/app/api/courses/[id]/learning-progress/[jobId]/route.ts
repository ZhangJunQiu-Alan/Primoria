import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/auth/guard";
import { getDb } from "@/lib/db/client";
import { getCourse, insertPlannedLesson } from "@/lib/courses/store";
import { getLearningProgressJob, resolveLearningProgressDecision } from "@/lib/courses/learning-progress-jobs";
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

    const pending = await getLearningProgressJob(jobId, ownerId);
    if (!pending || pending.decisionStatus !== "pending") {
      // Not found, not owned, or no longer pending (already resolved).
      return NextResponse.json({ error: "Recommendation not found or already resolved" }, { status: 404 });
    }

    if (action === "dismiss") {
      const resolved = await resolveLearningProgressDecision(jobId, ownerId, "dismissed");
      if (!resolved) return NextResponse.json({ error: "Recommendation not found or already resolved" }, { status: 404 });
      return NextResponse.json({ status: "dismissed" }, { status: 200 });
    }

    const decision = pending.decision;
    if (!decision) {
      const resolved = await resolveLearningProgressDecision(jobId, ownerId, "accepted");
      return resolved
        ? NextResponse.json({ status: "accepted" }, { status: 200 })
        : NextResponse.json({ error: "Recommendation not found or already resolved" }, { status: 404 });
    }

    if (decision.kind === "course_complete") {
      const resolved = await resolveLearningProgressDecision(jobId, ownerId, "accepted");
      return resolved
        ? NextResponse.json({ status: "accepted", kind: "course_complete" }, { status: 200 })
        : NextResponse.json({ error: "Recommendation not found or already resolved" }, { status: 404 });
    }

    if (decision.kind === "next") {
      const course = await getCourse(courseId, ownerId);
      const sorted = [...(course?.lessons ?? [])].sort((a, b) => a.sortKey - b.sortKey);
      const currentIndex = sorted.findIndex((lesson) => lesson.id === pending.lessonId);
      // New decisions pin the exact lesson. For old persisted decisions, the
      // immediate next lesson is the only safe source of truth; topic matching
      // can skip concept-frontier bundles or escape a goal-scoped course.
      const target = decision.targetLessonId
        ? sorted.find((lesson) => lesson.id === decision.targetLessonId)
        : currentIndex >= 0
          ? sorted[currentIndex + 1]
          : undefined;
      if (!target) return NextResponse.json({ error: "Next lesson not found in outline" }, { status: 404 });
      const materialized = await getDb().transaction(async (tx) => {
        const resolved = await resolveLearningProgressDecision(jobId, ownerId, "accepted", tx);
        if (!resolved) return null;
        if (target.status === "generated") return { job: null, status: 200 } as const;
        const result = await enqueueLessonGenerationJob({ ownerId, courseId, lessonId: target.id }, tx);
        const job = "job" in result && result.job ? toLessonGenerationJobSummary(result.job) : null;
        return { job, status: 202 } as const;
      });
      if (!materialized) return NextResponse.json({ error: "Recommendation not found or already resolved" }, { status: 404 });
      return NextResponse.json(
        { status: "accepted", kind: "next", lessonId: target.id, job: materialized.job },
        { status: materialized.status },
      );
    }

    // remediation
    const materialized = await getDb().transaction(async (tx) => {
      const resolved = await resolveLearningProgressDecision(jobId, ownerId, "accepted", tx);
      if (!resolved) return null;
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
      }, tx);
      const result = await enqueueLessonGenerationJob({ ownerId, courseId, lessonId: lesson.id }, tx);
      const job = "job" in result && result.job ? toLessonGenerationJobSummary(result.job) : null;
      return { lesson, job };
    });
    if (!materialized) return NextResponse.json({ error: "Recommendation not found or already resolved" }, { status: 404 });
    return NextResponse.json({ status: "accepted", kind: "remediation", lessonId: materialized.lesson.id, job: materialized.job }, { status: 202 });
  } catch (error) {
    console.error("[course/learning-progress/confirm]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid recommendation action", code: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to resolve recommendation. Please retry." }, { status: 500 });
  }
}
