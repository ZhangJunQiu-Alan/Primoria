import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { z } from "zod";
import { generateCourse } from "./course-generator.mjs";
import { getCourse } from "./course-store.mjs";
import { summarizeCourse } from "./course-types.mjs";

// plan_visualization and widgetRenderer are PASSIVE — they
// just take the args the model produces and surface them as artifacts
// so the frontend can render them. deepagents also injects:
//   - write_todos: plan card
//   - task: subagent delegation
//   - filesystem tools: skill markdown read access
// (no need to define those here)

/**
 * @param {unknown} value
 */
function normalizeKeyElements(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 4);
  return String(value ?? "")
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

const planVisualizationTool = tool(
  async ({ title, approach, technology, key_elements }) => {
    return JSON.stringify({
      type: "visualization_plan",
      title: title ?? "Visualization plan",
      approach,
      technology,
      keyElements: normalizeKeyElements(key_elements),
    });
  },
  {
    name: "plan_visualization",
    description:
      "Plan a widget before building it. MUST be called before widgetRenderer.",
    schema: z.object({
      title: z.string().optional(),
      approach: z.string(),
      technology: z.string(),
      key_elements: z.union([z.array(z.string()), z.string()]),
    }),
  },
);

/**
 * Keep model-generated widget content iframe-fragment compatible. This does not
 * invent UI; it only removes full-document wrappers when a provider emits them.
 * @param {string} html
 */
function normalizeWidgetHtml(html) {
  let text = String(html ?? "").trim();
  text = text.replace(/<!doctype[^>]*>/i, "").trim();
  const bodyMatch = text.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const headMatch = text.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  if (bodyMatch) {
    const headAssets = headMatch ? headMatch[1].match(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi)?.join("\n") ?? "" : "";
    text = `${headAssets}\n${bodyMatch[1]}`.trim();
  }
  text = text
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<\/?head[^>]*>/gi, "")
    .replace(/<\/?body[^>]*>/gi, "")
    .trim();
  return repairWidgetScripts(text);
}

/**
 * @param {string} html
 */
function repairWidgetScripts(html) {
  return html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (/** @type {string} */ _match, /** @type {string} */ attrs, /** @type {string} */ script) => {
    return `<script${attrs}>${repairYieldGenerators(script)}</script>`;
  });
}

/**
 * @param {string} script
 */
function repairYieldGenerators(script) {
  return script.replace(
    /(^|[^\w$.*])function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g,
    (/** @type {string} */ match, /** @type {string} */ prefix, /** @type {string} */ name, /** @type {string} */ args, /** @type {number} */ offset, /** @type {string} */ source) => {
      const bodyStart = offset + match.length;
      const bodyEnd = findMatchingBrace(source, bodyStart);
      if (bodyEnd === -1) return match;

      const body = source.slice(bodyStart, bodyEnd);
      if (!containsYieldToken(body)) return match;
      return `${prefix}function* ${name}(${args}) {`;
    },
  );
}

/**
 * @param {string} source
 */
function containsYieldToken(source) {
  return /(^|[^\w$])yield(?![\w$])/.test(stripJsCommentsAndStrings(source));
}

/**
 * @param {string} source
 * @param {number} start
 */
function findMatchingBrace(source, start) {
  let depth = 1;
  /** @type {string | null} */
  /** @type {string | null} */
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (ch === "\n" || ch === "\r") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        i++;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      i++;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * @param {string} source
 */
function stripJsCommentsAndStrings(source) {
  let out = "";
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (lineComment) {
      if (ch === "\n" || ch === "\r") {
        lineComment = false;
        out += ch;
      } else {
        out += " ";
      }
      continue;
    }
    if (blockComment) {
      if (ch === "*" && next === "/") {
        blockComment = false;
        out += "  ";
        i++;
      } else {
        out += ch === "\n" || ch === "\r" ? ch : " ";
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        quote = null;
      }
      out += ch === "\n" || ch === "\r" ? ch : " ";
      continue;
    }

    if (ch === "/" && next === "/") {
      lineComment = true;
      out += "  ";
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      blockComment = true;
      out += "  ";
      i++;
      continue;
    }
    if (ch === "'" || ch === "\"" || ch === "`") {
      quote = ch;
      out += " ";
      continue;
    }

    out += ch;
  }

  return out;
}

const widgetRendererTool = tool(
  async ({ title, description, html }) => {
    return JSON.stringify({
      type: "html_widget",
      title: title || "Interactive learning widget",
      description,
      html: normalizeWidgetHtml(html),
    });
  },
  {
    name: "widgetRenderer",
    description:
      "Render an interactive HTML/CSS/JS learning widget in a sandboxed iframe. MUST be used after plan_visualization for any visualization / simulation / demo request. Return a compact self-contained HTML fragment in the html argument: no doctype, no html/head/body wrapper, inline style/script only, target 80-160 lines. Use CSS variables when useful and include interactive controls where appropriate. Build as an inline responsive widget for a chat/course page, not a full-screen app shell. Use the soft Primoria palette: cream backgrounds #fbf7ee / #fffaf2. For HIGHLIGHTED / ACTIVE / SELECTED elements pair a tinted fill with a matching 1.5-2px solid border: amber pair (#fff2de + #c8881a), sage pair (#e8f3ea + #4a7a5a), lavender pair (#efe7d7 + #7c6ad0), rose pair (#fbeaf0 + #b56474). NEVER use the saturated border color alone as a fill. Inactive cells: cream background + 0.5px #eadfce border. Excluded / muted state: opacity 0.45-0.55. Text #3a352d for body, #6b6357 for muted. Rounded 12-18px corners, no black, no neon, no emoji decoration.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      html: z.string(),
    }),
    // Avoid a second post-tool model call with the full HTML in context.
    // That second call is where Anthropic-compatible MiniMax often hit the
    // ~60s terminated/RUN_ERROR path, which then confused AG-UI's event state.
    returnDirect: true,
  },
);

const COURSE_CARD_PREFIX = "PRIMORIA_COURSE_CARD:";

/**
 * @param {any} summary
 */
function serializeCourseCard(summary) {
  return `${COURSE_CARD_PREFIX}${JSON.stringify({
    type: "course_card",
    courseId: summary.id,
    title: summary.title,
    topic: summary.topic,
    summary: summary.summary,
    estimatedMinutes: summary.estimatedMinutes,
    outline: summary.outline,
    status: "ready",
  })}`;
}

/**
 * @param {string} topic
 */
function normalizeCourseTopic(topic) {
  return topic
    .replace(/^(生成|创建|做|帮我|请|please|make|create|build)\s*/i, "")
    .replace(/^(一个|一门|一节|a|an)\s*/i, "")
    .replace(/^(课程|教程|微课|lesson|course)\s*(关于|on|about)?\s*/i, "")
    .replace(/^(教我|学习|学一下|讲讲|讲解|系统讲|系统学|teach me|i want to learn|learn about|study)\s*/i, "")
    .replace(/\s*(的)?(课程|教程|微课|lesson|course|curriculum)$/i, "")
    .replace(/[。.!！?？]+$/g, "")
    .replace(/\s+/g, " ")
    .trim() || topic.trim();
}

const generateCourseTool = tool(
  async ({ topic, context_hint }) => {
    const normalizedTopic = normalizeCourseTopic(topic);
    const { summary } = await generateCourse(
      { topic: normalizedTopic, contextHint: context_hint },
      createModel({ streaming: false }),
    );
    return serializeCourseCard(summary);
  },
  {
    name: "generate_course",
    description:
      "Generate and persist a short structured course. MUST be used when the user asks for 课程 / 教程 / 微课 / 系统学习 / 教我 / 学习 / lesson / course / curriculum / teach me / learn about. Do NOT use widgetRenderer for these course requests.",
    schema: z.object({
      topic: z.string(),
      context_hint: z.string().optional(),
    }),
    returnDirect: true,
  },
);

const getCourseCardTool = tool(
  async ({ course_id }) => {
    const course = getCourse(course_id);
    if (!course) {
      return JSON.stringify({ type: "course_card_error", courseId: course_id, status: "not_found" });
    }
    return serializeCourseCard(summarizeCourse(course));
  },
  {
    name: "get_course_card",
    description: "Return a compact renderable course card for an already-generated course id. Use only if a visible card needs to be restored.",
    schema: z.object({
      course_id: z.string(),
    }),
  },
);

const subagents = [
  {
    name: "concept-agent",
    description: "Explains concepts with clear intuition, examples, and Socratic questions.",
    systemPrompt:
      "You are Primoria's Concept agent. Explain with intuition first, then concise formal detail. Prefer questions that reveal learner understanding.",
  },
  {
    name: "visualization-agent",
    description: "Plans and renders interactive educational widgets using plan_visualization and widgetRenderer.",
    systemPrompt:
      "You are Primoria's Visualization agent. For visual / simulated / step-by-step requests, briefly acknowledge, call plan_visualization, then widgetRenderer. Always write the complete HTML directly in the widgetRenderer html argument.",
  },
];

const SYSTEM_PROMPT = `You are Primoria, an AI tutor powered by deepagents.

You have access to:
- write_todos: lay out a short plan visible to the learner (call it first when a request needs multiple steps)
- task: delegate a focused job to a subagent (concept-agent or visualization-agent)
- plan_visualization / widgetRenderer: visualization tools
- generate_course: create and save a multi-block course, then return an opaque PRIMORIA_COURSE_CARD tool result for the UI
- get_course_card: restore a course card by id if needed
- A filesystem with skill documents you can read for guidance

INTENT ROUTING — choose exactly one branch.

COURSE branch has highest priority. If the latest user message contains 课程 / 教程 / 微课 / 系统讲 / 系统学 / 学一下 / 学习 / 教我 / 讲讲 / 讲解 / lesson / course / curriculum / teach me / I want to learn / learn about / study:
1. Call write_todos with 3 concise steps: plan the learning path / generate real course blocks / save and show the card.
2. Call generate_course with the specific topic.
3. Stop immediately after generate_course returns. The tool result is the UI card.
Never call task, plan_visualization, or widgetRenderer in COURSE branch.

VISUALIZATION branch only applies if COURSE branch does not match. For ANY visualization / interactive / simulation / demo / 可视化 / 演示 / 互动 request, follow the OpenGenerativeUI-style workflow:
1. Briefly acknowledge what you will build in 1 short sentence.
2. Call plan_visualization with approach, technology, and 2-4 key elements.
3. Call widgetRenderer with title, description, and a compact self-contained HTML fragment in the html argument. Prefer including title, but if the provider drops it the tool will derive a safe default. Do not include doctype/html/head/body wrappers.
4. Stop immediately after widgetRenderer returns; widgetRenderer is returnDirect, so do not ask for or produce a post-widget narration.
Never skip plan_visualization before widgetRenderer. Do not call task in VISUALIZATION branch.

CRITICAL OUTPUT RULES:
- Prefer short, decisive tool sequences. For visualization, the expected sequence is plan_visualization → widgetRenderer, then stop.
- NEVER paste HTML / CSS / JS code into your text reply. Code only belongs inside the widgetRenderer html argument.
- NEVER paste tool result strings or JSON into your text reply. If a tool result begins with PRIMORIA_COURSE_CARD:, treat it as UI-only data and do not mention or copy it.
- NEVER wrap output in markdown code blocks (no \`\`\`html, no \`\`\`).

For greetings ("hi", "你好"), thanks, casual chat, or anything that is clearly NOT a learning question, just reply with one short sentence and do NOT call any tools.

For plain factual / conceptual questions that do not require a visualization, answer in 1-2 sentences without tools.`;

/**
 * @param {{ streaming?: boolean }} [options]
 */
function createModel(options = {}) {
  const provider = process.env.AI_PROVIDER || "openai-compatible";
  const streaming = options.streaming ?? true;
  const baseUrl =
    provider === "anthropic-compatible" ? process.env.ANTHROPIC_BASE_URL : process.env.OPENAI_BASE_URL;
  const apiKey =
    provider === "anthropic-compatible" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
  const model =
    (provider === "anthropic-compatible" ? process.env.ANTHROPIC_MODEL : process.env.OPENAI_MODEL) ||
    (provider === "anthropic-compatible" ? "claude-3-5-sonnet-latest" : "gpt-5.4");
  if (!apiKey) throw new Error(`Missing ${provider === "anthropic-compatible" ? "ANTHROPIC" : "OPENAI"}_API_KEY`);

  if (provider === "anthropic-compatible") {
    return new ChatAnthropic({
      model,
      apiKey,
      anthropicApiUrl: baseUrl?.replace(/\/$/, ""),
      temperature: 0.2,
      maxTokens: streaming ? 4096 : 2200,
      streaming,
      clientOptions: {
        timeout: 180_000,
        maxRetries: 1,
      },
    });
  }

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens: 4096,
    streaming,
    configuration: { baseURL: baseUrl.replace(/\/$/, "") },
  });
}

const checkpointer = new MemorySaver();

export const graph = createDeepAgent({
  name: "primoria-tutor",
  model: createModel(),
  tools: [planVisualizationTool, widgetRendererTool, generateCourseTool, getCourseCardTool],
  systemPrompt: SYSTEM_PROMPT,
  subagents,
  checkpointer,
  backend: new FilesystemBackend({
    rootDir: process.cwd(),
    virtualMode: true,
  }),
  skills: ["/skills/"],
});
