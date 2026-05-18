import { AgentMark } from "./agent-mark";

type AssistantMessageProps = {
  label: string;
  children: React.ReactNode;
  tone?: "default" | "error";
};

export function AssistantMessage({ label, children, tone = "default" }: AssistantMessageProps) {
  return (
    <div className={`message-row assistant ${tone === "error" ? "error" : ""}`}>
      <AgentMark />
      <div className="bubble">
        <span className="message-label">{label}</span>
        {children}
      </div>
    </div>
  );
}

export function UserMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="message-row user">
      <div className="bubble">{children}</div>
    </div>
  );
}
