import type { TutorArtifact } from "@/lib/ai/types";
import { WidgetRenderer } from "./widget-renderer";

export function ToolCard({ artifact }: { artifact: TutorArtifact }) {
  if (artifact.type === "code") {
    return (
      <div className="message-row tool">
        <pre className="code-card">{artifact.code}</pre>
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
        <WidgetRenderer title={artifact.title} description={artifact.description} html={artifact.html} />
      </div>
    </div>
  );
}
