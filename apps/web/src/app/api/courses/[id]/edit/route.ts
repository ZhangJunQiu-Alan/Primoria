import { NextResponse } from "next/server";
import { z } from "zod";
import { editBlock } from "@/lib/ai/deepagent/course-editor";

const RequestSchema = z.object({
  blockId: z.string(),
  comment: z.string().min(1),
  selectedText: z.string().optional(),
  settings: z
    .object({
      provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
      baseUrl: z.string().optional(),
      apiKey: z.string().optional(),
      model: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const body = RequestSchema.parse(await request.json());
    const result = await editBlock(
      {
        courseId: id,
        blockId: body.blockId,
        comment: body.comment,
        selectedText: body.selectedText,
      },
      body.settings,
    );
    return NextResponse.json({ course: result.course, block: result.block });
  } catch (error) {
    console.error("[course/edit]", error);
    const message = error instanceof Error ? error.message : "Edit failed";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
