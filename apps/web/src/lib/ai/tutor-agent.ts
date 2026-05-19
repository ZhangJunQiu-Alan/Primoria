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

export async function runTutorAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  const userQuestion = latestUserMessage(messages);

  let plan: VisualizationPlanArtifact | null = null;
  let widget: HtmlWidgetArtifact | null = null;

  const result = await invokePrimoriaDeepAgentStream(messages, settings, (event) => {
    if (event.type === "artifact") {
      if (event.artifact.type === "visualization_plan") plan = event.artifact;
      if (event.artifact.type === "html_widget") widget = event.artifact;
    } else if (event.type === "artifact_delta" && event.artifact.type === "html_widget") {
      widget = event.artifact;
    }
    emit(event);
  });

  let reply = result.reply;
  if (widget && !reply.trim()) {
    const narration = await generateNarration(userQuestion, plan, widget, settings);
    if (narration) {
      reply = narration;
      emit({ type: "assistant_message", label: result.label, reply, suggestions: [] });
    }
  }

  const response: TutorAgentResponse = {
    label: result.label,
    reply,
    artifacts: result.artifacts,
    suggestions: result.suggestions,
  };
  emit({ type: "final", result: response });
  return response;
}
