import { NextResponse } from "next/server";
import { z } from "zod";
import { materializeLesson } from "@/lib/ai/deepagent/course-generator";
import { requireAuth } from "@/lib/auth/guard";

export const dynamic = "force-dynamic";

const SettingsSchema = z
  .object({
    provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string().optional(),
  })
  .optional();

const RequestSchema = z
  .object({
    contextHint: z.string().optional(),
    settings: SettingsSchema,
  })
  .optional();

// Lazy materialization of a planned outline lesson (doc §3.3 step 3). The
// generator atomically claims planned → generating, so concurrent requests for
// the same lesson cannot double-generate.
export async function POST(request: Request, context: { params: Promise<{ id: string; lessonId: string }> }) {
  try {
    const denied = await requireAuth();
    if (denied) return denied;
    const { id, lessonId } = await context.params;
    const body = RequestSchema.parse(await request.json().catch(() => ({})));

    const result = await materializeLesson(
      { courseId: id, lessonId, contextHint: body?.contextHint },
      body?.settings,
    );
    return NextResponse.json({ course: result.course, summary: result.summary });
  } catch (error) {
    console.error("[course/lesson/generate]", error);
    const message = error instanceof Error ? error.message : "Lesson generation failed";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
