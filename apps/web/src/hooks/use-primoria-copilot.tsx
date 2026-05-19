"use client";

import { z } from "zod";
import { useEffect } from "react";
import { useComponent, useDefaultRenderTool, useRenderTool } from "@copilotkit/react-core/v2";
import { WidgetRenderer } from "@/components/generative-ui/widget-renderer";
import { setTodos } from "@/lib/todos-store";
import type { VisualizationPlanArtifact } from "@/lib/ai/types";

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
  title: z.string(),
  approach: z.string(),
  technology: z.string(),
  key_elements: z.array(z.string()),
});

const RenderWidgetParams = z.object({
  title: z.string(),
  description: z.string(),
  html: z.string(),
});

function WriteTodosSink({ todos }: { todos: z.infer<typeof WriteTodosParams>["todos"] }) {
  useEffect(() => {
    setTodos(todos ?? []);
  }, [todos]);
  return <></>;
}

function PlanCard({ title, approach, technology, key_elements }: z.infer<typeof PlanVisualizationParams>) {
  const plan: VisualizationPlanArtifact = {
    type: "visualization_plan",
    title,
    approach,
    technology,
    keyElements: key_elements,
  };
  return (
    <div className="message-row tool">
      <details className="tool-card plan-card" open>
        <summary className="tool-title plan-summary">
          <span className="tool-dot" />
          <span className="plan-title-text">plan_visualization · complete</span>
          <span className="plan-chevron" aria-hidden="true">▾</span>
        </summary>
        <div className="visualizer">
          <strong>{plan.title}</strong>
          <span className="tool-note">{plan.technology}</span>
          <p className="plan-copy">{plan.approach}</p>
          <div className="plan-list">
            {plan.keyElements.map((element) => (
              <span key={element}>{element}</span>
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function WidgetCard({ title, description, html }: z.infer<typeof RenderWidgetParams>) {
  return (
    <div className="message-row tool">
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{title}</span>
        </div>
        <WidgetRenderer title={title} description={description} html={html} />
      </div>
    </div>
  );
}

export function usePrimoriaGenerativeUI() {
  useComponent({
    name: "render_interactive_widget",
    description: "Renders interactive HTML/CSS/JS visualizations in a sandboxed iframe.",
    parameters: RenderWidgetParams,
    render: WidgetCard,
  });

  useRenderTool({
    name: "plan_visualization",
    parameters: PlanVisualizationParams,
    render: () => <></>,
  });

  useRenderTool({
    name: "write_todos",
    parameters: WriteTodosParams,
    render: ({ parameters }) => <WriteTodosSink todos={parameters?.todos ?? []} />,
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
