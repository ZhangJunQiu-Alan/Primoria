import { NextResponse } from "next/server";
import { z } from "zod";

import { initializeCourseOutline } from "@/lib/ai/deepagent/course-generator";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import {
  InvalidCourseTopicAnchorError,
  resolveCourseContextFromTopicAnchor,
} from "@/lib/knowledge-graph/course-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  graphId: z.string().min(1),
  startTopicId: z.string().min(1),
  targetConceptId: z.string().min(1).nullable().optional(),
  language: z.string().min(1).optional(),
}).strict();

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/sign in/i.test(message)) return "You must sign in to create a course.";
  return "Course creation failed. Please retry.";
}

// Web-as-brain build entry (engineering doc §12.1). The client supplies only the
// graph/topic anchor; the server resolves the authoritative CourseContext before
// initializing/reusing the Course outline and enqueueing its first Lesson Job.
// A long-running worker generates the lesson; closing the page does not stop it.
export async function POST(request: Request) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;
    const ownerId = (await getCurrentUser())?.id;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const anchor = RequestSchema.parse(await request.json());
    const courseContext = resolveCourseContextFromTopicAnchor(anchor);

    const { course, firstLesson, summary } = await initializeCourseOutline({
      ownerId,
      topic: courseContext.startTopic.name,
      kgContext: courseContext,
      source: "cold_start",
      language: anchor.language ?? null,
    });

    const enqueued = await enqueueLessonGenerationJob({ ownerId, courseId: course.id, lessonId: firstLesson.id });
    const job = enqueued.job ? toLessonGenerationJobSummary(enqueued.job) : null;

    return NextResponse.json({ courseId: course.id, lessonId: firstLesson.id, job, summary }, { status: 202 });
  } catch (error) {
    console.error("[learning/course]", error);
    if (error instanceof z.ZodError || error instanceof InvalidCourseTopicAnchorError) {
      return NextResponse.json({ error: "The selected knowledge-graph topic is invalid." }, { status: 400 });
    }
    return NextResponse.json({ error: userFacingError(error) }, { status: 503 });
  }
}
