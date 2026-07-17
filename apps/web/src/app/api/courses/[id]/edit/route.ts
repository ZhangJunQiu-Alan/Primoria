import { NextResponse } from "next/server";
import { z } from "zod";
import {
  addCourseBlock,
  editCourseBlock,
  moveCourseBlock,
  removeCourseBlock,
  transformCourseBlock,
} from "@/lib/agent-os/ai";
import { requireAuthUser } from "@/lib/auth/guard";
import { InvalidMermaidDefinitionError } from "@/lib/courses/mermaid-validation";
import { CourseEditRejectedError, CourseResourceNotFoundError } from "@/lib/courses/errors";

const GeneratableBlockTypeSchema = z.enum([
  "text",
  "analogy",
  "transfer",
  "visual",
  "image",
  "code",
  "quiz",
]);

const RequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("rewrite"),
    blockId: z.string(),
    comment: z.string().min(1),
    selectedText: z.string().optional(),
  }),
  z.object({
    action: z.literal("add"),
    targetType: GeneratableBlockTypeSchema,
    instruction: z.string().min(1),
    afterBlockId: z.string().optional(),
  }),
  z.object({
    action: z.literal("transform"),
    blockId: z.string(),
    targetType: GeneratableBlockTypeSchema,
    instruction: z.string().min(1),
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
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { denied, user } = await requireAuthUser();
    if (denied) return denied;
    const { id } = await context.params;
    const ownerId = user?.id ?? null;
    const json = await request.json();
    const body = "action" in (json ?? {})
      ? RequestSchema.parse(json)
      : { action: "rewrite" as const, ...LegacyRewriteSchema.parse(json) };

    switch (body.action) {
      case "rewrite": {
        const result = await editCourseBlock(
          { courseId: id, blockId: body.blockId, comment: body.comment, selectedText: body.selectedText },
          {},
          ownerId,
        );
        return NextResponse.json({ course: result.course, block: result.block });
      }
      case "add": {
        const result = await addCourseBlock(
          { courseId: id, targetType: body.targetType, instruction: body.instruction, afterBlockId: body.afterBlockId },
          {},
          ownerId,
        );
        return NextResponse.json({ course: result.course, block: result.block });
      }
      case "transform": {
        const result = await transformCourseBlock(
          { courseId: id, blockId: body.blockId, targetType: body.targetType, instruction: body.instruction },
          {},
          ownerId,
        );
        return NextResponse.json({ course: result.course, block: result.block });
      }
      case "remove": {
        const result = await removeCourseBlock({ courseId: id, blockId: body.blockId, instruction: body.instruction }, ownerId);
        return NextResponse.json({ course: result.course });
      }
      case "move": {
        const result = await moveCourseBlock({ courseId: id, blockId: body.blockId, toIndex: body.toIndex, instruction: body.instruction }, ownerId);
        return NextResponse.json({ course: result.course });
      }
    }
  } catch (error) {
    console.error("[course/edit]", error);
    if (error instanceof InvalidMermaidDefinitionError) {
      return NextResponse.json(
        { error: "The Mermaid diagram has invalid syntax. Please revise and retry.", code: "invalid_mermaid" },
        { status: 422 },
      );
    }
    if (error instanceof CourseResourceNotFoundError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 404 });
    }
    if (error instanceof CourseEditRejectedError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 422 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid course edit request", code: "invalid_request" }, { status: 400 });
    }
    return NextResponse.json({ error: "Course edit failed. Please retry." }, { status: 500 });
  }
}
