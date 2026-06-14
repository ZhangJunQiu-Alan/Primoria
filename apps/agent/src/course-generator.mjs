// @ts-check

import { z } from "zod";
import { saveCourse } from "./course-store.mjs";
import { summarizeCourse } from "./course-types.mjs";

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

const PhysicsBodySchema = z.object({
  id: z.string(),
  shape: z.enum(["circle", "rectangle", "polygon"]),
  x: z.number(),
  y: z.number(),
  radius: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  vertices: z.array(z.object({ x: z.number(), y: z.number() })).optional(),
  isStatic: z.boolean().optional(),
  density: z.number().optional(),
  friction: z.number().optional(),
  restitution: z.number().optional(),
  frictionAir: z.number().optional(),
  angle: z.number().optional(),
  velocity: z.object({ x: z.number(), y: z.number() }).optional(),
  label: z.string().optional(),
  render: z.object({
    fillStyle: z.string().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: z.number().optional(),
  }).optional(),
});

const PhysicsConstraintSchema = z.object({
  bodyAId: z.string(),
  bodyBId: z.string().nullable(),
  pointA: z.object({ x: z.number(), y: z.number() }).optional(),
  pointB: z.object({ x: z.number(), y: z.number() }).optional(),
  length: z.number().optional(),
  stiffness: z.number().optional(),
  damping: z.number().optional(),
  render: z.object({
    visible: z.boolean().optional(),
    strokeStyle: z.string().optional(),
    lineWidth: z.number().optional(),
  }).optional(),
});

const PhysicsSceneSchema = z.object({
  gravity: z.object({ x: z.number(), y: z.number() }).optional(),
  walls: z.object({
    top: z.boolean().optional(),
    bottom: z.boolean().optional(),
    left: z.boolean().optional(),
    right: z.boolean().optional(),
  }).optional(),
  bodies: z.array(PhysicsBodySchema),
  constraints: z.array(PhysicsConstraintSchema).optional(),
  render: z.object({
    width: z.number(),
    height: z.number(),
    background: z.string().optional(),
  }),
  timeScale: z.number().optional(),
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
  physicsScene: PhysicsSceneSchema.optional(),
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

/** @type {z.ZodType<{ id: string; topic: string; children?: any[] }>} */
const MindMapNodeSchema = z.lazy(() =>
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
  items: z
    .array(z.discriminatedUnion("kind", [ShortAnswerItemSchema, FillBlankItemSchema, ProblemItemSchema]))
    .min(1)
    .max(8),
});

const BlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  AnalogyBlockSchema,
  TransferBlockSchema,
  VisualBlockSchema,
  CodeBlockSchema,
  QuizBlockSchema,
  MindMapBlockSchema,
  SlideBlockSchema,
  WorksheetBlockSchema,
]);

const CourseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number().int().min(3).max(60),
  blocks: z.array(BlockSchema).min(3).max(8),
});

const OutlineBlockSchema = z.object({
  type: z.enum(["text", "analogy", "transfer", "visual", "code", "quiz", "mind_map", "slide", "worksheet"]),
  title: z.string(),
  goal: z.string(),
});

const CourseOutlineSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number().int().min(3).max(60),
  blocks: z.array(OutlineBlockSchema).min(3).max(6),
});

const FastCourseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number().int().min(3).max(60),
  blocks: z.array(z.discriminatedUnion("type", [
    TextBlockSchema,
    AnalogyBlockSchema,
    TransferBlockSchema,
    VisualBlockSchema,
    CodeBlockSchema,
    QuizBlockSchema,
    MindMapBlockSchema,
    SlideBlockSchema,
    WorksheetBlockSchema,
  ])).min(4).max(7),
});

const FAST_COURSE_SYSTEM_PROMPT = `You are Primoria's Course Generator. Generate one real short course as structured JSON.

Use 4-6 ordered blocks forming a learning arc: hook → core idea → analogy → (optional richer block) → transfer → wrap-up.
Always include at least one text, one analogy, and one transfer block.
Choose the RIGHT block type for each idea — do NOT make everything text.

Block JSON shapes:
- text: { "type":"text", "title":"...", "markdown":"..." }
- analogy: { "type":"analogy", "title":"...", "source":"...", "target":"...", "mapping":"..." }
- transfer: { "type":"transfer", "title":"...", "fromDomain":"...", "toDomain":"...", "explanation":"...", "example":"..." }
- code: { "type":"code", "title":"...", "language":"python", "code":"...", "explanation":"..." }
- visual: { "type":"visual", "title":"...", "description":"...", "engine":"echarts|mermaid|physics|html", ...engine fields }
- quiz: { "type":"quiz", "title":"...", "questions":[ { "kind":"single", "id":"q1", "question":"...", "choices":[{"id":"a","text":"..."},{"id":"b","text":"..."}], "correctId":"a", "explanation":"..." } ] }  (kinds: "single" → correctId; "multi" → correctIds:[...]; "truefalse" → correct:true|false, no choices)
- mind_map: { "type":"mind_map", "title":"...", "root":{ "id":"r", "topic":"...", "children":[ { "id":"n1", "topic":"...", "children":[...] } ] } }
- slide: { "type":"slide", "title":"...", "slides":[ { "id":"s1", "title":"...", "layout":"title|bullets|quote|image-text", "bullets":["..."], "markdown":"...", "note":"..." } ] }
- worksheet: { "type":"worksheet", "title":"...", "items":[ { "kind":"short_answer|fill_blank|problem", "id":"i1", "prompt":"...", "hint":"...", "sampleAnswer":"...", "blanks":["..."] } ] }

Rules:
- visual / code / quiz / mind_map / slide / worksheet are OPTIONAL and AT MOST ONE each. Add one only when it genuinely helps THIS topic; otherwise omit it.
- quiz: 2-4 questions, place near the end as a comprehension check.
- mind_map: only for taxonomies / overviews with many sub-concepts; 8-20 nodes, 2-3 levels.
- slide: only for step-by-step processes, timelines, or comparisons; 2-6 slides.
- worksheet: 2-5 practice items for active recall. For fill_blank, "blanks" has one answer per "___" in the prompt.
- visual: echarts for charts/plots, mermaid for diagrams/flows, physics for simulations (set physicsScene JSON, never write simulation code), html otherwise (must include an interactive control). Only include fields for the chosen engine.
- code: only when executable examples help. Use real runnable code.
- Return a single JSON object with title, summary, estimatedMinutes, blocks. Do not return flat keys.
- Same language as the user. Be concise but specific. No boilerplate. No prose outside JSON.`;

const OUTLINE_SYSTEM_PROMPT = `You are Primoria's Course Planner. Plan a real short course as compact JSON.

Return only:
{
  "title": "string",
  "summary": "string",
  "estimatedMinutes": 8,
  "blocks": [
    { "type": "text", "title": "string", "goal": "string" },
    { "type": "analogy", "title": "string", "goal": "string" },
    { "type": "transfer", "title": "string", "goal": "string" },
    { "type": "code", "title": "string", "goal": "string" }
  ]
}

Rules:
- 4-6 blocks. Include at least one analogy and one transfer.
- Allowed types: text, analogy, transfer, code, visual, quiz, mind_map, slide, worksheet.
- Choose the right type per block; do not make everything text. Each optional type (code/visual/quiz/mind_map/slide/worksheet) appears AT MOST ONCE and only when it fits this topic.
- visual only if the user asks for visualization/interactive/demo OR the topic is strongly process/spatial (sorting, stack, queue, graph traversal, physics motion).
- quiz near the end; mind_map for taxonomies/overviews; slide for step-by-step processes; worksheet for practice.
- The outline is only a plan: do not write long body content here.
- Same language as the user. No markdown fences. No prose outside JSON.`;

const BLOCK_SYSTEM_PROMPT = `You are Primoria's Course Block Writer. Generate exactly one course block as compact valid JSON.

Schemas:
- text: {"type":"text","title":"...","markdown":"..."}
- analogy: {"type":"analogy","title":"...","source":"...","target":"...","mapping":"..."}
- transfer: {"type":"transfer","title":"...","fromDomain":"...","toDomain":"...","explanation":"...","example":"..."}
- code: {"type":"code","title":"...","language":"...","code":"...","explanation":"..."}
- visual: {"type":"visual","title":"...","description":"...","engine":"echarts|mermaid|physics|html","echartsOption":{...},"mermaidDefinition":"...","html":"..."}
- quiz: {"type":"quiz","title":"...","questions":[{"kind":"single","id":"q1","question":"...","choices":[{"id":"a","text":"..."}],"correctId":"a","explanation":"..."}]} (kinds: single→correctId, multi→correctIds[], truefalse→correct:boolean)
- mind_map: {"type":"mind_map","title":"...","root":{"id":"r","topic":"...","children":[{"id":"n1","topic":"..."}]}}
- slide: {"type":"slide","title":"...","slides":[{"id":"s1","title":"...","layout":"title|bullets|quote|image-text","bullets":["..."],"markdown":"...","note":"..."}]}
- worksheet: {"type":"worksheet","title":"...","items":[{"kind":"short_answer|fill_blank|problem","id":"i1","prompt":"...","hint":"...","sampleAnswer":"...","blanks":["..."]}]}

Rules:
- Generate only the requested block type.
- Keep text concise and specific; no boilerplate.
- For visual, choose the engine that best fits: "echarts" for charts/plots, "mermaid" for diagrams/flows, "physics" for simulations, "html" for other interactive. Only include fields for the chosen engine. Do not write simulation code — set physicsScene JSON for physics.
- Same language as the course topic. No markdown fences. No prose outside JSON.`;

const BLOCK_CONCURRENCY = Number(process.env.PRIMORIA_COURSE_BLOCK_CONCURRENCY ?? 4);
const COURSE_GENERATION_MODE = process.env.PRIMORIA_COURSE_GENERATION_MODE ?? "fast";

/**
 * @template T
 * @param {T | null | undefined | false} value
 * @returns {value is T}
 */
function isPresent(value) {
  return Boolean(value);
}

/**
 * @param {string} prefix
 */
function randomId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/**
 * @param {{ topic: string; contextHint?: string }} input
 * @param {{ invoke: Function }} model
 * @param {{ ownerId?: string | null; courseId?: string }} [options]
 */
export async function generateCourse(input, model, options = {}) {
  const draft = COURSE_GENERATION_MODE === "blocks"
    ? await generateCourseByBlocks(input, model)
    : await generateCourseFast(input, model);

  const now = Date.now();
  const course = {
    id: options.courseId ?? randomId("crs"),
    title: draft.title,
    topic: input.topic,
    summary: draft.summary,
    estimatedMinutes: draft.estimatedMinutes,
    blocks: draft.blocks.map((/** @type {any} */ block) => ({
      id: block.id ?? randomId("blk"),
      ...block,
    })),
    archivedAt: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await saveCourse(course, options.ownerId);

  return { course, summary: summarizeCourse(course) };
}

/**
 * One real model call. This is the default because CopilotKit/LangGraph's SSE
 * path can terminate around 60s if the course tool takes too long.
 * @param {{ topic: string; contextHint?: string }} input
 * @param {{ invoke: Function; withStructuredOutput?: Function }} model
 */
async function generateCourseFast(input, model) {
  const prompt = [
    `Topic: ${input.topic}`,
    input.contextHint ? `Prior context from chat: ${input.contextHint}` : "",
    "Generate the full course now.",
  ].filter(Boolean).join("\n");

  const raw = prefersTextJson(model) ? null : await invokeStructuredJson(model, FastCourseSchema, "course", FAST_COURSE_SYSTEM_PROMPT, prompt);
  if (raw) {
    try {
      return normalizeCourseDraft(raw, input.topic);
    } catch {
      // Some Anthropic-compatible providers acknowledge the forced tool call but
      // return empty/partial tool args. Fall through to plain JSON text instead
      // of fabricating fallback course content.
    }
  }

  const text = await invokeJsonText(model, FAST_COURSE_SYSTEM_PROMPT, prompt, "course");
  return normalizeCourseDraft(parseJsonObject(text), input.topic);
}

/**
 * Slower outline -> parallel blocks mode, useful when provider/transport is stable.
 * @param {{ topic: string; contextHint?: string }} input
 * @param {{ invoke: Function }} model
 */
async function generateCourseByBlocks(input, model) {
  const outlineRaw = await invokeCourseOutline(model, input);
  const outline = normalizeCourseOutline(outlineRaw, input.topic);

  const blocks = await mapWithConcurrency(outline.blocks, Math.max(1, Math.min(5, BLOCK_CONCURRENCY)), async (outlineBlock, index) => {
    const raw = await invokeCourseBlock(model, {
      topic: input.topic,
      courseTitle: outline.title,
      courseSummary: outline.summary,
      outlineBlock,
      index,
      total: outline.blocks.length,
    });
    const block = normalizeBlock(raw, input.topic) ?? normalizeBlock({ ...raw, ...outlineBlock }, input.topic);
    if (!block) throw new Error(`Course block ${index + 1} returned unusable data.`);
    return { id: randomId("blk"), ...block };
  });

  return normalizeCourseDraft(
    {
      title: outline.title,
      summary: outline.summary,
      estimatedMinutes: outline.estimatedMinutes,
      blocks,
    },
    input.topic,
  );
}

/**
 * @param {{ invoke: Function }} model
 * @param {{ topic: string; contextHint?: string }} input
 */
async function invokeCourseOutline(model, input) {
  const prompt = [
    `Topic: ${input.topic}`,
    input.contextHint ? `Prior context from chat: ${input.contextHint}` : "",
    "Plan the course outline only.",
  ].filter(Boolean).join("\n");

  const structured = prefersTextJson(model) ? null : await invokeStructuredJson(model, CourseOutlineSchema, "course_outline", OUTLINE_SYSTEM_PROMPT, prompt);
  if (structured) {
    try {
      return normalizeCourseOutline(structured, input.topic);
    } catch {
      // Fall through to provider-generated JSON text when structured tool args
      // are empty/partial.
    }
  }

  const text = await invokeJsonText(model, OUTLINE_SYSTEM_PROMPT, prompt, "outline");
  return parseJsonObject(text);
}

/**
 * @param {{ invoke: Function }} model
 * @param {{ topic: string; courseTitle: string; courseSummary: string; outlineBlock: z.infer<typeof OutlineBlockSchema>; index: number; total: number }} input
 */
async function invokeCourseBlock(model, input) {
  const prompt = [
    `Course topic: ${input.topic}`,
    `Course title: ${input.courseTitle}`,
    `Course summary: ${input.courseSummary}`,
    `Block ${input.index + 1} of ${input.total}:`,
    JSON.stringify(input.outlineBlock),
    "Generate this one block only.",
  ].join("\n");

  const schema = schemaForBlockType(input.outlineBlock.type);
  const structured = prefersTextJson(model) ? null : await invokeStructuredJson(model, schema, `course_${input.outlineBlock.type}_block`, BLOCK_SYSTEM_PROMPT, prompt);
  if (structured) {
    const block = normalizeBlock(structured, input.topic);
    if (block) return structured;
  }

  const text = await invokeJsonText(model, BLOCK_SYSTEM_PROMPT, prompt, `block ${input.index + 1}`);
  return parseJsonObject(text);
}

/**
 * MiniMax Anthropic-compatible responses are more reliable as explicit JSON
 * text than as Anthropic forced tool calls for this course generator.
 * This still uses the real model output; it only changes the transport format.
 * @param {any} model
 */
function prefersTextJson(model) {
  const name = String(model?.model ?? model?.modelName ?? "").toLowerCase();
  return name.includes("minimax");
}

/**
 * @param {{ invoke: Function; withStructuredOutput?: Function }} model
 * @param {z.ZodTypeAny} schema
 * @param {string} name
 * @param {string} system
 * @param {string} user
 */
async function invokeStructuredJson(model, schema, name, system, user) {
  if (typeof model.withStructuredOutput !== "function") return null;
  try {
    const structured = model.withStructuredOutput(schema, { name, method: "jsonSchema" });
    return await structured.invoke(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { callbacks: [] },
    );
  } catch {
    return null;
  }
}

/**
 * @param {z.infer<typeof OutlineBlockSchema>["type"]} type
 */
function schemaForBlockType(type) {
  switch (type) {
    case "analogy":
      return AnalogyBlockSchema;
    case "transfer":
      return TransferBlockSchema;
    case "visual":
      return VisualBlockSchema;
    case "code":
      return CodeBlockSchema;
    case "quiz":
      return QuizBlockSchema;
    case "mind_map":
      return MindMapBlockSchema;
    case "slide":
      return SlideBlockSchema;
    case "worksheet":
      return WorksheetBlockSchema;
    default:
      return TextBlockSchema;
  }
}

/**
 * @param {{ invoke: Function }} model
 * @param {string} system
 * @param {string} user
 * @param {string} label
 */
async function invokeJsonText(model, system, user, label) {
  const result = await model.invoke(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { callbacks: [] },
  );
  const text = messageContentToString(result.content);
  const meta = result?.response_metadata ?? {};
  const usage = result?.usage_metadata ?? {};
  const stopReason = meta.stop_reason ?? meta.finish_reason ?? meta.stopReason ?? "unknown";
  console.warn(
    `[course-generator] ${label}: stop_reason=${stopReason} outputChars=${text.length} ` +
      `inTok=${usage.input_tokens ?? "?"} outTok=${usage.output_tokens ?? "?"}`,
  );
  if (stopReason === "max_tokens" || stopReason === "length") {
    console.warn(`[course-generator] ${label} HIT TOKEN LIMIT — output was truncated.`);
  }
  if (!text.trim()) throw new Error(`Course generator returned empty ${label}.`);
  return text;
}

/**
 * @template T,U
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<U>} worker
 * @returns {Promise<U[]>}
 */
async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * @param {unknown} raw
 * @param {string} topic
 * @returns {z.infer<typeof CourseOutlineSchema>}
 */
function normalizeCourseOutline(raw, topic) {
  const candidate = raw && typeof raw === "object" && "course" in raw ? /** @type {any} */ (raw).course : raw;
  const obj = candidate && typeof candidate === "object" ? /** @type {Record<string, any>} */ (candidate) : {};
  const blocks = Array.isArray(obj.blocks)
    ? obj.blocks.map((block) => normalizeOutlineBlock(block, topic)).filter(isPresent)
    : [];

  const draft = {
    title: cleanText(obj.title, `${topic}课程`).slice(0, 80),
    summary: cleanText(obj.summary ?? obj.description, `一门关于「${topic}」的结构化短课程。`).slice(0, 240),
    estimatedMinutes: normalizeMinutes(obj.estimatedMinutes ?? obj.estimated_minutes, blocks.length),
    blocks: ensureRequiredOutlineBlocks(blocks, topic).slice(0, 4),
  };

  const parsed = CourseOutlineSchema.safeParse(draft);
  if (!parsed.success) {
    throw new Error(`Course outline returned unusable data: ${parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * @param {any} block
 * @param {string} topic
 */
function normalizeOutlineBlock(block, topic) {
  if (!block || typeof block !== "object") return null;
  const type = normalizeBlockType(inferBlockType(block));
  return {
    type,
    title: cleanText(block.title, defaultBlockTitle(type, topic)).slice(0, 80),
    goal: cleanText(block.goal ?? block.description ?? block.content ?? block.markdown, `讲清楚「${topic}」的一个关键点。`).slice(0, 220),
  };
}

/**
 * @param {Array<z.infer<typeof OutlineBlockSchema>>} blocks
 * @param {string} topic
 */
function ensureRequiredOutlineBlocks(blocks, topic) {
  const next = blocks.length > 0 ? [...blocks] : [
    { type: "text", title: `理解${topic}`, goal: `建立「${topic}」的核心直觉。` },
  ];
  if (!next.some((block) => block.type === "analogy")) {
    next.splice(Math.min(1, next.length), 0, { type: "analogy", title: `类比理解${topic}`, goal: "用熟悉事物建立映射。" });
  }
  if (!next.some((block) => block.type === "transfer")) {
    next.splice(Math.min(3, next.length), 0, { type: "transfer", title: "迁移应用", goal: "把同一原则迁移到另一个场景。" });
  }
  return next;
}

/**
 * Accepts provider variants such as MiniMax returning { course: { description, blocks[].content } }.
 * This keeps generation model-driven while normalizing into Primoria's persisted course schema.
 * @param {unknown} raw
 * @param {string} topic
 * @returns {z.infer<typeof CourseSchema>}
 */
export function normalizeCourseDraft(raw, topic) {
  const candidate = raw && typeof raw === "object" && "course" in raw ? /** @type {any} */ (raw).course : raw;
  const obj = candidate && typeof candidate === "object" ? /** @type {Record<string, any>} */ (candidate) : {};
  const blocks = Array.isArray(obj.blocks)
    ? obj.blocks.map((block) => normalizeBlock(block, topic)).filter(isPresent)
    : normalizeFlatCourseBlocks(obj, topic);

  const draft = {
    title: cleanText(obj.title, `${topic}课程`).slice(0, 80),
    summary: cleanText(obj.summary ?? obj.description, `一门关于「${topic}」的结构化短课程。`).slice(0, 240),
    estimatedMinutes: normalizeMinutes(obj.estimatedMinutes ?? obj.estimated_minutes, blocks.length),
    blocks: blocks.slice(0, 8),
  };

  const parsed = CourseSchema.safeParse(draft);
  if (!parsed.success || !isUsableCourseDraft(parsed.data)) {
    throw new Error(`Course generator returned unusable course data: ${parsed.success ? "unsafe content" : parsed.error.message}`);
  }
  return parsed.data;
}

/**
 * Accepts real model outputs that used top-level text/analogy/transfer/code
 * fields despite being asked for blocks. No content is invented here; fields are
 * only wrapped into the persisted block schema.
 * @param {Record<string, any>} obj
 * @param {string} topic
 */
function normalizeFlatCourseBlocks(obj, topic) {
  const blocks = [];
  if (obj.text || obj.markdown || obj.content) {
    blocks.push(normalizeBlock({ type: "text", title: `理解${topic}`, markdown: obj.text ?? obj.markdown ?? obj.content }, topic));
  }
  if (obj.analogy) {
    blocks.push(normalizeBlock(typeof obj.analogy === "object" ? { type: "analogy", ...obj.analogy } : { type: "analogy", title: `类比理解${topic}`, mapping: obj.analogy }, topic));
  }
  if (obj.transfer) {
    blocks.push(normalizeBlock(typeof obj.transfer === "object" ? { type: "transfer", ...obj.transfer } : { type: "transfer", title: "迁移应用", explanation: obj.transfer }, topic));
  }
  if (obj.code) {
    blocks.push(normalizeBlock(typeof obj.code === "object" ? { type: "code", ...obj.code } : { type: "code", title: "代码实现", language: obj.language ?? "python", code: obj.code, explanation: obj.explanation }, topic));
  }
  return blocks.filter(isPresent);
}

/**
 * @param {any} block
 * @param {string} topic
 */
function normalizeBlock(block, topic) {
  if (!block || typeof block !== "object") return null;
  const type = normalizeBlockType(inferBlockType(block));
  const title = cleanText(block.title, defaultBlockTitle(type, topic)).slice(0, 80);

  if (type === "analogy") {
    return {
      type: "analogy",
      title,
      source: cleanText(block.source, "熟悉事物"),
      target: cleanText(block.target, topic),
      mapping: cleanText(block.mapping ?? block.content ?? block.markdown ?? block.explanation, "把熟悉事物中的角色和关系对应到新概念中。"),
    };
  }

  if (type === "transfer") {
    return {
      type: "transfer",
      title,
      fromDomain: cleanText(block.fromDomain ?? block.from_domain, "当前主题"),
      toDomain: cleanText(block.toDomain ?? block.to_domain, "真实应用"),
      explanation: cleanText(block.explanation ?? block.content ?? block.markdown, "把这个概念迁移到另一个场景中理解。"),
      example: cleanText(block.example ?? block.code, `尝试用「${topic}」解释一个生活或编程中的例子。`),
    };
  }

  if (type === "visual") {
    const engine = typeof block.engine === "string" ? block.engine : undefined;
    const base = {
      type: /** @type {"visual"} */ ("visual"),
      title,
      description: cleanText(block.description ?? block.content ?? block.markdown, `互动观察「${topic}」的关键关系。`).slice(0, 220),
      engine,
    };
    if (engine === "echarts" && block.echartsOption && typeof block.echartsOption === "object") {
      return { ...base, echartsOption: block.echartsOption, echartsHeight: typeof block.echartsHeight === "number" ? block.echartsHeight : undefined };
    }
    if (engine === "mermaid" && typeof block.mermaidDefinition === "string" && block.mermaidDefinition.trim()) {
      return { ...base, mermaidDefinition: block.mermaidDefinition };
    }
    if (engine === "physics" && block.physicsScene && typeof block.physicsScene === "object") {
      return { ...base, physicsScene: block.physicsScene };
    }
    return { ...base, engine: "html", html: normalizeHtml(block.html, topic) };
  }

  if (type === "code") {
    const language = cleanText(block.language, "python").slice(0, 30);
    return {
      type: "code",
      title,
      language,
      code: normalizeCode(block.code ?? block.example ?? block.content, language),
      explanation: cleanText(block.explanation ?? block.content, "这段代码把概念写成可执行的形式。"),
    };
  }

  // Richer structured types are passed through their schema as-is. If the model's
  // payload does not satisfy the schema we drop the block (return null) rather
  // than coercing rich content into a degraded text block.
  if (type === "quiz" || type === "mind_map" || type === "slide" || type === "worksheet") {
    const schema = schemaForBlockType(type);
    const parsed = schema.safeParse({ ...block, type, title });
    return parsed.success ? parsed.data : null;
  }

  return {
    type: "text",
    title,
    markdown: cleanText(block.markdown ?? block.content ?? block.description ?? block.text, `围绕「${topic}」建立核心直觉。`),
  };
}

/**
 * @param {any} block
 */
function inferBlockType(block) {
  if (typeof block.type === "string") return block.type.toLowerCase();
  if ("html" in block) return "visual";
  if ("code" in block || "language" in block) return "code";
  if ("fromDomain" in block || "from_domain" in block || "toDomain" in block || "to_domain" in block || "example" in block) return "transfer";
  if ("source" in block || "target" in block || "mapping" in block) return "analogy";
  return "text";
}

/**
 * @param {string} type
 */
function normalizeBlockType(type) {
  /** @type {Record<string, string>} */
  const aliases = { mindmap: "mind_map", mind_map: "mind_map", slides: "slide", quizzes: "quiz" };
  const normalized = aliases[type] ?? type;
  if (["text", "analogy", "transfer", "visual", "code", "quiz", "mind_map", "slide", "worksheet"].includes(normalized)) {
    return /** @type {any} */ (normalized);
  }
  return "text";
}

/**
 * @param {unknown} value
 * @param {string} fallback
 */
function cleanText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

/**
 * @param {string} type
 * @param {string} topic
 */
function defaultBlockTitle(type, topic) {
  switch (type) {
    case "analogy":
      return `类比理解${topic}`;
    case "transfer":
      return "迁移应用";
    case "visual":
      return "互动观察";
    case "code":
      return "代码实现";
    case "quiz":
      return "小测验";
    case "mind_map":
      return `${topic}思维导图`;
    case "slide":
      return "幻灯片讲解";
    case "worksheet":
      return "练习巩固";
    default:
      return `理解${topic}`;
  }
}

/**
 * @param {unknown} value
 * @param {number} blockCount
 */
function normalizeMinutes(value, blockCount) {
  const n = Number(value);
  if (Number.isFinite(n)) return Math.max(3, Math.min(60, Math.round(n)));
  return Math.max(8, Math.min(24, (blockCount || 4) * 2));
}

/**
 * @param {unknown} value
 * @param {string} topic
 */
function normalizeHtml(value, topic) {
  const html = String(value ?? "").trim();
  const hasControl = /<(input|button|select)\b/i.test(html);
  const looksRunnable = /<([a-z][\w:-]*)(\s|>)/i.test(html) && !/yM\b|\bax\s*\+/i.test(html);
  if (html && hasControl && looksRunnable) return stripEmoji(html);

  const safeTopic = escapeHtml(topic || "函数");
  return `<div style="background:#fbf7ee;border:1px solid #c8881a;border-radius:16px;padding:18px;color:#3a352d;font-family:system-ui,sans-serif">
  <h3 style="margin:0 0 8px">互动观察：${safeTopic}</h3>
  <p style="margin:0 0 12px;color:#6b6357">点击按钮，观察状态按后进先出的方式变化。</p>
  <button id="push" style="padding:8px 12px;border-radius:10px;border:1px solid #c8881a;background:#fff2de;color:#3a352d">push</button>
  <button id="pop" style="padding:8px 12px;border-radius:10px;border:1px solid #4a7a5a;background:#e8f3ea;color:#3a352d">pop</button>
  <div id="stack" style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap"></div>
  <script>
    const stack=[], box=document.getElementById('stack');
    function draw(){box.innerHTML=stack.map((x,i)=>'<span style="padding:8px 10px;border-radius:10px;background:#fffaf2;border:1px solid #eadfce">'+x+(i===stack.length-1?' top':'')+'</span>').join('')||'<span style="color:#6b6357">empty</span>'}
    document.getElementById('push').onclick=()=>{stack.push(stack.length+1);draw()};
    document.getElementById('pop').onclick=()=>{stack.pop();draw()};draw();
  </script>
</div>`;
}

/**
 * @param {unknown} value
 * @param {string} language
 */
function normalizeCode(value, language) {
  const code = String(value ?? "").trim();
  if (code) return fixCommonCodeTypos(code, language);
  return "class Stack:\n    def __init__(self):\n        self.items = []\n\n    def push(self, item):\n        self.items.append(item)\n\n    def pop(self):\n        return self.items.pop()";
}

/**
 * @param {string} code
 * @param {string} language
 */
function fixCommonCodeTypos(code, language) {
  if (!/python/i.test(language)) return code;
  return code
    .replace(/return\s+([A-Za-z_][\w]*)\s*2\b/g, "return $1**2")
    .replace(/return\s+(\d+)\s*([A-Za-z_][\w]*)\b/g, "return $1 * $2")
    .replace(/return\s+([A-Za-z_][\w]*)\s*([A-Za-z_][\w]*)\s*([+-])/g, "return $1 * $2 $3");
}

/**
 * @param {string} text
 */
function stripEmoji(text) {
  return text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "");
}

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (char) => {
    const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
    return entities[/** @type {keyof typeof entities} */ (char)] || char;
  });
}

/**
 * @param {unknown} content
 */
function messageContentToString(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (!part || typeof part !== "object") return "";
        if ("text" in part) return String(part.text);
        if ("input" in part) return typeof part.input === "string" ? part.input : JSON.stringify(part.input);
        return "";
      })
      .join("");
  }
  return String(content ?? "");
}

/**
 * @param {string} text
 * @returns {unknown}
 */
function parseJsonObject(text) {
  const trimmed = text.trim();
  /** @type {string[]} */
  const candidates = [];
  pushUnique(candidates, trimmed);

  const fencedBlocks = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  for (const match of fencedBlocks) pushUnique(candidates, match[1]);

  const balanced = extractBalancedJsonObjects(trimmed);
  for (const candidate of balanced) pushUnique(candidates, candidate);

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start !== -1 && end > start) pushUnique(candidates, trimmed.slice(start, end + 1));

  for (const candidate of candidates) {
    const parsed = tryParseCourseJson(candidate);
    if (parsed !== undefined) return parsed;
  }
  const preview = trimmed.replace(/\s+/g, " ").slice(0, 240);
  throw new Error(`Course generator did not return valid JSON. Preview: ${preview}`);
}

/**
 * @param {string[]} candidates
 * @param {string | undefined} value
 */
function pushUnique(candidates, value) {
  const text = String(value ?? "").trim();
  if (text && !candidates.includes(text)) candidates.push(text);
}

/**
 * @param {string} text
 * @returns {unknown | undefined}
 */
function tryParseCourseJson(text) {
  const variants = [text, repairLikelyJson(text)];
  for (const variant of variants) {
    try {
      const parsed = JSON.parse(variant);
      if (Array.isArray(parsed)) {
        const textParts = parsed
          .map((part) => part && typeof part === "object" && "text" in part ? String(part.text) : "")
          .filter(Boolean)
          .join("\n");
        if (textParts) {
          return parseJsonObject(textParts);
        }
      }
      return parsed;
    } catch {
      // keep trying
    }
  }
  return undefined;
}

/**
 * Extract balanced JSON object substrings while ignoring braces inside quoted strings.
 * @param {string} text
 * @returns {string[]}
 */
function extractBalancedJsonObjects(text) {
  /** @type {string[]} */
  const results = [];
  let start = -1;
  let depth = 0;
  /** @type {string | null} */
  let quote = null;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      continue;
    }
    if (ch === "\"" || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}" && depth > 0) {
      depth--;
      if (depth === 0 && start !== -1) {
        results.push(text.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return results.sort((a, b) => b.length - a.length);
}

/**
 * Repairs common provider JSON slips while preserving model-generated content.
 * @param {string} text
 */
function repairLikelyJson(text) {
  return text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/},\s*"type"\s*:/g, '},{"type":')
    .replace(/}\s*{/g, "},{");
}

/**
 * @param {any} course
 */
function isUsableCourseDraft(course) {
  const suspicious = [
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
    ...course.blocks.flatMap((/** @type {any} */ block) =>
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
