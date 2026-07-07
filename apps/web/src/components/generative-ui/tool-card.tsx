"use client";

import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import type { TutorArtifact } from "@/lib/agent-os";
import { WidgetRenderer } from "./widget-renderer";
import { EChartsRenderer } from "./echarts-renderer";
import { MermaidRenderer } from "./mermaid-renderer";
import { PhysicsSceneRenderer } from "./physics-scene-renderer";
import { AlgorithmVisualizer } from "./algorithm-visualizer";
import { MathExplorerRenderer } from "./math-explorer-renderer";
import { WaveVisualizer } from "./wave-visualizer";
import { GraphVisualizer } from "./graph-visualizer";
import { MoleculeRenderer } from "./molecule-renderer";
import { useT } from "@/lib/i18n/client";
import { getTutorToolDisplay, getTutorToolIndicatorClass } from "@/lib/ai/tutor-tool-display";

export function ToolCard({
  artifact,
  onSendPrompt,
  collapsed = false,
}: {
  artifact: TutorArtifact;
  onSendPrompt?: (prompt: string) => void;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const t = useT();

  if (artifact.type === "code") {
    return (
      <div className="message-row tool">
        <pre className="code-card">{artifact.code}</pre>
      </div>
    );
  }

  if (artifact.type === "visualization_plan") {
    return (
      <div className="message-row tool">
        <details className="tool-card plan-card" open={!collapsed}>
          <summary className="tool-title plan-summary">
            <span className="tool-dot" />
            <span className="plan-title-text">
              {t.tutor.visualizationPlanTitle}
            </span>
            <span className="plan-chevron" aria-hidden="true">▾</span>
          </summary>
          <div className="visualizer">
            <strong>{artifact.title}</strong>
            <span className="tool-note">{artifact.technology}</span>
            <p className="plan-copy">{artifact.approach}</p>
            <div className="plan-list">
              {artifact.keyElements.map((element) => (
                <span key={element}>{element}</span>
              ))}
            </div>
          </div>
        </details>
      </div>
    );
  }

  if (artifact.type === "course_card") {
    const courseHref = `/course/${encodeURIComponent(artifact.courseId)}/outline`;
    const isReady = artifact.status === "ready";
    const typeIcon: Record<string, string> = {
      text: "T",
      analogy: "≈",
      transfer: "→",
      visual: "◐",
      code: "{}",
      quiz: "?",
      mind_map: "M",
      slide: "S",
      worksheet: "W",
    };
    const body = (
      <>
          <div className="tool-title">
            <span className={getTutorToolIndicatorClass(isReady ? "complete" : artifact.status)} />
            <span>{isReady ? t.tutor.courseCardReady : t.tutor.courseCardPending}</span>
          </div>
          <div className="visualizer course-card-body">
            <strong className="course-title">{artifact.title}</strong>
            <p className="course-summary">{artifact.summary}</p>
            <ul className="course-outline">
              {artifact.outline.map((item, index) => (
                <li key={`${item.type}-${index}`}>
                  <span className={`course-outline-icon course-outline-${item.type}`}>
                    {typeIcon[item.type] ?? "·"}
                  </span>
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
            <span className="course-meta">
              {isReady
                ? `${artifact.outline.length} ${t.tutor.courseCardMetaReady.replace("{minutes}", String(artifact.estimatedMinutes))}`
                : t.tutor.courseCardMetaPending}
            </span>
          </div>
      </>
    );
    return (
      <div className="message-row tool">
        {isReady ? (
          <a
            className="tool-card course-card-link"
            href={courseHref}
            onClick={(event: MouseEvent<HTMLAnchorElement>) => {
              event.preventDefault();
              event.stopPropagation();
              router.push(courseHref);
            }}
          >
            {body}
          </a>
        ) : (
          <div className="tool-card course-card-link course-card-pending" aria-busy="true">
            {body}
          </div>
        )}
      </div>
    );
  }

  if (artifact.type === "tool_status") {
    const display = getTutorToolDisplay(artifact.name, artifact.status, t);
    return (
      <div className="message-row tool">
        <div className="tool-card status-card">
          <div className="tool-title">
            <span className={getTutorToolIndicatorClass(artifact.status)} />
            <span>{display.title}</span>
          </div>
          <div className="visualizer">
            <span className="tool-note">{display.detail}</span>
          </div>
        </div>
      </div>
    );
  }

  if (artifact.type === "echarts_widget") {
    return <EChartsRenderer artifact={artifact} />;
  }

  if (artifact.type === "mermaid_diagram") {
    return <MermaidRenderer artifact={artifact} />;
  }

  if (artifact.type === "physics_scene") {
    return <PhysicsSceneRenderer artifact={artifact} />;
  }

  if (artifact.type === "algorithm_visualization") {
    return <AlgorithmVisualizer artifact={artifact} />;
  }

  if (artifact.type === "math_explorer") {
    return <MathExplorerRenderer artifact={artifact} />;
  }

  if (artifact.type === "wave_visualization") {
    return <WaveVisualizer artifact={artifact} />;
  }

  if (artifact.type === "graph_visualization") {
    return <GraphVisualizer artifact={artifact} />;
  }

  if (artifact.type === "molecule") {
    return <MoleculeRenderer artifact={artifact} />;
  }

  if (artifact.type === "todo_list") {
    if (artifact.items.length === 0) return null;
    return (
      <div className="message-row tool">
        <div className="tool-card todo-card">
          <div className="tool-title">
            <span className="tool-dot" />
            <span>{t.tutor.todoTitle}</span>
          </div>
          <ol className="todo-list">
            {artifact.items.map((item, index) => (
              <li key={`${index}-${item.title}`} className={`todo-item ${item.status}`}>
                <span className={`todo-indicator ${item.status}`} />
                <span className="todo-title">{item.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="message-row tool">
      <div className="tool-card">
        <div className="tool-title">
          <span className="tool-dot" />
          <span>{artifact.title}</span>
        </div>
        <WidgetRenderer
          title={artifact.title}
          description={artifact.description}
          html={artifact.html}
          dependencies={artifact.dependencies}
          onSendPrompt={onSendPrompt}
        />
      </div>
    </div>
  );
}
