import { tool } from "@langchain/core/tools";
import { Annotation, Command, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { z } from "zod";
import type {
  ChatMessage,
  CourseCardArtifact,
  HtmlWidgetArtifact,
  TodoListArtifact,
  ToolStatusArtifact,
  TutorAgentResponse,
  TutorArtifact,
  TutorProviderSettings,
  TutorStreamEvent,
  VisualizationPlanArtifact,
} from "../types";
import { generateCourse } from "./course-generator";
import { createTutorModel, resolveProviderSettings } from "./model";

export { createTutorModel } from "./model";

type PrimoriaAgent = ReturnType<typeof createReactAgent>;

type AgentTodo = {
  id: string;
  title: string;
  description?: string;
  emoji?: string;
  status: "pending" | "in_progress" | "completed";
};

const AgentStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  todos: Annotation<AgentTodo[]>({
    reducer: (_, next) => next,
    default: () => [],
  }),
});

const VisualizationPlanSchema = z.object({
  type: z.literal("visualization_plan"),
  title: z.string(),
  approach: z.string(),
  technology: z.string(),
  keyElements: z.array(z.string()),
});

const HtmlWidgetSchema = z.object({
  type: z.literal("html_widget"),
  title: z.string(),
  description: z.string(),
  html: z.string(),
});

const CourseCardSchema = z.object({
  type: z.literal("course_card"),
  courseId: z.string(),
  title: z.string(),
  topic: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number(),
  outline: z.array(
    z.object({
      type: z.enum(["text", "analogy", "transfer", "visual", "code"]),
      title: z.string(),
    }),
  ),
  status: z.enum(["generating", "ready"]),
});

function createModel(settings: TutorProviderSettings) {
  return createTutorModel(settings);
}

function parseDeepArtifact(value: unknown): TutorArtifact | undefined {
  let candidate: unknown;
  try {
    candidate = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return undefined;
  }

  const plan = VisualizationPlanSchema.safeParse(candidate);
  if (plan.success) return plan.data;

  const widget = HtmlWidgetSchema.safeParse(candidate);
  if (widget.success) return widget.data;

  const card = CourseCardSchema.safeParse(candidate);
  if (card.success) return card.data;

  return undefined;
}

function createTutorTools(settings: TutorProviderSettings) {
  const manageTodosTool = tool(
    async ({ todos }, config) => {
      const toolCallId = (config as { toolCall?: { id?: string } })?.toolCall?.id ?? "manage_todos";
      return new Command({
        update: {
          todos,
          messages: [
            { role: "tool", content: "Todos updated.", tool_call_id: toolCallId },
          ],
        },
      });
    },
    {
      name: "manage_todos",
      description:
        "Lay out or update the visible plan of steps the tutor will follow. Call this FIRST for any non-trivial request, then call it again to mark steps completed.",
      schema: z.object({
        todos: z
          .array(
            z.object({
              id: z.string(),
              title: z.string(),
              description: z.string().optional(),
              emoji: z.string().optional(),
              status: z.enum(["pending", "in_progress", "completed"]),
            }),
          )
          .min(1)
          .max(6),
      }),
    },
  );

  const planVisualizationTool = tool(
    async ({ title, approach, technology, key_elements }) => {
      const plan: VisualizationPlanArtifact = {
        type: "visualization_plan",
        title,
        approach,
        technology,
        keyElements: key_elements,
      };
      return JSON.stringify(plan);
    },
    {
      name: "plan_visualization",
      description: "Plan a widget before building it. MUST be called before render_interactive_widget.",
      schema: z.object({
        title: z.string(),
        approach: z.string(),
        technology: z.string(),
        key_elements: z.array(z.string()).min(2).max(4),
      }),
    },
  );

  const renderInteractiveWidgetTool = tool(
    async ({ title, description, html }) => {
      const widget: HtmlWidgetArtifact = {
        type: "html_widget",
        title,
        description,
        html,
      };
      return JSON.stringify(widget);
    },
    {
      name: "render_interactive_widget",
      description:
        "Render an interactive HTML/CSS/JS learning widget. MUST be used for any visualization request. Use the soft Primoria palette: cream backgrounds #fbf7ee / #fffaf2. For HIGHLIGHTED / ACTIVE / SELECTED elements pair a tinted fill with a matching 1.5-2px solid border: amber pair (#fff2de + #c8881a), sage pair (#e8f3ea + #4a7a5a), lavender pair (#efe7d7 + #7c6ad0), rose pair (#fbeaf0 + #b56474). NEVER use the saturated border color alone as a fill. Inactive cells: cream background + 0.5px #eadfce border. Excluded / muted state: opacity 0.45-0.55. Text #3a352d for body, #6b6357 for muted. Rounded 12-18px corners, no black, no neon, no emoji decoration. Goal: pale and airy overall, with one clearly distinct focus element via the tint+border pair.",
      schema: z.object({
        title: z.string(),
        description: z.string(),
        html: z.string(),
      }),
    },
  );

  const generateCourseTool = tool(
    async ({ topic, context_hint }) => {
      const { summary } = await generateCourse(
        { topic, contextHint: context_hint },
        settings,
      );
      const card: CourseCardArtifact = {
        type: "course_card",
        courseId: summary.id,
        title: summary.title,
        topic: summary.topic,
        summary: summary.summary,
        estimatedMinutes: summary.estimatedMinutes,
        outline: summary.outline,
        status: "ready",
      };
      return JSON.stringify(card);
    },
    {
      name: "generate_course",
      description:
        "Generate a short structured course on a topic the learner wants to study. Use this when the user asks to LEARN / STUDY a topic, asks for a 'course' / 'lesson' / 'curriculum' / '教程' / '课程' / '系统讲解' / '系统学习' — i.e. wants a multi-step learning artifact, not a single answer or a single widget. The tool persists the course in the Library and returns a course card. After calling it, write ONE short sentence inviting the learner to open the course (do NOT restate the content).",
      schema: z.object({
        topic: z
          .string()
          .describe("The specific topic to teach. Extract from the user's question. Keep it focused."),
        context_hint: z
          .string()
          .optional()
          .describe(
            "Optional 1-2 sentence summary of relevant prior chat (audience hints, what they've already understood). Leave empty if no useful context.",
          ),
      }),
    },
  );

  return [
    manageTodosTool,
    planVisualizationTool,
    renderInteractiveWidgetTool,
    generateCourseTool,
  ] as const;
}

const SYSTEM_PROMPT = `You are Primoria, an AI tutor with THREE possible response modes. Pick exactly ONE per turn.

═══ MODE PRECEDENCE (check in this order, stop at first match) ═══

(A) COURSE MODE — strongest priority.
Trigger ANY of these and you MUST take this branch:
- The latest user message contains: "课程" / "课" / "教程" / "微课" / "lesson" / "course" / "curriculum" / "系统讲" / "系统学" / "学一下" / "学习" / "教我" / "讲讲" / "teach me" / "I want to learn" / "learn about" / "study"
- The user says "生成 X" / "create a course" / "make a lesson" / "build a course" referring to a topic
- Any phrasing implying a multi-step, structured learning artifact

In COURSE MODE:
  1. Call manage_todos with 3 todos: "📋 拆解 {topic} 的学习路径" (in_progress) / "✍️ 生成结构化课程 blocks" (pending) / "✅ 入库并展示卡片" (pending).
  2. Call generate_course({topic, context_hint}). topic = the specific subject. context_hint = 1-2 sentence summary of relevant prior chat if any, otherwise omit.
  3. Call manage_todos again to mark all completed.
  4. Reply with ONE short sentence inviting the user to open the course card. NEVER restate the course content.

CRITICAL NEGATIVE RULE for COURSE MODE:
  ✗ Do NOT call plan_visualization or render_interactive_widget in COURSE MODE. The course generator handles its own visuals internally as one block among several.
  ✗ Do NOT explain why you picked course mode.

(B) VISUALIZATION MODE — only if (A) does NOT match.
Trigger: user asks for ONE interactive widget / demo / simulation, with phrases like "做一个...的可视化" / "演示" / "interactive widget" / "demo" — and NO course keywords.
Steps:
  1. Call manage_todos with 3-5 todos specific to the topic (use the emoji field, not inline emojis).
  2. Call plan_visualization.
  3. Call manage_todos again.
  4. Call render_interactive_widget with a complete self-contained HTML fragment using the Primoria palette (cream backgrounds #fbf7ee / #fffaf2, amber/sage/lavender tint+border highlights, no black, no neon).
  5. Call manage_todos one more time to mark all completed.
Rule: if you called plan_visualization, you MUST also call render_interactive_widget in the same turn.

(C) CASUAL MODE — only if neither (A) nor (B) match.
Greetings, thanks, trivially answerable factual questions. Reply in 1-2 short sentences. Do NOT call any tools.

═══ DECISION CHECKLIST (run silently before any tool call) ═══
- Does the latest user message contain any course keyword from the list in (A)? → COURSE MODE.
- Otherwise, does it ask for ONE interactive widget? → VISUALIZATION MODE.
- Otherwise → CASUAL MODE.

═══ OUTPUT RULES ═══
- NEVER paste HTML / CSS / JS into your text reply.
- NEVER wrap output in markdown code fences (no \`\`\`html, no \`\`\`).`;

let cachedAgent: PrimoriaAgent | null = null;
let cachedKey = "";
const checkpointer = new MemorySaver();

export function getPrimoriaDeepAgent(settings: TutorProviderSettings = {}) {
  const resolved = resolveProviderSettings(settings);
  const key = `${resolved.baseUrl}|${resolved.model}|${resolved.apiKey.slice(0, 8)}`;
  if (cachedAgent && cachedKey === key) return cachedAgent;

  cachedAgent = createReactAgent({
    llm: createModel(settings),
    tools: createTutorTools(settings) as never,
    prompt: SYSTEM_PROMPT,
    stateSchema: AgentStateAnnotation,
    checkpointer,
  });
  cachedKey = key;

  return cachedAgent;
}

const VISIBLE_TOOLS = new Set([
  "manage_todos",
  "plan_visualization",
  "render_interactive_widget",
  "generate_course",
]);

const TOOL_LABELS: Record<string, { executing: string; complete: string }> = {
  manage_todos: {
    executing: "Updating the plan steps.",
    complete: "Plan updated.",
  },
  plan_visualization: {
    executing: "Planning the visualization.",
    complete: "Visualization plan is ready.",
  },
  render_interactive_widget: {
    executing: "Generating the interactive widget.",
    complete: "Interactive widget is ready.",
  },
  generate_course: {
    executing: "Course agent is composing the lesson.",
    complete: "Course saved to Library.",
  },
};

function toolStatusEvent(name: string, status: ToolStatusArtifact["status"]): ToolStatusArtifact {
  const labels = TOOL_LABELS[name];
  const description = labels
    ? labels[status === "complete" ? "complete" : "executing"]
    : status === "executing"
      ? `Running ${name}.`
      : `${name} finished.`;
  return {
    type: "tool_status",
    name,
    status,
    description,
  };
}

function extractStringField(partialJson: string, field: string): string | null {
  const marker = `"${field}"`;
  const start = partialJson.indexOf(marker);
  if (start === -1) return null;
  let i = start + marker.length;
  while (i < partialJson.length && /\s/.test(partialJson[i])) i++;
  if (partialJson[i] !== ":") return null;
  i++;
  while (i < partialJson.length && /\s/.test(partialJson[i])) i++;
  if (partialJson[i] !== '"') return null;
  i++;
  let out = "";
  while (i < partialJson.length) {
    const c = partialJson[i];
    if (c === '"') return out;
    if (c === "\\") {
      const next = partialJson[i + 1];
      if (next === undefined) return out;
      switch (next) {
        case '"':
          out += '"';
          break;
        case "\\":
          out += "\\";
          break;
        case "/":
          out += "/";
          break;
        case "n":
          out += "\n";
          break;
        case "r":
          out += "\r";
          break;
        case "t":
          out += "\t";
          break;
        case "b":
          out += "\b";
          break;
        case "f":
          out += "\f";
          break;
        case "u": {
          if (i + 5 >= partialJson.length) return out;
          const hex = partialJson.slice(i + 2, i + 6);
          const code = parseInt(hex, 16);
          if (Number.isNaN(code)) return out;
          out += String.fromCharCode(code);
          i += 4;
          break;
        }
        default:
          out += next;
      }
      i += 2;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

type StreamEvent = {
  event: string;
  name?: string;
  data?: { input?: unknown; output?: unknown; chunk?: unknown };
};

type ToolCallChunk = { id?: string; index?: number; name?: string; args?: string };

type AccumulatedToolCall = {
  name?: string;
  args: string;
  executingEmitted: boolean;
  lastEmittedHtmlLength: number;
};

export async function invokePrimoriaDeepAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
  threadId = "primoria-local-tutor",
): Promise<TutorAgentResponse> {
  const agent = getPrimoriaDeepAgent(settings) as unknown as {
    streamEvents: (
      input: unknown,
      config: { configurable: { thread_id: string }; version: "v2" },
    ) => AsyncIterable<StreamEvent>;
  };

  const input = {
    messages: messages.map((message) => ({ role: message.role, content: message.content })),
  };

  const toolCallBuffers = new Map<string, AccumulatedToolCall>();
  const emittedArtifacts = new Set<string>();
  const executingEmitted = new Set<string>();
  const finalArtifacts: TutorArtifact[] = [];
  let replyBuffer = "";
  let lastTodosKey = "";

  function emitTodosFromState(rawTodos: unknown) {
    if (!Array.isArray(rawTodos) || rawTodos.length === 0) return;
    const items: TodoListArtifact["items"] = [];
    const emojiPrefix = /^\s*[\p{Extended_Pictographic}\p{Emoji_Component}]+\s*/u;
    for (const todo of rawTodos as AgentTodo[]) {
      if (!todo || typeof todo.title !== "string") continue;
      const mappedStatus =
        todo.status === "completed" ? "done" : todo.status === "in_progress" ? "in_progress" : "pending";
      const cleanedTitle = todo.title.replace(emojiPrefix, "").trim() || todo.title;
      const emoji = todo.emoji?.trim();
      items.push({
        title: emoji ? `${emoji} ${cleanedTitle}` : todo.title,
        status: mappedStatus,
      });
    }
    if (items.length === 0) return;
    const todoArtifact: TodoListArtifact = { type: "todo_list", items };
    const key = JSON.stringify(todoArtifact);
    if (key === lastTodosKey) return;
    lastTodosKey = key;
    emit({ type: "artifact_delta", artifact: todoArtifact });
  }

  function pushArtifact(artifact: TutorArtifact) {
    const key = JSON.stringify(artifact);
    if (emittedArtifacts.has(key)) return;
    emittedArtifacts.add(key);
    finalArtifacts.push(artifact);
    emit({ type: "artifact", artifact });
  }

  for await (const ev of agent.streamEvents(input, {
    configurable: { thread_id: threadId },
    version: "v2",
  })) {
    if (ev.event === "on_chat_model_stream") {
      const chunk = ev.data?.chunk as
        | { content?: unknown; tool_call_chunks?: ToolCallChunk[] }
        | undefined;
      if (!chunk) continue;

      const text = typeof chunk.content === "string" ? chunk.content : "";
      if (text) {
        replyBuffer += text;
        emit({
          type: "assistant_message",
          label: "Tutor team",
          reply: replyBuffer,
          suggestions: [],
        });
      }

      const toolChunks = chunk.tool_call_chunks ?? [];
      for (const tc of toolChunks) {
        const key = tc.id ?? `idx-${tc.index ?? 0}`;
        const buf = toolCallBuffers.get(key) ?? {
          name: tc.name,
          args: "",
          executingEmitted: false,
          lastEmittedHtmlLength: 0,
        };
        if (tc.name) buf.name = tc.name;
        if (tc.args) buf.args += tc.args;
        toolCallBuffers.set(key, buf);

        if (buf.name && !buf.executingEmitted && VISIBLE_TOOLS.has(buf.name)) {
          buf.executingEmitted = true;
          executingEmitted.add(buf.name);
          emit({ type: "tool_status", artifact: toolStatusEvent(buf.name, "executing") });
        }

        if (buf.name === "render_interactive_widget") {
          const html = extractStringField(buf.args, "html");
          if (html && html.length > buf.lastEmittedHtmlLength) {
            const title = extractStringField(buf.args, "title") ?? "Interactive widget";
            const description =
              extractStringField(buf.args, "description") ?? "";
            buf.lastEmittedHtmlLength = html.length;
            emit({
              type: "artifact_delta",
              artifact: {
                type: "html_widget",
                title,
                description,
                html,
              },
            });
          }
        }
      }
    } else if (ev.event === "on_chat_model_end") {
      const output = ev.data?.output as
        | { content?: unknown; tool_calls?: Array<{ name: string }> }
        | undefined;
      if (output) {
        const text = typeof output.content === "string" ? output.content : "";
        if (text && text !== replyBuffer) {
          replyBuffer = text;
          emit({
            type: "assistant_message",
            label: "Tutor team",
            reply: replyBuffer,
            suggestions: [],
          });
        }
      }
    } else if (ev.event === "on_tool_start" && VISIBLE_TOOLS.has(ev.name ?? "")) {
      const name = ev.name!;
      if (!executingEmitted.has(name)) {
        executingEmitted.add(name);
        emit({ type: "tool_status", artifact: toolStatusEvent(name, "executing") });
      }
    } else if (ev.event === "on_tool_end" && VISIBLE_TOOLS.has(ev.name ?? "")) {
      const name = ev.name!;
      emit({ type: "tool_status", artifact: toolStatusEvent(name, "complete") });
      const rawOutput = ev.data?.output as unknown;
      const candidate =
        rawOutput && typeof rawOutput === "object" && "content" in rawOutput
          ? (rawOutput as { content: unknown }).content
          : rawOutput;
      const artifact = parseDeepArtifact(candidate);
      if (artifact) pushArtifact(artifact);

      if (
        name === "manage_todos" &&
        rawOutput &&
        typeof rawOutput === "object" &&
        "update" in rawOutput
      ) {
        const update = (rawOutput as { update?: { todos?: unknown } }).update;
        emitTodosFromState(update?.todos);
      }
    }
  }

  return {
    label: "Tutor team",
    reply: replyBuffer,
    artifacts: finalArtifacts,
    suggestions: [],
  };
}

export async function invokePrimoriaDeepAgent(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  threadId = "primoria-local-tutor",
): Promise<TutorAgentResponse> {
  return invokePrimoriaDeepAgentStream(messages, settings, () => {}, threadId);
}
