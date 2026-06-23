import { NextResponse } from "next/server";
import { z } from "zod";

import { initializeCourseOutline } from "@/lib/ai/deepagent/course-generator";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ConceptSchema = z.object({
  conceptId: z.string(),
  name: z.string(),
  defaultOrder: z.number(),
});

const TopicSchema = z.object({
  topicId: z.string(),
  name: z.string(),
  concepts: z.array(ConceptSchema),
});

const RequestSchema = z.object({
  courseContext: z.object({
    learningPathType: z.literal("linear"),
    graphId: z.string(),
    startTopic: TopicSchema,
    targetConceptId: z.string().nullable(),
    nextTopic: TopicSchema.nullable(),
  }),
});

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/sign in/i.test(message)) return "You must sign in to create a course.";
  return "Course creation failed. Please retry.";
}

// Web-as-brain build entry (engineering doc §12.1). Initializes/reuses the Course
// outline WITHOUT generating lesson content, enqueues the first Lesson Job, and
// returns 202. A long-running worker generates the lesson; closing the page does
// not stop it. No BYOK: model settings are never accepted here.
export async function POST(request: Request) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;
    const ownerId = (await getCurrentUser())?.id;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseContext } = RequestSchema.parse(await request.json());

    const { course, firstLesson, summary } = await initializeCourseOutline({
      ownerId,
      topic: courseContext.startTopic.name,
      kgContext: courseContext,
      source: "cold_start",
    });

    const enqueued = await enqueueLessonGenerationJob({ ownerId, courseId: course.id, lessonId: firstLesson.id });
    const job = enqueued.job ? toLessonGenerationJobSummary(enqueued.job) : null;

    return NextResponse.json({ courseId: course.id, lessonId: firstLesson.id, job, summary }, { status: 202 });
  } catch (error) {
    console.error("[learning/course]", error);
    return NextResponse.json({ error: userFacingError(error) }, { status: 503 });
  }
}
