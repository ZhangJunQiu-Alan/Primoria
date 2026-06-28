import { z } from "zod";
import { getCourse, insertBlock, moveBlock, removeBlock, updateBlock } from "@/lib/courses/store";
import { recordCourseEditEvent } from "@/lib/memory/course-edit-events";
import type { Course, CourseBlock, Slide, VisualBlock, WorksheetItem } from "@/lib/courses/types";
import { courseBlocks } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import { createTutorModel } from "./model";
import { generateBlock, type GeneratableBlockType } from "./course-generator";
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

// Editing an image rewrites only its TEXT (title/alt/caption) and never the
// picture — the asset is preserved. Regenerating the image is an explicit,
// separate action (transform/add), not a block rewrite.
const ImageEdit = z.object({
  type: z.literal("image"),
  title: z.string(),
  alt: z.string(),
  caption: z.string(),
});

const SlideItemEdit = z.object({
  id: z.string(),
  title: z.string(),
  layout: z.enum(["title", "bullets", "quote", "image-text"]),
  bullets: z.array(z.string()).optional(),
  markdown: z.string().optional(),
  note: z.string().optional(),
});

const SlideEdit = z.object({
  type: z.literal("slide"),
  title: z.string(),
  slides: z.array(SlideItemEdit).min(2).max(10),
});

const WorksheetItemEdit = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("short_answer"), id: z.string(), prompt: z.string(), hint: z.string().optional(), sampleAnswer: z.string().optional() }),
  z.object({ kind: z.literal("fill_blank"), id: z.string(), prompt: z.string(), hint: z.string().optional(), blanks: z.array(z.string()).min(1) }),
  z.object({ kind: z.literal("problem"), id: z.string(), prompt: z.string(), hint: z.string().optional(), sampleAnswer: z.string().optional() }),
]);

const WorksheetEdit = z.object({
  type: z.literal("worksheet"),
  title: z.string(),
  items: z.array(WorksheetItemEdit).min(1).max(8),
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
- For image blocks: edit only the title, alt, and caption text. You cannot change the picture itself — never describe a new image.
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
    case "image":
      // Text-only edit; the picture/asset is preserved (regenerate is a separate action).
      return ImageEdit;
    case "code":
      return CodeEdit;
    case "quiz":
      throw new Error("Quiz blocks cannot be edited via the block editor.");
    case "mind_map":
      throw new Error("Mind map blocks cannot be edited via the block editor.");
    case "slide":
      return SlideEdit;
    case "worksheet":
      return WorksheetEdit;
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
  const block = courseBlocks(course).find((b) => b.id === input.blockId);
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
    lessonId: lessonIdForBlock(updatedCourse, input.blockId),
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

export type AddBlockInput = {
  courseId: string;
  targetType: GeneratableBlockType;
  instruction: string;
  afterBlockId?: string; // insert right after this block; default appends to the end
};

export async function addBlock(
  input: AddBlockInput,
  settings: TutorProviderSettings = {},
): Promise<EditBlockResult> {
  const course = await getCourse(input.courseId);
  if (!course) throw new Error("Course not found");

  const block = await generateBlock(
    { course, targetType: input.targetType, instruction: input.instruction },
    settings,
  );
  const atIndex = resolveInsertIndex(course, input.afterBlockId);
  const updatedCourse = await insertBlock(input.courseId, block, atIndex);
  if (!updatedCourse) throw new Error("Insert failed");

  await recordCourseEditEvent({
    courseId: input.courseId,
    lessonId: lessonIdForBlock(updatedCourse, block.id),
    blockId: block.id,
    instruction: input.instruction,
    beforeBlock: null,
    afterBlock: block,
    metadata: { source: "course-editor", action: "add", targetType: input.targetType },
  });
  return { course: updatedCourse, block };
}

export type TransformBlockInput = {
  courseId: string;
  blockId: string;
  targetType: GeneratableBlockType;
  instruction: string;
};

export async function transformBlock(
  input: TransformBlockInput,
  settings: TutorProviderSettings = {},
): Promise<EditBlockResult> {
  const course = await getCourse(input.courseId);
  if (!course) throw new Error("Course not found");
  const previous = courseBlocks(course).find((b) => b.id === input.blockId);
  if (!previous) throw new Error("Block not found");
  if (previous.type === input.targetType) {
    throw new Error("Block is already this type. Use the block editor to rewrite it.");
  }

  const generated = await generateBlock(
    { course, targetType: input.targetType, instruction: input.instruction, sourceBlock: previous },
    settings,
  );
  // Keep the original block id so position and references are preserved.
  // Carry teaching metadata across the representation change: the concept being
  // taught and its pedagogical role are unchanged when only the block type flips.
  const next = {
    ...generated,
    id: previous.id,
    ...(previous.conceptIds ? { conceptIds: previous.conceptIds } : {}),
    ...(previous.pedagogicalRole ? { pedagogicalRole: previous.pedagogicalRole } : {}),
  };
  const updatedCourse = await updateBlock(input.courseId, input.blockId, next);
  if (!updatedCourse) throw new Error("Update failed");

  await recordCourseEditEvent({
    courseId: input.courseId,
    lessonId: lessonIdForBlock(updatedCourse, input.blockId),
    blockId: input.blockId,
    instruction: input.instruction,
    beforeBlock: previous,
    afterBlock: next,
    metadata: { source: "course-editor", action: "transform", fromType: previous.type, targetType: input.targetType },
  });
  return { course: updatedCourse, block: next };
}

export async function removeCourseBlock(
  input: { courseId: string; blockId: string; instruction?: string },
): Promise<{ course: Course }> {
  const course = await getCourse(input.courseId);
  if (!course) throw new Error("Course not found");
  if (courseBlocks(course).length <= 1) throw new Error("A course must keep at least one block.");
  const previous = courseBlocks(course).find((b) => b.id === input.blockId);
  if (!previous) throw new Error("Block not found");
  const lessonId = lessonIdForBlock(course, input.blockId);

  const updatedCourse = await removeBlock(input.courseId, input.blockId);
  if (!updatedCourse) throw new Error("Remove failed");

  await recordCourseEditEvent({
    courseId: input.courseId,
    lessonId,
    blockId: input.blockId,
    instruction: input.instruction ?? "remove block",
    beforeBlock: previous,
    afterBlock: null,
    metadata: { source: "course-editor", action: "remove", removedType: previous.type },
  });
  return { course: updatedCourse };
}

export async function moveCourseBlock(
  input: { courseId: string; blockId: string; toIndex: number; instruction?: string },
): Promise<{ course: Course }> {
  const course = await getCourse(input.courseId);
  if (!course) throw new Error("Course not found");
  const flatBlocks = courseBlocks(course);
  const fromIndex = flatBlocks.findIndex((b) => b.id === input.blockId);
  if (fromIndex === -1) throw new Error("Block not found");
  const block = flatBlocks[fromIndex];

  const updatedCourse = await moveBlock(input.courseId, input.blockId, input.toIndex);
  if (!updatedCourse) throw new Error("Move failed");

  await recordCourseEditEvent({
    courseId: input.courseId,
    lessonId: lessonIdForBlock(updatedCourse, input.blockId),
    blockId: input.blockId,
    instruction: input.instruction ?? "reorder block",
    beforeBlock: block,
    afterBlock: block,
    metadata: { source: "course-editor", action: "move", fromIndex, toIndex: input.toIndex },
  });
  return { course: updatedCourse };
}

function resolveInsertIndex(course: Course, afterBlockId?: string): number | undefined {
  if (!afterBlockId) return undefined; // append
  const idx = courseBlocks(course).findIndex((b) => b.id === afterBlockId);
  return idx === -1 ? undefined : idx + 1;
}

function lessonIdForBlock(course: Course, blockId: string): string | null {
  return course.lessons.find((lesson) => lesson.blocks?.some((block) => block.id === blockId))?.id ?? null;
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

  if (previous.type === "image") {
    // Preserve the asset (assetId/imageUrl/imageKind/status); edit text only.
    return {
      ...previous,
      type: "image",
      title,
      alt: cleanText(obj.alt, previous.alt),
      caption: cleanText(obj.caption ?? obj.content, previous.caption),
    };
  }

  if (previous.type === "worksheet") {
    const rawItems = Array.isArray(obj.items) ? obj.items : previous.items;
    const items: WorksheetItem[] = rawItems
      .filter((it): it is Record<string, unknown> => !!it && typeof it === "object")
      .map((it, i) => {
        const kind = typeof it.kind === "string" ? it.kind : "short_answer";
        const id = cleanText(it.id, `w${i + 1}`);
        const prompt = cleanText(it.prompt ?? it.question, "").slice(0, 600);
        const hint = typeof it.hint === "string" && it.hint.trim() ? it.hint.trim() : undefined;
        if (kind === "fill_blank") {
          const blanks = Array.isArray(it.blanks)
            ? it.blanks.filter((b): b is string => typeof b === "string")
            : [];
          return { kind: "fill_blank" as const, id, prompt, ...(hint ? { hint } : {}), blanks: blanks.length > 0 ? blanks : ["…"] };
        }
        const sampleAnswer = typeof it.sampleAnswer === "string" && it.sampleAnswer.trim() ? it.sampleAnswer.trim() : undefined;
        if (kind === "problem") return { kind: "problem" as const, id, prompt, ...(hint ? { hint } : {}), ...(sampleAnswer ? { sampleAnswer } : {}) };
        return { kind: "short_answer" as const, id, prompt, ...(hint ? { hint } : {}), ...(sampleAnswer ? { sampleAnswer } : {}) };
      })
      .filter((it) => it.prompt);
    return { ...previous, title, items: items.length > 0 ? items : previous.items };
  }

  if (previous.type === "slide") {
    const rawSlides = Array.isArray(obj.slides) ? obj.slides : previous.slides;
    const slides: Slide[] = rawSlides
      .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
      .map((s, i) => ({
        id: cleanText(s.id, `s${i + 1}`),
        title: cleanText(s.title, `Slide ${i + 1}`).slice(0, 80),
        layout: (["title", "bullets", "quote", "image-text"] as const).includes(s.layout as Slide["layout"])
          ? (s.layout as Slide["layout"])
          : "bullets",
        ...(Array.isArray(s.bullets) && s.bullets.length > 0 ? { bullets: s.bullets.filter((b): b is string => typeof b === "string") } : {}),
        ...(typeof s.markdown === "string" && s.markdown.trim() ? { markdown: s.markdown.trim() } : {}),
        ...(typeof s.note === "string" && s.note.trim() ? { note: s.note.trim() } : {}),
      }))
      .filter((s) => s.title);
    return { ...previous, title, slides: slides.length > 0 ? slides : previous.slides };
  }

  if (previous.type !== "code") return previous;
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
  if (block.type === "slide") return '{ "type": "slide", "title": "string", "slides": [{ "id": "s1", "title": "string", "layout": "bullets", "bullets": ["point 1"] }] }';
  if (block.type === "worksheet") return '{ "type": "worksheet", "title": "string", "items": [{ "kind": "fill_blank", "id": "w1", "prompt": "The ___ converts ___", "blanks": ["answer1", "answer2"] }] }';
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
