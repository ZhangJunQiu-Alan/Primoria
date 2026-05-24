"use client";

import { useMemo, useState } from "react";
import type {
  WorkspaceMessage,
  WorkspaceMessageArtifact,
  WorkspaceTask,
  WorkspaceThread,
  WorkspaceView,
} from "@/lib/workspaces/types";

export function WorkspaceClient({ initialView }: { initialView: WorkspaceView }) {
  const [view, setView] = useState(initialView);
  const [activeThreadId, setActiveThreadId] = useState(initialView.threads[0]?.id ?? "");
  const [chatMode, setChatMode] = useState<WorkspaceThread["type"]>("room");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const activeThread = view.threads.find((thread) => thread.id === activeThreadId) ?? view.threads[0];
  const visibleThreads = view.threads.filter((thread) => thread.type === chatMode);
  const messages = useMemo(
    () => view.messages.filter((message) => message.threadId === activeThread?.id),
    [activeThread?.id, view.messages],
  );
  const tasks = view.tasks.filter((task) => !activeThread || task.threadId === activeThread.id);
  const activeTaskCount = tasks.length || view.tasks.length;

  function selectThread(thread: WorkspaceThread) {
    setActiveThreadId(thread.id);
    setChatMode(thread.type);
    setError(null);
  }

  function switchMode(nextMode: WorkspaceThread["type"]) {
    setChatMode(nextMode);
    const nextThread = view.threads.find((thread) => thread.type === nextMode);
    if (nextThread) setActiveThreadId(nextThread.id);
  }

  async function createDirectChat() {
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/threads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "direct", name: "New direct chat", description: "private conversation" }),
      });
      if (!response.ok) throw new Error("Chat could not be created.");
      const data = (await response.json()) as { thread: WorkspaceThread };
      setView((current) => ({
        ...current,
        threads: [data.thread, ...current.threads],
        workspace: { ...current.workspace, updatedAt: data.thread.updatedAt },
      }));
      setActiveThreadId(data.thread.id);
      setChatMode("direct");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Chat could not be created.");
    }
  }

  async function createTask() {
    if (!activeThread) return;
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread.id,
          title: `Follow up from ${activeThread.name}`,
          scope: activeThread.type === "direct" ? "Private" : "Shared",
          progress: "new",
        }),
      });
      if (!response.ok) throw new Error("Task could not be created.");
      const data = (await response.json()) as { task: WorkspaceTask };
      setView((current) => ({
        ...current,
        tasks: [data.task, ...current.tasks],
        workspace: { ...current.workspace, updatedAt: data.task.updatedAt },
      }));
      setDetailsOpen(true);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Task could not be created.");
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeThread || sending) return;
    setSending(true);
    setError(null);
    setDraft("");

    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: activeThread.id, content }),
      });
      if (!response.ok) throw new Error("Message could not be sent.");
      const data = (await response.json()) as { message: WorkspaceMessage };
      setView((current) => ({
        ...current,
        messages: [...current.messages, data.message],
        threads: current.threads.map((thread) =>
          thread.id === data.message.threadId ? { ...thread, updatedAt: data.message.createdAt } : thread,
        ),
        workspace: { ...current.workspace, updatedAt: data.message.createdAt },
      }));
    } catch (sendError) {
      setDraft(content);
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="workspace collaboration-workspace">
      <aside className="workspace-directory" aria-label="Workspace chats">
        <div className="workspace-directory-head">
          <div>
            <span className="course-block-tag">{view.persisted ? "Workspace" : "Local workspace"}</span>
            <strong>{view.workspace.name}</strong>
          </div>
          <button type="button" aria-label="New chat" onClick={() => void createDirectChat()}>+</button>
        </div>

        <div className="workspace-switcher" aria-label="Chat type">
          <button type="button" className={chatMode === "room" ? "active" : ""} onClick={() => switchMode("room")}>
            Rooms
          </button>
          <button type="button" className={chatMode === "direct" ? "active" : ""} onClick={() => switchMode("direct")}>
            Direct
          </button>
        </div>

        <ThreadSection title={chatMode === "room" ? "Rooms" : "Direct"} threads={visibleThreads} activeThreadId={activeThread?.id} onSelect={selectThread} />
      </aside>

      <section className="workspace-room" aria-label="Workspace chat">
        <div className="workspace-room-header">
          <div>
            <strong>{activeThread?.type === "room" ? "# " : ""}{activeThread?.name ?? "Workspace"}</strong>
            <span>{view.members.length} members / {agentCount(view.members)} agents online / {activeTaskCount} active tasks</span>
          </div>
          <div className="workspace-room-actions">
            <span className="workspace-live-dot">Live</span>
            <button type="button" onClick={() => setDetailsOpen(true)}>Invite</button>
            <button type="button" onClick={() => void createTask()}>New task</button>
          </div>
        </div>

        <div className="workspace-message-list">
          {messages.map((message) => (
            <article key={message.id} className={`workspace-message ${message.senderKind}`}>
              <div className="workspace-avatar" aria-hidden="true">{message.senderName.slice(0, 1)}</div>
              <div className="workspace-message-body">
                <div className="workspace-message-meta">
                  <strong>{message.senderName}</strong>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
                <p>{message.content}</p>
                {message.artifact ? <MessageArtifact artifact={message.artifact} onPrompt={setDraft} /> : null}
              </div>
            </article>
          ))}
        </div>

        <form className="workspace-composer" onSubmit={sendMessage}>
          <input
            aria-label="Message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${activeThread?.type === "room" ? "#" : ""}${activeThread?.name ?? "workspace"}, mention @Primoria, or attach an app...`}
          />
          <button type="button" aria-label="Attach">+</button>
          <button type="submit" disabled={sending || !draft.trim()}>{sending ? "Sending" : "Send"}</button>
          {error ? <p className="workspace-send-error">{error}</p> : null}
        </form>
      </section>

      <details
        className="workspace-side-drawer"
        aria-label="Room details"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Details</span>
        </summary>
        <aside className="workspace-side" aria-label="Workspace status">
          <section className="workspace-panel">
            <div className="workspace-panel-header">
              <strong>Members</strong>
              <span>{view.members.length}</span>
            </div>
            <ul className="workspace-member-list">
              {view.members.map((member) => (
                <li key={member.id}>
                  <span className="workspace-member-avatar" aria-hidden="true">{member.displayName.slice(0, 1)}</span>
                  <span>
                    <strong>{member.displayName}</strong>
                    <small>{member.role}{member.status ? ` / ${member.status}` : ""}</small>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-header">
              <strong>Tasks</strong>
              <span>{view.tasks.length}</span>
            </div>
            <ul className="workspace-task-list">
              {(tasks.length ? tasks : view.tasks).map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.scope}</span>
                  <small>{item.progress}{item.dueAt ? ` / due ${item.dueAt}` : ""}</small>
                </li>
              ))}
            </ul>
          </section>

          <section className="workspace-panel workspace-agent-panel">
            <span className="course-block-tag">Agent brief</span>
            <h2>Next best move</h2>
            <p>Ask for approval on pending scope decisions, then let Primoria execute queued cleanup tasks.</p>
            <button type="button" onClick={() => setDraft("Please summarize the pending decisions and suggest the next concrete workspace action.")}>
              Draft prompt
            </button>
          </section>
        </aside>
      </details>
    </section>
  );
}

function ThreadSection({
  title,
  threads,
  activeThreadId,
  onSelect,
}: {
  title: string;
  threads: WorkspaceThread[];
  activeThreadId?: string;
  onSelect: (thread: WorkspaceThread) => void;
}) {
  return (
    <section className="workspace-chat-section">
      <span>{title}</span>
      {threads.map((thread) => (
        <button key={thread.id} type="button" className={thread.id === activeThreadId ? "active" : ""} onClick={() => onSelect(thread)}>
          <strong>{thread.type === "room" ? "# " : ""}{thread.name}</strong>
          <small>{thread.description}</small>
        </button>
      ))}
    </section>
  );
}

function MessageArtifact({ artifact, onPrompt }: { artifact: WorkspaceMessageArtifact; onPrompt: (prompt: string) => void }) {
  if (artifact.type === "task") {
    return (
      <article className="workspace-assignment-card inline">
        <div>
          <span className="course-block-tag">Task card</span>
          <h2>{artifact.title}</h2>
          <p>{artifact.description}</p>
        </div>
        <div className="workspace-assignment-groups">
          {artifact.groups.map((group) => <span key={group}>{group}</span>)}
        </div>
      </article>
    );
  }
  return (
    <article className="workspace-app-card inline">
      <div className="workspace-app-preview" aria-hidden="true">
        <span />
        <i />
        <b />
      </div>
      <div>
        <span className="course-block-tag">Shared application</span>
        <h2>{artifact.title}</h2>
        <p>{artifact.description}</p>
        <div className="workspace-card-actions">
          <button type="button" onClick={() => onPrompt(`Open ${artifact.title} and summarize the review focus.`)}>
            {artifact.primaryAction}
          </button>
          {artifact.secondaryAction ? (
            <button type="button" onClick={() => onPrompt(`Share ${artifact.title} with the current workspace and create follow-up tasks.`)}>
              {artifact.secondaryAction}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function agentCount(members: WorkspaceView["members"]) {
  return members.filter((member) => member.role.toLowerCase().includes("ai") || member.displayName.toLowerCase().includes("agent")).length;
}
