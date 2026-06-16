import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCourse } from "@/lib/ai/deepagent/course-generator";
import { requireAuth } from "@/lib/auth/guard";

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
  settings: z
    .object({
      provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

function userFacingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Missing OPENAI|Missing ANTHROPIC/i.test(message)) {
    return "Course model provider settings are missing. Configure a provider in Settings.";
  }
  if (/insufficient.*balance|quota|credit/i.test(message)) {
    return "The model provider reports insufficient balance or credits.";
  }
  if (/fetch failed|socket|closed|timeout|network/i.test(message)) {
    return "The model provider connection was interrupted. Please retry.";
  }
  return "Course generation failed. Please retry.";
}

// Web-as-brain build entry: the browser calls this with the KG course context
// (resolved by /api/knowledge-graph/position). Generation + persistence run here
// so the signed-in user's session is available and the course lands in
// app_courses (saveCourse, inside generateCourse). Synchronous for 迭代一.
export async function POST(request: Request) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;
    const body = RequestSchema.parse(await request.json());
    const { courseContext } = body;

    const { course, summary } = await generateCourse(
      { topic: courseContext.startTopic.name, kgContext: courseContext },
      body.settings ?? {},
    );

    return NextResponse.json({ courseId: course.id, summary });
  } catch (error) {
    console.error("[learning/course]", error);
    return NextResponse.json({ error: userFacingError(error) }, { status: 503 });
  }
}
