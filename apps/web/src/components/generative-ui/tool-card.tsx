import type { TutorArtifact } from "@/lib/ai/types";
import { WidgetRenderer } from "./widget-renderer";

export function ToolCard({
  artifact,
  onSendPrompt,
}: {
  artifact: TutorArtifact;
  onSendPrompt?: (prompt: string) => void;
}) {
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
        <div className="tool-card plan-card">
          <div className="tool-title">
            <span className="tool-dot" />
            <span>plan_visualization · complete</span>
          </div>
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
        </div>
      </div>
    );
  }

  if (artifact.type === "tool_status") {
    return (
      <div className="message-row tool">
        <div className="tool-card status-card">
          <div className="tool-title">
            <span className={artifact.status === "executing" ? "tool-spinner" : "tool-dot"} />
            <span>
              {artifact.name} · {artifact.status}
            </span>
          </div>
          <div className="visualizer">
            <span className="tool-note">{artifact.description}</span>
          </div>
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
          onSendPrompt={onSendPrompt}
        />
      </div>
    </div>
  );
}
