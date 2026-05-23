import { invokePrimoriaDeepAgent, invokePrimoriaDeepAgentStream, createTutorModel } from "./deepagent/primoria-deep-agent";
import { generateCourse } from "./deepagent/course-generator";
import { sedimentWidget } from "@/lib/capability-library/sedimentation";
import { normalizeWidgetHtml } from "./widget-html";
import type {
  ChatMessage,
  CourseCardArtifact,
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
  const courseTopic = extractCourseTopic(latestUserMessage(messages));
  if (courseTopic) {
    return runCourseAgent(courseTopic, settings);
  }

  return invokePrimoriaDeepAgent(messages, settings);
}

function latestUserMessage(messages: ChatMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messageContentToString(messages[i].content);
  }
  return "";
}

function messageContentToString(content: ChatMessage["content"]) {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

const COURSE_INTENT_PATTERN =
  /(课程|教程|微课|系统讲|系统学|学一下|学习|教我|讲讲|讲解|lesson|course|curriculum|teach me|i want to learn|learn about|study)/i;

function extractCourseTopic(message: string) {
  if (!COURSE_INTENT_PATTERN.test(message)) return null;

  const cleaned = message
    .replace(/^(生成|创建|做|帮我|请|please|make|create|build)\s*/i, "")
    .replace(/^(一个|一门|一节|a|an)\s*/i, "")
    .replace(/^(课程|教程|微课|lesson|course)\s*(关于|on|about)?\s*/i, "")
    .replace(/^(教我|学习|学一下|讲讲|讲解|系统讲|系统学|teach me|i want to learn|learn about|study)\s*/i, "")
    .replace(/\s*(的)?(课程|教程|微课|lesson|course|curriculum)$/i, "")
    .replace(/[。.!！?？]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || message.trim();
}

function cardFromCourseSummary(summary: Awaited<ReturnType<typeof generateCourse>>["summary"]): CourseCardArtifact {
  return {
    type: "course_card",
    courseId: summary.id,
    title: summary.title,
    topic: summary.topic,
    summary: summary.summary,
    estimatedMinutes: summary.estimatedMinutes,
    outline: summary.outline,
    status: "ready",
  };
}

async function runCourseAgent(
  topic: string,
  settings: TutorProviderSettings,
  emit?: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  emit?.({
    type: "artifact_delta",
    artifact: {
      type: "todo_list",
      items: [
        { title: `📋 拆解 ${topic} 的学习路径`, status: "in_progress" },
        { title: "✍️ 生成结构化课程 blocks", status: "pending" },
        { title: "✅ 入库并展示卡片", status: "pending" },
      ],
    },
  });
  emit?.({
    type: "tool_status",
    artifact: {
      type: "tool_status",
      name: "generate_course",
      status: "executing",
      description: "Course agent is composing the lesson.",
    },
  });

  const { summary } = await generateCourse({ topic }, settings);
  const card = cardFromCourseSummary(summary);
  const reply = "课程已经生成好了，点卡片打开后可以逐个 block 学，也可以在右侧让 AI 改写。";

  emit?.({
    type: "tool_status",
    artifact: {
      type: "tool_status",
      name: "generate_course",
      status: "complete",
      description: "Course saved to Library.",
    },
  });
  emit?.({
    type: "artifact_delta",
    artifact: {
      type: "todo_list",
      items: [
        { title: `📋 拆解 ${topic} 的学习路径`, status: "done" },
        { title: "✍️ 生成结构化课程 blocks", status: "done" },
        { title: "✅ 入库并展示卡片", status: "done" },
      ],
    },
  });
  emit?.({ type: "artifact", artifact: card });
  emit?.({ type: "assistant_message", label: "Tutor team", reply, suggestions: [] });

  return {
    label: "Tutor team",
    reply,
    artifacts: [card],
    suggestions: [],
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
  const courseTopic = extractCourseTopic(userQuestion);
  if (courseTopic) {
    const response = await runCourseAgent(courseTopic, settings, emit);
    emit({ type: "final", result: response });
    return response;
  }

  if (process.env.PRIMORIA_FIXTURE_WIDGET === "1") {
    return runFixtureWidgetStream(userQuestion, emit);
  }

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
        html: normalizeWidgetHtml(extracted.html),
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

  const hasCourseCard = artifacts.some((artifact) => artifact.type === "course_card");

  if (!resolvedWidget && !hasCourseCard) {
    emit({ type: "artifact_delta", artifact: { type: "todo_list", items: [] } });
    artifacts = artifacts.filter((artifact) => artifact.type !== "todo_list");
  }

  if (resolvedWidget) {
    try {
      const outcome = sedimentWidget(resolvedWidget, capturedPlan, { userQuestion });
      if (outcome.saved) {
        console.info("[capability-library] sedimented widget", outcome.app.id, outcome.app.displayName);
      }
    } catch (error) {
      console.warn("[capability-library] sedimentation failed", error);
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

async function runFixtureWidgetStream(
  userQuestion: string,
  emit: (event: TutorStreamEvent) => void,
): Promise<TutorAgentResponse> {
  const plan: VisualizationPlanArtifact = {
    type: "visualization_plan",
    title: "Fixture: Newton's cradle",
    approach: "Animate momentum transfer across five suspended balls",
    technology: "SVG + JavaScript",
    keyElements: ["five balls", "elastic collision", "user-adjustable mass"],
  };
  const html = `<div class="fixture-cradle" style="padding:24px;background:#fbf7ee;border:1px solid #eadfce;border-radius:14px;">
    <h3 style="margin:0 0 12px;color:#3a352d;">Newton's cradle fixture</h3>
    <svg viewBox="0 0 320 120" width="100%" height="120" role="img" aria-label="Newton's cradle fixture">
      ${Array.from({ length: 5 }, (_, i) => `<g><line x1="${40 + i * 60}" y1="10" x2="${40 + i * 60}" y2="80" stroke="#c8881a" stroke-width="1.5"/><circle cx="${40 + i * 60}" cy="92" r="14" fill="#fff2de" stroke="#c8881a" stroke-width="2"/></g>`).join("")}
    </svg>
    <p style="margin:12px 0 0;color:#6b6357;font-size:13px;">Tap a ball to nudge it; momentum should propagate through the chain.</p>
    <script>console.info('fixture cradle mounted')</script>
  </div>`;
  const widget: HtmlWidgetArtifact = {
    type: "html_widget",
    title: "Newton's cradle fixture demo",
    description: "Fixture widget emitted for integration test (no LLM call).",
    html,
  };

  emit({ type: "tool_status", artifact: { type: "tool_status", name: "plan_visualization", status: "executing", description: "Fixture planner running." } });
  emit({ type: "artifact", artifact: plan });
  emit({ type: "tool_status", artifact: { type: "tool_status", name: "plan_visualization", status: "complete", description: "Fixture plan ready." } });
  emit({ type: "tool_status", artifact: { type: "tool_status", name: "render_interactive_widget", status: "executing", description: "Fixture widget rendering." } });
  emit({ type: "artifact", artifact: widget });
  emit({ type: "tool_status", artifact: { type: "tool_status", name: "render_interactive_widget", status: "complete", description: "Fixture widget ready." } });

  const reply = "Fixture mode: returning a canned Newton's cradle widget so the integration path can be tested without an LLM call.";
  emit({ type: "assistant_message", label: "Tutor team", reply, suggestions: [] });

  try {
    const outcome = sedimentWidget(widget, plan, { userQuestion });
    if (outcome.saved) {
      console.info("[capability-library] sedimented widget", outcome.app.id, outcome.app.displayName);
    }
  } catch (error) {
    console.warn("[capability-library] sedimentation failed", error);
  }

  const response: TutorAgentResponse = {
    label: "Tutor team",
    reply,
    artifacts: [plan, widget],
    suggestions: [],
  };
  emit({ type: "final", result: response });
  return response;
}
