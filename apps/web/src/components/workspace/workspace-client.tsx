"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LearningApp, LearningAppTemplate } from "@/lib/capability-library/types";
import type {
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceMessageArtifact,
  WorkspaceTask,
  WorkspaceThread,
  WorkspaceView,
} from "@/lib/workspaces/types";

type LibraryAppOption = {
  id: string;
  displayName: string;
  description?: string;
  version: number;
};

type SharedAppArtifact = Extract<WorkspaceMessageArtifact, { type: "app" }>;

type AppPreviewState = {
  artifact: SharedAppArtifact;
  app?: LearningApp;
  template?: LearningAppTemplate;
  loading: boolean;
  error?: string;
};

const WorkspaceWidgetRenderer = dynamic(
  () => import("@/components/generative-ui/widget-renderer").then((module) => module.WidgetRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="workspace-preview-state" role="status">
        <span className="tool-spinner" aria-hidden="true" />
        <strong>Loading preview...</strong>
      </div>
    ),
  },
);

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
  const [newThreadParticipantId, setNewThreadParticipantId] = useState("");
  const [attachmentOpen, setAttachmentOpen] = useState(false);
  const [attachmentTitle, setAttachmentTitle] = useState("");
  const [attachmentDescription, setAttachmentDescription] = useState("");
  const [libraryApps, setLibraryApps] = useState<LibraryAppOption[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [loadingApps, setLoadingApps] = useState(false);
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("Person");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskScope, setTaskScope] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskResultDrafts, setTaskResultDrafts] = useState<Record<string, string>>({});
  const [appPreview, setAppPreview] = useState<AppPreviewState | null>(null);

  const visibleThreads = view.threads.filter((thread) => thread.type === chatMode);
  const activeThread = visibleThreads.find((thread) => thread.id === activeThreadId) ?? visibleThreads[0];
  const messages = useMemo(
    () => view.messages.filter((message) => message.threadId === activeThread?.id),
    [activeThread?.id, view.messages],
  );
  const tasks = activeThread ? view.tasks.filter((task) => task.threadId === activeThread.id) : view.tasks;
  const activeTaskCount = activeThread ? tasks.length : view.tasks.length;
  const selectedApp = libraryApps.find((app) => app.id === selectedAppId);
  const chatCount = view.threads.length;
  const roomCount = view.threads.filter((thread) => thread.type === "room").length;
  const directCount = view.threads.filter((thread) => thread.type === "direct").length;

  const applyWorkspaceView = useCallback((data: WorkspaceView) => {
    setView(data);
    setActiveThreadId((current) => {
      if (data.threads.some((thread) => thread.id === current)) return current;
      return data.threads[0]?.id ?? "";
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollingInterval: number | undefined;

    if (typeof EventSource !== "undefined") {
      const source = new EventSource(`/api/workspaces/${view.workspace.id}/events`);
      source.addEventListener("workspace", (event) => {
        if (cancelled) return;
        if (pollingInterval !== undefined) {
          window.clearInterval(pollingInterval);
          pollingInterval = undefined;
        }
        applyWorkspaceView(JSON.parse((event as MessageEvent<string>).data) as WorkspaceView);
      });
      source.addEventListener("error", (event) => {
        const message = (event as MessageEvent<string>).data;
        if (message) setError("Workspace updates stopped. Refresh the page or try again.");
      });
      source.onerror = () => {
        source.close();
        if (!cancelled && pollingInterval === undefined) {
          pollingInterval = window.setInterval(() => void refreshWorkspace(), 8000);
        }
      };
      return () => {
        cancelled = true;
        source.close();
        if (pollingInterval !== undefined) window.clearInterval(pollingInterval);
      };
    }

    async function refreshWorkspace() {
      try {
        const response = await fetch(`/api/workspaces/${view.workspace.id}`, { cache: "no-store" });
        if (cancelled) return;
        if (!response.ok) {
          setError("Workspace could not be refreshed.");
          return;
        }
        const data = (await response.json()) as WorkspaceView;
        applyWorkspaceView(data);
      } catch {
        if (!cancelled) setError("Workspace updates are temporarily unavailable.");
      }
    }
    pollingInterval = window.setInterval(() => void refreshWorkspace(), 8000);
    return () => {
      cancelled = true;
      if (pollingInterval !== undefined) window.clearInterval(pollingInterval);
    };
  }, [applyWorkspaceView, view.workspace.id]);

  useEffect(() => {
    if (!attachmentOpen || libraryApps.length > 0 || loadingApps) return;
    let cancelled = false;
    async function loadApps() {
      setLoadingApps(true);
      try {
        const response = await fetch("/api/apps", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as { apps?: LibraryAppOption[] };
        setLibraryApps(Array.isArray(data.apps) ? data.apps : []);
      } catch {
        setLibraryApps([]);
      } finally {
        if (!cancelled) setLoadingApps(false);
      }
    }
    void loadApps();
    return () => {
      cancelled = true;
    };
  }, [attachmentOpen, libraryApps.length, loadingApps]);

  useEffect(() => {
    if (!appPreview) return;
    function closePreview(event: KeyboardEvent) {
      if (event.key === "Escape") setAppPreview(null);
    }
    window.addEventListener("keydown", closePreview);
    return () => window.removeEventListener("keydown", closePreview);
  }, [appPreview]);

  function selectThread(thread: WorkspaceThread) {
    setActiveThreadId(thread.id);
    setChatMode(thread.type);
    setError(null);
  }

  function switchMode(nextMode: WorkspaceThread["type"]) {
    setChatMode(nextMode);
    setNewThreadType(nextMode);
    const nextThread = view.threads.find((thread) => thread.type === nextMode);
    if (nextThread) setActiveThreadId(nextThread.id);
  }

  function toggleWorkspaceAction(action: "create" | "join" | "thread") {
    setNewWorkspaceOpen((open) => (action === "create" ? !open : false));
    setJoinWorkspaceOpen((open) => (action === "join" ? !open : false));
    setNewThreadOpen((open) => (action === "thread" ? !open : false));
  }

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === view.workspace.id) return;
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Workspace could not be opened.");
      const data = (await response.json()) as WorkspaceView;
      applyWorkspaceView(data);
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
      applyWorkspaceView(data);
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
      applyWorkspaceView(data);
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
          participantIds: newThreadType === "direct" && newThreadParticipantId ? [newThreadParticipantId] : undefined,
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
      setNewThreadParticipantId("");
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
        body: JSON.stringify({ displayName, role: memberRole || "Person", status: "invited" }),
      });
      if (!response.ok) throw new Error("Member could not be added.");
      const data = (await response.json()) as { member: WorkspaceMember };
      setView((current) => ({
        ...current,
        members: [...current.members, data.member],
        workspace: { ...current.workspace, updatedAt: Date.now() },
      }));
      setMemberName("");
      setMemberPickerOpen(false);
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

  async function submitTaskResult(task: WorkspaceTask) {
    const resultSummary = taskResultDrafts[task.id]?.trim();
    if (!resultSummary) {
      setError("Add a result note before submitting.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "done", progress: "submitted", resultSummary }),
      });
      if (!response.ok) throw new Error("Task result could not be submitted.");
      const data = (await response.json()) as { task: WorkspaceTask };
      setView((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => (entry.id === data.task.id ? data.task : entry)),
        workspace: { ...current.workspace, updatedAt: data.task.updatedAt },
      }));
      setTaskResultDrafts((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Task result could not be submitted.");
    }
  }

  async function shareAppCard(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!activeThread) return;
    const title = selectedApp?.displayName?.trim() || attachmentTitle.trim();
    const description = selectedApp?.description?.trim() || attachmentDescription.trim();
    if (!title || !description) {
      setError("Select an app or add a title and short description first.");
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
            appId: selectedApp?.id,
            version: selectedApp?.version,
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
      setSelectedAppId("");
      setAttachmentOpen(false);
    } catch (shareError) {
      setError(shareError instanceof Error ? shareError.message : "Application card could not be shared.");
    } finally {
      setSending(false);
    }
  }

  async function openAppArtifact(artifact: SharedAppArtifact) {
    if (artifact.template) {
      setAppPreview({ artifact, template: artifact.template, loading: false });
      return;
    }

    if (!artifact.appId) {
      setDraft(`Open ${artifact.title} and summarize the review focus.`);
      return;
    }

    setAppPreview({ artifact, loading: true });
    setError(null);
    try {
      const response = await fetch(`/api/apps/${encodeURIComponent(artifact.appId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Application could not be opened.");
      const data = (await response.json()) as { app?: LearningApp };
      if (!data.app) throw new Error("Application could not be opened.");
      setAppPreview({ artifact, app: data.app, loading: false });
    } catch (previewError) {
      setAppPreview({
        artifact,
        loading: false,
        error: previewError instanceof Error ? previewError.message : "Application could not be opened.",
      });
    }
  }

  function createTaskFromArtifact(artifact: SharedAppArtifact) {
    setTaskTitle(`Review ${artifact.title}`);
    setTaskScope(activeThread?.type === "direct" ? "Private" : "Shared");
    setDetailsOpen(true);
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
      setDraft((current) => current || content);
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
            <button type="button" aria-label="New workspace" title="New workspace" onClick={() => toggleWorkspaceAction("create")}>New</button>
            <button type="button" aria-label="Join workspace" title="Join workspace" onClick={() => toggleWorkspaceAction("join")}>Join</button>
            <button type="button" aria-label="New chat" title="New chat" onClick={() => toggleWorkspaceAction("thread")}>+</button>
          </div>
        </div>

        {newWorkspaceOpen ? (
          <form className="workspace-quick-form workspace-action-form" onSubmit={createNewWorkspace}>
            <input
              aria-label="Workspace name"
              value={newWorkspaceName}
              onChange={(event) => setNewWorkspaceName(event.target.value)}
              placeholder="Workspace name"
            />
            <button type="submit">Create</button>
          </form>
        ) : null}

        {joinWorkspaceOpen ? (
          <form className="workspace-quick-form workspace-action-form" onSubmit={joinExistingWorkspace}>
            <input
              aria-label="Workspace invite code"
              value={joinWorkspaceCode}
              onChange={(event) => setJoinWorkspaceCode(event.target.value)}
              placeholder="Invite code"
            />
            <button type="submit">Join</button>
          </form>
        ) : null}

        {view.workspaces.length ? (
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
            Groups <span>{roomCount}</span>
          </button>
          <button type="button" className={chatMode === "direct" ? "active" : ""} onClick={() => switchMode("direct")}>
            Private <span>{directCount}</span>
          </button>
        </div>

        {newThreadOpen ? (
          <form className="workspace-quick-form workspace-action-form" onSubmit={createThread}>
            <div className="workspace-mini-switcher" aria-label="New chat type">
              <button type="button" className={newThreadType === "room" ? "active" : ""} onClick={() => setNewThreadType("room")}>
                Group
              </button>
              <button type="button" className={newThreadType === "direct" ? "active" : ""} onClick={() => setNewThreadType("direct")}>
                Private
              </button>
            </div>
            <input
              aria-label="Chat name"
              value={newThreadName}
              onChange={(event) => setNewThreadName(event.target.value)}
              placeholder={newThreadType === "room" ? "Room name" : "Person or agent"}
            />
            {newThreadType === "direct" ? (
              <select
                aria-label="Direct participant"
                value={newThreadParticipantId}
                onChange={(event) => {
                  const memberId = event.target.value;
                  const member = view.members.find((entry) => entry.id === memberId);
                  setNewThreadParticipantId(memberId);
                  if (member && !newThreadName.trim()) setNewThreadName(member.displayName);
                }}
              >
                <option value="">Private to me</option>
                {view.members.map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
            ) : null}
            <input
              aria-label="Chat description"
              value={newThreadDescription}
              onChange={(event) => setNewThreadDescription(event.target.value)}
              placeholder="Short context"
            />
            <button type="submit">Create</button>
          </form>
        ) : null}

        <ThreadSection
          title={chatMode === "room" ? "Group chats" : "Private chats"}
          threads={visibleThreads}
          activeThreadId={activeThread?.id}
          emptyText={chatMode === "room" ? "No group chats yet." : "No private chats yet."}
          onSelect={selectThread}
        />
      </aside>

      <section className="workspace-room" aria-label="Workspace chat">
        <div className="workspace-room-header">
          <div>
            <strong>{activeThread ? `${activeThread.type === "room" ? "# " : ""}${activeThread.name}` : view.workspace.name}</strong>
            <span>
              {activeThread
                ? `${view.members.length} members / ${agentCount(view.members)} agents / ${activeTaskCount} active tasks`
                : `${view.members.length} members / ${chatCount} chats / ${view.tasks.length} tasks`}
            </span>
          </div>
          <div className="workspace-room-actions">
            <span className="workspace-live-dot">Live</span>
            <button type="button" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? "Hide details" : "Details"}</button>
            <button type="button" onClick={() => { setDetailsOpen(true); setMemberPickerOpen(true); setMemberName(""); }}>Invite</button>
            <button type="button" onClick={() => { setTaskTitle(`Follow up from ${activeThread?.name ?? "workspace"}`); setDetailsOpen(true); }}>New task</button>
          </div>
        </div>

        <div className={`workspace-message-list ${!activeThread ? "workspace-message-list-start" : ""}`}>
          {!activeThread ? (
            <WorkspaceStartState
              workspaceName={view.workspace.name}
              chatMode={chatMode}
              newThreadType={newThreadType}
              newThreadName={newThreadName}
              newThreadDescription={newThreadDescription}
              newThreadParticipantId={newThreadParticipantId}
              members={view.members}
              onModeChange={switchMode}
              onThreadTypeChange={setNewThreadType}
              onThreadNameChange={setNewThreadName}
              onThreadDescriptionChange={setNewThreadDescription}
              onThreadParticipantChange={(memberId) => {
                const member = view.members.find((entry) => entry.id === memberId);
                setNewThreadParticipantId(memberId);
                if (member && !newThreadName.trim()) setNewThreadName(member.displayName);
              }}
              onCreateThread={createThread}
              onOpenDetails={() => setDetailsOpen(true)}
            />
          ) : messages.length === 0 ? (
            <div className="workspace-empty-state active-chat-empty">
              <span className="course-block-tag">{activeThread.type === "room" ? "Group chat" : "Private chat"}</span>
              <strong>No messages yet</strong>
              <span>Start with a note, share a saved app, or create a task when there is real work to track.</span>
            </div>
          ) : null}
          {messages.map((message) => (
            <article key={message.id} className={`workspace-message ${message.senderKind}`}>
              <div className="workspace-avatar" aria-hidden="true">{message.senderName.slice(0, 1)}</div>
              <div className="workspace-message-body">
                <div className="workspace-message-meta">
                  <strong>{message.senderName}</strong>
                  <span>{formatTime(message.createdAt)}</span>
                </div>
                <p>{message.content}</p>
                {message.artifact ? (
                  <MessageArtifact
                    artifact={message.artifact}
                    onOpenApp={(artifact) => void openAppArtifact(artifact)}
                    onCreateTask={createTaskFromArtifact}
                  />
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <form className="workspace-composer" onSubmit={sendMessage}>
          {attachmentOpen ? (
            <div className="workspace-attachment-tray">
              <div className="workspace-quick-form horizontal">
                <select
                  aria-label="Saved application"
                  value={selectedAppId}
                  onChange={(event) => {
                    const appId = event.target.value;
                    const app = libraryApps.find((entry) => entry.id === appId);
                    setSelectedAppId(appId);
                    if (app) {
                      setAttachmentTitle(app.displayName);
                      setAttachmentDescription(app.description ?? "");
                    }
                  }}
                >
                  <option value="">{loadingApps ? "Loading apps" : "Manual card"}</option>
                  {libraryApps.map((app) => (
                    <option key={app.id} value={app.id}>{app.displayName}</option>
                  ))}
                </select>
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
            disabled={!activeThread}
            placeholder={
              activeThread
                ? `Message ${activeThread.type === "room" ? "#" : ""}${activeThread.name}, mention an agent, or attach an app...`
                : "Create or select a chat to send a message"
            }
          />
          <button type="button" aria-label="Attach" disabled={!activeThread} onClick={() => setAttachmentOpen((open) => !open)}>+</button>
          <button type="submit" disabled={sending || !draft.trim() || !activeThread}>{sending ? "Sending" : "Send"}</button>
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
          <section className="workspace-panel workspace-members-panel">
            <div className="workspace-panel-header">
              <strong>Members</strong>
              <div className="workspace-panel-header-actions">
                <span>{view.members.length}</span>
                <button
                  type="button"
                  aria-label="Add member"
                  aria-expanded={memberPickerOpen}
                  onClick={() => setMemberPickerOpen((open) => !open)}
                >
                  +
                </button>
              </div>
            </div>
            {view.workspace.inviteCode ? (
              <div className="workspace-invite-code">
                <span>Invite code</span>
                <strong>{view.workspace.inviteCode}</strong>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(view.workspace.inviteCode ?? "");
                  }}
                >
                  Copy
                </button>
              </div>
            ) : null}
            {memberPickerOpen ? (
              <form className="workspace-member-popover" aria-label="Add workspace member" onSubmit={inviteMember}>
                <div className="workspace-member-type-switch" aria-label="Member type">
                  <button type="button" className={memberRole === "Person" ? "active" : ""} onClick={() => setMemberRole("Person")}>
                    Person
                  </button>
                  <button type="button" className={memberRole === "Agent" ? "active" : ""} onClick={() => setMemberRole("Agent")}>
                    Agent
                  </button>
                </div>
                <input
                  aria-label="Invite name"
                  value={memberName}
                  onChange={(event) => setMemberName(event.target.value)}
                  placeholder={memberRole === "Agent" ? "Agent name or handle" : "Name or email"}
                />
                <div className="workspace-member-popover-actions">
                  <button type="button" onClick={() => setMemberPickerOpen(false)}>Cancel</button>
                  <button type="submit">Add</button>
                </div>
              </form>
            ) : null}
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
            <form className="workspace-quick-form compact workspace-task-form" onSubmit={createTask}>
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
              {tasks.map((item) => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <span>{item.scope}{item.assigneeName ? ` / ${item.assigneeName}` : " / unassigned"}</span>
                  <small>{item.progress}{item.dueAt ? ` / due ${item.dueAt}` : ""}</small>
                  {item.resultSummary ? (
                    <p className="workspace-task-result">{item.resultSummary}</p>
                  ) : null}
                  <div className="workspace-task-submit">
                    <input
                      aria-label={`Result for ${item.title}`}
                      value={taskResultDrafts[item.id] ?? ""}
                      onChange={(event) => setTaskResultDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                      placeholder="Result note"
                    />
                    <button type="button" onClick={() => void submitTaskResult(item)}>Submit</button>
                  </div>
                  <button type="button" onClick={() => void updateTaskStatus(item, item.status === "done" ? "open" : "done")}>
                    {item.status === "done" ? "Reopen" : "Complete"}
                  </button>
                </li>
              ))}
            </ul>
          </section>

        </aside>
      </details>

      {appPreview ? (
        <AppPreviewDialog
          preview={appPreview}
          onClose={() => setAppPreview(null)}
          onSendPrompt={(prompt) => {
            setDraft(prompt);
            setAppPreview(null);
          }}
          onCreateTask={(artifact) => {
            createTaskFromArtifact(artifact);
            setAppPreview(null);
          }}
        />
      ) : null}
    </section>
  );
}

function ThreadSection({
  title,
  threads,
  activeThreadId,
  emptyText,
  onSelect,
}: {
  title: string;
  threads: WorkspaceThread[];
  activeThreadId?: string;
  emptyText: string;
  onSelect: (thread: WorkspaceThread) => void;
}) {
  return (
    <section className="workspace-chat-section">
      <span>{title}</span>
      {threads.length === 0 ? <p className="workspace-thread-empty">{emptyText}</p> : null}
      {threads.map((thread) => (
        <button key={thread.id} type="button" className={thread.id === activeThreadId ? "active" : ""} onClick={() => onSelect(thread)}>
          <strong>{thread.type === "room" ? "# " : ""}{thread.name}</strong>
          <small>{thread.description}</small>
        </button>
      ))}
    </section>
  );
}

function WorkspaceStartState({
  workspaceName,
  chatMode,
  newThreadType,
  newThreadName,
  newThreadDescription,
  newThreadParticipantId,
  members,
  onModeChange,
  onThreadTypeChange,
  onThreadNameChange,
  onThreadDescriptionChange,
  onThreadParticipantChange,
  onCreateThread,
  onOpenDetails,
}: {
  workspaceName: string;
  chatMode: WorkspaceThread["type"];
  newThreadType: WorkspaceThread["type"];
  newThreadName: string;
  newThreadDescription: string;
  newThreadParticipantId: string;
  members: WorkspaceMember[];
  onModeChange: (mode: WorkspaceThread["type"]) => void;
  onThreadTypeChange: (type: WorkspaceThread["type"]) => void;
  onThreadNameChange: (name: string) => void;
  onThreadDescriptionChange: (description: string) => void;
  onThreadParticipantChange: (memberId: string) => void;
  onCreateThread: (event?: React.FormEvent<HTMLFormElement>) => void;
  onOpenDetails: () => void;
}) {
  return (
    <section className="workspace-start-state" aria-label="Start workspace">
      <div className="workspace-start-copy">
        <span className="course-block-tag">Empty workspace</span>
        <h1>{workspaceName}</h1>
        <p>Create the first real conversation. Use a group chat for shared context, or a private chat for focused work with one person or agent.</p>
      </div>

      <div className="workspace-start-actions" role="tablist" aria-label="Conversation type">
        <button
          type="button"
          className={chatMode === "room" ? "active" : ""}
          onClick={() => {
            onModeChange("room");
            onThreadTypeChange("room");
          }}
        >
          Group
        </button>
        <button
          type="button"
          className={chatMode === "direct" ? "active" : ""}
          onClick={() => {
            onModeChange("direct");
            onThreadTypeChange("direct");
          }}
        >
          Private
        </button>
      </div>

      <form className="workspace-start-form" onSubmit={onCreateThread}>
        <input
          aria-label="Chat name"
          value={newThreadName}
          onChange={(event) => onThreadNameChange(event.target.value)}
          placeholder={newThreadType === "room" ? "Group name" : "Person or agent"}
        />
        {newThreadType === "direct" ? (
          <select aria-label="Direct participant" value={newThreadParticipantId} onChange={(event) => onThreadParticipantChange(event.target.value)}>
            <option value="">Private to me</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>{member.displayName}</option>
            ))}
          </select>
        ) : null}
        <input
          aria-label="Chat description"
          value={newThreadDescription}
          onChange={(event) => onThreadDescriptionChange(event.target.value)}
          placeholder="Short context, optional"
        />
        <div className="workspace-start-footer">
          <button type="button" onClick={onOpenDetails}>Invite people</button>
          <button type="submit">Create {newThreadType === "room" ? "group" : "private chat"}</button>
        </div>
      </form>
    </section>
  );
}

function MessageArtifact({
  artifact,
  onOpenApp,
  onCreateTask,
}: {
  artifact: WorkspaceMessageArtifact;
  onOpenApp: (artifact: SharedAppArtifact) => void;
  onCreateTask: (artifact: SharedAppArtifact) => void;
}) {
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
        <span className="course-block-tag">{artifact.appId ? `Library app v${artifact.version ?? 1}` : "Shared application"}</span>
        <h2>{artifact.title}</h2>
        <p>{artifact.description}</p>
        <div className="workspace-card-actions">
          <button type="button" onClick={() => onOpenApp(artifact)}>
            {artifact.primaryAction}
          </button>
          {artifact.secondaryAction ? (
            <button type="button" onClick={() => onCreateTask(artifact)}>
              {artifact.secondaryAction}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function AppPreviewDialog({
  preview,
  onClose,
  onSendPrompt,
  onCreateTask,
}: {
  preview: AppPreviewState;
  onClose: () => void;
  onSendPrompt: (prompt: string) => void;
  onCreateTask: (artifact: SharedAppArtifact) => void;
}) {
  const appTitle = preview.app?.displayName ?? preview.artifact.title;
  const description = preview.app?.description ?? preview.artifact.description;
  const template = preview.app?.template ?? preview.template ?? preview.artifact.template;
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    window.setTimeout(() => {
      const firstControl = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      firstControl?.focus();
    }, 0);
    return () => {
      previousFocusRef.current?.focus();
    };
  }, []);

  function handleDialogKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
      (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div className="workspace-preview-layer" role="presentation">
      <button className="workspace-preview-backdrop" type="button" aria-label="Close app preview" onClick={onClose} />
      <section
        ref={dialogRef}
        className="workspace-preview-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-preview-title"
        onKeyDown={handleDialogKeyDown}
      >
        <header className="workspace-preview-header">
          <div>
            <span className="course-block-tag">{preview.app ? `Library app v${preview.app.version}` : "Shared application"}</span>
            <h2 id="workspace-preview-title">{appTitle}</h2>
            <p>{description}</p>
          </div>
          <button type="button" aria-label="Close app preview" onClick={onClose}>Close</button>
        </header>

        <div className="workspace-preview-body">
          {preview.loading ? (
            <div className="workspace-preview-state" role="status">
              <span className="tool-spinner" aria-hidden="true" />
              <strong>Opening app...</strong>
            </div>
          ) : null}

          {preview.error ? (
            <div className="workspace-preview-state" role="alert">
              <strong>{preview.error}</strong>
              <p>The card is still available in chat. You can ask the workspace to recover or replace this app.</p>
              <button type="button" onClick={() => onSendPrompt(`Recover or replace ${preview.artifact.title} for this workspace.`)}>
                Draft recovery prompt
              </button>
            </div>
          ) : null}

          {!preview.loading && !preview.error && template?.type === "html" ? (
            <WorkspaceWidgetRenderer
              title={appTitle}
              description={description}
              html={template.source}
              onSendPrompt={onSendPrompt}
            />
          ) : null}

          {!preview.loading && !preview.error && template?.type === "generator" ? (
            <div className="workspace-preview-state generator">
              <strong>Generator app</strong>
              <p>{template.prompt}</p>
              <button type="button" onClick={() => onSendPrompt(template.prompt)}>
                Use prompt
              </button>
            </div>
          ) : null}
        </div>

        <footer className="workspace-preview-actions">
          <button type="button" onClick={() => onCreateTask(preview.artifact)}>
            Create task
          </button>
          <button type="button" onClick={() => onSendPrompt(`Summarize how ${appTitle} should be used in this workspace.`)}>
            Ask workspace
          </button>
        </footer>
      </section>
    </div>
  );
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat([], { month: "short", day: "numeric" }).format(new Date(timestamp));
}

function agentCount(members: WorkspaceView["members"]) {
  return members.filter((member) => {
    const role = member.role.toLowerCase();
    return role.includes("agent") || role.includes("ai");
  }).length;
}
