import { z } from "zod";
import { saveCourse } from "@/lib/courses/store";
import type { Course, CourseBlock } from "@/lib/courses/types";
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
      ]),
    )
    .min(3)
    .max(8),
});

const COURSE_SYSTEM_PROMPT = `You are Primoria's Course Generator sub-agent. You design a single short, deeply learnable course on a topic, broken into 4-7 ordered blocks.

Block types (use the right type for each idea, do NOT just use text):
- text: a short prose explanation in markdown (2-4 short paragraphs max).
- analogy: map an unfamiliar concept to a familiar one. Fields: source (familiar thing), target (concept being taught), mapping (what corresponds to what).
- transfer: show how a principle from one domain applies in another. Fields: fromDomain, toDomain, explanation, example.
- visual: a self-contained interactive HTML/CSS/JS fragment that visualizes a key intuition.
- code: a small code snippet with a plain-language explanation.

COURSE STRUCTURE RULES:
- 4-7 blocks total. Order them as a learning arc: hook → core idea → one analogy → one visual or code → transfer to a different domain → wrap-up.
- Include AT MOST ONE visual block per course. Keep its HTML compact (<300 lines).
- Include at least one analogy block and one transfer block.
- Every block needs a short, specific title (no generic "Introduction").
- Write in the same language as the user's topic prompt.

VISUAL BLOCK RULES (include at most one per course):
Choose the engine that best fits the concept:
- engine "echarts": charts, data plots, function curves, histograms, bar/line/scatter. Set echartsOption to a complete ECharts option object. Use Primoria palette: amber #c8881a, sage #4a7a5a, lavender #7c6ad0. Always set a chart title inside the option.
- engine "mermaid": flowcharts, sequence diagrams, concept maps, ER diagrams, state machines, process flows. Set mermaidDefinition to a valid Mermaid DSL string.
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
    { "type": "code", "title": "string", "language": "string", "code": "string", "explanation": "string" }
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

  return {
    type: "text",
    title,
    markdown: cleanText(obj.markdown ?? obj.content ?? obj.description ?? obj.text, `围绕「${topic}」建立核心直觉。`),
  };
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
