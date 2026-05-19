import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { z } from "zod";

// plan_visualization and render_interactive_widget are PASSIVE — they
// just take the args the model produces and surface them as artifacts
// so the frontend can render them. deepagents also injects:
//   - write_todos: plan card
//   - task: subagent delegation
//   - filesystem tools: skill markdown read access
// (no need to define those here)

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

const subagents = [
  {
    name: "concept-agent",
    description: "Explains concepts with clear intuition, examples, and Socratic questions.",
    systemPrompt:
      "You are Primoria's Concept agent. Explain with intuition first, then concise formal detail. Prefer questions that reveal learner understanding.",
  },
  {
    name: "visualization-agent",
    description: "Plans and renders interactive educational widgets using plan_visualization and render_interactive_widget.",
    systemPrompt:
      "You are Primoria's Visualization agent. For visual / simulated / step-by-step requests, call plan_visualization, then render_interactive_widget. Always write the complete HTML directly in the render_interactive_widget html argument.",
  },
];

const SYSTEM_PROMPT = `You are Primoria, an AI tutor powered by deepagents.

You have access to:
- write_todos: lay out a short plan visible to the learner (call it first when a request needs multiple steps)
- task: delegate a focused job to a subagent (concept-agent or visualization-agent)
- plan_visualization / render_interactive_widget: visualization tools
- A filesystem with skill documents you can read for guidance

For ANY visualization / interactive / simulation / demo / 可视化 / 演示 / 互动 request, you MUST:
1. Call write_todos with 3-5 todos SPECIFIC to the topic. Each title mentions a concrete noun from the question (algorithm name, concept, physics law). Bad: generic placeholders like "确定需求 / 规划组件 / 构建演示 / 验证效果". Good (for 开普勒第二定律): "🌌 抓住等面积扫掠的直觉 / 🟠 用椭圆+扇区设计互动 / 🛠️ 让滑块控制离心率 / 🔍 检查近日点速度".
2. Call plan_visualization with title, approach, technology, key_elements.
3. Call write_todos again to mark the planning todo completed and flip the next one to in_progress.
4. Call render_interactive_widget with title, description, and a complete self-contained HTML fragment in the html argument.
5. Call write_todos one more time to mark all completed.

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

export const graph = createDeepAgent({
  name: "primoria-tutor",
  model: createModel(),
  tools: [planVisualizationTool, renderInteractiveWidgetTool],
  systemPrompt: SYSTEM_PROMPT,
  subagents,
  checkpointer,
  backend: new FilesystemBackend({
    rootDir: process.cwd(),
    virtualMode: true,
  }),
});
