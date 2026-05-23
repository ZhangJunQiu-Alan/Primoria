import { z } from "zod";
import { getCourse, updateBlock } from "@/lib/courses/store";
import { recordCourseEditEvent } from "@/lib/memory/course-edit-events";
import type { Course, CourseBlock } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import { createTutorModel } from "./model";

const TextEdit = z.object({
  type: z.literal("text"),
  title: z.string(),
  markdown: z.string(),
});
const AnalogyEdit = z.object({
  type: z.literal("analogy"),
  title: z.string(),
  source: z.string(),
  target: z.string(),
  mapping: z.string(),
});
const TransferEdit = z.object({
  type: z.literal("transfer"),
  title: z.string(),
  fromDomain: z.string(),
  toDomain: z.string(),
  explanation: z.string(),
  example: z.string(),
});
const VisualEdit = z.object({
  type: z.literal("visual"),
  title: z.string(),
  description: z.string(),
  html: z.string(),
});
const CodeEdit = z.object({
  type: z.literal("code"),
  title: z.string(),
  language: z.string(),
  code: z.string(),
  explanation: z.string(),
});

const EDITOR_SYSTEM_PROMPT = `You are Primoria's Course Editor agent. You receive ONE block from a course and a learner comment, then rewrite the block to address the comment.

RULES:
- Keep the same block type. Do NOT switch types.
- Stay focused on the comment. Don't redesign the whole block if the comment only asks for one change.
- Keep the same approximate length unless the learner asks for more or less.
- For visual blocks, regenerate self-contained HTML using the Primoria palette (cream #fbf7ee, ink #3a352d, amber/sage/lavender accents). Include at least one interactive control.
- Output valid JSON only.`;

export type EditBlockInput = {
  courseId: string;
  blockId: string;
  comment: string;
};

export type EditBlockResult = {
  course: Course;
  block: CourseBlock;
};

function schemaForBlock(block: CourseBlock) {
  switch (block.type) {
    case "text":
      return TextEdit;
    case "analogy":
      return AnalogyEdit;
    case "transfer":
      return TransferEdit;
    case "visual":
      return VisualEdit;
    case "code":
      return CodeEdit;
  }
}

export async function editBlock(
  input: EditBlockInput,
  settings: TutorProviderSettings = {},
): Promise<EditBlockResult> {
  const course = await getCourse(input.courseId);
  if (!course) throw new Error("Course not found");
  const block = course.blocks.find((b) => b.id === input.blockId);
  if (!block) throw new Error("Block not found");

  const model = createTutorModel(settings);
  const schema = schemaForBlock(block);
  const userPrompt = buildEditPrompt(course, block, input.comment);
  const rewritten = await invokeBlockEdit(model, schema, block, userPrompt);

  const next = normalizeEditedBlock(rewritten, block);
  const updatedCourse = await updateBlock(input.courseId, input.blockId, next);
  if (!updatedCourse) throw new Error("Update failed");
  await recordCourseEditEvent({
    courseId: input.courseId,
    blockId: input.blockId,
    instruction: input.comment,
    beforeBlock: block,
    afterBlock: next,
    metadata: { source: "course-editor" },
  });
  return { course: updatedCourse, block: next };
}

function buildEditPrompt(course: Course, block: CourseBlock, comment: string) {
  return [
    `Course title: ${course.title}`,
    `Course topic: ${course.topic}`,
    `Block type: ${block.type}`,
    `Current block JSON:`,
    JSON.stringify(stripId(block), null, 2),
    "",
    `Learner comment: ${comment}`,
    "",
    "Rewrite the block as JSON. Keep the same type.",
  ].join("\n");
}

async function invokeBlockEdit(
  model: ReturnType<typeof createTutorModel>,
  schema: ReturnType<typeof schemaForBlock>,
  block: CourseBlock,
  userPrompt: string,
): Promise<unknown> {
  try {
    const structured = model.withStructuredOutput(schema, { name: "block_edit" });
    return await structured.invoke(
      [
        { role: "system", content: EDITOR_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { callbacks: [] },
    );
  } catch (error) {
    console.warn("[course-editor] structured output failed, falling back to JSON prompt", error);
  }

  const result = await model.invoke(
    [
      {
        role: "system",
        content: `${EDITOR_SYSTEM_PROMPT}

Your provider may not support native structured output. Return ONLY a JSON object for this exact block type.
Expected shape:
${exampleShapeForBlock(block)}
No markdown fences. No prose outside JSON.`,
      },
      { role: "user", content: userPrompt },
    ],
    { callbacks: [] },
  );

  return parseJsonObject(messageContentToString(result.content));
}

function normalizeEditedBlock(raw: unknown, previous: CourseBlock): CourseBlock {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const title = cleanText(obj.title, previous.title ?? previous.type).slice(0, 80);

  if (previous.type === "text") {
    return {
      ...previous,
      type: "text",
      title,
      markdown: cleanText(obj.markdown ?? obj.content ?? obj.text, previous.markdown),
    };
  }

  if (previous.type === "analogy") {
    return {
      ...previous,
      type: "analogy",
      title,
      source: cleanText(obj.source, previous.source),
      target: cleanText(obj.target, previous.target),
      mapping: cleanText(obj.mapping ?? obj.content ?? obj.explanation, previous.mapping),
    };
  }

  if (previous.type === "transfer") {
    return {
      ...previous,
      type: "transfer",
      title,
      fromDomain: cleanText(obj.fromDomain ?? obj.from_domain, previous.fromDomain),
      toDomain: cleanText(obj.toDomain ?? obj.to_domain, previous.toDomain),
      explanation: cleanText(obj.explanation ?? obj.content, previous.explanation),
      example: cleanText(obj.example, previous.example),
    };
  }

  if (previous.type === "visual") {
    return {
      ...previous,
      type: "visual",
      title,
      description: cleanText(obj.description ?? obj.content, previous.description),
      html: cleanText(obj.html, previous.html),
    };
  }

  return {
    ...previous,
    type: "code",
    title,
    language: cleanText(obj.language, previous.language).slice(0, 30),
    code: cleanText(obj.code ?? obj.example, previous.code),
    explanation: cleanText(obj.explanation ?? obj.content, previous.explanation),
  };
}

function exampleShapeForBlock(block: CourseBlock) {
  if (block.type === "text") return '{ "type": "text", "title": "string", "markdown": "string" }';
  if (block.type === "analogy") return '{ "type": "analogy", "title": "string", "source": "string", "target": "string", "mapping": "string" }';
  if (block.type === "transfer") return '{ "type": "transfer", "title": "string", "fromDomain": "string", "toDomain": "string", "explanation": "string", "example": "string" }';
  if (block.type === "visual") return '{ "type": "visual", "title": "string", "description": "string", "html": "string" }';
  return '{ "type": "code", "title": "string", "language": "string", "code": "string", "explanation": "string" }';
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text: unknown }).text);
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Course editor returned empty text.");
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Course editor did not return valid JSON.");
  }
}

function cleanText(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function stripId<T extends { id: string }>(block: T): Omit<T, "id"> {
  const { id: _id, ...rest } = block;
  return rest;
}
