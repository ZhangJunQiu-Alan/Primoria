import { z } from "zod";
import { saveCourse } from "@/lib/courses/store";
import type { BlockType, Course, CourseBlock } from "@/lib/courses/types";
import { summarizeCourse } from "@/lib/courses/types";
import type { CourseSummary } from "@/lib/courses/types";
import type { TutorProviderSettings } from "../types";
import { createTutorModel } from "./model";
import { PhysicsSceneZodSchema } from "@/lib/ai/visual-schemas";

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

type MindMapNodeRaw = { id: string; topic: string; children?: MindMapNodeRaw[] };
const MindMapNodeSchema: z.ZodType<MindMapNodeRaw> = z.lazy(() =>
  z.object({
    id: z.string(),
    topic: z.string(),
    children: z.array(MindMapNodeSchema).optional(),
  }),
);

const MindMapBlockSchema = z.object({
  type: z.literal("mind_map"),
  title: z.string(),
  root: MindMapNodeSchema,
});

const SlideSchema = z.object({
  id: z.string(),
  title: z.string(),
  layout: z.enum(["title", "bullets", "quote", "image-text"]),
  bullets: z.array(z.string()).optional(),
  markdown: z.string().optional(),
  note: z.string().optional(),
});

const SlideBlockSchema = z.object({
  type: z.literal("slide"),
  title: z.string(),
  slides: z.array(SlideSchema).min(2).max(10),
});

const ShortAnswerItemSchema = z.object({
  kind: z.literal("short_answer"),
  id: z.string(),
  prompt: z.string(),
  hint: z.string().optional(),
  sampleAnswer: z.string().optional(),
});

const FillBlankItemSchema = z.object({
  kind: z.literal("fill_blank"),
  id: z.string(),
  prompt: z.string(),
  hint: z.string().optional(),
  blanks: z.array(z.string()).min(1),
});

const ProblemItemSchema = z.object({
  kind: z.literal("problem"),
  id: z.string(),
  prompt: z.string(),
  hint: z.string().optional(),
  sampleAnswer: z.string().optional(),
});

const WorksheetBlockSchema = z.object({
  type: z.literal("worksheet"),
  title: z.string(),
  items: z.array(
    z.discriminatedUnion("kind", [ShortAnswerItemSchema, FillBlankItemSchema, ProblemItemSchema]),
  ).min(1).max(8),
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
        MindMapBlockSchema,
        SlideBlockSchema,
        WorksheetBlockSchema,
      ]),
    )
    .min(3)
    .max(8),
});

const COURSE_SYSTEM_PROMPT = `You are Primoria's Course Generator sub-agent. You design a single short, deeply learnable course on a topic, broken into 4-7 ordered blocks.

Block types (use the right type for each idea, do NOT just use text):
- text: prose in markdown. Use for concept explanations (2-4 paragraphs), OR a "Further reading" section with 2-3 markdown links to real resources, OR a "Discussion" section with 2-3 open-ended reflection questions.
- analogy: map an unfamiliar concept to a familiar one. Fields: source (familiar thing), target (concept being taught), mapping (what corresponds to what).
- transfer: show how a principle from one domain applies in another. Fields: fromDomain, toDomain, explanation, example.
- visual: a self-contained interactive HTML/CSS/JS fragment that visualizes a key intuition.
- code: a small code snippet with a plain-language explanation.
- quiz: a set of 2-4 questions to check understanding. Each question has a "kind": "single" (one correct answer), "multi" (multiple correct answers), or "truefalse" (true/false). All questions must have an "id" (short unique string like "q1"), a "question" string, and an optional "explanation" shown after submission. For "single" and "multi", include a "choices" array of {id, text} objects. For "single" set "correctId" to the correct choice id. For "multi" set "correctIds" to an array of correct choice ids. For "truefalse" set "correct" to true or false.
- mind_map: an interactive, editable mind map. Use when the topic has a meaningful taxonomy, multi-branch categorization, or a knowledge overview with many sub-concepts. Do NOT use a mermaid mindmap inside a visual block — always use this block type for that purpose. Set "root" to a JSON node tree where each node has "id" (short unique string), "topic" (label text, max 40 chars), and optional "children" array. The root is the central concept; aim for 2-3 levels, 8-20 nodes total.
- slide: a mini slide deck (2-6 slides). Use for step-by-step walkthroughs, processes, timelines, or comparisons. Each slide has "id" (short unique string), "title", "layout" ("title"|"bullets"|"quote"|"image-text"), and optionally "bullets" (string array), "markdown" (prose), "note" (speaker note). Use "title" layout for the opening slide, "bullets" for key points, "quote" for a memorable statement, "image-text" for explanation + supporting details.
- worksheet: a practice worksheet with 2-5 items. Use for active recall and application. Each item has "kind": "short_answer" (open question + sampleAnswer), "fill_blank" (sentence with ___ placeholders + blanks array of answers in order, one per ___), or "problem" (multi-step problem + sampleAnswer). All items need "id" (short unique string) and "prompt". Optional "hint". For fill_blank, count the number of ___ in the prompt and provide exactly that many entries in "blanks".

COURSE STRUCTURE RULES:
- 4-7 blocks total. Order them as a learning arc: hook → core idea → one analogy → one visual or code → transfer to a different domain → quiz → wrap-up.
- Include AT MOST ONE visual block per course. Keep its HTML compact (<300 lines).
- Include at least one analogy block and one transfer block.
- Include AT MOST ONE quiz block per course, placed near the end as a comprehension check.
- Include AT MOST ONE mind_map block per course. Use it to show a concept overview or taxonomy, typically early in the course.
- Include AT MOST ONE slide block per course. Use it for a process walkthrough or step-by-step overview.
- Include AT MOST ONE worksheet block per course. Place it after the core content as a practice exercise.
- Every block needs a short, specific title (no generic "Introduction").
- Write in the same language as the user's topic prompt.

VISUAL BLOCK RULES (include at most one per course):
Choose the engine that best fits the concept:
- engine "echarts": charts, data plots, function curves, histograms, bar/line/scatter. Set echartsOption to a complete ECharts option object. Use Primoria palette: amber #c8881a, sage #4a7a5a, lavender #7c6ad0. Always set a chart title inside the option.
- engine "mermaid": flowcharts, sequence diagrams, ER diagrams, state machines, process flows. Set mermaidDefinition to a valid Mermaid DSL string. Do NOT use mermaid mindmap syntax — use a mind_map block instead.
- engine "physics": physics simulations (pendulum, collision, projectile, spring, inclined plane). Set physicsScene with a bodies array and optional constraints. NEVER write simulation code — the renderer handles physics automatically.
- engine "html" (fallback): custom interactive experiences not covered above. Single self-contained HTML fragment, no external scripts, must include at least one interactive control (slider, button, toggle).
Only include fields for the chosen engine. Do not include "html" when using echarts/mermaid/physics.

OUTPUT:
- Return valid JSON matching the schema. No prose outside JSON.`;

export type GenerateCourseInput = {
  topic: string;
  contextHint?: string;
};

export type GenerateCourseResult = {
  course: Course;
  summary: CourseSummary;
};

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function generateCourse(
  input: GenerateCourseInput,
  settings: TutorProviderSettings = {},
): Promise<GenerateCourseResult> {
  const model = createTutorModel(settings);

  const userPrompt = [
    `Topic: ${input.topic}`,
    input.contextHint ? `Prior context from chat: ${input.contextHint}` : "",
    "",
    "Generate the course as JSON. Make every block specific to this topic, not boilerplate.",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await invokeCourseJson(model, userPrompt, input.topic);
  const draft = normalizeCourseDraft(raw, input.topic);

  const now = Date.now();
  const blocks: CourseBlock[] = draft.blocks.map((block) => ({
    id: randomId("blk"),
    ...block,
  }));

  const course: Course = {
    id: randomId("crs"),
    title: draft.title,
    topic: input.topic,
    summary: draft.summary,
    estimatedMinutes: draft.estimatedMinutes,
    blocks,
    archivedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await saveCourse(course);

  return { course, summary: summarizeCourse(course) };
}

const BLOCK_SCHEMAS = {
  text: TextBlockSchema,
  analogy: AnalogyBlockSchema,
  transfer: TransferBlockSchema,
  visual: VisualBlockSchema,
  code: CodeBlockSchema,
  quiz: QuizBlockSchema,
  mind_map: MindMapBlockSchema,
  slide: SlideBlockSchema,
  worksheet: WorksheetBlockSchema,
} as const satisfies Record<BlockType, z.ZodTypeAny>;

export type GenerateBlockInput = {
  course: Course;
  targetType: BlockType;
  instruction: string;
  sourceBlock?: CourseBlock; // present when transforming an existing block
};

// Generate a single course block of a target type, reusing the course generator's
// per-type schema and normalization. Used by the course editor for add/transform.
export async function generateBlock(
  input: GenerateBlockInput,
  settings: TutorProviderSettings = {},
): Promise<CourseBlock> {
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

function buildSingleBlockPrompt(input: GenerateBlockInput): string {
  const outline = input.course.blocks
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
  targetType: BlockType,
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

async function invokeCourseJson(model: ReturnType<typeof createTutorModel>, userPrompt: string, topic: string) {
  try {
    const structured = model.withStructuredOutput(CourseSchema, { name: "course" });
    return await structured.invoke(
      [
        { role: "system", content: COURSE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      { callbacks: [] },
    );
  } catch (error) {
    console.warn("[course-generator] structured output failed, falling back to JSON prompt", error);
  }

  const result = await model.invoke(
    [
      {
      role: "system",
      content: `${COURSE_SYSTEM_PROMPT}

Your provider may not support native structured output. You must still return ONLY one JSON object with this shape:
{
  "title": "string",
  "summary": "string",
  "estimatedMinutes": 12,
  "blocks": [
    { "type": "text", "title": "string", "markdown": "string" },
    { "type": "analogy", "title": "string", "source": "string", "target": "string", "mapping": "string" },
    { "type": "transfer", "title": "string", "fromDomain": "string", "toDomain": "string", "explanation": "string", "example": "string" },
    { "type": "visual", "title": "string", "description": "string", "engine": "echarts|mermaid|physics|html", "echartsOption": {}, "mermaidDefinition": "string", "html": "string" },
    { "type": "code", "title": "string", "language": "string", "code": "string", "explanation": "string" },
    { "type": "slide", "title": "string", "slides": [{ "id": "s1", "title": "string", "layout": "bullets", "bullets": ["point 1"] }] },
    { "type": "worksheet", "title": "string", "items": [{ "kind": "fill_blank", "id": "w1", "prompt": "The ___ is used to ___", "blanks": ["term", "purpose"] }, { "kind": "short_answer", "id": "w2", "prompt": "Explain X in your own words.", "sampleAnswer": "..." }] }
  ]
}
No markdown fences. No prose outside JSON.`,
    },
      { role: "user", content: userPrompt },
    ],
    { callbacks: [] },
  );

  try {
    return parseJsonObject(messageContentToString(result.content));
  } catch (error) {
    console.warn("[course-generator] JSON compatibility mode failed", error);
    throw new Error("Course generator returned invalid JSON. Please retry or use a model with better JSON support.");
  }
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

export function normalizeCourseDraft(raw: unknown, topic: string): z.infer<typeof CourseSchema> {
  const candidate = raw && typeof raw === "object" && "course" in raw ? (raw as { course: unknown }).course : raw;
  const obj = candidate && typeof candidate === "object" ? (candidate as Record<string, unknown>) : {};
  const rawBlocks = Array.isArray(obj.blocks) ? obj.blocks : [];
  const blocks = rawBlocks
    .map((block) => normalizeBlock(block, topic))
    .filter((block): block is z.infer<typeof CourseSchema>["blocks"][number] => Boolean(block))
    .slice(0, 8);

  const draft = {
    title: cleanText(obj.title, `${topic}课程`).slice(0, 80),
    summary: cleanText(obj.summary ?? obj.description, `一门关于「${topic}」的结构化短课程。`).slice(0, 240),
    estimatedMinutes: normalizeMinutes(obj.estimatedMinutes ?? obj.estimated_minutes, blocks.length),
    blocks,
  };

  const parsed = CourseSchema.safeParse(draft);
  if (!parsed.success || !isUsableCourseDraft(parsed.data)) {
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

  if (type === "mind_map") {
    const root = normalizeMindMapNode(obj.root ?? obj.nodeData, topic);
    if (!root) return null;
    return { type: "mind_map", title, root };
  }

  if (type === "slide") {
    const rawSlides = Array.isArray(obj.slides) ? obj.slides : [];
    const slides = rawSlides
      .map((s: unknown, i: number) => normalizeSlide(s, i))
      .filter((s): s is z.infer<typeof SlideSchema> => s !== null);
    if (slides.length === 0) return null;
    return { type: "slide", title, slides };
  }

  if (type === "worksheet") {
    const rawItems = Array.isArray(obj.items) ? obj.items : [];
    const items = rawItems
      .map((item: unknown, i: number) => normalizeWorksheetItem(item, i))
      .filter((item): item is z.infer<typeof WorksheetBlockSchema>["items"][number] => item !== null);
    if (items.length === 0) return null;
    return { type: "worksheet", title, items };
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

function normalizeWorksheetItem(item: unknown, index: number): z.infer<typeof WorksheetBlockSchema>["items"][number] | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  const kind = typeof obj.kind === "string" ? obj.kind : "short_answer";
  const id = cleanText(obj.id, `w${index + 1}`);
  const prompt = cleanText(obj.prompt ?? obj.question ?? obj.text, "").slice(0, 600);
  if (!prompt) return null;
  const hint = typeof obj.hint === "string" && obj.hint.trim() ? obj.hint.trim() : undefined;

  if (kind === "fill_blank") {
    const blanksInPrompt = (prompt.match(/___/g) ?? []).length;
    const rawBlanks = Array.isArray(obj.blanks)
      ? obj.blanks.filter((b): b is string => typeof b === "string" && b.trim().length > 0)
      : [];
    const blanks = blanksInPrompt > 0
      ? rawBlanks.slice(0, blanksInPrompt).concat(
          Array(Math.max(0, blanksInPrompt - rawBlanks.length)).fill("…"),
        )
      : rawBlanks;
    if (blanks.length === 0) return null;
    return { kind: "fill_blank", id, prompt, ...(hint ? { hint } : {}), blanks };
  }

  const sampleAnswer = typeof obj.sampleAnswer === "string" && obj.sampleAnswer.trim()
    ? obj.sampleAnswer.trim()
    : typeof obj.answer === "string" && obj.answer.trim()
    ? obj.answer.trim()
    : undefined;

  if (kind === "problem") {
    return { kind: "problem", id, prompt, ...(hint ? { hint } : {}), ...(sampleAnswer ? { sampleAnswer } : {}) };
  }
  return { kind: "short_answer", id, prompt, ...(hint ? { hint } : {}), ...(sampleAnswer ? { sampleAnswer } : {}) };
}

function normalizeSlide(s: unknown, index: number): z.infer<typeof SlideSchema> | null {
  if (!s || typeof s !== "object") return null;
  const obj = s as Record<string, unknown>;
  const id = cleanText(obj.id, `s${index + 1}`);
  const title = cleanText(obj.title, `Slide ${index + 1}`).slice(0, 80);
  const validLayouts = ["title", "bullets", "quote", "image-text"] as const;
  const layout: (typeof validLayouts)[number] =
    validLayouts.includes(obj.layout as (typeof validLayouts)[number]) ? (obj.layout as (typeof validLayouts)[number]) : "bullets";
  const bullets = Array.isArray(obj.bullets)
    ? obj.bullets.filter((b): b is string => typeof b === "string" && b.trim().length > 0).slice(0, 8)
    : undefined;
  const markdown = typeof obj.markdown === "string" && obj.markdown.trim() ? obj.markdown.trim() : undefined;
  const note = typeof obj.note === "string" && obj.note.trim() ? obj.note.trim() : undefined;
  return { id, title, layout, ...(bullets && bullets.length > 0 ? { bullets } : {}), ...(markdown ? { markdown } : {}), ...(note ? { note } : {}) };
}

function normalizeMindMapNode(node: unknown, topicFallback: string): MindMapNodeRaw | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  const topic = cleanText(obj.topic ?? obj.name ?? obj.label, topicFallback).slice(0, 80);
  const id = cleanText(obj.id, `n${Math.random().toString(36).slice(2, 8)}`);
  const rawChildren = Array.isArray(obj.children) ? obj.children : [];
  const children = rawChildren
    .map((c: unknown) => normalizeMindMapNode(c, ""))
    .filter((c): c is MindMapNodeRaw => c !== null);
  return { id, topic, ...(children.length > 0 ? { children } : {}) };
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
    case "mind_map":
      return `${topic}概念图`;
    case "slide":
      return `${topic}要点`;
    case "worksheet":
      return `${topic}练习`;
    default:
      return `理解${topic}`;
  }
}

function normalizeMinutes(value: unknown, blockCount: number): number {
  const n = Number(value);
  if (Number.isFinite(n)) return Math.max(3, Math.min(60, Math.round(n)));
  return Math.max(8, Math.min(24, (blockCount || 4) * 3));
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

function isUsableCourseDraft(course: z.infer<typeof CourseSchema>): boolean {
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

  return fields.every((value) => {
    const text = String(value);
    if (text.length > 2200) return false;
    return !suspicious.some((pattern) => pattern.test(text));
  });
}
