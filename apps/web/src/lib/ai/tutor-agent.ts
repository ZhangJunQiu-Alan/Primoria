import { invokePrimoriaDeepAgent, invokePrimoriaDeepAgentStream, createTutorModel } from "./deepagent/primoria-deep-agent";
import type {
  ChatMessage,
  HtmlWidgetArtifact,
  TutorAgentResponse,
  TutorProviderSettings,
  TutorStreamEvent,
  VisualizationPlanArtifact,
} from "./types";

export async function runTutorAgent(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
): Promise<TutorAgentResponse> {
  return invokePrimoriaDeepAgent(messages, settings);
}

function latestUserMessage(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function buildNarrationPrompt(
  userQuestion: string,
  plan: VisualizationPlanArtifact | null,
  widget: HtmlWidgetArtifact | null,
) {
  const planLine = plan ? `Plan: ${plan.title} (${plan.technology}). Key elements: ${plan.keyElements.join(", ")}.` : "";
  const widgetLine = widget ? `Widget title: ${widget.title}. Description: ${widget.description}.` : "";
  return `学生问："${userQuestion}"。

你刚做了一个互动 widget：
${planLine}
${widgetLine}

请用 2-3 句中文给学生说说：
- 这个 widget 主要展示什么、可以怎么操作（一句话）
- 一个学习时容易踩的误区或关键观察点（一句话）
- 邀请他用一个具体的下一步问题（一句话）

直接说话，不要 markdown，不要列表，用"你"称呼。`;
}

async function generateNarration(
  userQuestion: string,
  plan: VisualizationPlanArtifact | null,
  widget: HtmlWidgetArtifact | null,
  settings: TutorProviderSettings,
): Promise<string> {
  try {
    const model = createTutorModel(settings);
    const result = await model.invoke([
      { role: "system", content: "You are Primoria, a warm Socratic AI tutor. Keep replies very short." },
      { role: "user", content: buildNarrationPrompt(userQuestion, plan, widget) },
    ]);
    const content = typeof result.content === "string" ? result.content : "";
    return content.trim();
  } catch {
    return "";
  }
}

function extractInlineHtml(text: string): { html: string; cleaned: string } | null {
  const fenced = text.match(/```(?:html|HTML)?\s*([\s\S]*?)```/);
  if (fenced && fenced[1].trim().length > 0) {
    const html = fenced[1].trim();
    const cleaned = (text.slice(0, fenced.index ?? 0) + text.slice((fenced.index ?? 0) + fenced[0].length)).trim();
    return { html, cleaned };
  }
  const rawTagMatch = text.match(/<(div|svg|section|main|article|canvas|form|table)[\s\S]+<\/\1>/i);
  if (rawTagMatch && rawTagMatch[0].length > 80) {
    const html = rawTagMatch[0];
    const cleaned = (text.slice(0, rawTagMatch.index ?? 0) + text.slice((rawTagMatch.index ?? 0) + html.length)).trim();
    return { html, cleaned };
  }
  return null;
}

export async function runTutorAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  const userQuestion = latestUserMessage(messages);

  const planContainer: { value: VisualizationPlanArtifact | null } = { value: null };
  const widgetContainer: { value: HtmlWidgetArtifact | null } = { value: null };

  const result = await invokePrimoriaDeepAgentStream(messages, settings, (event) => {
    if (event.type === "artifact") {
      if (event.artifact.type === "visualization_plan") planContainer.value = event.artifact;
      if (event.artifact.type === "html_widget") widgetContainer.value = event.artifact;
    } else if (event.type === "artifact_delta" && event.artifact.type === "html_widget") {
      widgetContainer.value = event.artifact;
    }
    emit(event);
  });

  const capturedPlan = planContainer.value;
  let resolvedWidget = widgetContainer.value;

  let reply = result.reply;
  let artifacts = result.artifacts;

  if (!resolvedWidget && reply) {
    const extracted = extractInlineHtml(reply);
    if (extracted) {
      const salvagedWidget: HtmlWidgetArtifact = {
        type: "html_widget",
        title: capturedPlan?.title ?? "Interactive widget",
        description: capturedPlan ? `Interactive visualization for: ${capturedPlan.approach}` : "",
        html: extracted.html,
      };
      resolvedWidget = salvagedWidget;
      reply = extracted.cleaned;
      artifacts = [...artifacts, salvagedWidget];
      emit({ type: "artifact", artifact: salvagedWidget });
    }
  }

  if (resolvedWidget && !reply.trim()) {
    const narration = await generateNarration(userQuestion, capturedPlan, resolvedWidget, settings);
    if (narration) {
      reply = narration;
      emit({ type: "assistant_message", label: result.label, reply, suggestions: [] });
    }
  } else if (reply !== result.reply) {
    emit({ type: "assistant_message", label: result.label, reply, suggestions: [] });
  }

  if (!resolvedWidget) {
    const hasTodos = artifacts.some((artifact) => artifact.type === "todo_list");
    if (hasTodos) {
      emit({ type: "artifact_delta", artifact: { type: "todo_list", items: [] } });
      artifacts = artifacts.filter((artifact) => artifact.type !== "todo_list");
    }
  }

  const response: TutorAgentResponse = {
    label: result.label,
    reply,
    artifacts,
    suggestions: result.suggestions,
  };
  emit({ type: "final", result: response });
  return response;
}
