import { z } from "zod";
import { getCourseByGraph, saveCourse } from "@/lib/courses/store";
import { getTopicGraph } from "@/lib/knowledge-graph/topic-graph";
import type { BlockType, Course, CourseBlock, Lesson } from "@/lib/courses/types";
import { courseBlocks, summarizeCourse } from "@/lib/courses/types";
import type { CourseSummary } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import { createTutorModel } from "./model";
import { buildKgContextPrompt, type CourseContext, type CourseContextTopic } from "./course-kg-context";
import { PhysicsSceneZodSchema } from "@/lib/ai/visual-schemas";
import type { ImageBrief } from "@/lib/ai/media/image-brief";
import { finalizeImageBlocks, makePendingImageBlock } from "@/lib/ai/media/image-builder";
import { isCodeEligibleTopicOrGoal } from "@/lib/ai/course-generation/code-eligibility";

const TextBlockSchema = z.object({
  type: z.literal("text"),
  title: z.string(),
  markdown: z.string(),
});

const AnalogyBlockSchema = z.object({
  type: z.literal("analogy"),
  title: z.string(),
  source: z.string(),
  target: z.string(),
  mapping: z.string(),
});

const TransferBlockSchema = z.object({
  type: z.literal("transfer"),
  title: z.string(),
  fromDomain: z.string(),
  toDomain: z.string(),
  explanation: z.string(),
  example: z.string(),
});

const VisualBlockSchema = z.object({
  type: z.literal("visual"),
  title: z.string(),
  description: z.string(),
  engine: z.enum(["html", "echarts", "mermaid", "physics"]).optional(),
  html: z.string().optional(),
  echartsOption: z.record(z.unknown()).optional(),
  echartsHeight: z.number().optional(),
  mermaidDefinition: z.string().optional(),
  physicsScene: PhysicsSceneZodSchema.optional(),
});

const CodeBlockSchema = z.object({
  type: z.literal("code"),
  title: z.string(),
  language: z.string(),
  code: z.string(),
  explanation: z.string(),
});

const SingleQuestionSchema = z.object({
  kind: z.literal("single"),
  id: z.string(),
  question: z.string(),
  choices: z.array(z.object({ id: z.string(), text: z.string() })).min(2).max(6),
  correctId: z.string(),
  explanation: z.string().optional(),
});

const MultiQuestionSchema = z.object({
  kind: z.literal("multi"),
  id: z.string(),
  question: z.string(),
  choices: z.array(z.object({ id: z.string(), text: z.string() })).min(2).max(6),
  correctIds: z.array(z.string()).min(1),
  explanation: z.string().optional(),
});

const TrueFalseQuestionSchema = z.object({
  kind: z.literal("truefalse"),
  id: z.string(),
  question: z.string(),
  correct: z.boolean(),
  explanation: z.string().optional(),
});

const QuizBlockSchema = z.object({
  type: z.literal("quiz"),
  title: z.string(),
  questions: z
    .array(z.discriminatedUnion("kind", [SingleQuestionSchema, MultiQuestionSchema, TrueFalseQuestionSchema]))
    .min(1)
    .max(6),
});

const CourseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number().int().min(3).max(60),
  blocks: z
    .array(
      z.discriminatedUnion("type", [
        TextBlockSchema,
        AnalogyBlockSchema,
        TransferBlockSchema,
        VisualBlockSchema,
        CodeBlockSchema,
        QuizBlockSchema,
      ]),
    )
    .min(8)
    .max(20),
});

const COURSE_SYSTEM_PROMPT = `You are Primoria's Lesson Generator sub-agent. You design one complete lesson for the current knowledge-graph topic. A normal topic contains 2-3 ordered concepts.

Block types (use the right type for each idea, do NOT just use text):
- text: prose in markdown. Use for concept explanations (2-4 paragraphs), OR a "Further reading" section with 2-3 markdown links to real resources, OR a "Discussion" section with 2-3 open-ended reflection questions.
- analogy: map an unfamiliar concept to a familiar one. Fields: source (familiar thing), target (concept being taught), mapping (what corresponds to what).
- transfer: show how a principle from one domain applies in another. Fields: fromDomain, toDomain, explanation, example.
- visual: a self-contained interactive HTML/CSS/JS fragment that visualizes a key intuition.
- code: a small code snippet with a plain-language explanation. Code is opt-in: use it only for programming, algorithms, software/web engineering, numerical computing, ML implementation, or an explicit user request to write/run/implement code. Do NOT use code as a default example format for biology, chemistry, physics, math, or general conceptual lessons.
- quiz: a short concept-closing check. Each concept needs its own quiz block placed after that concept's teaching loop. Each question has a "kind": "single" (one correct answer), "multi" (multiple correct answers), or "truefalse" (true/false). All questions must have an "id" (short unique string like "q1"), a "question" string, and an optional "explanation" shown after submission. For "single" and "multi", include a "choices" array of {id, text} objects. For "single" set "correctId" to the correct choice id. For "multi" set "correctIds" to an array of correct choice ids. For "truefalse" set "correct" to true or false.

COURSE STRUCTURE RULES:
- Produce 13-15 blocks for a 2-concept lesson and 16-20 blocks for a 3-concept lesson. Never add repetitive filler merely to reach a number.
- Activation and positioning: exactly 2 text blocks — a concrete hook, then learning goals and prerequisite recall.
- Concept core teaching: each concept needs one text explanation plus one example/application. Default examples are text; use visual when interaction teaches the mechanism; use code only when code is the thing being learned.
- Media rhythm: visual blocks should be 30%-45% of the lesson in this legacy path. Each visual must have a concrete teaching purpose, not decoration.
- Focused deepening: 2-3 blocks total using analogy, visual, or a text block about a common misconception. Concentrate these on the hardest 1-2 concepts.
- Integrated transfer: exactly 1 transfer block after the concept teaching arc.
- Concept assessment: exactly one quiz block per concept, placed at that concept's close. Do not put one combined quiz at the lesson end.
- Closure: exactly 1 final text block connecting the concepts, summarizing the lesson, and previewing the next lesson.
- Keep visual HTML compact (<300 lines).
- Include analogy only when it materially helps an abstract or difficult concept.
- Every block needs a short, specific title (no generic "Introduction").
- Write in the same language as the user's topic prompt.

VISUAL BLOCK RULES:
Use visual blocks only when interaction teaches the concept. Multiple visual blocks are allowed when each has a distinct teaching purpose and the lesson still stays within the 30%-45% media rhythm.
Choose the engine that best fits the concept:
- engine "echarts": charts, data plots, function curves, histograms. Set echartsOption to a complete ECharts option object. Use Primoria palette: amber #c8881a, sage #4a7a5a, lavender #7c6ad0. Always set a chart title inside the option.
- engine "mermaid": flowcharts, sequence diagrams, ER diagrams, state machines, process flows. Set mermaidDefinition to a valid Mermaid DSL string.
- engine "physics": physics simulations (pendulum, collision, projectile, spring, inclined plane). Set physicsScene with a bodies array and optional constraints.
- engine "html" (fallback): custom interactive experiences. Single self-contained HTML fragment, must include at least one interactive control.
Only include fields for the chosen engine. Do not include "html" when using echarts/mermaid/physics.
OUTPUT:
- Return valid JSON matching the schema. No prose outside JSON.`;

export { buildKgContextPrompt };
export type { CourseContext, CourseContextTopic };

export type GenerateCourseInput = {
  topic: string;
  contextHint?: string;
  kgContext?: CourseContext;
  courseId?: string;
  ownerId?: string;
  source?: "cold_start" | "profile";
  language?: string | null;
};

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export type InitializeCourseOutlineInput = {
  ownerId: string;
  topic: string;
  kgContext?: CourseContext;
  source?: "cold_start" | "profile";
  language?: string | null;
};

export type InitializeCourseOutlineResult = {
  course: Course;
  firstLesson: Lesson;
  summary: CourseSummary;
  isNewCourse: boolean;
};

// Course-creation entry for the recoverable job path (engineering doc §12.1):
// build/reuse the Course outline of planned lessons WITHOUT calling the model,
// persist it, and return the first lesson to enqueue. No content is generated
// here and no course.generated event is emitted — the worker emits that once,
// after the first lesson is published (doc §14).
export async function initializeCourseOutline(
  input: InitializeCourseOutlineInput,
): Promise<InitializeCourseOutlineResult> {
  const { ownerId } = input;
  if (!ownerId) throw new Error("You must sign in to create a course.");
  const graphId = input.kgContext?.graphId ?? null;
  const targetTopicId = input.kgContext?.startTopic?.topicId ?? null;

  // Reuse the learner's existing Course for this subject KG, otherwise build a
  // fresh outline of planned (lazy) lessons spanning the remaining topics.
  let course = graphId ? await getCourseByGraph(ownerId, graphId) : undefined;
  const isNewCourse = !course;
  if (!course) course = buildOutlineCourse({ topic: input.topic, kgContext: input.kgContext, language: input.language }, graphId);

  const firstLesson = firstLessonForTopic(course, targetTopicId);
  if (!firstLesson) throw new Error("Course outline has no lessons to generate.");

  try {
    await saveCourse(course, ownerId);
  } catch (error) {
    if (!graphId || !isNewCourse || !isOwnerGraphUniqueViolation(error)) throw error;

    // Concurrent cold-start requests can both miss getCourseByGraph(), build
    // different random course ids, then race on courses_owner_graph_uidx. The
    // winner already created the canonical owner+graph course; reuse it.
    const existingCourse = await getCourseByGraph(ownerId, graphId);
    if (!existingCourse) throw error;

    const existingFirstLesson = firstLessonForTopic(existingCourse, targetTopicId);
    if (!existingFirstLesson) throw new Error("Course outline has no lessons to generate.");
    return {
      course: existingCourse,
      firstLesson: existingFirstLesson,
      summary: summarizeCourse(existingCourse),
      isNewCourse: false,
    };
  }
  return { course, firstLesson, summary: summarizeCourse(course), isNewCourse };
}

function firstLessonForTopic(course: Course, targetTopicId: string | null) {
  const ordered = [...course.lessons].sort((a, b) => a.sortKey - b.sortKey);
  return (targetTopicId ? ordered.find((lesson) => lesson.topicId === targetTopicId) : undefined) ?? ordered[0];
}

function isOwnerGraphUniqueViolation(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const message = error instanceof Error ? error.message : "";
  const detail = typeof record.detail === "string" ? record.detail : "";
  const constraint = typeof record.constraint === "string" ? record.constraint : "";
  return (
    record.code === "23505" &&
    (constraint === "courses_owner_graph_uidx" ||
      message.includes("courses_owner_graph_uidx") ||
      detail.includes("courses_owner_graph_uidx"))
  );
}

// All KG topics from the entry topic onward, by Topic Order (default_order).
// Falls back to a single node when the graph/topic is unknown (free-form topics).
function outlineTopicsFrom(
  graphId: string,
  startTopicId: string | null,
  fallbackName: string,
): { topicId: string | null; name: string; order: number }[] {
  let graph;
  try {
    graph = getTopicGraph(graphId);
  } catch {
    return [{ topicId: startTopicId, name: fallbackName, order: 1 }];
  }
  const start = startTopicId ? graph.topics.find((t) => t.topicId === startTopicId) : undefined;
  const startOrder = start?.defaultOrder ?? 0;
  const remaining = graph.topics
    .filter((t) => t.defaultOrder >= startOrder)
    .sort((a, b) => a.defaultOrder - b.defaultOrder)
    .map((t) => ({ topicId: t.topicId as string | null, name: t.name, order: t.defaultOrder }));
  return remaining.length > 0 ? remaining : [{ topicId: startTopicId, name: fallbackName, order: 1 }];
}

function plannedLesson(topicId: string | null, title: string, order: number, now: number): Lesson {
  return {
    id: randomId("lsn"),
    title,
    role: "new",
    progress: "not_started",
    status: "planned",
    sortKey: order,
    topicId: topicId ?? null,
    triggeredFrom: null,
    blocks: null,
    estimatedMinutes: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function subjectFor(graphId: string | null, fallback: string): string {
  if (!graphId) return fallback;
  try {
    return getTopicGraph(graphId).subject;
  } catch {
    return fallback;
  }
}

// A fresh Course: subject-level metadata + an outline of planned lessons (one per
// remaining KG topic, or a single node for free-form topics with no KG).
function buildOutlineCourse(input: GenerateCourseInput, graphId: string | null): Course {
  const now = Date.now();
  const startTopic = input.kgContext?.startTopic ?? null;
  const subject = subjectFor(graphId, input.topic);
  const outline = graphId
    ? outlineTopicsFrom(graphId, startTopic?.topicId ?? null, startTopic?.name ?? input.topic)
    : [{ topicId: null as string | null, name: input.topic, order: 1 }];
  return {
    id: input.courseId ?? randomId("crs"),
    title: subject,
    topic: subject,
    summary: graphId ? `${subject}的个性化学习路径` : input.topic,
    estimatedMinutes: 0,
    anchorConceptId: input.kgContext?.targetConceptId ?? null,
    graphId,
    language: input.language ?? null,
    lessons: outline.map((t) => plannedLesson(t.topicId, t.name, t.order, now)),
    archivedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

const BLOCK_SCHEMAS = {
  text: TextBlockSchema,
  analogy: AnalogyBlockSchema,
  transfer: TransferBlockSchema,
  visual: VisualBlockSchema,
  code: CodeBlockSchema,
  quiz: QuizBlockSchema,
} as const;

export type GeneratableBlockType = Exclude<BlockType, "mind_map" | "slide" | "worksheet">;

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3.1-flash-image";

// The image writer emits a BRIEF (no text/labels/formulas in the picture); the
// asset is generated by the imaging step, not the LLM.
const ImageBriefContentSchema = z.object({
  title: z.string(),
  learningGoal: z.string(),
  imageKind: z.enum(["educational_illustration", "structure_diagram", "realistic_scene", "analogy_illustration"]),
  prompt: z.string(),
  alt: z.string(),
  caption: z.string(),
  negativePrompt: z.string().optional(),
  aspectRatio: z.enum(["1:1", "4:3", "16:9"]).optional(),
  resolution: z.enum(["1K", "2K", "4K"]).optional(),
});

export type GenerateBlockInput = {
  course: Course;
  targetType: GeneratableBlockType;
  instruction: string;
  sourceBlock?: CourseBlock;
};

export async function generateBlock(
  input: GenerateBlockInput,
  settings: TutorProviderSettings = {},
): Promise<CourseBlock> {
  if (input.targetType === "image") return generateImageBlock(input, settings);

  const model = createTutorModel(settings);
  const schema = BLOCK_SCHEMAS[input.targetType];
  const systemPrompt = `${COURSE_SYSTEM_PROMPT}

You are now generating EXACTLY ONE block of type "${input.targetType}" for an existing course. Return only that single block as JSON matching the schema for this type. Do not return a full course.`;
  const userPrompt = buildSingleBlockPrompt(input);

  const raw = await invokeSingleBlock(model, schema, systemPrompt, userPrompt, input.targetType);
  const withType = raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>), type: input.targetType } : raw;
  const normalized = normalizeBlock(withType, input.course.topic);
  if (!normalized || normalized.type !== input.targetType) {
    throw new Error(`Could not generate a usable "${input.targetType}" block.`);
  }
  return { id: randomId("blk"), ...normalized };
}

// Image blocks don't go through schema→final-block: the LLM writes a brief and
// the imaging step generates/caches a global asset. A generation failure yields
// an inline error block, never a thrown editor error.
async function generateImageBlock(input: GenerateBlockInput, settings: TutorProviderSettings): Promise<CourseBlock> {
  const model = createTutorModel(settings);
  const systemPrompt = `${COURSE_SYSTEM_PROMPT}

You are now writing a BRIEF for ONE static teaching IMAGE block for an existing course. An image is a static cognitive anchor — a concrete object, structure, scene, or analogy picture — NOT an interactive diagram. The picture must contain NO text, labels, numbers, axes, formulas, or chemical notation (use a visual block for those). Return only the brief JSON for this single image block.`;
  const userPrompt = buildSingleBlockPrompt(input);
  const raw = await invokeSingleBlock(model, ImageBriefContentSchema, systemPrompt, userPrompt, "image");
  const parsed = ImageBriefContentSchema.parse(raw);

  const conceptIds = input.sourceBlock?.conceptIds ?? [];
  const brief: ImageBrief = {
    conceptIds,
    learningGoal: parsed.learningGoal,
    imageKind: parsed.imageKind,
    prompt: parsed.prompt,
    alt: parsed.alt,
    caption: parsed.caption,
    negativePrompt: parsed.negativePrompt,
    aspectRatio: parsed.aspectRatio,
    resolution: parsed.resolution,
    language: input.course.language ?? undefined,
  };
  const pending = makePendingImageBlock({
    id: randomId("blk"),
    title: parsed.title,
    conceptIds,
    pedagogicalRole: input.sourceBlock?.pedagogicalRole,
    brief,
  });
  // Global asset (ownerId null): the brief-keyed cache is shared across users, so
  // the asset must be globally readable or reuse would 404. See the imaging stage
  // note in lesson-generation-processor.ts.
  const [finalized] = await finalizeImageBlocks([pending], { ownerId: null, model: IMAGE_MODEL, language: input.course.language ?? null });
  return finalized;
}

function buildSingleBlockPrompt(input: GenerateBlockInput): string {
  const outline = courseBlocks(input.course)
    .map((block, i) => `${i + 1}. [${block.type}] ${block.title ?? block.type}`)
    .join("\n");
  const lines = [
    `Course title: ${input.course.title}`,
    `Course topic: ${input.course.topic}`,
    `Existing blocks:`,
    outline || "(none)",
    "",
  ];
  if (input.sourceBlock) {
    const { id: _id, ...rest } = input.sourceBlock;
    lines.push(
      `Transform the following block into a "${input.targetType}" block, preserving its teaching intent and meaning:`,
      JSON.stringify(rest, null, 2),
      "",
    );
  }
  lines.push(
    `Learner request: ${input.instruction}`,
    "",
    `Generate exactly one "${input.targetType}" block as JSON. Write in the same language as the course. Make it specific to this course, not boilerplate.`,
  );
  return lines.join("\n");
}

async function invokeSingleBlock(
  model: ReturnType<typeof createTutorModel>,
  schema: z.ZodTypeAny,
  systemPrompt: string,
  userPrompt: string,
  targetType: GeneratableBlockType,
) {
  try {
    const structured = model.withStructuredOutput(schema, { name: "course_block" });
    return await structured.invoke(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { callbacks: [] },
    );
  } catch (error) {
    console.warn("[course-generator] single-block structured output failed, falling back to JSON prompt", error);
  }

  const result = await model.invoke(
    [
      {
        role: "system",
        content: `${systemPrompt}

Your provider may not support native structured output. Return ONLY one JSON object for a "${targetType}" block. No markdown fences. No prose outside JSON.`,
      },
      { role: "user", content: userPrompt },
    ],
    { callbacks: [] },
  );

  return parseJsonObject(messageContentToString(result.content));
}

function messageContentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

function parseJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const candidates: string[] = [];
  pushUnique(candidates, trimmed);

  for (const match of trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) {
    pushUnique(candidates, match[1]);
  }
  for (const candidate of extractBalancedJsonObjects(trimmed)) {
    pushUnique(candidates, candidate);
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) pushUnique(candidates, trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    const parsed = tryParseCourseJson(candidate);
    if (parsed !== undefined) return parsed;
  }
  throw new Error(`Course generator did not return valid JSON. Preview: ${trimmed.replace(/\s+/g, " ").slice(0, 240)}`);
}

function pushUnique(candidates: string[], value: string | undefined) {
  const text = String(value ?? "").trim();
  if (text && !candidates.includes(text)) candidates.push(text);
}

function tryParseCourseJson(text: string): unknown | undefined {
  for (const variant of [text, repairLikelyJson(text)]) {
    try {
      const parsed = JSON.parse(variant) as unknown;
      if (Array.isArray(parsed)) {
        const textParts = parsed
          .map((part) => part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : "")
          .filter(Boolean)
          .join("\n");
        if (textParts) return parseJsonObject(textParts);
      }
      return parsed;
    } catch {
      // keep trying variants
    }
  }
  return undefined;
}

function extractBalancedJsonObjects(text: string) {
  const results: string[] = [];
  let start = -1;
  let depth = 0;
  let quote: string | null = null;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "\"" || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return results.sort((a, b) => b.length - a.length);
}

function repairLikelyJson(text: string) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/},\s*"type"\s*:/g, '},{"type":')
    .replace(/}\s*{/g, "},{");
}

export function normalizeCourseDraft(raw: unknown, topic: string, conceptCount?: number): z.infer<typeof CourseSchema> {
  const candidate = raw && typeof raw === "object" && "course" in raw ? (raw as { course: unknown }).course : raw;
  const obj = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : [];
  const blocks = rawBlocks
    .map((block) => normalizeBlock(block, topic))
    .filter((block): block is z.infer<typeof CourseSchema>["blocks"][number] => Boolean(block));

  const draft = {
    title: cleanText(obj.title, `${topic}课程`).slice(0, 80),
    summary: cleanText(obj.summary ?? obj.description, `一门关于「${topic}」的结构化短课程。`).slice(0, 240),
    estimatedMinutes: normalizeMinutes(obj.estimatedMinutes ?? obj.estimated_minutes, blocks.length),
    blocks,
  };

  const parsed = CourseSchema.safeParse(draft);
  if (!parsed.success || !isUsableCourseDraft(parsed.data, conceptCount, topic)) {
    throw new Error(`Course generator returned unusable course data: ${parsed.success ? "unsafe content" : parsed.error.message}`);
  }
  return parsed.data;
}

function normalizeBlock(block: unknown, topic: string): z.infer<typeof CourseSchema>["blocks"][number] | null {
  if (!block || typeof block !== "object") return null;
  const obj = block as Record<string, unknown>;
  const type = typeof obj.type === "string" ? obj.type.toLowerCase() : "text";
  const title = cleanText(obj.title, defaultBlockTitle(type, topic)).slice(0, 80);

  if (type === "analogy") {
    return {
      type: "analogy",
      title,
      source: cleanText(obj.source, "熟悉事物"),
      target: cleanText(obj.target, topic),
      mapping: cleanText(obj.mapping ?? obj.content ?? obj.markdown ?? obj.explanation, "把熟悉事物中的角色和关系对应到新概念中。"),
    };
  }

  if (type === "transfer") {
    return {
      type: "transfer",
      title,
      fromDomain: cleanText(obj.fromDomain ?? obj.from_domain, "当前主题"),
      toDomain: cleanText(obj.toDomain ?? obj.to_domain, "真实应用"),
      explanation: cleanText(obj.explanation ?? obj.content ?? obj.markdown, "把这个概念迁移到另一个场景中理解。"),
      example: cleanText(obj.example ?? obj.code, `尝试用「${topic}」解释一个生活或编程中的例子。`),
    };
  }

  if (type === "visual") {
    const engine = typeof obj.engine === "string" ? obj.engine : undefined;
    const base = {
      type: "visual" as const,
      title,
      description: cleanText(obj.description ?? obj.content ?? obj.markdown, `互动观察「${topic}」的关键关系。`).slice(0, 220),
      engine: engine as "html" | "echarts" | "mermaid" | "physics" | undefined,
    };
    if (engine === "echarts" && obj.echartsOption && typeof obj.echartsOption === "object") {
      return { ...base, echartsOption: obj.echartsOption as Record<string, unknown>, echartsHeight: typeof obj.echartsHeight === "number" ? obj.echartsHeight : undefined };
    }
    if (engine === "mermaid" && typeof obj.mermaidDefinition === "string" && obj.mermaidDefinition.trim()) {
      return { ...base, mermaidDefinition: obj.mermaidDefinition };
    }
    if (engine === "physics" && obj.physicsScene && typeof obj.physicsScene === "object") {
      return { ...base, physicsScene: obj.physicsScene as z.infer<typeof PhysicsSceneZodSchema> };
    }
    return { ...base, engine: "html" as const, html: normalizeHtml(obj.html, topic) };
  }

  if (type === "code") {
    const language = cleanText(obj.language, "python").slice(0, 30);
    return {
      type: "code",
      title,
      language,
      code: normalizeCode(obj.code ?? obj.example ?? obj.content, language),
      explanation: cleanText(obj.explanation ?? obj.content, "这段代码把数学关系写成可执行的函数。"),
    };
  }

  if (type === "quiz") {
    const rawQuestions = Array.isArray(obj.questions) ? obj.questions : [];
    const questions = rawQuestions
      .map((q: unknown) => normalizeQuizQuestion(q))
      .filter((q): q is NonNullable<ReturnType<typeof normalizeQuizQuestion>> => q !== null)
      .slice(0, 6);
    if (questions.length === 0) return null;
    return { type: "quiz", title, questions };
  }

  return {
    type: "text",
    title,
    markdown: cleanText(obj.markdown ?? obj.content ?? obj.description ?? obj.text, `围绕「${topic}」建立核心直觉。`),
  };
}

function normalizeQuizQuestion(q: unknown): z.infer<typeof SingleQuestionSchema> | z.infer<typeof MultiQuestionSchema> | z.infer<typeof TrueFalseQuestionSchema> | null {
  if (!q || typeof q !== "object") return null;
  const obj = q as Record<string, unknown>;
  const kind = typeof obj.kind === "string" ? obj.kind : "single";
  const id = cleanText(obj.id, `q${Math.random().toString(36).slice(2, 6)}`);
  const question = cleanText(obj.question, "").slice(0, 400);
  if (!question) return null;
  const explanation = typeof obj.explanation === "string" ? obj.explanation.trim() : undefined;

  if (kind === "truefalse") {
    return { kind: "truefalse", id, question, correct: obj.correct === true, explanation };
  }

  const rawChoices = Array.isArray(obj.choices) ? obj.choices : [];
  const choices = rawChoices
    .map((c: unknown) => {
      if (!c || typeof c !== "object") return null;
      const co = c as Record<string, unknown>;
      const choiceId = cleanText(co.id, `c${Math.random().toString(36).slice(2, 6)}`);
      const text = cleanText(co.text, "").slice(0, 200);
      if (!text) return null;
      return { id: choiceId, text };
    })
    .filter((c): c is { id: string; text: string } => c !== null);

  if (choices.length < 2) return null;

  if (kind === "multi") {
    const correctIds = Array.isArray(obj.correctIds)
      ? obj.correctIds.filter((cid) => typeof cid === "string" && choices.some((c) => c.id === cid))
      : [];
    if (correctIds.length === 0) return null;
    return { kind: "multi", id, question, choices, correctIds, explanation };
  }

  const correctId = typeof obj.correctId === "string" && choices.some((c) => c.id === obj.correctId)
    ? obj.correctId
    : choices[0].id;
  return { kind: "single", id, question, choices, correctId, explanation };
}

function cleanText(value: unknown, fallback: string): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function defaultBlockTitle(type: string, topic: string): string {
  switch (type) {
    case "analogy":
      return `类比理解${topic}`;
    case "transfer":
      return "迁移应用";
    case "visual":
      return "互动观察";
    case "code":
      return "代码中的函数";
    case "quiz":
      return "知识检测";
    default:
      return `理解${topic}`;
  }
}

function normalizeMinutes(value: unknown, blockCount: number): number {
  const n = Number(value);
  if (Number.isFinite(n)) return Math.max(3, Math.min(60, Math.round(n)));
  return Math.max(12, Math.min(60, (blockCount || 4) * 3));
}

function normalizeHtml(value: unknown, topic: string): string {
  const html = String(value ?? "").trim();
  const hasControl = /<(input|button|select)\b/i.test(html);
  const looksRunnable = /<([a-z][\w:-]*)(\s|>)/i.test(html) && !/yM\b|\bax\s*\+/i.test(html);
  if (html && hasControl && looksRunnable) return stripEmoji(html);

  const safeTopic = escapeHtml(topic || "函数");
  return `<div style="background:#fbf7ee;border:1px solid #c8881a;border-radius:16px;padding:18px;color:#3a352d;font-family:system-ui,sans-serif">
  <h3 style="margin:0 0 8px">互动观察：${safeTopic}</h3>
  <p style="margin:0 0 12px;color:#6b6357">拖动输入值 x，观察输出如何按固定规则变化。</p>
  <label style="display:block;margin-bottom:8px;color:#6b6357">x = <span id="xv">2</span></label>
  <input id="x" type="range" min="-5" max="5" step="1" value="2" style="width:100%">
  <div id="out" style="margin-top:12px;padding:12px;background:#fff2de;border:1.5px solid #c8881a;border-radius:12px">f(2)=5</div>
  <script>
    const x=document.getElementById('x'),xv=document.getElementById('xv'),out=document.getElementById('out');
    function draw(){const v=Number(x.value);xv.textContent=String(v);out.textContent='f('+v+') = 2×'+v+' + 1 = '+(2*v+1)}
    x.addEventListener('input',draw);draw();
  </script>
</div>`;
}

function normalizeCode(value: unknown, language: string): string {
  const code = String(value ?? "").trim();
  if (code) return fixCommonCodeTypos(code, language);
  return "def f(x):\n    return 2 * x + 1\n\nprint(f(3))  # 7";
}

function fixCommonCodeTypos(code: string, language: string): string {
  if (!/python/i.test(language)) return code;
  return code
    .replace(/return\s+([A-Za-z_][\w]*)\s*2\b/g, "return $1**2")
    .replace(/return\s+(\d+)\s*([A-Za-z_][\w]*)\b/g, "return $1 * $2")
    .replace(/return\s+([A-Za-z_][\w]*)\s*([A-Za-z_][\w]*)\s*([+-])/g, "return $1 * $2 $3");
}

function stripEmoji(text: string): string {
  return text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "");
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char] ?? char);
}

function isUsableCourseDraft(course: z.infer<typeof CourseSchema>, conceptCount?: number, topic = course.title): boolean {
  const suspicious = [
    /error/i,
    /schema/i,
    /void/i,
    /closing braces/i,
    /ignore tags/i,
    /final countdown/i,
    /deliverable/i,
    /must final/i,
    /====/,
    />>>/,
  ];

  const fields = [
    course.title,
    course.summary,
    ...course.blocks.flatMap((block) =>
      Object.entries(block)
        .filter(([key, value]) => !["html", "echartsOption", "mermaidDefinition", "physicsScene", "echartsHeight"].includes(key) && typeof value === "string")
        .map(([, value]) => value),
    ),
  ];

  if (!hasRequiredLessonComposition(course, conceptCount, topic)) return false;

  return fields.every((value) => {
    const text = String(value);
    if (text.length > 2200) return false;
    return !suspicious.some((pattern) => pattern.test(text));
  });
}

function hasRequiredLessonComposition(course: z.infer<typeof CourseSchema>, conceptCount?: number, topic = course.title): boolean {
  const count = (type: z.infer<typeof CourseSchema>["blocks"][number]["type"]) =>
    course.blocks.filter((block) => block.type === type).length;
  const normalConceptCount = conceptCount === 2 || conceptCount === 3 ? conceptCount : null;
  const baseRange = normalConceptCount === 2
    ? { min: 13, max: 15 }
    : normalConceptCount === 3
      ? { min: 16, max: 20 }
      : { min: 8, max: 20 };
  const minimumTextBlocks = normalConceptCount ? normalConceptCount + 3 : 4;
  const visualRatio = course.blocks.length ? count("visual") / course.blocks.length : 0;
  const expectedQuizCount = normalConceptCount ?? 1;

  return course.blocks.length >= baseRange.min
    && course.blocks.length <= baseRange.max
    && count("text") >= minimumTextBlocks
    && count("transfer") === 1
    && count("quiz") === expectedQuizCount
    && visualRatio >= 0.15
    && visualRatio <= 0.60
    && (count("code") === 0 || isLegacyCodeEligibleTopic(topic));
}

function isLegacyCodeEligibleTopic(topic: string): boolean {
  return isCodeEligibleTopicOrGoal(topic);
}
