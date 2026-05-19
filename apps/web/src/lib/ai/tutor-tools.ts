import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import type { RunnableConfig } from "@langchain/core/runnables";
import { z } from "zod";
import { parseJsonObject } from "./json";
import { createChatCompletion, streamChatCompletion } from "./openai-compatible";
import type {
  ChatMessage,
  HtmlWidgetArtifact,
  TutorProviderSettings,
  VisualizationPlanArtifact,
} from "./types";

const VisualizationPlanSchema = z.object({
  title: z.string(),
  approach: z.string(),
  technology: z.string(),
  key_elements: z.array(z.string()).min(2).max(4),
});

function transcript(messages: ChatMessage[]) {
  return messages.map((message) => `${message.role}: ${message.content}`).join("\n");
}

function widgetRules() {
  return `Return ONLY a self-contained HTML fragment. Do not return JSON. Do not wrap in markdown fences.

HTML rules:
- Return an HTML fragment only, not a full document.
- Use light, warm Primoria styling. Avoid black backgrounds and low-opacity main content.
- Include readable labels and controls. Controls must work.
- Keep the widget compact, responsive, and suitable inside a chat card.
- Inline <style> and <script> are allowed.
- Approved module imports are available in <script type="module">: three, gsap, d3, chart.js, chart.js/auto.
- Do not load other external network resources.
- If the widget should ask the tutor a follow-up, use window.sendPrompt("question") or an element with data-prompt="question".
- Use window.openLink("https://...") for external links instead of direct navigation.`;
}

function widgetPrompt(messages: ChatMessage[], plan: VisualizationPlanArtifact, visualizationGoal: string) {
  return `Conversation:
${transcript(messages)}

Visualization goal:
${visualizationGoal}

Plan:
Title: ${plan.title}
Approach: ${plan.approach}
Technology: ${plan.technology}
Key elements:
${plan.keyElements.map((element) => `- ${element}`).join("\n")}`;
}

export async function planVisualization(
  messages: ChatMessage[],
  visualizationGoal: string,
  settings: TutorProviderSettings,
): Promise<VisualizationPlanArtifact> {
  const raw = await createChatCompletion(
    [
      {
        role: "system",
        content: `You are Primoria's plan_visualization tool.

Return ONLY valid JSON with this shape:
{
  "title": "short title",
  "approach": "one sentence visualization strategy",
  "technology": "HTML + inline SVG | HTML + Canvas | D3.js | Chart.js | Three.js | CSS + JS",
  "key_elements": ["2-4 concrete elements"]
}

Choose the simplest technology that can teach the concept well. Prefer HTML + inline SVG for algorithms and conceptual diagrams. Use Three.js only when true 3D helps.`,
      },
      {
        role: "user",
        content: `Conversation:\n${transcript(messages)}\n\nVisualization goal:\n${visualizationGoal}`,
      },
    ],
    settings,
  );

  const plan = VisualizationPlanSchema.parse(parseJsonObject(raw));
  return {
    type: "visualization_plan",
    title: plan.title,
    approach: plan.approach,
    technology: plan.technology,
    keyElements: plan.key_elements,
  };
}

export async function streamInteractiveWidget(
  messages: ChatMessage[],
  plan: VisualizationPlanArtifact,
  visualizationGoal: string,
  settings: TutorProviderSettings,
  runConfig?: RunnableConfig,
): Promise<HtmlWidgetArtifact> {
  let html = "";

  const streamed = await streamChatCompletion(
    [
      {
        role: "system",
        content: `You are Primoria's render_interactive_widget streaming tool.

${widgetRules()}`,
      },
      {
        role: "user",
        content: widgetPrompt(messages, plan, visualizationGoal),
      },
    ],
    settings,
    (delta) => {
      html += delta;
      if (runConfig) {
        void dispatchCustomEvent(
          "widget_html_delta",
          {
            html,
            title: plan.title,
            description: `Interactive visualization for: ${visualizationGoal}`,
          },
          runConfig,
        ).catch(() => {});
      }
    },
  );

  const finalHtml = html || streamed;
  return {
    type: "html_widget",
    title: plan.title,
    description: `Interactive visualization for: ${visualizationGoal}`,
    html: finalHtml,
  };
}
