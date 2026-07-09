import { NextResponse } from "next/server";
import { z } from "zod";

import { initializeCourseOutline } from "@/lib/ai/deepagent/course-generator";
import { getOrCreateGeneratedGraph } from "@/lib/knowledge-graph/generated-graph";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import {
  InvalidCourseTopicAnchorError,
  resolveCourseContextFromTopicAnchor,
} from "@/lib/knowledge-graph/course-context";
import { recordLearningEvent } from "@/lib/learning-events/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AnchorRequestSchema = z.object({
  graphId: z.string().min(1),
  startTopicId: z.string().min(1),
  targetConceptId: z.string().min(1).nullable().optional(),
  language: z.string().min(1).optional(),
  // Set when this build came from a subject-clarification chip click; carries the
  // original ambiguous query so the server can log a subject-level menu_select.
  clarifySourceQuery: z.string().min(1).optional(),
}).strict();

// Out-of-library build: no KG anchor, just the learner's topic. The server
// designs a free-form outline with one model call, then reuses the normal
// lesson-job pipeline.
const FreeformRequestSchema = z.object({
  topic: z.string().min(1).max(200),
  language: z.string().min(1).optional(),
}).strict();

const RequestSchema = z.union([AnchorRequestSchema, FreeformRequestSchema]);

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

    const parsed = RequestSchema.parse(await request.json());

    let outlineInput;
    if ("topic" in parsed) {
      // Out-of-library: reuse (or generate + persist) a topic graph for this
      // topic, then build the course exactly like a library-anchored one — the
      // gen_* graphId gives per-owner course dedup and cross-user graph reuse.
      const generated = await getOrCreateGeneratedGraph({ topic: parsed.topic, language: parsed.language ?? null });
      outlineInput = {
        ownerId,
        topic: parsed.topic,
        source: "cold_start" as const,
        language: parsed.language ?? null,
        generatedGraph: generated?.graph,
      };
    } else {
      const anchor = parsed;
      const courseContext = resolveCourseContextFromTopicAnchor(anchor);

      if (anchor.clarifySourceQuery) {
        await recordLearningEvent({
          type: "position.menu_select",
          ownerId,
          graphId: anchor.graphId,
          sourceQuery: anchor.clarifySourceQuery,
        });
      }

      outlineInput = {
        ownerId,
        topic: courseContext.startTopic.name,
        kgContext: courseContext,
        source: "cold_start" as const,
        language: anchor.language ?? null,
      };
    }

    const { course, firstLesson, summary } = await initializeCourseOutline(outlineInput);

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
