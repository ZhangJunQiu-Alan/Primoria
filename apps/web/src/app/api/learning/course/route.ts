import { NextResponse } from "next/server";
import { z } from "zod";

import { initializeCourseOutline } from "@/lib/ai/deepagent/course-generator";
import { getOrCreateGeneratedGraph } from "@/lib/knowledge-graph/generated-graph";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { requireAuthUser } from "@/lib/auth/guard";
import {
  InvalidCourseTopicAnchorError,
  resolveCourseContextFromTopicAnchor,
} from "@/lib/knowledge-graph/course-context";
import { recordLearningEvent } from "@/lib/learning-events/store";
import { getCourseIntake, attachCourseIntake, courseIntakePreparationKey } from "@/lib/courses/course-intake-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AnchorRequestSchema = z.object({
  intakeId: z.string().optional(),
  graphId: z.string().min(1),
  startTopicId: z.string().min(1),
  targetConceptId: z.string().min(1).nullable().optional(),
  targetConceptIds: z.array(z.string().min(1)).max(8).optional(),
  scope: z.enum(["canonical", "goal"]).optional(),
  learningGoal: z.string().trim().min(1).max(300).nullable().optional(),
  language: z.string().min(1).optional(),
  // Set when this build came from a subject-clarification chip click; carries the
  // original ambiguous query so the server can log a subject-level menu_select.
  clarifySourceQuery: z.string().min(1).optional(),
}).strict();

// Out-of-library build: no KG anchor, just the learner's topic. The server
// designs a free-form outline with one model call, then reuses the normal
// lesson-job pipeline.
const FreeformRequestSchema = z.object({
  intakeId: z.string().optional(),
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
    const { denied, user } = await requireAuthUser();
    if (denied) return denied;
    const ownerId = user?.id;
    if (!ownerId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = RequestSchema.parse(await request.json());
    const prepared = parsed.intakeId ? await getCourseIntake(ownerId, parsed.intakeId) : null;
    if (!prepared?.intake.ready) return NextResponse.json({ error: "Complete your course background questions first.", code: "course_intake_required" }, { status: 409 });
    if (prepared.row.graphId && "graphId" in parsed && prepared.row.graphId !== parsed.graphId) return NextResponse.json({ error: "Course subject does not match your preparation." }, { status: 400 });
    const language = prepared.intake.language;

    let outlineInput;
    if ("topic" in parsed) {
      // Out-of-library: reuse (or generate + persist) a topic graph for this
      // topic, then build the course exactly like a library-anchored one — the
      // gen_* graphId gives per-owner course dedup and cross-user graph reuse.
      const generated = await getOrCreateGeneratedGraph({ topic: prepared.intake.goal, language });
      if (!generated) {
        throw new Error(`Generated graph creation failed for out-of-library topic: ${parsed.topic}`);
      }
      outlineInput = {
        ownerId,
        topic: prepared.intake.goal,
        source: "cold_start" as const,
        language,
        generatedGraph: generated.graph,
      };
    } else {
      const anchor = { ...parsed, ...(parsed.scope === "goal" ? { learningGoal: prepared.intake.goal } : {}) };
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
        topic: courseContext.learningGoal ?? courseContext.startTopic.name,
        kgContext: courseContext,
        source: "cold_start" as const,
        language,
      };
    }

    const { course, firstLesson, summary } = await initializeCourseOutline({ ...outlineInput, preparationKey: courseIntakePreparationKey(prepared.row) });
    await attachCourseIntake(ownerId, prepared.row.id, course.id);

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
