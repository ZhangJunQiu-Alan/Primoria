import { tool } from "@langchain/core/tools";
import { Annotation, Command, MemorySaver, MessagesAnnotation } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  emoji: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed"]),
});

const AgentStateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  todos: Annotation({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
});

const manageTodosTool = tool(
  async ({ todos }, config) => {
    const toolCallId = config?.toolCall?.id ?? "manage_todos";
    return new Command({
      update: {
        todos,
        messages: [{ role: "tool", content: "Todos updated.", tool_call_id: toolCallId }],
      },
    });
  },
  {
    name: "manage_todos",
    description:
      "Lay out or update the visible plan of steps the tutor will follow. Call this FIRST for any non-trivial visualization request, then call it again to mark steps completed.",
    schema: z.object({
      todos: z.array(TodoSchema).min(1).max(6),
    }),
  },
);

const planVisualizationTool = tool(
  async ({ title, approach, technology, key_elements }) => {
    return JSON.stringify({
      type: "visualization_plan",
      title,
      approach,
      technology,
      keyElements: key_elements,
    });
  },
  {
    name: "plan_visualization",
    description:
      "Plan a widget before building it. MUST be called before render_interactive_widget.",
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
    return JSON.stringify({
      type: "html_widget",
      title,
      description,
      html,
    });
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

const SYSTEM_PROMPT = `You are Primoria, an AI tutor.

For ANY visualization / interactive / simulation / demo / 可视化 / 演示 / 互动 request, you MUST:
1. Call manage_todos first with 3-5 todos that are SPECIFIC to the learner's topic. Each title must mention a concrete noun from the question (algorithm name, concept, physics law, etc.). Bad: "确定需求 / 规划组件 / 构建演示 / 验证效果". Good (for 开普勒第二定律): "🌌 抓住等面积扫掠的直觉 / 🟠 用椭圆+扇区设计互动 / 🛠️ 让滑块控制离心率 / 🔍 检查近日点速度". Use the emoji field, NOT a leading emoji inside title. Set first todo in_progress, rest pending.
2. Call plan_visualization with title, approach, technology, key_elements.
3. Call manage_todos again to flip the planning todo to completed and the next one to in_progress.
4. Call render_interactive_widget with title, description, and a complete self-contained HTML fragment in the html argument.
5. Call manage_todos one more time to mark all completed.

CRITICAL OUTPUT RULES:
- If you called plan_visualization, you MUST also call render_interactive_widget in the same turn. Never stop after planning.
- NEVER paste HTML / CSS / JS code into your text reply. Code only belongs inside the render_interactive_widget html argument.
- NEVER wrap output in markdown code blocks (no \`\`\`html, no \`\`\`).

For greetings ("hi", "你好"), thanks, casual chat, or anything that is clearly NOT a learning question, just reply with one short sentence and do NOT call any tools.

For plain factual / conceptual questions that do not require a visualization, answer in 1-2 sentences without tools.`;

function createModel() {
  const baseUrl = process.env.OPENAI_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-5.4";
  if (!baseUrl) throw new Error("Missing OPENAI_BASE_URL");
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  return new ChatOpenAI({
    model,
    apiKey,
    temperature: 0.2,
    maxTokens: 4096,
    streaming: true,
    configuration: { baseURL: baseUrl.replace(/\/$/, "") },
  });
}

const checkpointer = new MemorySaver();

export const graph = createReactAgent({
  llm: createModel(),
  tools: [manageTodosTool, planVisualizationTool, renderInteractiveWidgetTool],
  prompt: SYSTEM_PROMPT,
  stateSchema: AgentStateAnnotation,
  checkpointer,
});
