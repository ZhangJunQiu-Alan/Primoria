import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addBlock,
  editBlock,
  moveCourseBlock,
  removeCourseBlock,
  transformBlock,
} from "@/lib/ai/deepagent/course-editor";

const SettingsSchema = z
  .object({
    provider: z.enum(["openai-compatible", "anthropic-compatible"]).optional(),
    baseUrl: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string().optional(),
  })
  .optional();

const BlockTypeSchema = z.enum([
  "text",
  "analogy",
  "transfer",
  "visual",
  "code",
  "quiz",
  "mind_map",
  "slide",
  "worksheet",
]);

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("rewrite"),
    blockId: z.string(),
    comment: z.string().min(1),
    selectedText: z.string().optional(),
    settings: SettingsSchema,
  }),
  z.object({
    action: z.literal("add"),
    targetType: BlockTypeSchema,
    instruction: z.string().min(1),
    afterBlockId: z.string().optional(),
    settings: SettingsSchema,
  }),
  z.object({
    action: z.literal("transform"),
    blockId: z.string(),
    targetType: BlockTypeSchema,
    instruction: z.string().min(1),
    settings: SettingsSchema,
  }),
  z.object({
    action: z.literal("remove"),
    blockId: z.string(),
    instruction: z.string().optional(),
  }),
  z.object({
    action: z.literal("move"),
    blockId: z.string(),
    toIndex: z.number().int().min(0),
    instruction: z.string().optional(),
  }),
]);

// Back-compat: requests without an `action` field are treated as rewrite.
const LegacyRewriteSchema = z.object({
  blockId: z.string(),
  comment: z.string().min(1),
  selectedText: z.string().optional(),
  settings: SettingsSchema,
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const json = await request.json();
    const body = "action" in (json ?? {})
      ? RequestSchema.parse(json)
      : { action: "rewrite" as const, ...LegacyRewriteSchema.parse(json) };

    switch (body.action) {
      case "rewrite": {
        const result = await editBlock(
          { courseId: id, blockId: body.blockId, comment: body.comment, selectedText: body.selectedText },
          body.settings,
        );
        return NextResponse.json({ course: result.course, block: result.block });
      }
      case "add": {
        const result = await addBlock(
          { courseId: id, targetType: body.targetType, instruction: body.instruction, afterBlockId: body.afterBlockId },
          body.settings,
        );
        return NextResponse.json({ course: result.course, block: result.block });
      }
      case "transform": {
        const result = await transformBlock(
          { courseId: id, blockId: body.blockId, targetType: body.targetType, instruction: body.instruction },
          body.settings,
        );
        return NextResponse.json({ course: result.course, block: result.block });
      }
      case "remove": {
        const result = await removeCourseBlock({ courseId: id, blockId: body.blockId, instruction: body.instruction });
        return NextResponse.json({ course: result.course });
      }
      case "move": {
        const result = await moveCourseBlock({ courseId: id, blockId: body.blockId, toIndex: body.toIndex, instruction: body.instruction });
        return NextResponse.json({ course: result.course });
      }
    }
  } catch (error) {
    console.error("[course/edit]", error);
    const message = error instanceof Error ? error.message : "Edit failed";
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
