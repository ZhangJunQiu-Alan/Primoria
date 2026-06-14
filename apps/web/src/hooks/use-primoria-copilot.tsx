"use client";

import { z } from "zod";
import { useEffect } from "react";
import { useComponent, useDefaultRenderTool, useRenderTool } from "@copilotkit/react-core/v2";
import { WidgetRenderer } from "@/components/generative-ui/widget-renderer";
import { ToolCard } from "@/components/generative-ui/tool-card";
import { PlanProgressCard } from "@/components/tutor/plan-progress-card";
import { normalizeWidgetHtml } from "@/lib/ai/widget-html";
import { setTodos } from "@/lib/todos-store";
import type { CourseCardArtifact } from "@/lib/ai/types";

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
  description: z.string().optional().default(""),
  html: z.string().optional().default(""),
  dependencies: z.array(z.object({
    url: z.string(),
    global: z.string().optional(),
    kind: z.enum(["script", "module", "style"]).optional(),
  })).optional(),
});

const GenerateCourseParams = z.object({
  topic: z.string(),
  context_hint: z.string().optional(),
});

const GetCourseCardParams = z.object({
  course_id: z.string(),
});

const CourseBlockTypeResult = z.enum(["text", "analogy", "transfer", "visual", "code", "quiz", "mind_map", "slide", "worksheet"]);

const CourseCardResult = z.object({
  type: z.literal("course_card"),
  courseId: z.string(),
  title: z.string(),
  topic: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number(),
  outline: z.array(
    z.object({
      type: CourseBlockTypeResult,
      title: z.string(),
    }),
  ),
  status: z.enum(["generating", "ready"]),
});

const COURSE_CARD_PREFIX = "PRIMORIA_COURSE_CARD:";

function WriteTodosSink({ todos }: { todos: z.infer<typeof WriteTodosParams>["todos"] }) {
  useEffect(() => {
    setTodos(todos ?? []);
  }, [todos]);

  if (!todos?.length) return null;

  return (
    <div className="primoria-copilot-tool primoria-copilot-progress-tool">
      <PlanProgressCard />
    </div>
  );
}

function normalizePlanKeyElements(value: z.infer<typeof PlanVisualizationParams>["key_elements"]) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  return String(value ?? "")
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function WidgetCard({ title, description, html, dependencies }: z.infer<typeof RenderWidgetParams>) {
  const safeHtml = typeof html === "string" ? normalizeWidgetHtml(html) : "";
  return (
    <div className="primoria-copilot-tool primoria-copilot-widget-tool">
      <WidgetRenderer
        title={title || "Interactive learning widget"}
        description={description || ""}
        html={safeHtml}
        dependencies={dependencies}
      />
    </div>
  );
}

function VisualizationPlanTool({
  status,
  approach,
  technology,
  keyElements,
}: {
  status: "inProgress" | "executing" | "complete";
  approach?: string;
  technology?: string;
  keyElements?: string[];
}) {
  const isRunning = status === "executing" || status === "inProgress";
  return (
    <details className="primoria-copilot-tool primoria-copilot-plan-tool" open={isRunning || undefined}>
      <summary>
        <span className={isRunning ? "tool-spinner" : "inline-plan-check"} aria-hidden="true">
          {isRunning ? null : "✓"}
        </span>
        <span>{isRunning ? "Planning visualization…" : `Plan: ${technology || "visualization"}`}</span>
        <span className="inline-plan-chevron" aria-hidden="true">▾</span>
      </summary>
      {approach ? (
        <div className="primoria-copilot-plan-body">
          {technology ? <span>{technology}</span> : null}
          <p>{approach}</p>
          {keyElements && keyElements.length > 0 ? (
            <ul>
              {keyElements.map((element) => (
                <li key={element}>{element}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </details>
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
  if (artifact) return <div className="primoria-copilot-tool"><ToolCard artifact={artifact} /></div>;

  return (
    <div className="primoria-copilot-tool">
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
  if (artifact) return <div className="primoria-copilot-tool"><ToolCard artifact={artifact} /></div>;
  return (
    <div className="primoria-copilot-tool">
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
      <VisualizationPlanTool
        status={status}
        approach={parameters?.approach ?? "Planning the visualization."}
        technology={parameters?.technology ?? "HTML + JavaScript"}
        keyElements={normalizePlanKeyElements(parameters?.key_elements ?? [])}
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
    render: () => <></>,
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
