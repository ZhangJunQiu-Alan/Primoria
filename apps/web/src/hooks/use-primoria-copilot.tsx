"use client";

import { z } from "zod";
import { useEffect, useRef } from "react";
import { useComponent, useDefaultRenderTool, useRenderTool } from "@copilotkit/react-core/v2";
import { WidgetRenderer } from "@/components/generative-ui/widget-renderer";
import { ToolCard } from "@/components/generative-ui/tool-card";
import { PlanProgressCard } from "@/components/tutor/plan-progress-card";
import { setTodos } from "@/lib/todos-store";
import type { CourseCardArtifact, VisualizationPlanArtifact } from "@/lib/ai/types";

const WriteTodosParams = z.object({
  todos: z.array(
    z.object({
      content: z.string().optional(),
      title: z.string().optional(),
      status: z.enum(["pending", "in_progress", "completed"]).optional(),
    }),
  ),
});

const PlanVisualizationParams = z.object({
  title: z.string().optional(),
  approach: z.string(),
  technology: z.string(),
  key_elements: z.union([z.array(z.string()), z.string()]),
});

const RenderWidgetParams = z.object({
  title: z.string().optional(),
  description: z.string(),
  html: z.string(),
});

const GenerateCourseParams = z.object({
  topic: z.string(),
  context_hint: z.string().optional(),
});

const GetCourseCardParams = z.object({
  course_id: z.string(),
});

const CourseCardResult = z.object({
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

const COURSE_CARD_PREFIX = "PRIMORIA_COURSE_CARD:";

// First write_todos render slot to mount in this session claims the anchor
// position and renders the PlanProgressCard; later write_todos calls in the
// same turn still update the shared store but render nothing, so the card
// updates in place instead of stacking.
let anchorInstanceId: string | null = null;

function WriteTodosSink({ todos }: { todos: z.infer<typeof WriteTodosParams>["todos"] }) {
  const idRef = useRef<string | null>(null);
  if (!idRef.current) {
    idRef.current = Math.random().toString(36).slice(2);
  }
  const myId = idRef.current;

  useEffect(() => {
    setTodos(todos ?? []);
  }, [todos]);

  if (anchorInstanceId === null) {
    anchorInstanceId = myId;
  }

  if (anchorInstanceId === myId) {
    return <PlanProgressCard />;
  }
  return <></>;
}

function normalizePlanKeyElements(value: z.infer<typeof PlanVisualizationParams>["key_elements"]) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value ?? "")
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

type ToolRenderStatus = "inProgress" | "executing" | "complete";

function PlanCard({
  status,
  title,
  approach,
  technology,
  key_elements,
}: z.infer<typeof PlanVisualizationParams> & { status: ToolRenderStatus }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const isRunning = status === "executing" || status === "inProgress";
  const keyElements = normalizePlanKeyElements(key_elements);

  useEffect(() => {
    if (!detailsRef.current) return;
    detailsRef.current.open = isRunning;
  }, [isRunning]);

  const plan: VisualizationPlanArtifact = {
    type: "visualization_plan",
    title: title ?? "Visualization plan",
    approach,
    technology,
    keyElements,
  };

  return (
    <div className="message-row tool inline-plan-row">
      <details ref={detailsRef} className="inline-plan-card" open>
        <summary className="inline-plan-summary">
          <span className={isRunning ? "tool-spinner inline-plan-indicator" : "inline-plan-check"} aria-hidden="true">
            {isRunning ? null : "✓"}
          </span>
          <span className="inline-plan-title">
            {isRunning ? "Planning visualization…" : `Plan: ${plan.technology || "visualization"}`}
          </span>
          <span className="inline-plan-chevron" aria-hidden="true">▼</span>
        </summary>
        <div className="inline-plan-body">
          {plan.technology ? <span className="inline-plan-badge">{plan.technology}</span> : null}
          <p>{plan.approach}</p>
          {plan.keyElements.length > 0 ? (
            <ul>
              {plan.keyElements.map((element) => (
                <li key={element}>{element}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </details>
    </div>
  );
}

function WidgetCard({ title, description, html }: z.infer<typeof RenderWidgetParams>) {
  const safeTitle = title || "Interactive learning widget";
  return (
    <div className="message-row tool">
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{safeTitle}</span>
        </div>
        <WidgetRenderer title={safeTitle} description={description} html={html} />
      </div>
    </div>
  );
}

function stripCourseCardPrefix(result: string) {
  return result.startsWith(COURSE_CARD_PREFIX) ? result.slice(COURSE_CARD_PREFIX.length) : result;
}

function parseCourseCardResult(result?: string): CourseCardArtifact | null {
  if (!result) return null;
  try {
    const parsed = CourseCardResult.safeParse(JSON.parse(stripCourseCardPrefix(result)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function CourseCardTool({
  status,
  result,
  parameters,
}: {
  status: "inProgress" | "executing" | "complete";
  result?: string;
  parameters?: Partial<z.infer<typeof GenerateCourseParams>>;
}) {
  const artifact = parseCourseCardResult(result);
  if (artifact) return <ToolCard artifact={artifact} />;

  return (
    <div className="message-row tool">
      <div className="tool-card status-card">
        <div className="tool-title">
          <span className={status === "complete" ? "tool-dot" : "tool-spinner"} />
          <span>generate_course · {status === "complete" ? "complete" : "executing"}</span>
        </div>
        <div className="visualizer">
          <span className="tool-note">
            {parameters?.topic ? `Course agent is composing: ${parameters.topic}` : "Course agent is composing the lesson."}
          </span>
        </div>
      </div>
    </div>
  );
}

function GetCourseCardTool({
  status,
  result,
}: {
  status: "inProgress" | "executing" | "complete";
  result?: string;
  parameters?: Partial<z.infer<typeof GetCourseCardParams>>;
}) {
  const artifact = parseCourseCardResult(result);
  if (artifact) return <ToolCard artifact={artifact} />;
  return (
    <div className="message-row tool">
      <div className="tool-card status-card">
        <div className="tool-title">
          <span className={status === "complete" ? "tool-dot" : "tool-spinner"} />
          <span>get_course_card · {status === "complete" ? "complete" : "executing"}</span>
        </div>
      </div>
    </div>
  );
}

export function usePrimoriaGenerativeUI() {
  useComponent({
    name: "widgetRenderer",
    description: "Renders interactive HTML/CSS/JS visualizations in a sandboxed iframe.",
    parameters: RenderWidgetParams,
    render: WidgetCard,
  });

  // Backward-compatible alias for older local runs/messages.
  useComponent({
    name: "render_interactive_widget",
    description: "Renders interactive HTML/CSS/JS visualizations in a sandboxed iframe.",
    parameters: RenderWidgetParams,
    render: WidgetCard,
  });

  useRenderTool({
    name: "plan_visualization",
    parameters: PlanVisualizationParams,
    render: ({ status, parameters }) => (
      <PlanCard
        status={status}
        title={parameters?.title}
        approach={parameters?.approach ?? "Planning the visualization."}
        technology={parameters?.technology ?? "HTML + JavaScript"}
        key_elements={parameters?.key_elements ?? []}
      />
    ),
  });

  useRenderTool({
    name: "write_todos",
    parameters: WriteTodosParams,
    render: ({ parameters }) => <WriteTodosSink todos={parameters?.todos ?? []} />,
  });

  useRenderTool({
    name: "generate_course",
    parameters: GenerateCourseParams,
    render: ({ status, result, parameters }) => (
      <CourseCardTool status={status} result={result} parameters={parameters} />
    ),
  });

  useRenderTool({
    name: "get_course_card",
    parameters: GetCourseCardParams,
    render: ({ status, result, parameters }) => (
      <GetCourseCardTool status={status} result={result} parameters={parameters} />
    ),
  });

  useDefaultRenderTool({
    render: ({ name, status }) => (
      <div className="message-row tool">
        <div className="activity-list">
          <div className={`activity-row ${status === "complete" ? "complete" : "executing"}`}>
            <span className={status === "complete" ? "tool-dot activity-indicator" : "tool-spinner activity-indicator"} />
            <span className="activity-name">{name}</span>
            <span className="activity-desc">{status === "complete" ? `${name} finished.` : `Running ${name}.`}</span>
          </div>
        </div>
      </div>
    ),
  });
}


export function sanitizeCopilotAssistantText(content?: string) {
  const text = (content ?? "").trim();
  if (!text) return "";
  if (text.startsWith(COURSE_CARD_PREFIX)) return "";

  const withoutPrefixedCards = text.replace(/PRIMORIA_COURSE_CARD:\s*\{[\s\S]*?\}\s*/g, "").trim();
  if (!withoutPrefixedCards) return "";

  try {
    const parsed = JSON.parse(withoutPrefixedCards);
    if (parsed?.type === "course_card" || parsed?.course?.blocks || parsed?.blocks) return "";
  } catch {
    // keep ordinary prose
  }

  if (/^\{[\s\S]*"blocks"\s*:\s*\[[\s\S]*\}\s*\*?$/.test(withoutPrefixedCards)) return "";
  return withoutPrefixedCards;
}
