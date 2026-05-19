import { invokePrimoriaDeepAgent, invokePrimoriaDeepAgentStream, createTutorModel } from "./deepagent/primoria-deep-agent";
import type {
  ChatMessage,
  HtmlWidgetArtifact,
  TodoListArtifact,
  ToolStatusArtifact,
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

const VISUALIZATION_PATTERN =
  /可视化|演示|互动|动画|图解|步骤|画一个|做一个|simulate|simulation|visuali[sz]e|interactive|step\s*through|widget|render|illustrate|diagram/i;

function latestUserMessage(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content;
  }
  return "";
}

function detectsVisualizationIntent(messages: ChatMessage[]) {
  const latest = latestUserMessage(messages);
  if (!latest) return false;
  const negated =
    /不要.*(图|可视化|互动|widget|演示)|不用.*(图|可视化|互动|widget|演示)|no\s+(diagram|visual|widget)|do\s+not\s+(draw|visualize|render)/i.test(
      latest,
    );
  if (negated) return false;
  return VISUALIZATION_PATTERN.test(latest);
}

function buildInitialTodos(): TodoListArtifact {
  return {
    type: "todo_list",
    items: [
      { title: "理解学习目标", status: "done" },
      { title: "规划可视化方案", status: "in_progress" },
      { title: "生成互动 widget", status: "pending" },
      { title: "讲解关键概念", status: "pending" },
    ],
  };
}

function withTodoUpdate(
  current: TodoListArtifact,
  updates: Partial<Record<number, TodoListArtifact["items"][number]["status"]>>,
): TodoListArtifact {
  return {
    type: "todo_list",
    items: current.items.map((item, index) =>
      index in updates && updates[index] ? { ...item, status: updates[index]! } : item,
    ),
  };
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

function toolStatus(
  name: ToolStatusArtifact["name"],
  status: ToolStatusArtifact["status"],
  description: string,
): ToolStatusArtifact {
  return { type: "tool_status", name, status, description };
}

export async function runTutorAgentStream(
  messages: ChatMessage[],
  settings: TutorProviderSettings = {},
  emit: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  const isVisualization = detectsVisualizationIntent(messages);
  const userQuestion = latestUserMessage(messages);

  let todos: TodoListArtifact | null = null;
  let plan: VisualizationPlanArtifact | null = null;
  let widget: HtmlWidgetArtifact | null = null;

  if (isVisualization) {
    emit({
      type: "tool_status",
      artifact: toolStatus("write_todos", "executing", "Tutor team is laying out the steps."),
    });
    todos = buildInitialTodos();
    emit({ type: "artifact", artifact: todos });
    emit({
      type: "tool_status",
      artifact: toolStatus("write_todos", "complete", "Plan is ready."),
    });
    emit({
      type: "tool_status",
      artifact: toolStatus("task", "executing", "Delegating to the visualization agent."),
    });
  }

  const result = await invokePrimoriaDeepAgentStream(messages, settings, (event) => {
    if (todos && event.type === "tool_status") {
      const name = event.artifact.name;
      const status = event.artifact.status;
      if (name === "plan_visualization" && status === "complete") {
        todos = withTodoUpdate(todos, { 1: "done", 2: "in_progress" });
        emit({ type: "artifact_delta", artifact: todos });
      } else if (name === "render_interactive_widget" && status === "complete") {
        todos = withTodoUpdate(todos, { 2: "done", 3: "in_progress" });
        emit({ type: "artifact_delta", artifact: todos });
      }
    }
    if (event.type === "artifact") {
      if (event.artifact.type === "visualization_plan") plan = event.artifact;
      if (event.artifact.type === "html_widget") widget = event.artifact;
    }
    if (event.type === "artifact_delta" && event.artifact.type === "html_widget") {
      widget = event.artifact;
    }
    emit(event);
  });

  if (isVisualization) {
    emit({
      type: "tool_status",
      artifact: toolStatus("task", "complete", "Visualization agent finished."),
    });
  }

  let reply = result.reply;
  if (isVisualization && widget && !reply.trim()) {
    const narration = await generateNarration(userQuestion, plan, widget, settings);
    if (narration) {
      reply = narration;
      emit({ type: "assistant_message", label: "Tutor team", reply, suggestions: [] });
    }
  }

  if (todos) {
    todos = withTodoUpdate(todos, { 3: "done" });
    emit({ type: "artifact_delta", artifact: todos });
  }

  const response: TutorAgentResponse = {
    label: result.label,
    reply,
    artifacts: todos ? [todos, ...result.artifacts] : result.artifacts,
    suggestions: result.suggestions,
  };
  emit({ type: "final", result: response });
  return response;
}
