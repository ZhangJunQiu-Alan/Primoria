"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  WorkspaceMember,
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
  const [newWorkspaceOpen, setNewWorkspaceOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [joinWorkspaceOpen, setJoinWorkspaceOpen] = useState(false);
  const [joinWorkspaceCode, setJoinWorkspaceCode] = useState("");
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadType, setNewThreadType] = useState<WorkspaceThread["type"]>("room");
  const [newThreadName, setNewThreadName] = useState("");
  const [newThreadDescription, setNewThreadDescription] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("Human");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskScope, setTaskScope] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");

  const activeThread = view.threads.find((thread) => thread.id === activeThreadId) ?? view.threads[0];
  const visibleThreads = view.threads.filter((thread) => thread.type === chatMode);
  const messages = useMemo(
    () => view.messages.filter((message) => message.threadId === activeThread?.id),
    [activeThread?.id, view.messages],
  );
  const tasks = view.tasks.filter((task) => !activeThread || task.threadId === activeThread.id);
  const activeTaskCount = tasks.length || view.tasks.length;

  useEffect(() => {
    let cancelled = false;
    async function refreshWorkspace() {
      try {
        const response = await fetch(`/api/workspaces/${view.workspace.id}`, { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as WorkspaceView;
        setView(data);
        setActiveThreadId((current) => {
          if (data.threads.some((thread) => thread.id === current)) return current;
          return data.threads[0]?.id ?? "";
        });
      } catch {
        // Polling is best-effort; direct actions still show errors when they fail.
      }
    }
    const interval = window.setInterval(() => void refreshWorkspace(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [view.workspace.id]);

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

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === view.workspace.id) return;
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Workspace could not be opened.");
      const data = (await response.json()) as WorkspaceView;
      setView(data);
      setActiveThreadId(data.threads[0]?.id ?? "");
      setChatMode(data.threads[0]?.type ?? "room");
      setDetailsOpen(false);
    } catch (switchError) {
      setError(switchError instanceof Error ? switchError.message : "Workspace could not be opened.");
    }
  }

  async function createNewWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newWorkspaceName.trim();
    if (!name) {
      setError("Name the workspace first.");
      return;
    }
    setError(null);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Workspace could not be created.");
      const data = (await response.json()) as WorkspaceView;
      setView(data);
      setActiveThreadId(data.threads[0]?.id ?? "");
      setChatMode(data.threads[0]?.type ?? "room");
      setNewWorkspaceName("");
      setNewWorkspaceOpen(false);
      setDetailsOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Workspace could not be created.");
    }
  }

  async function joinExistingWorkspace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const inviteCode = joinWorkspaceCode.trim();
    if (!inviteCode) {
      setError("Enter an invite code first.");
      return;
    }
    setError(null);
    try {
      const response = await fetch("/api/workspaces/join", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inviteCode }),
      });
      if (!response.ok) throw new Error("Workspace invite could not be joined.");
      const data = (await response.json()) as WorkspaceView;
      setView(data);
      setActiveThreadId(data.threads[0]?.id ?? "");
      setChatMode(data.threads[0]?.type ?? "room");
      setJoinWorkspaceCode("");
      setJoinWorkspaceOpen(false);
      setDetailsOpen(false);
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Workspace invite could not be joined.");
    }
  }

  async function createThread(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const name = newThreadName.trim();
    if (!name) {
      setError("Name the room or direct chat first.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/threads`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: newThreadType,
          name,
          description: newThreadDescription.trim() || (newThreadType === "direct" ? "private conversation" : "shared room"),
        }),
      });
      if (!response.ok) throw new Error("Chat could not be created.");
      const data = (await response.json()) as { thread: WorkspaceThread };
      setView((current) => ({
        ...current,
        threads: [data.thread, ...current.threads],
        workspace: { ...current.workspace, updatedAt: data.thread.updatedAt },
      }));
      setActiveThreadId(data.thread.id);
      setChatMode(data.thread.type);
      setNewThreadName("");
      setNewThreadDescription("");
      setNewThreadOpen(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Chat could not be created.");
    }
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = memberName.trim();
    if (!displayName) return;
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, role: memberRole || "Human", status: "invited" }),
      });
      if (!response.ok) throw new Error("Member could not be added.");
      const data = (await response.json()) as { member: WorkspaceMember };
      setView((current) => ({
        ...current,
        members: [...current.members, data.member],
        workspace: { ...current.workspace, updatedAt: Date.now() },
      }));
      setMemberName("");
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Member could not be added.");
    }
  }

  async function createTask(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!activeThread) return;
    const title = taskTitle.trim() || `Follow up from ${activeThread.name}`;
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread.id,
          title,
          scope: taskScope.trim() || (activeThread.type === "direct" ? "Private" : "Shared"),
          progress: "new",
          assigneeId: taskAssigneeId || undefined,
          dueAt: taskDueAt.trim() || undefined,
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
      setTaskTitle("");
      setTaskScope("");
      setTaskAssigneeId("");
      setTaskDueAt("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Task could not be created.");
    }
  }

  async function updateTaskStatus(task: WorkspaceTask, status: "open" | "done") {
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, progress: status === "done" ? "done" : "reopened" }),
      });
      if (!response.ok) throw new Error("Task could not be updated.");
      const data = (await response.json()) as { task: WorkspaceTask };
      setView((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => (entry.id === data.task.id ? data.task : entry)),
        workspace: { ...current.workspace, updatedAt: data.task.updatedAt },
      }));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Task could not be updated.");
    }
  }

  async function shareAppCard(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!activeThread) return;
    const title = attachmentTitle.trim();
    const description = attachmentDescription.trim();
    if (!title || !description) {
      setError("Add an app title and short description first.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          threadId: activeThread.id,
          content: `Shared ${title}.`,
          artifact: {
            type: "app",
            title,
            description,
            primaryAction: "Open app",
            secondaryAction: "Create task",
          },
        }),
      });
      if (!response.ok) throw new Error("Application card could not be shared.");
      const data = (await response.json()) as { message: WorkspaceMessage };
      setView((current) => ({
        ...current,
        messages: [...current.messages, data.message],
        threads: current.threads.map((thread) =>
          thread.id === data.message.threadId ? { ...thread, updatedAt: data.message.createdAt } : thread,
        ),
        workspace: { ...current.workspace, updatedAt: data.message.createdAt },
      }));
      setAttachmentTitle("");
      setAttachmentDescription("");
      setAttachmentOpen(false);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Application card could not be shared.");
    } finally {
      setSending(false);
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
          <div className="workspace-directory-actions">
            <button type="button" aria-label="New workspace" onClick={() => setNewWorkspaceOpen((open) => !open)}>W</button>
            <button type="button" aria-label="Join workspace" onClick={() => setJoinWorkspaceOpen((open) => !open)}>J</button>
            <button type="button" aria-label="New chat" onClick={() => setNewThreadOpen((open) => !open)}>+</button>
          </div>
        </div>

        {newWorkspaceOpen ? (
          <form className="workspace-quick-form" onSubmit={createNewWorkspace}>
            <input
              aria-label="Workspace name"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="Workspace name"
            />
            <button type="submit">Create workspace</button>
          </form>
        ) : null}

        {joinWorkspaceOpen ? (
          <form className="workspace-quick-form" onSubmit={joinExistingWorkspace}>
            <input
              aria-label="Workspace invite code"
              value={joinWorkspaceCode}
              onChange={(event) => setJoinWorkspaceCode(event.target.value)}
              placeholder="Invite code"
            />
            <button type="submit">Join workspace</button>
          </form>
        ) : null}

        {view.workspaces.length > 1 ? (
          <div className="workspace-list" aria-label="Workspaces">
            {view.workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={workspace.id === view.workspace.id ? "active" : ""}
                onClick={() => void switchWorkspace(workspace.id)}
              >
                <strong>{workspace.name}</strong>
                <small>{formatDate(workspace.updatedAt)}</small>
              </button>
            ))}
          </div>
        ) : null}

        <div className="workspace-switcher" aria-label="Chat type">
          <button type="button" className={chatMode === "room" ? "active" : ""} onClick={() => switchMode("room")}>
            Rooms
          </button>
          <button type="button" className={chatMode === "direct" ? "active" : ""} onClick={() => switchMode("direct")}>
            Direct
          </button>
        </div>

        {newThreadOpen ? (
          <form className="workspace-quick-form" onSubmit={createThread}>
            <div className="workspace-mini-switcher" aria-label="New chat type">
              <button type="button" className={newThreadType === "room" ? "active" : ""} onClick={() => setNewThreadType("room")}>
                Room
              </button>
              <button type="button" className={newThreadType === "direct" ? "active" : ""} onClick={() => setNewThreadType("direct")}>
                Direct
              </button>
            </div>
            <input
              aria-label="Chat name"
              value={newThreadName}
              onChange={(event) => setNewThreadName(event.target.value)}
              placeholder={newThreadType === "room" ? "Room name" : "Person or agent"}
            />
            <input
              aria-label="Chat description"
              value={newThreadDescription}
              onChange={(event) => setNewThreadDescription(event.target.value)}
              placeholder="Short context"
            />
            <button type="submit">Create</button>
          </form>
        ) : null}

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
            <button type="button" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? "Hide details" : "Details"}</button>
            <button type="button" onClick={() => { setDetailsOpen(true); setMemberName(""); }}>Invite</button>
            <button type="button" onClick={() => { setTaskTitle(`Follow up from ${activeThread?.name ?? "workspace"}`); setDetailsOpen(true); }}>New task</button>
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
          {attachmentOpen ? (
            <div className="workspace-attachment-tray">
              <div className="workspace-quick-form horizontal">
                <input
                  aria-label="Application title"
                  value={attachmentTitle}
                  onChange={(event) => setAttachmentTitle(event.target.value)}
                  placeholder="Application title"
                />
                <input
                  aria-label="Application description"
                  value={attachmentDescription}
                  onChange={(event) => setAttachmentDescription(event.target.value)}
                  placeholder="What should this card do?"
                />
                <button type="button" disabled={sending} onClick={() => void shareAppCard()}>Share app</button>
              </div>
            </div>
          ) : null}
          <input
            aria-label="Message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Message ${activeThread?.type === "room" ? "#" : ""}${activeThread?.name ?? "workspace"}, mention @Primoria, or attach an app...`}
          />
          <button type="button" aria-label="Attach" onClick={() => setAttachmentOpen((open) => !open)}>+</button>
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
            {view.workspace.inviteCode ? (
              <div className="workspace-invite-code">
                <span>Invite code</span>
                <strong>{view.workspace.inviteCode}</strong>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(view.workspace.inviteCode ?? "");
                    setDraft(`Join ${view.workspace.name} with invite code ${view.workspace.inviteCode}.`);
                  }}
                >
                  Copy
                </button>
              </div>
            ) : null}
            <form className="workspace-quick-form compact" onSubmit={inviteMember}>
              <input
                aria-label="Invite name"
                value={memberName}
                onChange={(event) => setMemberName(event.target.value)}
                placeholder="Name or agent"
              />
              <select aria-label="Member role" value={memberRole} onChange={(event) => setMemberRole(event.target.value)}>
                <option>Human</option>
                <option>AI teammate</option>
                <option>Observer</option>
              </select>
              <button type="submit">Add</button>
            </form>
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
            <form className="workspace-quick-form compact" onSubmit={createTask}>
              <input
                aria-label="Task title"
                value={taskTitle}
                onChange={(event) => setTaskTitle(event.target.value)}
                placeholder="Task title"
              />
              <input
                aria-label="Task scope"
                value={taskScope}
                onChange={(event) => setTaskScope(event.target.value)}
                placeholder={activeThread?.type === "direct" ? "Private" : "Shared"}
              />
              <select aria-label="Task assignee" value={taskAssigneeId} onChange={(event) => setTaskAssigneeId(event.target.value)}>
                <option value="">Unassigned</option>
                {view.members.map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
              <input
                aria-label="Task due date"
                value={taskDueAt}
                onChange={(event) => setTaskDueAt(event.target.value)}
                placeholder="Due, optional"
              />
              <button type="submit">Create task</button>
            </form>
            <ul className="workspace-task-list">
              {(tasks.length ? tasks : view.tasks).map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.scope}{item.assigneeName ? ` / ${item.assigneeName}` : " / unassigned"}</span>
                  <small>{item.progress}{item.dueAt ? ` / due ${item.dueAt}` : ""}</small>
                  <button type="button" onClick={() => void updateTaskStatus(item, item.status === "done" ? "open" : "done")}>
                    {item.status === "done" ? "Reopen" : "Complete"}
                  </button>
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

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function agentCount(members: WorkspaceView["members"]) {
  return members.filter((member) => member.role.toLowerCase().includes("ai") || member.displayName.toLowerCase().includes("agent")).length;
}
