import { tool } from "@langchain/core/tools";
import { Annotation, MemorySaver, getConfig } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { createMiddleware } from "langchain";
import { z } from "zod";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { getCourse } from "./course-store.mjs";
import { courseBlocks, summarizeCourse } from "./course-types.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const STEM_SUBJECTS = ["physics", "math", "cs"];

const planVisualizationTool = tool(
  async ({ title, approach, technology, key_elements, subject }) => {
    let plan = JSON.stringify({
      type: "visualization_plan",
      title: title ?? "Visualization plan",
      approach,
      technology,
      keyElements: normalizeKeyElements(key_elements),
    });

    if (subject && STEM_SUBJECTS.includes(subject)) {
      try {
        const apiDocPath = resolve(__dirname, "../skills/stem/", `${subject}-api.md`);
        const apiDoc = readFileSync(apiDocPath, "utf-8");
        plan += `\n\n---\n## ${subject.toUpperCase()} Runtime API Reference\n${apiDoc}`;
      } catch {
        // API doc not found — proceed without it
      }
    }

    return plan;
  },
  {
    name: "plan_visualization",
    description:
      "Plan a widget before building it. MUST be followed immediately by the matching render tool in the same turn (widgetRenderer or stemRenderer) — never as a standalone final call. Extract the user's non-negotiable visual/interaction requirements into key_elements; do not replace them with generic topic bullets. For physics/math/cs simulations, set subject to 'physics', 'math', or 'cs' to receive the Runtime API reference.",
    schema: z.object({
      title: z.string().optional(),
      approach: z.string(),
      technology: z.string(),
      key_elements: z.union([z.array(z.string()), z.string()]),
      subject: z.enum(["physics", "math", "cs"]).optional(),
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

const WIDGET_DEPENDENCY_ALLOWLIST = {
  d3: { global: "d3", url: "https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", kind: "script" },
  cytoscape: { global: "cytoscape", url: "https://cdn.jsdelivr.net/npm/cytoscape@3.29.2/dist/cytoscape.min.js", kind: "script" },
  Chart: { global: "Chart", url: "https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.min.js", kind: "script" },
  gsap: { global: "gsap", url: "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js", kind: "script" },
  THREE: { global: "THREE", url: "https://cdn.jsdelivr.net/npm/three@0.181.2/build/three.min.js", kind: "script" },
  anime: { global: "anime", url: "https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js", kind: "script" },
  Matter: { global: "Matter", url: "https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js", kind: "script" },
  p5: { global: "p5", url: "https://cdn.jsdelivr.net/npm/p5@1.11.3/lib/p5.min.js", kind: "script" },
  math: { global: "math", url: "https://cdn.jsdelivr.net/npm/mathjs@14.2.1/lib/browser/math.min.js", kind: "script" },
  L: { global: "L", url: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js", kind: "script" },
  mermaid: { global: "mermaid", url: "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js", kind: "script" },
  echarts: { global: "echarts", url: "https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js", kind: "script" },
};
const WIDGET_DEPENDENCIES_BY_URL = new Map(
  Object.values(WIDGET_DEPENDENCY_ALLOWLIST).map((dep) => [dep.url, dep]),
);

/**
 * @param {unknown} dependencies
 */
function normalizeWidgetDependencies(dependencies) {
  if (!Array.isArray(dependencies)) return [];
  const seen = new Set();
  const normalized = [];
  for (const dep of dependencies) {
    const allowed = WIDGET_DEPENDENCIES_BY_URL.get(String(dep?.url ?? "").trim());
    if (!allowed || seen.has(allowed.url)) continue;
    seen.add(allowed.url);
    normalized.push(allowed);
    if (normalized.length >= 6) break;
  }
  return normalized;
}

const widgetRendererTool = tool(
  async ({ title, description, html, dependencies }) => {
    return JSON.stringify({
      type: "html_widget",
      title: title || "Interactive learning widget",
      description,
      html: normalizeWidgetHtml(html),
      dependencies: normalizeWidgetDependencies(dependencies),
    });
  },
  {
    name: "widgetRenderer",
    description:
      "Render an interactive HTML/CSS/JS learning widget in a sandboxed iframe. MUST be used after plan_visualization for any visualization / simulation / demo request. If you use an external browser library, include it in the optional dependencies array as {url, global, kind}; only Primoria's fixed whitelist is accepted, so prefer d3, Chart, gsap, THREE, anime, Matter, p5, math, L, or mermaid exact CDN URLs already known to the renderer. Return a compact self-contained HTML fragment in the html argument: no doctype, no html/head/body wrapper, inline style/script only, target 70-130 lines and under about 8KB. Implement every concrete requirement from the latest user message and the plan key_elements as visible UI behavior, not just hidden code. Prefer one canvas or one inline SVG plus a small control/status panel; avoid verbose CSS, verbose explanatory text, and duplicate UI. Avoid D3 unless absolutely necessary; for SVG, prefer plain DOM APIs such as createElementNS/setAttribute over complex D3 chains. Include visible labels/legend/status for the important objects and comparisons so the learner can verify the concept by eye. For physics/math visualizations, label anchors, extrema, variables, current values, and measured comparisons (for example equal areas, distances, angles, elapsed time) whenever the user mentions them. Use CSS variables when useful and include interactive controls where appropriate. Build as an inline responsive widget for a chat/course page, not a full-screen app shell; do not style body/html and do not use 100vh page layouts. Use the soft Primoria palette: cream backgrounds #fbf7ee / #fffaf2. For HIGHLIGHTED / ACTIVE / SELECTED elements pair a tinted fill with a matching 1.5-2px solid border: amber pair (#fff2de + #c8881a), sage pair (#e8f3ea + #4a7a5a), lavender pair (#efe7d7 + #7c6ad0), rose pair (#fbeaf0 + #b56474). NEVER use the saturated border color alone as a fill. Inactive cells: cream background + 0.5px #eadfce border. Excluded / muted state: opacity 0.45-0.55. Text #3a352d for body, #6b6357 for muted. Rounded 12-18px corners, no black, no neon, no emoji decoration.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      html: z.string(),
      dependencies: z.array(z.object({
        url: z.string(),
        global: z.string().optional(),
        kind: z.enum(["script", "module", "style"]).optional(),
      })).optional(),
    }),
    // Avoid a second post-tool model call with the full HTML in context.
    // That second call is where Anthropic-compatible MiniMax often hit the
    // ~60s terminated/RUN_ERROR path, which then confused AG-UI's event state.
    returnDirect: true,
  },
);

const stemRendererTool = tool(
  async ({ subject, scene, title, description, code }) => {
    return JSON.stringify({
      type: "stem_renderer",
      subject,
      scene,
      title,
      description,
      code,
    });
  },
  {
    name: "stemRenderer",
    description:
      "Render a STEM simulation in a sandboxed iframe using a pre-loaded subject Runtime API. Use ONLY for rigid-body physics (Matter.js PhysicsRuntime), math function plots (MathGL Canvas), or CS algorithm step-by-step visualizations (AlgoViz). MUST be called after plan_visualization with subject set. The code argument must ONLY use the Runtime API methods documented by plan_visualization — do NOT import libraries, do NOT call Matter.Engine directly, do NOT use DOM APIs outside the API.",
    schema: z.object({
      subject: z.enum(["physics", "math", "cs"]),
      scene: z.string().describe("Scene type, e.g. 'pendulum', 'spring', 'bubble-sort'"),
      title: z.string().describe("Short title for the simulation"),
      description: z.string().describe("One-sentence description of what this demonstrates"),
      code: z.string().describe(
        "JavaScript code calling the subject Runtime API (Physics / MathGL / AlgoViz). No imports. No document/window DOM calls. Call run() last."
      ),
    }),
    returnDirect: true,
  },
);

const COURSE_CARD_PREFIX = "PRIMORIA_COURSE_CARD:";

/**
 * @param {any} summary
 */
function serializeCourseCard(summary, status = "ready") {
  return `${COURSE_CARD_PREFIX}${JSON.stringify({
    type: "course_card",
    courseId: summary.id,
    title: summary.title,
    topic: summary.topic,
    summary: summary.summary,
    estimatedMinutes: summary.estimatedMinutes ?? 0,
    outline: summary.outline ?? [],
    status,
  })}`;
}

/**
 * @param {any} course
 */
function formatAvailableBlocks(course) {
  return courseBlocks(course)
    .map((/** @type {any} */ block, /** @type {number} */ index) => `${block.index ?? index + 1}. ${block.title ?? block.type} [${block.type}, id=${block.id}]`)
    .join("; ");
}

/**
 * The single course-path entry. This is a STATELESS signal: it just surfaces the
 * learner's goal as a tool result so the browser-rendered card can take over.
 * KG positioning + course generation + persistence all happen web-side, driven
 * by the browser (which carries the user's session natively) — see the
 * "Web-as-brain" architecture. The model cannot generate a course any other way.
 */
const positionLearningGoalTool = tool(
  async ({ query, graph_id }) => {
    return JSON.stringify({ type: "learning_goal_position", query, graphId: graph_id });
  },
  {
    name: "position_learning_goal",
    description:
      "Surface a learning goal so the UI can locate it in the knowledge graph and build a course. MUST be the first and only tool used for any 课程 / 教程 / 微课 / 系统学习 / 教我 / 学习 / lesson / course / curriculum / teach me / learn about request. Pass the learner's goal verbatim as `query`. The UI card performs the knowledge-graph positioning and course generation; you must not attempt to build a course any other way.",
    schema: z.object({
      query: z.string(),
      graph_id: z.string().optional(),
    }),
    returnDirect: true,
  },
);

const ChatQuizChoiceSchema = z.object({
  id: z.string(),
  text: z.string(),
});

const ChatQuizQuestionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("single"),
    id: z.string(),
    question: z.string(),
    choices: z.array(ChatQuizChoiceSchema).min(2).max(6),
    correctId: z.string(),
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal("multi"),
    id: z.string(),
    question: z.string(),
    choices: z.array(ChatQuizChoiceSchema).min(2).max(6),
    correctIds: z.array(z.string()).min(1),
    explanation: z.string().optional(),
  }),
  z.object({
    kind: z.literal("truefalse"),
    id: z.string(),
    question: z.string(),
    correct: z.boolean(),
    explanation: z.string().optional(),
  }),
]);

const renderChatQuizTool = tool(
  async ({ title, description, questions }) => {
    return JSON.stringify({
      type: "chat_quiz",
      title,
      description,
      questions,
    });
  },
  {
    name: "render_chat_quiz",
    description:
      "Render a temporary interactive quiz directly inside the chat. Use this in COURSE DETAIL MODE when the learner asks for a quiz / test / practice / 测验 / 测试 / 练习题 / 考考我 / 出题 / 自测 about the current course or selected block. The quiz is not added to the course outline, is not a course block, and does not update mastery. Return concise, answerable questions grounded in the course context. Do not also write the questions as plain text.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      questions: z.array(ChatQuizQuestionSchema).min(1).max(6),
    }),
    returnDirect: true,
  },
);

/**
 * @param {unknown} runtime
 */
function getRuntimeOwnerId(runtime) {
  const runtimeAny = /** @type {any} */ (runtime);
  let config = null;
  try {
    config = /** @type {any} */ (getConfig());
  } catch {
    config = null;
  }
  return runtimeAny?.context?.primoria_owner_id
    ?? runtimeAny?.context?.user_id
    ?? runtimeAny?.state?.primoria_owner_id
    ?? runtimeAny?.state?.user_id
    ?? runtimeAny?.configurable?.primoria_owner_id
    ?? runtimeAny?.configurable?.user_id
    ?? runtimeAny?.metadata?.primoria_owner_id
    ?? runtimeAny?.metadata?.user_id
    ?? runtimeAny?.config?.configurable?.primoria_owner_id
    ?? runtimeAny?.config?.configurable?.user_id
    ?? runtimeAny?.config?.metadata?.primoria_owner_id
    ?? runtimeAny?.config?.metadata?.user_id
    ?? config?.context?.primoria_owner_id
    ?? config?.context?.user_id
    ?? config?.configurable?.primoria_owner_id
    ?? config?.configurable?.user_id
    ?? config?.metadata?.primoria_owner_id
    ?? config?.metadata?.user_id
    ?? null;
}

const PrimoriaContextSchema = z.object({
  primoria_owner_id: z.string().optional(),
  user_id: z.string().optional(),
  copilotkit: z.any().optional(),
});

const PrimoriaContextAnnotation = Annotation.Root({
  primoria_owner_id: Annotation(),
  user_id: Annotation(),
  copilotkit: Annotation(),
});

const PrimoriaStateAnnotation = Annotation.Root({
  primoria_owner_id: Annotation(),
  user_id: Annotation(),
  copilotkit: Annotation(),
});

/**
 * @param {unknown} items
 */
function parseCourseDetailContextItems(items) {
  if (!Array.isArray(items)) return null;
  const item = items.find((entry) => entry?.description === "Primoria course detail mode");
  if (!item?.value) return null;
  try {
    return JSON.parse(String(item.value));
  } catch {
    return null;
  }
}

/**
 * @param {unknown} request
 */
function getCourseDetailContext(request) {
  const requestAny = /** @type {any} */ (request);
  return parseCourseDetailContextItems(requestAny?.runtime?.context?.copilotkit?.context)
    ?? parseCourseDetailContextItems(requestAny?.state?.copilotkit?.context)
    ?? parseCourseDetailContextItems(requestAny?.runtime?.state?.copilotkit?.context)
    ?? parseCourseDetailContextItems(requestAny?.runtime?.context?.["ag-ui"]?.context)
    ?? parseCourseDetailContextItems(requestAny?.state?.["ag-ui"]?.context)
    ?? parseCourseDetailContextItems(requestAny?.runtime?.state?.["ag-ui"]?.context)
    ?? null;
}

/**
 * @param {any} context
 */
function formatCourseDetailSystemPrompt(context) {
  const course = context?.course;
  const selected = context?.selectedBlock;
  if (!course?.title) return "";
  return `

COURSE DETAIL MODE — highest priority for this run.
The learner is currently inside an existing Primoria course detail page, not asking you to create a new course by default.
Current course: ${course.title}
Topic: ${course.topic ?? ""}
Summary: ${course.summary ?? ""}
Selected block: ${selected ? `${selected.title ?? selected.type} (${selected.type}, id=${selected.id})` : "none; answer from the whole course"}
Available blocks: ${formatAvailableBlocks(course)}

Behavior in COURSE DETAIL MODE:
- For summarize/explain/practice questions about this course, answer directly from this context.
- Course creation and learning-path building happen through the learning-goal flow on the web app, not from this chat. If the learner explicitly asks to create a new course, call position_learning_goal to anchor their goal in the knowledge graph.
- If the learner asks to modify/rewrite/simplify/expand/fix the selected block, call revise_selected_course_block.
- If the learner asks for a quiz / test / practice / 测验 / 测试 / 练习题 / 考考我 / 出题 / 自测, call render_chat_quiz. Do NOT call add_course_block, do NOT create a course block, and do NOT write the questions as plain text. The quiz must appear directly inside this chat.
- If no block is selected and the learner asks to modify a block, ask them to select a block first.
- Keep answers concise and in the user's language.
`.trim();
}

const primoriaCourseDetailMiddleware = createMiddleware({
  name: "PrimoriaCourseDetailMiddleware",
  contextSchema: PrimoriaContextSchema,
  wrapModelCall: async (request, handler) => {
    const courseDetail = getCourseDetailContext(request);
    const extra = formatCourseDetailSystemPrompt(courseDetail);
    if (!extra) return handler(request);
    return handler({
      ...request,
      systemMessage: request.systemMessage.concat(`\n\n${extra}`),
    });
  },
});

const primoriaContextMiddleware = createMiddleware({
  name: "PrimoriaContextMiddleware",
  contextSchema: PrimoriaContextSchema,
  stateSchema: PrimoriaStateAnnotation,
});

const renderChartTool = tool(
  async ({ title, description, option, height }) => {
    return JSON.stringify({
      type: "echarts_widget",
      title: title ?? "Chart",
      description: description ?? "",
      option,
      height,
    });
  },
  {
    name: "render_chart",
    description:
      "Render a chart or data visualization using ECharts. Use this for charts, graphs, data plots, mathematical function curves, bar/line/scatter/pie/radar/treemap/heatmap. Output a complete valid ECharts option JSON. Do NOT call plan_visualization before this tool. Use Primoria palette colors: amber #c8881a, sage #4a7a5a, lavender #7c6ad0, rose #b56474.",
    schema: z.object({
      title: z.string().describe("Display title for the chart card header"),
      description: z.string().describe("One sentence describing what this chart shows"),
      option: z.record(z.unknown()).describe("Complete ECharts option JSON object"),
      height: z.number().optional().describe("Canvas height in px, default 400"),
    }),
    returnDirect: true,
  },
);

const renderDiagramTool = tool(
  async ({ title, definition }) => {
    return JSON.stringify({
      type: "mermaid_diagram",
      title: title ?? "Diagram",
      definition,
    });
  },
  {
    name: "render_diagram",
    description:
      "Render a diagram using Mermaid DSL. Use for flowcharts, sequence diagrams, class diagrams, ER diagrams, mind maps, state machines, architecture diagrams, process flows. Output a valid Mermaid definition string. Do NOT call plan_visualization before this tool.",
    schema: z.object({
      title: z.string().describe("Display title for the diagram card header"),
      definition: z.string().describe("Complete Mermaid diagram definition string"),
    }),
    returnDirect: true,
  },
);

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

const renderPhysicsSceneTool = tool(
  async ({ title, description, scene }) => {
    return JSON.stringify({
      type: "physics_scene",
      title: title ?? "Physics Simulation",
      description: description ?? "",
      scene,
    });
  },
  {
    name: "render_physics_scene",
    description:
      "Render an interactive physics simulation using Matter.js. Use for pendulums, Newton's cradle, collisions, projectile motion, springs, inclined planes, falling objects, rigid-body dynamics. NEVER write simulation code — describe the scene as JSON with bodies (circles/rectangles/polygons with positions, velocities, material properties) and constraints (rods, strings, springs). The Matter.js engine handles all physics automatically. Coordinate system: (0,0) = top-left, x right, y down. Typical scene: width 600 height 400. isStatic:true = fixed anchor. Use label on bodies for educational annotations. Do NOT call plan_visualization before this tool.",
    schema: z.object({
      title: z.string().describe("Display title"),
      description: z.string().describe("One sentence describing the physics concept"),
      scene: PhysicsSceneSchema,
    }),
    returnDirect: true,
  },
);

const AlgorithmHighlightRoleSchema = z.enum([
  "comparing", "swapping", "pivot", "sorted",
  "current", "visited", "queued", "stacked", "path",
  "dependency", "result", "muted",
]);

const AlgorithmStepSchema = z.object({
  description: z.string(),
  annotation: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).optional(),
  kind: z.enum(["array", "tree", "graph", "table"]),
  array: z.object({
    values: z.array(z.union([z.number(), z.string()])),
    highlights: z.array(z.object({ index: z.number(), role: AlgorithmHighlightRoleSchema })).optional(),
    pointers: z.array(z.object({ index: z.number(), label: z.string() })).optional(),
    sortedIndices: z.array(z.number()).optional(),
  }).optional(),
  tree: z.object({
    nodes: z.array(z.object({
      id: z.string(), value: z.union([z.number(), z.string()]),
      parentId: z.string().nullable().optional(),
      left: z.string().nullable().optional(),
      right: z.string().nullable().optional(),
    })),
    highlights: z.array(z.object({ id: z.string(), role: AlgorithmHighlightRoleSchema })).optional(),
    traversalPath: z.array(z.string()).optional(),
  }).optional(),
  graph: z.object({
    nodes: z.array(z.object({ id: z.string(), label: z.string(), x: z.number(), y: z.number(), value: z.union([z.number(), z.string()]).optional() })),
    edges: z.array(z.object({ from: z.string(), to: z.string(), directed: z.boolean().optional(), weight: z.number().optional() })),
    highlights: z.array(z.object({ nodeId: z.string().optional(), edgeKey: z.string().optional(), role: AlgorithmHighlightRoleSchema })).optional(),
    queue: z.array(z.string()).optional(),
    stack: z.array(z.string()).optional(),
    distances: z.array(z.object({ nodeId: z.string(), value: z.union([z.number(), z.string()]) })).optional(),
  }).optional(),
  table: z.object({
    data: z.array(z.array(z.union([z.number(), z.string(), z.null()]))),
    rowLabels: z.array(z.string()).optional(),
    colLabels: z.array(z.string()).optional(),
    highlights: z.array(z.object({ row: z.number(), col: z.number(), role: AlgorithmHighlightRoleSchema })).optional(),
    formula: z.string().optional(),
  }).optional(),
});

const MathExplorerFunctionSchema = z.object({
  expr: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  dashed: z.boolean().optional(),
});

const MathExplorerCurveSchema = z.object({
  xExpr: z.string(),
  yExpr: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
});

const MathExplorerParameterSchema = z.object({
  name: z.string(),
  label: z.string().optional(),
  min: z.number(),
  max: z.number(),
  default: z.number(),
  step: z.number().optional(),
});

const MathExplorerRangeInputSchema = z.array(z.number()).min(2).max(2);

/** @param {number[] | undefined} range @returns {[number, number] | undefined} */
function normalizeMathRange(range) {
  if (!Array.isArray(range)) return undefined;
  return [range[0], range[1]];
}

const renderAlgorithmTool = tool(
  async ({ title, description, algorithm, steps }) => {
    return JSON.stringify({
      type: "algorithm_visualization",
      title: title || "Algorithm",
      description,
      algorithm,
      steps,
    });
  },
  {
    name: "render_algorithm",
    description:
      "Render a step-by-step algorithm visualization with play/pause/step controls. Use for: sorting, binary search, two-pointer/sliding-window, tree algorithms (BST, heap, traversals), graph algorithms (BFS/DFS/Dijkstra/MST/topo-sort), dynamic programming. Do NOT call plan_visualization before this tool.\n\nSteps per kind:\n- kind=\"array\": provide array.values[] and array.highlights[]. Use pointers[] for i/j/left/right labels.\n- kind=\"tree\": provide tree.nodes[] with id/value/parentId/left/right. Renderer auto-positions nodes.\n- kind=\"graph\": provide graph.nodes[] (id, label, x [0-1], y [0-1]) and graph.edges[]. Include queue[]/stack[] per step.\n- kind=\"table\": provide table.data[][] and table.highlights[]. Include rowLabels/colLabels and formula per step.\n\nMax 60 steps. Show every individual comparison/swap/visit.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      algorithm: z.string().describe("e.g. 'bubble_sort', 'bfs', 'binary_tree_inorder', 'knapsack_dp'"),
      steps: z.array(AlgorithmStepSchema).min(1).max(60),
    }),
    returnDirect: true,
  },
);

const renderMathExplorerTool = tool(
  async ({ title, description, mode, functions, curves, parameters, xRange, yRange, tRange, xLabel, yLabel }) => {
    return JSON.stringify({
      type: "math_explorer",
      title: title || "Math Explorer",
      description,
      mode,
      functions,
      curves,
      parameters,
      xRange: normalizeMathRange(xRange),
      yRange: normalizeMathRange(yRange),
      tRange: normalizeMathRange(tRange),
      xLabel,
      yLabel,
    });
  },
  {
    name: "render_math_explorer",
    description:
      "Render an interactive math/function explorer with canvas and parameter sliders. Use for: Taylor series, Fourier series partial sums, parametric curves (Lissajous, cycloid, rose curve), function exploration with amplitude/frequency/phase sliders, polynomial degree sliders. Do NOT use for static charts (use render_chart) or 3D scenes (use render_3d_scene). Do NOT call plan_visualization before this tool.\n\nmode='cartesian' (default): y=f(x). functions[].expr: mathjs expression in x and param names. Examples: 'sin(k*x)+c', 'x^n', 'A*cos(omega*x+phi)'.\nmode='parametric': x(t),y(t). curves[].xExpr + curves[].yExpr in t and params. Lissajous: { xExpr:'cos(a*t)', yExpr:'sin(b*t)' }, tRange:[0,6.28].\n\nSERIES — do NOT use sum(k,1,N,expr), mathjs has no symbolic loop summation. For N-term series, gate each term: sin(x) + (N>=3)*sin(3*x)/3 + (N>=5)*sin(5*x)/5.\n\nparameters[]: {name, label?, min, max, default, step?}. Every param must appear in an expression. Max 6 parameters. xRange/yRange/tRange optional; auto-computed if omitted.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      mode: z.enum(["cartesian", "parametric"]).optional(),
      functions: z.array(MathExplorerFunctionSchema).optional(),
      curves: z.array(MathExplorerCurveSchema).optional(),
      parameters: z.array(MathExplorerParameterSchema).max(6),
      xRange: MathExplorerRangeInputSchema.optional(),
      yRange: MathExplorerRangeInputSchema.optional(),
      tRange: MathExplorerRangeInputSchema.optional(),
      xLabel: z.string().optional(),
      yLabel: z.string().optional(),
    }),
    returnDirect: true,
  },
);

const WaveComponentSchema = z.object({
  label: z.string().optional(),
  amplitude: z.number().min(0).max(1),
  frequency: z.number().positive(),
  phase: z.number().optional(),
  kind: z.enum(["sine", "square", "sawtooth", "triangle"]).optional(),
  color: z.string().optional(),
});

const renderWaveTool = tool(
  async ({ title, description, waves, layout, timeScale, audioEnabled, audioFrequencies }) => {
    return JSON.stringify({
      type: "wave_visualization",
      title: title || "Wave Visualization",
      description,
      waves,
      layout: layout || "superposition",
      timeScale: timeScale ?? 3,
      audioEnabled: audioEnabled ?? false,
      audioFrequencies,
    });
  },
  {
    name: "render_wave",
    description:
      "Render an interactive 1D/2D wave visualization with play/pause, per-wave amplitude/frequency sliders, and optional audio. Use for: wave superposition, interference (constructive/destructive), beat frequency, standing waves, 声波叠加, 拍频, 驻波, 相消/相长干涉.\n\nDo NOT use for 3D electromagnetic wave E-B components (use render_3d_scene). Do NOT use for static function plots (use render_chart).\n\nlayout:\n- 'superposition': N component strips + sum strip. Use 2-4 waves.\n- 'beat': Two waves close in frequency + sum + amplitude envelope auto-annotated with T_beat. Set audioEnabled=true.\n- 'standing': Spatial snapshot y(x,t) oscillating over time. Nodes (N) and antinodes (A) auto-labeled.\n\nFrequency guidelines:\n- Visual-only demos: 0.5–5 Hz (slow enough to see wave shapes clearly)\n- Beat with audio: display waves at 2–5 Hz, set audioFrequencies=[f1_audio, f2_audio] (e.g. [440, 444]) for audible sound\n- Standing waves: use frequency=1 for fundamental, frequency=2 for second harmonic, etc.\n\nFor beat with audioEnabled=true: set audioFrequencies to a pair of audio-range frequencies (e.g. [440, 444]) while keeping display waves at low visual frequencies. Amplitude 0.0–1.0. Phase in radians.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      waves: z.array(WaveComponentSchema).min(1).max(6),
      layout: z.enum(["superposition", "beat", "standing"]).optional(),
      timeScale: z.number().positive().optional().describe("Number of slowest-wave cycles to show. Default 3."),
      audioEnabled: z.boolean().optional(),
      audioFrequencies: z.array(z.number().positive()).optional().describe("Per-wave audio frequencies in Hz. Overrides wave.frequency for sound only."),
    }),
    returnDirect: true,
  },
);

const GraphNodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  group: z.string().optional(),
  size: z.number().min(0.5).max(3).optional(),
  color: z.string().optional(),
});

const GraphEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  weight: z.number().optional(),
  directed: z.boolean().optional(),
});

const renderGraphTool = tool(
  async ({ title, description, nodes, edges, directed, layout }) => {
    return JSON.stringify({
      type: "graph_visualization",
      title: title || "Graph",
      description,
      nodes,
      edges,
      directed: directed ?? false,
      layout: layout || "force",
    });
  },
  {
    name: "render_graph",
    description:
      "Render an interactive force-directed graph with draggable nodes, click-to-highlight neighbors, and zoom/pan. Use for: knowledge graphs, concept maps, dependency graphs, social/actor networks, org charts with many nodes, call graphs, FSMs with many states, ontologies.\n\nUse render_diagram (Mermaid) instead for: flowcharts/sequence/ER/class diagrams with <10 nodes or strict left-to-right flow.\n\nNodes: id required; label defaults to id; group assigns a color family (up to 4 groups: sage/amber/lavender/rose); size multiplier 0.5–3.\nEdges: source/target reference node ids; directed overrides artifact-level directed flag per edge.\nlayout:\n- 'force' (default): spring-repulsion, best for general networks\n- 'tree': top-down hierarchy from root (no-incoming-edge) nodes\n- 'circle': all nodes equidistant on a circle\n- 'grid': uniform grid\ndirected: global arrow flag; individual edges can override with edge.directed.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      nodes: z.array(GraphNodeSchema).min(2).max(60),
      edges: z.array(GraphEdgeSchema).max(120),
      directed: z.boolean().optional(),
      layout: z.enum(["force", "tree", "circle", "grid"]).optional(),
    }),
    returnDirect: true,
  },
);

const MoleculeAtomSchema = z.object({
  id: z.string(),
  element: z.string().describe("Chemical symbol e.g. H, C, O, N, P, S, Cl, Br, Fe, etc."),
  x: z.number().describe("X coordinate in Angstroms"),
  y: z.number().describe("Y coordinate in Angstroms"),
  z: z.number().describe("Z coordinate in Angstroms"),
  label: z.string().optional(),
  charge: z.number().int().optional().describe("Formal charge e.g. +1, -1"),
});

const MoleculeBondSchema = z.object({
  atomA: z.string().describe("ID of first atom"),
  atomB: z.string().describe("ID of second atom"),
  order: z.number().int().min(1).max(3).optional().describe("Bond order: 1=single, 2=double, 3=triple"),
});

const renderMoleculeTool = tool(
  async ({ title, description, atoms, bonds, representation }) => {
    return JSON.stringify({
      type: "molecule",
      title: title || "Molecule",
      description,
      atoms,
      bonds,
      representation: representation ?? "ball_stick",
    });
  },
  {
    name: "render_molecule",
    description:
      "Render an interactive 3D molecular structure with CPK colors, drag-to-rotate, scroll-to-zoom, ball-and-stick/stick/space-fill views, and single/double/triple bond rendering.\n\nUse for: molecules (H₂O, CO₂, CH₄, benzene, ethanol, amino acids, DNA bases, organic functional groups, VSEPR geometries, crystal fragments).\n\nDo NOT use for abstract 3D vector fields or orbital mechanics — those belong in render_3d_scene.\n\nAtom coordinates in Angstroms. Standard geometries:\n- Water: O(0,0,0), H1(0.76,-0.59,0), H2(-0.76,-0.59,0) — 2 bonds order=1\n- CO₂: O1(-1.16,0,0), C(0,0,0), O2(1.16,0,0) — 2 bonds order=2, linear\n- Methane: C(0,0,0), H1(0.63,0.63,0.63), H2(-0.63,-0.63,0.63), H3(-0.63,0.63,-0.63), H4(0.63,-0.63,-0.63)\n- Benzene: 6 C at (1.40·cos k·60°, 1.40·sin k·60°, 0) for k=0..5; 6 H at radius 2.49 Å; alternate bond orders 2,1,2,1,2,1\n- Ammonia (sp3): N(0,0,0), H1(0,0.94,0.35), H2(0.82,-0.47,0.35), H3(-0.82,-0.47,0.35)\nElement symbols match CPK standard: H(white), C(dark grey), N(blue), O(red), S(yellow), P(orange), Cl(green), Br(dark red), I(purple), Na/K/Ca/Mg/Fe available.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      atoms: z.array(MoleculeAtomSchema).min(1).max(200),
      bonds: z.array(MoleculeBondSchema).max(300),
      representation: z.enum(["ball_stick", "stick", "sphere"]).optional(),
    }),
    returnDirect: true,
  },
);

const render3dSceneTool = tool(
  async ({ title, description, html }) => {
    return JSON.stringify({
      type: "html_widget",
      title: title || "3D Scene",
      description,
      html: normalizeWidgetHtml(html),
    });
  },
  {
    name: "render_3d_scene",
    description:
      "Render a 3D scientific visualization using THREE.js. Use for inherently 3D concepts: 3D vector operations, electric/magnetic/gravitational fields, orbital mechanics, wave propagation in 3D, molecular geometry (bond angles, VSEPR, orbitals), crystal lattice structures, 3D surfaces. Do NOT use for 2D physics (use render_physics_scene) or 2D charts.\n\nIMPORTANT: Use a plain <script> (NOT type=\"module\", NO import statements). THREE is auto-loaded from CDN when THREE. appears in the code; use the THREE global directly. OrbitControls is available as new THREE.OrbitControls(camera, domElement) — provided by the runtime shim.\n\nREQUIRED sections (all must be present):\n1. Container + WebGLRenderer — background #fbf7ee, setPixelRatio capped at 2\n2. PerspectiveCamera(45, aspect, 0.1, 1000) at position (8, 6, 8)\n3. Three lights: AmbientLight(0xb8d4ff, 0.4) + DirectionalLight key(0xffffff, 0.8) at (5,8,5) + DirectionalLight rim(0xff66aa, 0.35) at (-5,-3,-5)\n4. new THREE.OrbitControls(camera, renderer.domElement) with enableDamping + dampingFactor 0.05\n5. GridHelper(10, 10, 0xccbbaa, 0xddd0c0)\n6. makeLabel(text) — CanvasTexture Sprite with depthTest:false for text annotations\n7. animate() loop — requestAnimationFrame + controls.update() + renderer.render()\n8. ResizeObserver — update camera.aspect + renderer.setSize on container resize\n\nPalette: amber #c8881a, sage #4a7a5a, lavender #7c6ad0, rose #b56474. Container: <div id=\"scene\" style=\"width:100%;height:480px\">. Add overlay sliders/buttons for key parameters and a readout panel for live values.",
    schema: z.object({
      title: z.string().optional(),
      description: z.string(),
      html: z.string(),
    }),
    returnDirect: true,
  },
);

const getCourseCardTool = tool(
  async ({ course_id }, runtime) => {
    const ownerId = getRuntimeOwnerId(runtime);
    const course = await getCourse(course_id, ownerId);
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
    description: "Plans and renders creative interactive widgets using plan_visualization and widgetRenderer. Do NOT use for charts, diagrams, physics simulations, algorithm animations, math function explorers, or 3D science scenes — those have dedicated tools.",
    systemPrompt:
      "You are Primoria's Visualization agent. Handle ONLY custom creative widgets and animations that don't fit specialized tools. Call plan_visualization, then immediately widgetRenderer (nothing between). Preserve concrete user constraints in the plan and make them visible/interactable in the widget. Always write the complete HTML directly in the widgetRenderer html argument.",
  },
];

const SYSTEM_PROMPT = `You are Primoria, an AI tutor powered by deepagents.

You have access to:
- write_todos: lay out a short plan visible to the learner (call it first when a request needs multiple steps)
- task: delegate a focused job to a subagent (concept-agent or visualization-agent)
- plan_visualization / widgetRenderer: visualization tools
- position_learning_goal: surface a learning goal so the UI can locate it in the knowledge graph and build a course. This is the ONLY way a course is created.
- render_chat_quiz: render a temporary interactive quiz directly inside chat. It never creates a course block and never updates mastery.
- get_course_card: restore aCOURSE branch has highest priority only when the learner is in the main tutor workspace or explicitly asks to create/generate/build a NEW course. If COURSE DETAIL MODE context is present, do not enter COURSE branch for summarize/explain/practice questions about the current course. In main tutor mode, if the latest user message contains 课程 / 教程 / 微课 / 系统讲 / 系统学 / 学一下 / 学习 / 教我 / 讲讲 / 讲解 / lesson / course / curriculum / teach me / I want to learn / learn about / study:
1. Call position_learning_goal with the learner's goal as \`query\`.
2. In the same turn, greet the learner like a warm, encouraging tutor in 2-3 sentences (their language): restate their goal in your own words, tell them you are locating it in their knowledge graph and starting to build a path tailored to them, and add one line that sparks curiosity about the topic. Do NOT invent specifics — you have not seen the positioning result, so never name concrete topics, a lesson count, or an outline; speak only about the goal and what you are doing. Warm but concise: no lists, no markdown, no headings. The UI card then performs the positioning and course generation and shows the result (a course, a topic menu, or a "be more specific" message) — you do not see or handle that result.
3. Stop. Never call task, plan_visualization, or widgetRenderer in COURSE branch, and never attempt to generate a course by any other means.
In main tutor mode, if the learner asks for a quiz / test / practice questions / 测验 / 测试 / 练习题 / 考考我 / 出题 / 自测 on a topic, enter COURSE branch and call position_learning_goal for that topic. If they are already inside COURSE DETAIL MODE, call render_chat_quiz instead so the quiz appears inside the chat and does not create a course block.

CHART branch (if COURSE does not match): user asks for chart / graph / data plot / bar chart / line chart / scatter / pie / radar / histogram / heatmap / treemap.
  Call render_chart with a complete ECharts option JSON. Stop immediately. Do NOT call plan_visualization.

DIAGRAM branch (if COURSE and CHART do not match): user asks for flowchart / sequence diagram / architecture diagram / ER diagram / class diagram / mind map / simple state machine / process flow with clear linear or hierarchical structure.
  Do NOT use for knowledge graphs, concept maps, or networks with many nodes and complex interconnections — use the GRAPH branch for those.
  Call render_diagram with a valid Mermaid definition. Stop immediately. Do NOT call plan_visualization.

PHYSICS branch (if COURSE, CHART, DIAGRAM do not match): user asks for physics simulation / pendulum / Newton's cradle / collision / projectile / spring / inclined plane / falling object / rigid-body demo.
  Call render_physics_scene with a scene JSON (bodies + constraints + initial conditions). NEVER write simulation code. Stop immediately. Do NOT call plan_visualization.

ALGORITHM branch (if COURSE, CHART, DIAGRAM, PHYSICS do not match): user asks for a step-by-step CS algorithm visualization — sorting, binary search, tree traversal, graph algorithms (BFS/DFS/Dijkstra/MST), dynamic programming, or any request to animate an algorithm step-by-step.
Call render_algorithm directly. Stop immediately after render_algorithm returns.
1. Call render_algorithm with all steps computed for the given input. Show every individual comparison/swap/visit.
2. Stop.

MATH EXPLORER branch (if COURSE, CHART, DIAGRAM, PHYSICS, ALGORITHM do not match): user asks for Taylor series / Fourier series partial sums / parametric curves (Lissajous, cycloid, rose curve) / interactive function exploration with sliders (amplitude/frequency/phase/polynomial degree) / any scenario where changing a parameter changes the function shape.
Call render_math_explorer directly. Stop immediately after render_math_explorer returns.
1. Call render_math_explorer.
2. Stop.
Expression rules: do NOT use sum(k,1,N,expr) — mathjs has no symbolic loop summation. For N-term series, gate each term: sin(x) + (N>=3)*sin(3*x)/3 + (N>=5)*sin(5*x)/5 (boolean 1/0 gates the term).

WAVE branch (if COURSE, CHART, DIAGRAM, PHYSICS, ALGORITHM, MATH EXPLORER, WAVE do not match): user asks for wave superposition / beat frequency / standing wave / wave interference / 声波叠加 / 拍频 / 驻波 / 波的叠加 / 相消干涉 / 相长干涉.
Do NOT use for 3D electromagnetic wave E-B components in 3D space (use 3D SCIENCE).
Do NOT use for static sine/cosine plots or Fourier series coefficient exploration (use MATH EXPLORER or render_chart).
Call render_wave directly. Stop immediately after render_wave returns.
1. Call render_wave.
   - Superposition / interference: layout="superposition", 2–4 waves.
   - Beat frequency: layout="beat", two waves with close display frequencies (e.g. 2 Hz and 2.4 Hz), audioEnabled=true, audioFrequencies=[440, 444]. Beat period T_beat = 1/|f₁-f₂| is auto-annotated.
   - Standing wave: layout="standing", frequency=1 for fundamental; for multiple harmonics add waves with frequency=2, 3.
2. Stop.

GRAPH branch (if COURSE, CHART, DIAGRAM, PHYSICS, ALGORITHM, MATH EXPLORER, WAVE do not match): user asks for a knowledge graph / concept map / network graph / dependency graph / social network / actor-movie graph / call graph / org chart / ontology / FSM with many nodes.
Do NOT use for simple flowcharts or diagrams with clear linear flow (use DIAGRAM branch).
Call render_graph directly. Stop immediately after render_graph returns.
1. Call render_graph. Tips:
   - Group nodes by category using group field (up to 4 groups)
   - layout="tree" for class hierarchies, org charts, taxonomies
   - layout="circle" for peer groups, round-robin comparisons
   - layout="force" (default) for general networks and knowledge graphs
   - Set directed=true for dependency/call graphs, DAGs, FSMs
2. Stop.

MOLECULE branch (if COURSE, CHART, DIAGRAM, PHYSICS, ALGORITHM, MATH EXPLORER, WAVE, GRAPH do not match): user asks for a molecular structure / chemical structure / atom arrangement / DNA/RNA base / amino acid / organic molecule / crystal fragment / VSEPR geometry / Lewis structure / 分子结构 / 化学键 / 原子模型 / 碱基 / 氨基酸 / 有机分子.
Do NOT use for abstract 3D field visualizations or orbital mechanics (use 3D SCIENCE).
Call render_molecule directly. Stop immediately after render_molecule returns.
1. Call render_molecule with chemically accurate 3D atom coordinates in Angstroms.
   Use these reference geometries:
   - Water (H₂O): O at origin, H at (±0.76, -0.59, 0), bond angle 104.5°
   - CO₂: O at (±1.16, 0, 0), linear, bonds order=2
   - Methane (CH₄): C at origin, 4 H at (±0.63, Extruded tetrahedral corners
   - Benzene: 6 C at radius 1.40 Å, 6 H at 2.49 Å, alternating bond orders 2,1,2,1,2,1
   - NH₃: N at origin, 3 H at 120° around N with slight pyramidal tilt
   - For amino acids: backbone N-Cα-C(=O) with appropriate side chain; use sp3 for Cα
   Set representation="sphere" for space-fill questions, "stick" for bond-only diagrams.
3. Stop.

3D SCIENCE branch (if COURSE, CHART, DIAGRAM, PHYSICS, ALGORITHM, MATH EXPLORER, WAVE, GRAPH, MOLECULE do not match): user asks for a 3D scientific visualization — 3D vectors, electric/magnetic/gravitational fields, orbital mechanics (Kepler's laws, planetary motion), wave propagation in 3D, abstract orbital shapes (s/p/d orbitals), crystal lattice structures, geological/geographic 3D surfaces, or any concept that is inherently three-dimensional and NOT a concrete molecule with atoms and bonds.
Call render_3d_scene directly. Stop immediately after render_3d_scene returns.
1. Call render_3d_scene. Use the REQUIRED structure: container, renderer, camera at (8,6,8), three-light setup (ambient+key+rim), OrbitControls with damping, GridHelper, makeLabel sprite factory, animate loop, ResizeObserver.
2. Stop.

VISUALIZATION branch only applies if none of the above match. For custom interactive widgets / creative animations / interactive quizzes that are NOT charts, diagrams, 2D physics simulations, 3D science scenes, algorithm visualizations, or math function explorers:

STEM SIMULATION sub-branch — use when the request is specifically about:
  • Physics: rigid-body, pendulum, spring, collision, projectile, gravity, orbital mechanics (if 2D)
  • Math: function plots, trigonometry, calculus, vectors, parametric curves, Fourier series (if 2D)
  • CS algorithms: sorting, graph traversal, tree operations, stack/queue visualization (if 2D)
Workflow:
1. Briefly acknowledge what you will build in 1 short sentence.
2. Call plan_visualization with approach, technology, 2-4 key elements, and subject set to "physics", "math", or "cs". Read the Runtime API reference it returns carefully — your code must ONLY use the documented API methods.
3. Call stemRenderer with subject, scene, title, description, and code that uses the Runtime API. Call run() last. No imports, no raw DOM/Matter.js calls.
4. Stop immediately after stemRenderer returns.

GENERAL WIDGET sub-branch — use for everything else (charts, diagrams, architecture visualizations, custom simulations, interactive tools):
1. Briefly acknowledge what you will build in 1 short sentence.
2. Call plan_visualization with approach, technology, and 2-4 key elements (no subject for general widgets).
3. Call widgetRenderer with title, description, and a compact self-contained HTML fragment. Do not include doctype/html/head/body wrappers. Keep code concise; use one canvas/SVG and a compact status panel.
4. Stop immediately after widgetRenderer returns.

CRITICAL: plan_visualization and widgetRenderer (or stemRenderer) are an INSEPARABLE PAIR. No other tool call may appear between them. Stop immediately after the rendering tool returns.

CRITICAL OUTPUT RULES:
- Prefer short, decisive tool sequences. For charts/diagrams/physics, call ONE tool and stop.
- Never reveal hidden reasoning. Do not output <think>, </think>, or any private chain-of-thought text.
- NEVER paste HTML / CSS / JS code into your text reply. Code only belongs inside the widgetRenderer/stemRenderer html/code arguments.
- NEVER paste tool result strings or JSON into your text reply. If a tool result begins with PRIMORIA_COURSE_CARD:, treat it as UI-only data and do not mention or copy it.
- NEVER wrap output in markdown code blocks (no \`\`\`html, no \`\`\`).

For greetings ("hi", "你好"), thanks, casual chat, or anything that is clearly NOT a learning question, just reply with one short sentence and do NOT call any tools.

For plain factual / conceptual questions that do not require a visualization, answer in 1-2 sentences without tools.

If the latest prompt includes an explicit COURSE DETAIL MODE system/context section, that section overrides the COURSE branch above. In that mode, summarize/explain from the existing course context, and use render_chat_quiz for quiz/practice requests unless the learner clearly asks for a new/different course.`;

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
      maxTokens: streaming ? 24000 : 4096,
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
    maxTokens: 24000,
    streaming,
    configuration: { baseURL: baseUrl.replace(/\/$/, "") },
  });
}

const checkpointer = new MemorySaver();

export const graph = createDeepAgent({
  name: "primoria-tutor",
  model: createModel(),
  tools: [
    planVisualizationTool,
    widgetRendererTool,
    renderChatQuizTool,
    getCourseCardTool,
    renderChartTool,
    renderDiagramTool,
    renderPhysicsSceneTool,
    render3dSceneTool,
    renderAlgorithmTool,
    renderMathExplorerTool,
    renderWaveTool,
    renderGraphTool,
    renderMoleculeTool,
    stemRendererTool,
    positionLearningGoalTool,
  ],
  systemPrompt: SYSTEM_PROMPT,
  subagents,
  middleware: [primoriaContextMiddleware, primoriaCourseDetailMiddleware],
  contextSchema: /** @type {any} */ (PrimoriaContextAnnotation),
  checkpointer,
  backend: new FilesystemBackend({
    rootDir: process.cwd(),
    virtualMode: true,
  }),
  skills: ["/skills/"],
});
