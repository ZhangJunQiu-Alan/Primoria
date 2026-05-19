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

  if (artifact.type === "course_draft") {
    return (
      <div className="message-row tool">
        <div className="tool-card course-card">
          <div className="tool-title">
            <span className="tool-dot" />
            <span>generate_course · draft ready</span>
          </div>
          <div className="visualizer course-draft">
            <div>
              <strong className="course-title">{artifact.title}</strong>
              <span className="tool-note">
                {artifact.audience} · {artifact.duration}
              </span>
            </div>
            <div className="course-modules">
              {artifact.modules.map((module, index) => (
                <article key={`${module.title}-${index}`} className="course-module">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{module.title}</strong>
                    <p>{module.description}</p>
                    {module.lessons.length > 0 ? (
                      <div className="plan-list">
                        {module.lessons.map((lesson) => (
                          <button
                            key={lesson}
                            type="button"
                            onClick={() => onSendPrompt?.(`帮我展开课程《${artifact.title}》里的「${lesson}」这一课，并生成练习`)}
                          >
                            {lesson}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {module.project ? <p className="course-project">Project: {module.project}</p> : null}
                  </div>
                </article>
              ))}
            </div>
            {artifact.nextActions.length > 0 ? (
              <div className="tool-actions">
                {artifact.nextActions.map((action) => (
                  <button key={action} type="button" className="soft-btn" onClick={() => onSendPrompt?.(action)}>
                    {action}
                  </button>
                ))}
              </div>
            ) : null}
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
