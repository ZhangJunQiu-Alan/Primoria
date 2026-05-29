import { z } from "zod";
import { getCourse, updateBlock } from "@/lib/courses/store";
import { recordCourseEditEvent } from "@/lib/memory/course-edit-events";
import type { Course, CourseBlock, VisualBlock } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import { createTutorModel } from "./model";
import { PhysicsSceneZodSchema } from "@/lib/ai/visual-schemas";

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
const VisualEditHtml = z.object({
  type: z.literal("visual"),
  title: z.string(),
  description: z.string(),
  html: z.string(),
});
const VisualEditECharts = z.object({
  type: z.literal("visual"),
  title: z.string(),
  description: z.string(),
  echartsOption: z.record(z.unknown()),
  echartsHeight: z.number().optional(),
});
const VisualEditMermaid = z.object({
  type: z.literal("visual"),
  title: z.string(),
  description: z.string(),
  mermaidDefinition: z.string(),
});
const VisualEditPhysics = z.object({
  type: z.literal("visual"),
  title: z.string(),
  description: z.string(),
  physicsScene: PhysicsSceneZodSchema,
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
- Keep the same block type AND the same engine. Do NOT switch types or engines.
- Stay focused on the comment. Don't redesign the whole block if the comment only asks for one change.
- Keep the same approximate length unless the learner asks for more or less.
- For visual blocks with engine "html": regenerate self-contained HTML using the Primoria palette (cream #fbf7ee, ink #3a352d, amber/sage/lavender accents). Include at least one interactive control.
- For visual blocks with engine "echarts": update the echartsOption JSON to address the comment. Keep Primoria palette colors.
- For visual blocks with engine "mermaid": update the mermaidDefinition DSL string. Keep valid Mermaid syntax.
- For visual blocks with engine "physics": update the physicsScene JSON (bodies/constraints) to address the comment. Never write simulation code.
- Output valid JSON only.`;

export type EditBlockInput = {
  courseId: string;
  blockId: string;
  comment: string;
  selectedText?: string;
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
      return schemaForVisualBlock(block);
    case "code":
      return CodeEdit;
  }
}

function schemaForVisualBlock(block: VisualBlock) {
  if (block.engine === "echarts") return VisualEditECharts;
  if (block.engine === "mermaid") return VisualEditMermaid;
  if (block.engine === "physics") return VisualEditPhysics;
  return VisualEditHtml;
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
  const userPrompt = buildEditPrompt(course, block, input.comment, input.selectedText);
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
    metadata: {
      source: "course-editor",
      selectedText: cleanOptionalText(input.selectedText),
    },
  });
  return { course: updatedCourse, block: next };
}

function buildEditPrompt(course: Course, block: CourseBlock, comment: string, selectedText?: string) {
  const cleanSelectedText = cleanOptionalText(selectedText);
  return [
    `Course title: ${course.title}`,
    `Course topic: ${course.topic}`,
    `Block type: ${block.type}`,
    `Current block JSON:`,
    JSON.stringify(stripId(block), null, 2),
    "",
    cleanSelectedText
      ? [
          "Selected text inside this block:",
          cleanSelectedText,
          "",
          "The learner's request targets this selected text. Revise only that local passage unless the instruction explicitly requires nearby context.",
          "Return the full updated block JSON, preserving the rest of the block as much as possible.",
          "",
        ].join("\n")
      : "",
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
    const description = cleanText(obj.description ?? obj.content, previous.description);
    if (previous.engine === "echarts" && obj.echartsOption && typeof obj.echartsOption === "object") {
      return { ...previous, title, description, echartsOption: obj.echartsOption as Record<string, unknown>, echartsHeight: typeof obj.echartsHeight === "number" ? obj.echartsHeight : previous.echartsHeight };
    }
    if (previous.engine === "mermaid" && typeof obj.mermaidDefinition === "string" && obj.mermaidDefinition.trim()) {
      return { ...previous, title, description, mermaidDefinition: obj.mermaidDefinition };
    }
    if (previous.engine === "physics" && obj.physicsScene && typeof obj.physicsScene === "object") {
      return { ...previous, title, description, physicsScene: obj.physicsScene as VisualBlock["physicsScene"] };
    }
    return { ...previous, title, description, engine: "html" as const, html: cleanText(obj.html, previous.html ?? "") };
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
  if (block.type === "visual") {
    if (block.engine === "echarts") return '{ "type": "visual", "title": "string", "description": "string", "echartsOption": {}, "echartsHeight": 300 }';
    if (block.engine === "mermaid") return '{ "type": "visual", "title": "string", "description": "string", "mermaidDefinition": "string" }';
    if (block.engine === "physics") return '{ "type": "visual", "title": "string", "description": "string", "physicsScene": { "bodies": [], "render": { "width": 600, "height": 300 } } }';
    return '{ "type": "visual", "title": "string", "description": "string", "html": "string" }';
  }
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

function cleanOptionalText(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || undefined;
}

function stripId<T extends { id: string }>(block: T): Omit<T, "id"> {
  const { id: _id, ...rest } = block;
  return rest;
}
