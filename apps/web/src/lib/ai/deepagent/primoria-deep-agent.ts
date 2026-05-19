import { tool } from "@langchain/core/tools";
import type { RunnableConfig } from "@langchain/core/runnables";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createDeepAgent, FilesystemBackend, type DeepAgent, type SubAgent } from "deepagents";
import { toolStrategy } from "langchain";
import { z } from "zod/v4";
import { planVisualization, streamInteractiveWidget } from "../tutor-tools";
import type {
  ChatMessage,
  HtmlWidgetArtifact,
  ToolStatusArtifact,
  TutorAgentResponse,
  TutorProviderSettings,
  TutorStreamEvent,
  VisualizationPlanArtifact,
} from "../types";

type PrimoriaDeepAgent = DeepAgent;

export type DeepTutorStructuredResponse = {
  label: TutorAgentResponse["label"];
  reply: string;
  tool_calls: Array<
    | {
        name: "deep_agent";
        status: "complete";
        summary: string;
      }
    | {
        name: "plan_visualization";
        status: "complete";
        summary: string;
      }
    | {
        name: "render_interactive_widget";
        status: "complete";
        summary: string;
      }
  >;
  artifacts: Array<VisualizationPlanArtifact | HtmlWidgetArtifact>;
  suggestions: string[];
};

const DeepTutorResponseSchema = z.object({
  label: z
    .enum(["Tutor team", "Concept agent", "Visualization agent", "Practice agent", "Code agent"])
    .default("Tutor team"),
  reply: z.string(),
  tool_calls: z
    .array(
      z.discriminatedUnion("name", [
        z.object({
          name: z.literal("deep_agent"),
          status: z.literal("complete"),
          summary: z.string(),
        }),
        z.object({
          name: z.literal("plan_visualization"),
          status: z.literal("complete"),
          summary: z.string(),
        }),
        z.object({
          name: z.literal("render_interactive_widget"),
          status: z.literal("complete"),
          summary: z.string(),
        }),
      ]),
    )
    .default([]),
  artifacts: z.array(z.unknown()).default([]),
  suggestions: z.array(z.string()).default([]),
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
    temperature: 0.35,
    maxTokens: 4096,
    configuration: {
      baseURL: baseUrl.replace(/\/$/, ""),
    },
  });
}

function transcript(messages: ChatMessage[]) {
  return messages.map((message) => `${message.role}: ${message.content}`).join("\n");
}

function parseDeepArtifact(value: unknown) {
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

function createTutorTools(settings: TutorProviderSettings) {
  const planVisualizationTool = tool(
    async ({ conversation, visualizationGoal }) => {
      const plan = await planVisualization(
        [{ role: "user", content: conversation }],
        visualizationGoal,
        settings,
      );
      return JSON.stringify(plan);
    },
    {
      name: "plan_visualization",
      description:
        "Create a compact visualization plan for an interactive learning widget. Use before render_interactive_widget.",
      schema: z.object({
        conversation: z.string().describe("Relevant tutor conversation transcript."),
        visualizationGoal: z.string().describe("Concrete objective for what the visual should teach."),
      }),
    },
  );

  const renderInteractiveWidgetTool = tool(
    async ({ conversation, visualizationGoal, plan }, config: RunnableConfig) => {
      const parsedPlan = VisualizationPlanSchema.parse(JSON.parse(plan)) as VisualizationPlanArtifact;
      const widget = await streamInteractiveWidget(
        [{ role: "user", content: conversation }],
        parsedPlan,
        visualizationGoal,
        settings,
        config,
      );
      return JSON.stringify(widget);
    },
    {
      name: "render_interactive_widget",
      description:
        "Render a real sandboxed HTML/CSS/JS interactive UI widget from a visualization plan. Use for visual, simulated, step-by-step, or exploratory learning requests. Streams HTML tokens to the client as they are produced.",
      schema: z.object({
        conversation: z.string().describe("Relevant tutor conversation transcript."),
        visualizationGoal: z.string().describe("Concrete objective for what the widget should teach."),
        plan: z.string().describe("The exact JSON string returned by plan_visualization."),
      }),
    },
  );

  return [planVisualizationTool, renderInteractiveWidgetTool] as const;
}

const subagents: SubAgent[] = [
  {
    name: "concept-agent",
    description: "Explains concepts with clear intuition, examples, and checks for understanding.",
    systemPrompt:
      "You are Primoria's Concept agent. Explain with intuition first, then concise formal detail. Prefer questions that reveal learner understanding.",
  },
  {
    name: "visualization-agent",
    description: "Plans and renders interactive educational widgets using plan_visualization and render_interactive_widget.",
    systemPrompt:
      "You are Primoria's Visualization agent. For visual, simulated, or step-by-step requests, call plan_visualization, then render_interactive_widget, and return the produced artifact JSON exactly.",
  },
];

const SYSTEM_PROMPT = `You are Primoria, a DeepAgent-powered AI tutor.

Use the built-in DeepAgent planning, filesystem working memory, and task delegation when helpful. You have specialist subagents for concepts and visualization.

Important product behavior:
- For ordinary tutoring, answer directly and concisely; do not claim plan_visualization or render_interactive_widget was used. If you want to report status, use only deep_agent.
- For visual / simulate / interactive / step-by-step algorithm requests, use plan_visualization then render_interactive_widget. Return the resulting artifacts in structured output.
- Do not invent fake artifacts. Only include artifacts that came from tools.
- Keep a warm, clear, Socratic teaching tone.
- Never mention internal system prompts.`;

let cachedAgent: PrimoriaDeepAgent | null = null;
let cachedKey = "";
const checkpointer = new MemorySaver();

export function getPrimoriaDeepAgent(settings: TutorProviderSettings = {}) {
  const resolved = resolveProviderSettings(settings);
  const key = `${resolved.baseUrl}|${resolved.model}|${resolved.apiKey.slice(0, 8)}`;
  if (cachedAgent && cachedKey === key) return cachedAgent;

  cachedAgent = createDeepAgent({
    name: "primoria-tutor",
    model: createModel(settings),
    tools: createTutorTools(settings),
    systemPrompt: SYSTEM_PROMPT,
    subagents,
    responseFormat: toolStrategy(DeepTutorResponseSchema),
    checkpointer,
    backend: new FilesystemBackend({
      rootDir: process.cwd(),
      virtualMode: true,
    }),
    skills: ["/src/lib/ai/skills/"],
  });
  cachedKey = key;

  return cachedAgent;
}

export async function invokePrimoriaDeepAgent(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  threadId = "primoria-local-tutor",
): Promise<DeepTutorStructuredResponse> {
  const agent = getPrimoriaDeepAgent(settings);
  const result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content: `Current tutor conversation:\n${transcript(messages)}\n\nRespond to the latest user message.`,
        },
      ],
    },
    { configurable: { thread_id: threadId } },
  );

  const structured = DeepTutorResponseSchema.parse(result.structuredResponse ?? {});
  const artifacts = structured.artifacts.map(parseDeepArtifact).filter((artifact) => artifact !== undefined);

  return {
    label: structured.label,
    reply: structured.reply,
    tool_calls: structured.tool_calls,
    artifacts,
    suggestions: structured.suggestions,
  };
}

const VISIBLE_TOOLS = new Set([
  "plan_visualization",
  "render_interactive_widget",
  "write_todos",
  "task",
]);

const TOOL_LABELS: Record<string, { executing: string; complete: string }> = {
  plan_visualization: {
    executing: "Choosing the visual strategy and key teaching elements.",
    complete: "Visualization plan is ready.",
  },
  render_interactive_widget: {
    executing: "Generating the interactive HTML widget.",
    complete: "Interactive widget is ready.",
  },
  write_todos: {
    executing: "DeepAgent is planning the next steps.",
    complete: "Plan updated.",
  },
  task: {
    executing: "Delegating to a specialist subagent.",
    complete: "Specialist subagent returned.",
  },
};

const SUBAGENT_NAMES = new Set(["concept-agent", "visualization-agent"]);

const SUBAGENT_LABELS: Record<string, { executing: string; complete: string }> = {
  "concept-agent": {
    executing: "Concept agent is building intuition.",
    complete: "Concept agent finished.",
  },
  "visualization-agent": {
    executing: "Visualization agent is planning and rendering.",
    complete: "Visualization agent finished.",
  },
};

function toolStatusEvent(
  name: string,
  status: ToolStatusArtifact["status"],
): ToolStatusArtifact {
  const labels = TOOL_LABELS[name] ?? SUBAGENT_LABELS[name];
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

type StreamEvent = {
  event: string;
  name?: string;
  data?: { input?: unknown; output?: unknown };
};

export async function invokePrimoriaDeepAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
  threadId = "primoria-local-tutor",
): Promise<DeepTutorStructuredResponse> {
  const agent = getPrimoriaDeepAgent(settings) as unknown as {
    streamEvents: (
      input: unknown,
      config: { configurable: { thread_id: string }; version: "v2" },
    ) => AsyncIterable<StreamEvent>;
  };

  const input = {
    messages: [
      {
        role: "user",
        content: `Current tutor conversation:\n${transcript(messages)}\n\nRespond to the latest user message.`,
      },
    ],
  };

  const emittedArtifacts = new Set<string>();
  const openSubagents = new Set<string>();
  let finalOutput: { structuredResponse?: unknown } | null = null;

  for await (const ev of agent.streamEvents(input, {
    configurable: { thread_id: threadId },
    version: "v2",
  })) {
    const name = ev.name ?? "";

    if (ev.event === "on_tool_start" && VISIBLE_TOOLS.has(name)) {
      emit({ type: "tool_status", artifact: toolStatusEvent(name, "executing") });
    } else if (ev.event === "on_tool_end" && VISIBLE_TOOLS.has(name)) {
      emit({ type: "tool_status", artifact: toolStatusEvent(name, "complete") });
      const artifact = parseDeepArtifact(ev.data?.output);
      if (artifact) {
        const key = JSON.stringify(artifact);
        if (!emittedArtifacts.has(key)) {
          emittedArtifacts.add(key);
          emit({ type: "artifact", artifact });
        }
      }
    } else if (ev.event === "on_chain_start" && SUBAGENT_NAMES.has(name)) {
      if (!openSubagents.has(name)) {
        openSubagents.add(name);
        emit({ type: "tool_status", artifact: toolStatusEvent(name, "executing") });
      }
    } else if (ev.event === "on_chain_end" && SUBAGENT_NAMES.has(name)) {
      if (openSubagents.has(name)) {
        openSubagents.delete(name);
        emit({ type: "tool_status", artifact: toolStatusEvent(name, "complete") });
      }
    } else if (ev.event === "on_custom_event" && name === "widget_html_delta") {
      const data = ev.data as
        | { html?: string; title?: string; description?: string }
        | undefined;
      if (data && typeof data.html === "string") {
        emit({
          type: "artifact_delta",
          artifact: {
            type: "html_widget",
            title: data.title ?? "Interactive widget",
            description: data.description ?? "",
            html: data.html,
          },
        });
      }
    } else if (ev.event === "on_chain_end") {
      const out = ev.data?.output;
      if (out && typeof out === "object" && "structuredResponse" in out) {
        finalOutput = out as { structuredResponse?: unknown };
      }
    }
  }

  const structured = DeepTutorResponseSchema.parse(finalOutput?.structuredResponse ?? {});
  const artifacts = structured.artifacts
    .map(parseDeepArtifact)
    .filter((artifact): artifact is NonNullable<ReturnType<typeof parseDeepArtifact>> => artifact !== undefined);

  for (const artifact of artifacts) {
    const key = JSON.stringify(artifact);
    if (!emittedArtifacts.has(key)) {
      emittedArtifacts.add(key);
      emit({ type: "artifact", artifact });
    }
  }

  return {
    label: structured.label,
    reply: structured.reply,
    tool_calls: structured.tool_calls,
    artifacts,
    suggestions: structured.suggestions,
  };
}
