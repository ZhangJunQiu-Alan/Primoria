import { tool } from "@langchain/core/tools";
import { Annotation, Command, MessagesAnnotation } from "@langchain/langgraph";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import type {
  ChatMessage,
  HtmlWidgetArtifact,
  TodoListArtifact,
  ToolStatusArtifact,
  TutorAgentResponse,
  TutorArtifact,
  TutorProviderSettings,
  TutorStreamEvent,
  VisualizationPlanArtifact,
} from "../types";

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

function resolveProviderSettings(settings: TutorProviderSettings = {}) {
  const baseUrl = settings.baseUrl || process.env.OPENAI_BASE_URL;
  const apiKey = settings.apiKey || process.env.OPENAI_API_KEY;
  const model = settings.model || process.env.OPENAI_MODEL || "gpt-5.4";

  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  return { baseUrl, apiKey, model };
}

function createModel(settings: TutorProviderSettings) {
  const { baseUrl, apiKey, model } = resolveProviderSettings(settings);

  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens: 4096,
    streaming: true,
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ""),
    },
  });
}

export function createTutorModel(settings: TutorProviderSettings = {}) {
  return createModel(settings);
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

  return undefined;
}

function createTutorTools() {
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
        "Render an interactive HTML/CSS/JS learning widget. MUST be used for any visualization request. Use the Primoria warm palette: backgrounds #fbf7ee / #fffaf2 / #f7f3ea, accents amber #c8881a, sage #4a7a5a, lavender #7c6ad0, sky #4a7aa8, coral #c46a4e, rose #b56474, text #3a352d, borders #eadfce. Use 2-3 different accent colors per widget for visual distinction. Rounded 12-18px corners, soft 0.5-1px borders, no black backgrounds, no neon, no emoji decoration.",
      schema: z.object({
        title: z.string(),
        description: z.string(),
        html: z.string(),
      }),
    },
  );

  return [manageTodosTool, planVisualizationTool, renderInteractiveWidgetTool] as const;
}

const SYSTEM_PROMPT = `You are Primoria, an AI tutor.

For ANY visualization / interactive / simulation / demo / 可视化 / 演示 / 互动 request, you MUST:
1. Call manage_todos first with 3-5 todos that are SPECIFIC to the learner's topic. Each title must mention a concrete noun from the question (algorithm name, concept, physics law, etc.). Bad: "确定需求 / 规划组件 / 构建演示 / 验证效果". Good (for 开普勒第二定律): "🌌 抓住等面积扫掠的直觉 / 🟠 用椭圆+扇区设计互动 / 🛠️ 让滑块控制离心率 / 🔍 检查近日点速度". Set first todo in_progress, rest pending.
2. Call plan_visualization with title, approach, technology, key_elements.
3. Call manage_todos again to flip the planning todo to completed and the next one to in_progress.
4. Call render_interactive_widget with title, description, and a complete self-contained HTML fragment in the html argument.
5. Call manage_todos one more time to mark all completed.

Do NOT respond with text alone for visualization requests. The tool calls are required.

For plain questions, answer in 1-2 sentences without tools.`;

let cachedAgent: PrimoriaAgent | null = null;
let cachedKey = "";
const checkpointer = new MemorySaver();

export function getPrimoriaDeepAgent(settings: TutorProviderSettings = {}) {
  const resolved = resolveProviderSettings(settings);
  const key = `${resolved.baseUrl}|${resolved.model}|${resolved.apiKey.slice(0, 8)}`;
  if (cachedAgent && cachedKey === key) return cachedAgent;

  cachedAgent = createReactAgent({
    llm: createModel(settings),
    tools: createTutorTools() as never,
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
    for (const todo of rawTodos as AgentTodo[]) {
      if (!todo || typeof todo.title !== "string") continue;
      const mappedStatus =
        todo.status === "completed" ? "done" : todo.status === "in_progress" ? "in_progress" : "pending";
      items.push({
        title: todo.emoji ? `${todo.emoji} ${todo.title}` : todo.title,
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
    } else if (ev.event === "on_chain_end") {
      const out = ev.data?.output;
      if (out && typeof out === "object" && !Array.isArray(out) && "todos" in out) {
        emitTodosFromState((out as { todos?: unknown }).todos);
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
