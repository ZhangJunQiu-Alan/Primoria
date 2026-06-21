"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceComposer } from "@/components/workspace/workspace-composer";
import {
  agentCount,
  bumpThreadsForMessages,
  getActiveAgentMentionRange,
  isAgentMember,
  latestWorkspaceTimestamp,
  mergeAgentApprovals,
  mergeAgentConnections,
  mergeAgentMemories,
  mergeAgentProfiles,
  mergeAgentRunEvents,
  mergeAgentRuns,
  mergeArtifacts,
  mergeMembers,
  mergeMessages,
  mergeThreads,
  mergeWorkspaceViews,
  readLastReadState,
  removeMessageById,
  writeLastReadState,
} from "@/components/workspace/workspace-client-state";
import type {
  WorkspaceArtifact,
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceMessageArtifact,
  WorkspaceAgentApproval,
  WorkspaceAgentProfile,
  WorkspaceAgentRun,
  WorkspaceAgentRunEvent,
  WorkspaceAgentTemplate,
  WorkspaceAgentCapability,
  WorkspaceAgentCapabilityInput,
  WorkspaceAgentConnection,
  WorkspaceAgentMemory,
  WorkspaceTask,
  WorkspaceThread,
  WorkspaceView,
} from "@/lib/workspaces/types";
import { AGENT_BEHAVIOR_MAX_LENGTH, AGENT_PURPOSE_MAX_LENGTH } from "@/lib/workspaces/agent-profile-guardrails";

type WorkspaceAgentSkillOption = { source: "workspace" | "user"; name: string; slug: string; path: string; description?: string; instructions?: string; version: number };
type WorkspaceAgentSkillVersion = WorkspaceAgentSkillOption & { skillFile?: string };
const MESSAGE_PAGE_SIZE = 50;
const WORKSPACE_SHELL_CACHE_KEY = "primoria:workspace:shell:v1";
const AGENT_SKILL_OPTIONS = [
  { path: "/skills/socratic-questioning", label: "Socratic questions" },
  { path: "/skills/visual-explainer", label: "Visual explanations" },
  { path: "/skills/project-breakdown", label: "Project breakdown" },
  { path: "/skills/quiz-generation", label: "Practice questions" },
  { path: "/skills/misconception-diagnosis", label: "Misconception diagnosis" },
  { path: "/skills/source-grounded-research", label: "Source-grounded research" },
  { path: "/skills/artifact-review", label: "Artifact review" },
] as const;

type CachedThreadActivity = {
  messages: WorkspaceMessage[];
  runs: WorkspaceAgentRun[];
  events: WorkspaceAgentRunEvent[];
  approvals: WorkspaceAgentApproval[];
  hasMore?: boolean;
};

function readCachedWorkspaceShell(qid?: string | null) {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WORKSPACE_SHELL_CACHE_KEY) ?? "null") as { view?: WorkspaceView; savedAt?: number } | null;
    if (!parsed?.view?.persisted || !parsed.view.workspace?.id || !Array.isArray(parsed.view.threads)) return null;
    if (qid && parsed.view.workspace.id !== qid) return null;
    return parsed.view;
  } catch {
    return null;
  }
}

function writeCachedWorkspaceShell(view: WorkspaceView) {
  if (!view.persisted || typeof window === "undefined") return;
  try {
    const shellMessages = [...view.messages]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MESSAGE_PAGE_SIZE)
      .sort((a, b) => a.createdAt - b.createdAt);
    const shell: WorkspaceView = {
      ...view,
      messages: shellMessages,
      tasks: [],
      artifacts: [],
      agentRuns: [],
      agentRunEvents: [],
      agentApprovals: [],
      agentMemories: [],
      agentConnections: [],
    };
    window.localStorage.setItem(WORKSPACE_SHELL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), view: shell }));
  } catch {
    // Best-effort startup cache.
  }
}

function threadActivityCacheKey(workspaceId: string, threadId: string) {
  return `primoria:workspace:${workspaceId}:thread:${threadId}:activity:v1`;
}

function activeThreadCacheKey(workspaceId: string) {
  return `primoria:workspace:${workspaceId}:active-thread:v1`;
}

function readCachedActiveThreadId(workspaceId: string) {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(activeThreadCacheKey(workspaceId)) ?? "";
  } catch {
    return "";
  }
}

function writeCachedActiveThreadId(workspaceId: string, threadId: string) {
  if (typeof window === "undefined" || !threadId) return;
  try {
    window.localStorage.setItem(activeThreadCacheKey(workspaceId), threadId);
  } catch {
    // Best-effort navigation restore.
  }
}

function pickWorkspaceThread(view: WorkspaceView, preferredThreadId?: string) {
  const latestMessage = [...view.messages].sort((a, b) => b.createdAt - a.createdAt)[0];
  if (preferredThreadId) {
    const preferred = view.threads.find((thread) => thread.id === preferredThreadId);
    const preferredHasLoadedMessages = view.messages.some((message) => message.threadId === preferredThreadId);
    if (preferred && (preferredHasLoadedMessages || !latestMessage)) return preferred;
  }
  if (latestMessage) {
    const messageThread = view.threads.find((thread) => thread.id === latestMessage.threadId);
    if (messageThread) return messageThread;
  }
  return [...view.threads].sort((a, b) => b.updatedAt - a.updatedAt)[0];
}

function readCachedThreadActivity(workspaceId: string, threadId: string): CachedThreadActivity | null {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(threadActivityCacheKey(workspaceId, threadId)) ?? "null") as CachedThreadActivity | null;
    if (!parsed || !Array.isArray(parsed.messages) || !Array.isArray(parsed.runs)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedThreadActivity(workspaceId: string, threadId: string, activity: CachedThreadActivity) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(threadActivityCacheKey(workspaceId, threadId), JSON.stringify(activity));
  } catch {
    // Best-effort startup cache.
  }
}

async function readWorkspaceApiError(response: Response, fallback: string) {
  try {
    const data = (await response.clone().json()) as { error?: unknown };
    return typeof data.error === "string" && data.error.trim() ? data.error : fallback;
  } catch {
    return fallback;
  }
}

function agentProfileDisplayKey(profile: WorkspaceAgentProfile) {
  if (!profile.templateKey) return `profile:${profile.id}`;
  return `template:${profile.workspaceId}:${profile.templateKey}:${profile.displayName.trim().toLowerCase()}`;
}

function dedupeVisibleAgentProfiles(profiles: WorkspaceAgentProfile[]) {
  const byKey = new Map<string, WorkspaceAgentProfile>();
  for (const profile of profiles) {
    const key = agentProfileDisplayKey(profile);
    const existing = byKey.get(key);
    if (!existing || profile.createdAt < existing.createdAt) byKey.set(key, profile);
  }
  return Array.from(byKey.values()).sort((a, b) => a.createdAt - b.createdAt);
}

function dedupeVisibleMembers(members: WorkspaceMember[], profiles: WorkspaceAgentProfile[]) {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
  const seenAgentKeys = new Set<string>();
  return members.filter((member) => {
    if (!member.agentProfileId) return true;
    const profile = profilesById.get(member.agentProfileId);
    const key = profile ? agentProfileDisplayKey(profile) : `profile:${member.agentProfileId}`;
    if (seenAgentKeys.has(key)) return false;
    seenAgentKeys.add(key);
    return true;
  });
}

export function WorkspaceClient({ initialView }: { initialView: WorkspaceView }) {
  const [view, setView] = useState(initialView);
  const [workspaceReady, setWorkspaceReady] = useState(initialView.persisted);
  const [activeThreadId, setActiveThreadId] = useState(() => pickWorkspaceThread(initialView, readCachedActiveThreadId(initialView.workspace.id))?.id ?? "");
  const [chatMode, setChatMode] = useState<WorkspaceThread["type"]>(() => pickWorkspaceThread(initialView, readCachedActiveThreadId(initialView.workspace.id))?.type ?? "room");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [prevMentionQuery, setPrevMentionQuery] = useState<string | undefined>(undefined);
  const [prevThreadId, setPrevThreadId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadType, setNewThreadType] = useState<WorkspaceThread["type"]>("room");
  const [newThreadName, setNewThreadName] = useState("");
  const [newThreadDescription, setNewThreadDescription] = useState("");
  const [newThreadParticipantId, setNewThreadParticipantId] = useState("");

  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberPickerQuery, setMemberPickerQuery] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberRole, setMemberRole] = useState("Person");
  const [agentFeedback, setAgentFeedback] = useState("");
  const [agentCreateMode, setAgentCreateMode] = useState<"template" | "existing" | "custom">("template");
  const [agentAddTarget, setAgentAddTarget] = useState<"workspace" | "direct">("workspace");
  const [agentTemplates, setAgentTemplates] = useState<WorkspaceAgentTemplate[]>([]);
  const [selectedAgentTemplateKey, setSelectedAgentTemplateKey] = useState("");
  const [selectedExistingAgentProfileId, setSelectedExistingAgentProfileId] = useState("");
  const [startingAgentDirectProfileId, setStartingAgentDirectProfileId] = useState("");
  const [agentPurpose, setAgentPurpose] = useState("");
  const [agentBehavior, setAgentBehavior] = useState("");
  const [agentVisibility, setAgentVisibility] = useState<WorkspaceAgentProfile["visibility"]>("workspace");
  const [agentMemoryScope, setAgentMemoryScope] = useState<WorkspaceAgentProfile["memoryScope"]>("thread");
  const [agentCanSearchMessages, setAgentCanSearchMessages] = useState(false);
  const [agentCanSummarize, setAgentCanSummarize] = useState(true);
  const [agentCanCreateTasks, setAgentCanCreateTasks] = useState(false);
  const [agentCreateTaskApproval, setAgentCreateTaskApproval] = useState<"on_risk" | "always">("on_risk");
  const [agentCanUpdateTasks, setAgentCanUpdateTasks] = useState(false);
  const [agentCanCreateQuiz, setAgentCanCreateQuiz] = useState(false);
  const [agentCanGenerateCourse, setAgentCanGenerateCourse] = useState(false);
  const [agentCanSaveArtifact, setAgentCanSaveArtifact] = useState(false);
  const [agentCanSaveMemory, setAgentCanSaveMemory] = useState(false);
  const [agentSkillPaths, setAgentSkillPaths] = useState<string[]>(["/skills/socratic-questioning"]);
  const [agentDelegateProfileIds, setAgentDelegateProfileIds] = useState<string[]>([]);
  const [agentConnectionToolKeys, setAgentConnectionToolKeys] = useState<string[]>([]);
  const [workspaceAgentSkills, setWorkspaceAgentSkills] = useState<WorkspaceAgentSkillOption[]>([]);
  const [loadingWorkspaceAgentSkills, setLoadingWorkspaceAgentSkills] = useState(false);
  const [customSkillName, setCustomSkillName] = useState("");
  const [customSkillDescription, setCustomSkillDescription] = useState("");
  const [customSkillInstructions, setCustomSkillInstructions] = useState("");
  const [customSkillSource, setCustomSkillSource] = useState<"workspace" | "user">("workspace");
  const [editingAgentProfileId, setEditingAgentProfileId] = useState("");
  const [agentEditName, setAgentEditName] = useState("");
  const [agentEditPurpose, setAgentEditPurpose] = useState("");
  const [agentEditBehavior, setAgentEditBehavior] = useState("");
  const [agentEditVisibility, setAgentEditVisibility] = useState<WorkspaceAgentProfile["visibility"]>("workspace");
  const [agentEditMemoryScope, setAgentEditMemoryScope] = useState<WorkspaceAgentProfile["memoryScope"]>("thread");
  const [agentEditCanSearchMessages, setAgentEditCanSearchMessages] = useState(false);
  const [agentEditCanSummarize, setAgentEditCanSummarize] = useState(true);
  const [agentEditCanCreateTasks, setAgentEditCanCreateTasks] = useState(false);
  const [agentEditCreateTaskApproval, setAgentEditCreateTaskApproval] = useState<"on_risk" | "always">("on_risk");
  const [agentEditCanUpdateTasks, setAgentEditCanUpdateTasks] = useState(false);
  const [agentEditCanCreateQuiz, setAgentEditCanCreateQuiz] = useState(false);
  const [agentEditCanGenerateCourse, setAgentEditCanGenerateCourse] = useState(false);
  const [agentEditCanSaveArtifact, setAgentEditCanSaveArtifact] = useState(false);
  const [agentEditCanSaveMemory, setAgentEditCanSaveMemory] = useState(false);
  const [agentEditSkillPaths, setAgentEditSkillPaths] = useState<string[]>([]);
  const [agentEditDelegateProfileIds, setAgentEditDelegateProfileIds] = useState<string[]>([]);
  const [agentEditConnectionToolKeys, setAgentEditConnectionToolKeys] = useState<string[]>([]);
  const [connectionName, setConnectionName] = useState("");
  const [connectionScope, setConnectionScope] = useState<WorkspaceAgentConnection["scope"]>("workspace");
  const [connectionTransport, setConnectionTransport] = useState<WorkspaceAgentConnection["transport"]>("http");
  const [connectionRef, setConnectionRef] = useState("");
  const [connectionTools, setConnectionTools] = useState("");
  const [savingConnection, setSavingConnection] = useState(false);
  const [updatingConnectionIds, setUpdatingConnectionIds] = useState<Record<string, boolean>>({});
  const [customEditSkillName, setCustomEditSkillName] = useState("");
  const [customEditSkillDescription, setCustomEditSkillDescription] = useState("");
  const [customEditSkillInstructions, setCustomEditSkillInstructions] = useState("");
  const [customEditSkillSource, setCustomEditSkillSource] = useState<"workspace" | "user">("workspace");
  const [editingSkillPath, setEditingSkillPath] = useState("");
  const [skillEditName, setSkillEditName] = useState("");
  const [skillEditDescription, setSkillEditDescription] = useState("");
  const [skillEditInstructions, setSkillEditInstructions] = useState("");
  const [updatingSkillPath, setUpdatingSkillPath] = useState("");
  const [deletingSkillPath, setDeletingSkillPath] = useState("");
  const [skillHistoryPath, setSkillHistoryPath] = useState("");
  const [skillVersionsByPath, setSkillVersionsByPath] = useState<Record<string, WorkspaceAgentSkillVersion[]>>({});
  const [loadingSkillHistoryPath, setLoadingSkillHistoryPath] = useState("");
  const [restoringSkillVersionKey, setRestoringSkillVersionKey] = useState("");
  const [loadingAgentTemplates, setLoadingAgentTemplates] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskScope, setTaskScope] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueAt, setTaskDueAt] = useState("");
  const [taskResultDrafts, setTaskResultDrafts] = useState<Record<string, string>>({});
  const [decidingApprovalIds, setDecidingApprovalIds] = useState<Record<string, boolean>>({});
  const [cancellingRunIds, setCancellingRunIds] = useState<Record<string, boolean>>({});
  const [retryingRunIds, setRetryingRunIds] = useState<Record<string, boolean>>({});
  const [archivingMemoryIds, setArchivingMemoryIds] = useState<Record<string, boolean>>({});
  const [expandedAgentRunIds, setExpandedAgentRunIds] = useState<Record<string, boolean>>({});
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [exhaustedThreadIds, setExhaustedThreadIds] = useState<Record<string, boolean>>({});
  const [loadedThreadActivityIds, setLoadedThreadActivityIds] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialView.messages.map((message) => [message.threadId, true])),
  );
  const [lastReadByWorkspace, setLastReadByWorkspace] = useState<Record<string, Record<string, number>>>(() => ({
    [initialView.workspace.id]: readLastReadState(initialView.workspace.id),
  }));

  const visibleThreads = view.threads.filter((thread) => thread.type === chatMode);
  const activeThread = visibleThreads.find((thread) => thread.id === activeThreadId) ?? visibleThreads[0];
  const messages = useMemo(
    () => view.messages.filter((message) => message.threadId === activeThread?.id),
    [activeThread?.id, view.messages],
  );
  const activeThreadActivityLoading = Boolean(
    activeThread &&
      !loadedThreadActivityIds[activeThread.id] &&
      messages.length === 0,
  );
  const agentRunsByOutputMessageId = useMemo(() => {
    const runsByMessage = new Map<string, WorkspaceAgentRun>();
    for (const run of view.agentRuns) {
      if (run.threadId !== activeThread?.id || !run.outputMessageId) continue;
      runsByMessage.set(run.outputMessageId, run);
    }
    return runsByMessage;
  }, [activeThread?.id, view.agentRuns]);
  const agentRunEventsByRunId = useMemo(() => {
    const eventsByRun = new Map<string, WorkspaceAgentRunEvent[]>();
    for (const event of view.agentRunEvents) {
      const events = eventsByRun.get(event.runId) ?? [];
      events.push(event);
      eventsByRun.set(event.runId, events);
    }
    return eventsByRun;
  }, [view.agentRunEvents]);
  const agentApprovalsByRunId = useMemo(() => {
    const approvalsByRun = new Map<string, WorkspaceAgentApproval[]>();
    for (const approval of view.agentApprovals) {
      const approvals = approvalsByRun.get(approval.runId) ?? [];
      approvals.push(approval);
      approvalsByRun.set(approval.runId, approvals);
    }
    return approvalsByRun;
  }, [view.agentApprovals]);
  const artifactsBySourceMessageId = useMemo(() => {
    const artifactsByMessage = new Map<string, WorkspaceArtifact>();
    for (const artifact of view.artifacts) {
      artifactsByMessage.set(artifact.sourceMessageId, artifact);
    }
    return artifactsByMessage;
  }, [view.artifacts]);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const activeThreadIdRef = useRef(activeThread?.id ?? "");
  const workspaceIdRef = useRef(view.workspace.id);
  const loadingThreadActivityIdsRef = useRef<Set<string>>(new Set());
  const tasks = activeThread ? view.tasks.filter((task) => task.threadId === activeThread.id) : view.tasks;
  const activeTaskCount = tasks.filter((task) => task.status !== "done").length;

  const chatCount = view.threads.length;
  const roomCount = view.threads.filter((thread) => thread.type === "room").length;
  const directCount = view.threads.filter((thread) => thread.type === "direct").length;
  const visibleAgentProfiles = useMemo(() => dedupeVisibleAgentProfiles(view.agentProfiles), [view.agentProfiles]);
  const visibleMembers = useMemo(() => dedupeVisibleMembers(view.members, view.agentProfiles), [view.members, view.agentProfiles]);
  const agentMembers = visibleMembers.filter(isAgentMember);
  const mentionRange = getActiveAgentMentionRange(draft, selectionStart ?? draft.length);
  if (mentionRange?.query !== prevMentionQuery || activeThread?.id !== prevThreadId) {
    setPrevMentionQuery(mentionRange?.query);
    setPrevThreadId(activeThread?.id);
    setMentionIndex(0);
  }
  const mentionCandidates = mentionRange
    ? agentMembers
        .filter((member) => agentPickerMatchesQuery(mentionRange.query, [member.displayName, member.role, member.status ?? ""]))
        .slice(0, 6)
    : [];
  const mentionPickerOpen = Boolean(activeThread && mentionRange && mentionCandidates.length);
  const peopleMembers = visibleMembers.filter((member) => !isAgentMember(member) && member.status !== "owner");
  const savedAgentProfiles = visibleAgentProfiles.filter((profile) => !visibleMembers.some((member) => member.agentProfileId === profile.id));
  const filteredPeopleMembers = peopleMembers.filter((member) =>
    agentPickerMatchesQuery(memberPickerQuery, [member.displayName, member.role, member.status ?? ""]),
  );
  const filteredAgentTemplates = agentTemplates.filter((template) =>
    agentPickerMatchesQuery(memberPickerQuery, agentPickerSearchValues(template)),
  );
  const filteredSavedAgentProfiles = savedAgentProfiles.filter((profile) =>
    agentPickerMatchesQuery(memberPickerQuery, agentPickerSearchValues(profile)),
  );
  const lastReadByThread = useMemo(
    () => lastReadByWorkspace[view.workspace.id] ?? readLastReadState(view.workspace.id),
    [lastReadByWorkspace, view.workspace.id],
  );
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const message of view.messages) {
      if (message.threadId === activeThread?.id) continue;
      if (message.createdAt > (lastReadByThread[message.threadId] ?? 0)) {
        counts[message.threadId] = (counts[message.threadId] ?? 0) + 1;
      }
    }
    return counts;
  }, [activeThread?.id, lastReadByThread, view.messages]);

  const markThreadRead = useCallback(
    (workspaceId: string, threadId: string | undefined, sourceMessages: WorkspaceMessage[], fallbackToNow = true) => {
      if (!threadId) return;
      const threadMessages = sourceMessages.filter((message) => message.threadId === threadId);
      if (!threadMessages.length && !fallbackToNow) return;
      const latestRead = Math.max(Date.now(), ...threadMessages.map((message) => message.createdAt));
      setLastReadByWorkspace((current) => {
        const workspaceReads = current[workspaceId] ?? readLastReadState(workspaceId);
        if ((workspaceReads[threadId] ?? 0) >= latestRead) return current;
        const nextWorkspaceReads = { ...workspaceReads, [threadId]: latestRead };
        writeLastReadState(workspaceId, nextWorkspaceReads);
        return { ...current, [workspaceId]: nextWorkspaceReads };
      });
    },
    [],
  );

  const applyWorkspaceView = useCallback((data: WorkspaceView) => {
    if (data.workspace.id !== workspaceIdRef.current) return;
    markThreadRead(data.workspace.id, activeThreadIdRef.current, data.messages, false);
    setView((current) => mergeWorkspaceViews(current, data));
    writeCachedWorkspaceShell(data);
    setActiveThreadId((current) => {
      if (data.threads.some((thread) => thread.id === current)) return current;
      const nextThread = pickWorkspaceThread(data);
      if (nextThread) setChatMode(nextThread.type);
      return nextThread?.id ?? "";
    });
  }, [markThreadRead]);

  useEffect(() => {
    activeThreadIdRef.current = activeThread?.id ?? "";
    if (workspaceReady && view.persisted && activeThread) writeCachedActiveThreadId(view.workspace.id, activeThread.id);
  }, [activeThread, view.persisted, view.workspace.id, workspaceReady]);



  useEffect(() => {
    workspaceIdRef.current = view.workspace.id;
  }, [view.workspace.id]);

  useEffect(() => {
    if (initialView.persisted) return;
    const controller = new AbortController();
    async function loadInitialWorkspace() {
      const qid = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("workspaceId") : null;
      const cached = readCachedWorkspaceShell(qid);
      if (cached) {
        const cachedThread = pickWorkspaceThread(cached, readCachedActiveThreadId(cached.workspace.id));
        setView(cached);
        workspaceIdRef.current = cached.workspace.id;
        setActiveThreadId(cachedThread?.id ?? "");
        setChatMode(cachedThread?.type ?? "room");
        setLoadedThreadActivityIds(Object.fromEntries(cached.messages.map((message) => [message.threadId, true])));
        setWorkspaceReady(true);
      }
      try {
        const url = qid ? `/api/workspaces/${qid}?view=shell` : "/api/workspaces?view=shell";
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Workspace could not be loaded.");
        const data = (await response.json()) as WorkspaceView;
        if (controller.signal.aborted) return;
        const nextThread = pickWorkspaceThread(data, readCachedActiveThreadId(data.workspace.id));
        setView(data);
        workspaceIdRef.current = data.workspace.id;
        setActiveThreadId(nextThread?.id ?? "");
        setChatMode(nextThread?.type ?? "room");
        setLoadedThreadActivityIds(Object.fromEntries(data.messages.map((message) => [message.threadId, true])));
        writeCachedWorkspaceShell(data);
      } catch {
        if (!controller.signal.aborted) setError("Workspace could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setWorkspaceReady(true);
      }
    }
    void loadInitialWorkspace();
    return () => controller.abort();
  }, [initialView.persisted]);

  useEffect(() => {
    if (!workspaceReady) return;
    let cancelled = false;
    let source: EventSource | undefined;
    let reconnectTimeout: number | undefined;
    let fallbackPollingInterval: number | undefined;

    function clearReconnectTimer() {
      if (reconnectTimeout !== undefined) {
        window.clearTimeout(reconnectTimeout);
        reconnectTimeout = undefined;
      }
    }

    function stopFallbackPolling() {
      if (fallbackPollingInterval !== undefined) {
        window.clearInterval(fallbackPollingInterval);
        fallbackPollingInterval = undefined;
      }
    }

    function startFallbackPolling() {
      if (cancelled || fallbackPollingInterval !== undefined) return;
      void refreshWorkspace();
      fallbackPollingInterval = window.setInterval(() => {
        void refreshWorkspace();
      }, 10000);
    }

    function closeStream() {
      source?.close();
      source = undefined;
    }

    function scheduleStreamReconnect() {
      if (cancelled || typeof EventSource === "undefined" || reconnectTimeout !== undefined) return;
      reconnectTimeout = window.setTimeout(() => {
        reconnectTimeout = undefined;
        openStream();
      }, 5000);
    }

    function openStream() {
      if (cancelled || typeof EventSource === "undefined" || source) return;
      clearReconnectTimer();
      const nextSource = new EventSource(`/api/workspaces/${view.workspace.id}/events`);
      source = nextSource;
      nextSource.addEventListener("workspace", (event) => {
        if (cancelled) return;
        clearReconnectTimer();
        stopFallbackPolling();
        applyWorkspaceView(JSON.parse((event as MessageEvent<string>).data) as WorkspaceView);
      });
      nextSource.addEventListener("error", (event) => {
        const message = (event as MessageEvent<string>).data;
        if (message) setError("Workspace updates stopped. Refresh the page or try again.");
      });
      nextSource.onerror = () => {
        if (source === nextSource) source = undefined;
        nextSource.close();
        startFallbackPolling();
        scheduleStreamReconnect();
      };
    }

    if (typeof EventSource !== "undefined") {
      openStream();
      return () => {
        cancelled = true;
        closeStream();
        clearReconnectTimer();
        stopFallbackPolling();
      };
    }

    async function refreshWorkspace() {
      try {
        const response = await fetch(`/api/workspaces/${view.workspace.id}?view=shell`, { cache: "no-store" });
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
    startFallbackPolling();
    return () => {
      cancelled = true;
      clearReconnectTimer();
      stopFallbackPolling();
    };
  }, [applyWorkspaceView, view.workspace.id, workspaceReady]);

  useEffect(() => {
    if (!workspaceReady || !activeThread || loadedThreadActivityIds[activeThread.id]) return;
    if (loadingThreadActivityIdsRef.current.has(activeThread.id)) return;
    const controller = new AbortController();
    async function loadThreadActivity(threadId: string) {
      loadingThreadActivityIdsRef.current.add(threadId);
      const cached = readCachedThreadActivity(view.workspace.id, threadId);
      if (cached) {
        setView((current) => ({
          ...current,
          messages: mergeMessages(current.messages, cached.messages),
          agentRuns: mergeAgentRuns(current.agentRuns, cached.runs),
          agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, cached.events),
          agentApprovals: mergeAgentApprovals(current.agentApprovals, cached.approvals),
        }));
      }
      try {
        const params = new URLSearchParams({ threadId, messageLimit: String(MESSAGE_PAGE_SIZE), runLimit: "20" });
        const response = await fetch(`/api/workspaces/${view.workspace.id}/thread-activity?${params.toString()}`, { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error("Thread activity could not be loaded.");
        const activity = (await response.json()) as {
          messages?: WorkspaceMessage[];
          hasMore?: boolean;
          runs?: WorkspaceAgentRun[];
          events?: WorkspaceAgentRunEvent[];
          approvals?: WorkspaceAgentApproval[];
        };
        setView((current) => ({
          ...current,
          messages: mergeMessages(current.messages, activity.messages ?? []),
          agentRuns: mergeAgentRuns(current.agentRuns, activity.runs ?? []),
          agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, activity.events ?? []),
          agentApprovals: mergeAgentApprovals(current.agentApprovals, activity.approvals ?? []),
        }));
        writeCachedThreadActivity(view.workspace.id, threadId, {
          messages: activity.messages ?? [],
          runs: activity.runs ?? [],
          events: activity.events ?? [],
          approvals: activity.approvals ?? [],
          hasMore: activity.hasMore,
        });
        setLoadedThreadActivityIds((current) => ({ ...current, [threadId]: true }));
        if (!activity.hasMore) setExhaustedThreadIds((current) => ({ ...current, [threadId]: true }));
      } catch {
        if (!controller.signal.aborted) setError("Thread activity is temporarily unavailable.");
      } finally {
        loadingThreadActivityIdsRef.current.delete(threadId);
      }
    }
    void loadThreadActivity(activeThread.id);
    return () => controller.abort();
  }, [activeThread, loadedThreadActivityIds, view.workspace.id, workspaceReady]);



  useEffect(() => {
    if (!workspaceReady) return;
    const controller = new AbortController();
    let timeout: number | undefined;
    async function loadWorkspaceCatalog() {
      try {
        const agentsResponse = await fetch(`/api/workspaces/${view.workspace.id}/agents`, { cache: "no-store", signal: controller.signal });
        if (controller.signal.aborted) return;
        if (agentsResponse.ok) {
          const data = (await agentsResponse.json()) as { templates?: WorkspaceAgentTemplate[]; agentProfiles?: WorkspaceAgentProfile[]; agentMembers?: WorkspaceMember[] };
          setAgentTemplates(Array.isArray(data.templates) ? data.templates : []);
          setSelectedAgentTemplateKey((current) => current || data.templates?.[0]?.key || "");
          setView((current) => ({
            ...current,
            agentProfiles: mergeAgentProfiles(current.agentProfiles, data.agentProfiles ?? []),
            members: mergeMembers(current.members, data.agentMembers ?? []),
          }));
        }
      } catch {
        // The shell is usable without the side-panel catalog; explicit actions still retry their own APIs.
      }
    }
    timeout = window.setTimeout(() => void loadWorkspaceCatalog(), 800);
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
      controller.abort();
    };
  }, [view.workspace.id, workspaceReady]);

  useEffect(() => {
    if (!memberPickerOpen || memberRole !== "Agent" || agentTemplates.length > 0) return;
    const controller = new AbortController();
    async function loadAgentTemplates() {
      setLoadingAgentTemplates(true);
      try {
        const response = await fetch(`/api/workspaces/${view.workspace.id}/agents`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        const data = (await response.json()) as { templates?: WorkspaceAgentTemplate[]; agentProfiles?: WorkspaceAgentProfile[]; agentMembers?: WorkspaceMember[] };
        const templates = Array.isArray(data.templates) ? data.templates : [];
        setAgentTemplates(templates);
        setView((current) => ({
          ...current,
          agentProfiles: mergeAgentProfiles(current.agentProfiles, data.agentProfiles ?? []),
          members: mergeMembers(current.members, data.agentMembers ?? []),
        }));
        setSelectedAgentTemplateKey((current) => current || templates[0]?.key || "");
      } catch {
        if (!controller.signal.aborted) setAgentTemplates([]);
      } finally {
        if (!controller.signal.aborted) setLoadingAgentTemplates(false);
      }
    }
    void loadAgentTemplates();
    return () => {
      controller.abort();
    };
  }, [agentTemplates.length, memberPickerOpen, memberRole, view.workspace.id]);

  const loadWorkspaceAgentSkills = useCallback(async (signal?: AbortSignal) => {
    Promise.resolve().then(() => {
      if (!signal?.aborted) setLoadingWorkspaceAgentSkills(true);
    });
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-skills`, { cache: "no-store", signal });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent skills could not be loaded."));
      const data = (await response.json()) as { skills?: WorkspaceAgentSkillOption[] };
      setWorkspaceAgentSkills(Array.isArray(data.skills) ? data.skills : []);
    } catch (skillError) {
      if (!signal?.aborted) setError(skillError instanceof Error ? skillError.message : "Agent skills could not be loaded.");
    } finally {
      if (!signal?.aborted) setLoadingWorkspaceAgentSkills(false);
    }
  }, [view.workspace.id]);

  useEffect(() => {
    if (!memberPickerOpen || memberRole !== "Agent") return;
    const controller = new AbortController();
    Promise.resolve().then(() => {
      if (!controller.signal.aborted) {
        void loadWorkspaceAgentSkills(controller.signal);
      }
    });
    return () => controller.abort();
  }, [memberPickerOpen, memberRole, loadWorkspaceAgentSkills]);

  function selectThread(thread: WorkspaceThread) {
    markThreadRead(view.workspace.id, activeThread?.id, view.messages);
    markThreadRead(view.workspace.id, thread.id, view.messages);
    setActiveThreadId(thread.id);
    setChatMode(thread.type);
    setError(null);
  }

  function switchMode(nextMode: WorkspaceThread["type"]) {
    markThreadRead(view.workspace.id, activeThread?.id, view.messages);
    setChatMode(nextMode);
    setNewThreadType(nextMode);
    const nextThread = view.threads.find((thread) => thread.type === nextMode);
    if (nextThread) {
      markThreadRead(view.workspace.id, nextThread.id, view.messages);
      setActiveThreadId(nextThread.id);
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
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Chat could not be created."));
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



  async function createWorkspaceAgentSkill(mode: "create" | "edit") {
    const name = (mode === "create" ? customSkillName : customEditSkillName).trim();
    const description = (mode === "create" ? customSkillDescription : customEditSkillDescription).trim();
    const instructions = (mode === "create" ? customSkillInstructions : customEditSkillInstructions).trim();
    const source = mode === "create" ? customSkillSource : customEditSkillSource;
    if (!name || !description || !instructions) {
      setError("Name, description, and instructions are required for a custom skill.");
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-skills`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source, name, description, instructions }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Custom skill could not be created."));
      const data = (await response.json()) as { skill: WorkspaceAgentSkillOption };
      setWorkspaceAgentSkills((current) => [data.skill, ...current.filter((skill) => skill.path !== data.skill.path)]);
      if (mode === "create") {
        setAgentSkillPaths((current) => (current.includes(data.skill.path) ? current : [...current, data.skill.path]));
        setCustomSkillName("");
        setCustomSkillDescription("");
        setCustomSkillInstructions("");
        setCustomSkillSource("workspace");
      } else {
        setAgentEditSkillPaths((current) => (current.includes(data.skill.path) ? current : [...current, data.skill.path]));
        setCustomEditSkillName("");
        setCustomEditSkillDescription("");
        setCustomEditSkillInstructions("");
        setCustomEditSkillSource("workspace");
      }
    } catch (skillError) {
      setError(skillError instanceof Error ? skillError.message : "Custom skill could not be created.");
    }
  }

  async function createWorkspaceAgentConnection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = connectionName.trim();
    const configRef = connectionRef.trim();
    const allowedToolNames = connectionTools
      .split(/[\n,]+/)
      .map((toolName) => toolName.trim())
      .filter(Boolean);
    if (!displayName || !configRef || !allowedToolNames.length) {
      setError("Connection name, reference, and allowed tools are required.");
      return;
    }
    setSavingConnection(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-connections`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scope: connectionScope,
          displayName,
          transport: connectionTransport,
          configRef,
          allowedToolNames,
        }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Connection could not be saved."));
      const data = (await response.json()) as { connection: WorkspaceAgentConnection };
      setView((current) => ({
        ...current,
        agentConnections: mergeAgentConnections(current.agentConnections, [data.connection]),
        workspace: { ...current.workspace, updatedAt: data.connection.updatedAt },
      }));
      setConnectionName("");
      setConnectionRef("");
      setConnectionTools("");
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Connection could not be saved.");
    } finally {
      setSavingConnection(false);
    }
  }

  async function updateWorkspaceAgentConnectionStatus(connection: WorkspaceAgentConnection) {
    if (updatingConnectionIds[connection.id]) return;
    setUpdatingConnectionIds((current) => ({ ...current, [connection.id]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-connections`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          connectionId: connection.id,
          status: connection.status === "disabled" ? "available" : "disabled",
        }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Connection status could not be updated."));
      const data = (await response.json()) as { connection: WorkspaceAgentConnection };
      setView((current) => ({
        ...current,
        agentConnections: mergeAgentConnections(current.agentConnections, [data.connection]),
        workspace: { ...current.workspace, updatedAt: data.connection.updatedAt },
      }));
    } catch (connectionError) {
      setError(connectionError instanceof Error ? connectionError.message : "Connection status could not be updated.");
    } finally {
      setUpdatingConnectionIds((current) => {
        const next = { ...current };
        delete next[connection.id];
        return next;
      });
    }
  }

  function startWorkspaceAgentSkillEdit(skill: WorkspaceAgentSkillOption) {
    setEditingSkillPath(skill.path);
    setSkillEditName(skill.name);
    setSkillEditDescription(skill.description ?? "");
    setSkillEditInstructions(skill.instructions ?? "");
    setError(null);
  }

  async function loadWorkspaceAgentSkillVersions(skill: WorkspaceAgentSkillOption) {
    const nextOpen = skillHistoryPath === skill.path ? "" : skill.path;
    setSkillHistoryPath(nextOpen);
    if (!nextOpen || skillVersionsByPath[skill.path]) return;
    setLoadingSkillHistoryPath(skill.path);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-skills?path=${encodeURIComponent(skill.path)}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Skill history could not be loaded."));
      const data = (await response.json()) as { versions?: WorkspaceAgentSkillVersion[] };
      setSkillVersionsByPath((current) => ({ ...current, [skill.path]: Array.isArray(data.versions) ? data.versions : [] }));
    } catch (skillError) {
      setError(skillError instanceof Error ? skillError.message : "Skill history could not be loaded.");
    } finally {
      setLoadingSkillHistoryPath("");
    }
  }

  async function restoreWorkspaceAgentSkillVersion(skillPath: string, version: number) {
    const restoreKey = `${skillPath}:${version}`;
    if (restoringSkillVersionKey) return;
    setRestoringSkillVersionKey(restoreKey);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-skills`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: skillPath, restoreVersion: version }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Skill version could not be restored."));
      const data = (await response.json()) as { skill: WorkspaceAgentSkillOption };
      setWorkspaceAgentSkills((current) => current.map((skill) => (skill.path === data.skill.path ? data.skill : skill)));
      setSkillVersionsByPath((current) => {
        const next = { ...current };
        delete next[skillPath];
        return next;
      });
      setSkillHistoryPath("");
      startWorkspaceAgentSkillEdit(data.skill);
    } catch (skillError) {
      setError(skillError instanceof Error ? skillError.message : "Skill version could not be restored.");
    } finally {
      setRestoringSkillVersionKey("");
    }
  }

  async function updateWorkspaceAgentSkill() {
    const name = skillEditName.trim();
    const description = skillEditDescription.trim();
    const instructions = skillEditInstructions.trim();
    if (!editingSkillPath || !name || !description || !instructions) {
      setError("Name, description, and instructions are required to update a custom skill.");
      return;
    }
    setUpdatingSkillPath(editingSkillPath);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-skills`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: editingSkillPath, name, description, instructions }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Custom skill could not be updated."));
      const data = (await response.json()) as { skill: WorkspaceAgentSkillOption };
      setWorkspaceAgentSkills((current) => current.map((skill) => (skill.path === data.skill.path ? data.skill : skill)));
      setSkillVersionsByPath((current) => {
        const next = { ...current };
        delete next[data.skill.path];
        return next;
      });
      setEditingSkillPath("");
      setSkillEditName("");
      setSkillEditDescription("");
      setSkillEditInstructions("");
    } catch (skillError) {
      setError(skillError instanceof Error ? skillError.message : "Custom skill could not be updated.");
    } finally {
      setUpdatingSkillPath("");
    }
  }

  async function deleteWorkspaceAgentSkill(skill: WorkspaceAgentSkillOption) {
    if (deletingSkillPath) return;
    setDeletingSkillPath(skill.path);
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-skills`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: skill.path }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Custom skill could not be deleted."));
      setWorkspaceAgentSkills((current) => current.filter((entry) => entry.path !== skill.path));
      setAgentSkillPaths((current) => current.filter((path) => path !== skill.path));
      setAgentEditSkillPaths((current) => current.filter((path) => path !== skill.path));
      setSkillVersionsByPath((current) => {
        const next = { ...current };
        delete next[skill.path];
        return next;
      });
      if (skillHistoryPath === skill.path) setSkillHistoryPath("");
      if (editingSkillPath === skill.path) {
        setEditingSkillPath("");
        setSkillEditName("");
        setSkillEditDescription("");
        setSkillEditInstructions("");
      }
    } catch (skillError) {
      setError(skillError instanceof Error ? skillError.message : "Custom skill could not be deleted.");
    } finally {
      setDeletingSkillPath("");
    }
  }

  async function ensureAgentWorkspaceMember(profile: WorkspaceAgentProfile, existingMember?: WorkspaceMember) {
    if (existingMember) return existingMember;
    const response = await fetch(`/api/workspaces/${view.workspace.id}/agents`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profileId: profile.id }),
    });
    const data = (await response.json().catch(() => ({}))) as { member?: WorkspaceMember; profile?: WorkspaceAgentProfile; error?: string };
    if (!response.ok || !data.member) throw new Error(data.error || "Agent could not be added.");
    setView((current) => ({
      ...current,
      members: mergeMembers(current.members, [data.member!]),
      agentProfiles: mergeAgentProfiles(current.agentProfiles, data.profile ? [data.profile] : [profile]),
      workspace: { ...current.workspace, updatedAt: Date.now() },
    }));
    return data.member;
  }

  async function createAgentDirectThread(member: WorkspaceMember, profile: WorkspaceAgentProfile) {
    const response = await fetch(`/api/workspaces/${view.workspace.id}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "direct",
        name: profile.displayName,
        participantIds: [member.id],
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { thread?: WorkspaceThread; error?: string };
    if (!response.ok || !data.thread) throw new Error(data.error || "Private chat could not be created.");
    setView((current) => ({
      ...current,
      threads: mergeThreads(current.threads, [data.thread!]),
      members: mergeMembers(current.members, [member]),
      agentProfiles: mergeAgentProfiles(current.agentProfiles, [profile]),
      workspace: { ...current.workspace, updatedAt: Date.now() },
    }));
    setChatMode("direct");
    setActiveThreadId(data.thread.id);
    return data.thread;
  }

  function resetMemberPicker() {
    setMemberPickerOpen(false);
    setMemberPickerQuery("");
    setMemberName("");
    setSelectedExistingAgentProfileId("");
    setSelectedAgentTemplateKey("");
  }

  function openMemberPicker(role?: "Person" | "Agent") {
    resetMemberPicker();
    if (role) setMemberRole(role);
    setMemberPickerOpen(true);
  }

  async function startDirectChatWithPerson(member: WorkspaceMember) {
    setError(null);
    setAgentFeedback("");
    const existingThread = view.threads.find((thread) => thread.type === "direct" && thread.participantIds?.includes(member.id));
    if (existingThread) {
      setChatMode("direct");
      setActiveThreadId(existingThread.id);
      resetMemberPicker();
      return existingThread;
    }
    const response = await fetch(`/api/workspaces/${view.workspace.id}/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "direct",
        name: member.displayName,
        participantIds: [member.id],
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { thread?: WorkspaceThread; error?: string };
    if (!response.ok || !data.thread) throw new Error(data.error || "Private chat could not be created.");
    setView((current) => ({
      ...current,
      threads: mergeThreads(current.threads, [data.thread!]),
      workspace: { ...current.workspace, updatedAt: Date.now() },
    }));
    setChatMode("direct");
    setActiveThreadId(data.thread.id);
    resetMemberPicker();
    return data.thread;
  }

  async function ensureAgentInActiveRoom(profile: WorkspaceAgentProfile) {
    if (activeThread?.type !== "room") return undefined;
    if (!activeThread.allowedAgentProfileIds) return undefined;
    if (activeThread.allowedAgentProfileIds.includes(profile.id)) return activeThread;
    const nextAllowedAgentProfileIds = [...activeThread.allowedAgentProfileIds, profile.id];
    const response = await fetch(`/api/workspaces/${view.workspace.id}/threads`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        threadId: activeThread.id,
        allowedAgentProfileIds: nextAllowedAgentProfileIds,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { thread?: WorkspaceThread; error?: string };
    if (!response.ok || !data.thread) throw new Error(data.error || "Agent could not be added to this room.");
    return data.thread;
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setAgentFeedback("");
    try {
      if (memberRole === "Agent") {
        if (agentCreateMode === "template" && !selectedAgentTemplateKey) {
          setError("Choose an agent first.");
          return;
        }
        if (agentCreateMode === "existing" && !selectedExistingAgentProfileId) {
          setError("Choose a saved agent first.");
          return;
        }
        if (agentCreateMode === "custom" && !memberName.trim()) {
          setError("Name your agent first.");
          return;
        }
        if (agentCreateMode === "custom" && !agentPurpose.trim()) {
          setError("Describe this agent's purpose first.");
          return;
        }
        if (agentCreateMode === "custom" && !agentBehavior.trim()) {
          setError("Describe how this agent should behave first.");
          return;
        }
        const customCapabilities = buildAgentCapabilityInputs({
          name: memberName.trim() || "custom-agent",
          canSearchMessages: agentCanSearchMessages,
          canSummarize: agentCanSummarize,
          canCreateTasks: agentCanCreateTasks,
          createTaskApproval: agentCreateTaskApproval,
          canUpdateTasks: agentCanUpdateTasks,
          canCreateQuiz: agentCanCreateQuiz,
          canGenerateCourse: agentCanGenerateCourse,
          canSaveArtifact: agentCanSaveArtifact,
          canSaveMemory: agentCanSaveMemory,
          selectedSkillPaths: agentSkillPaths,
          selectedDelegateProfileIds: agentDelegateProfileIds,
          selectedConnectionToolKeys: filterAvailableAgentConnectionToolKeys(agentConnectionToolKeys, view.agentConnections),
        });
        if (agentCreateMode === "custom" && !hasEnabledAgentCapabilities(customCapabilities)) {
          setError("Choose at least one way this agent can help.");
          return;
        }
        const response = await fetch(`/api/workspaces/${view.workspace.id}/agents`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            agentCreateMode === "existing"
              ? {
                  profileId: selectedExistingAgentProfileId,
                }
              : agentCreateMode === "template"
              ? {
                  templateKey: selectedAgentTemplateKey,
                  displayName: memberName.trim() || undefined,
                }
              : {
                  displayName: memberName.trim(),
                  description: agentPurpose.trim(),
                  systemPrompt: agentBehavior.trim(),
                  memoryScope: agentMemoryScope,
                  visibility: agentVisibility,
                  capabilities: customCapabilities,
                },
          ),
        });
        if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent could not be added."));
        const data = (await response.json()) as { member?: WorkspaceMember; profile: WorkspaceAgentProfile };
        let agentMember = data.member;
        let directThread: WorkspaceThread | undefined;
        let activeRoomThread: WorkspaceThread | undefined;
        if (agentAddTarget === "direct") {
          agentMember = await ensureAgentWorkspaceMember(data.profile, data.member);
          directThread = await createAgentDirectThread(agentMember, data.profile);
        } else if (agentAddTarget === "workspace" && agentMember) {
          activeRoomThread = await ensureAgentInActiveRoom(data.profile);
        }
        setView((current) => ({
          ...current,
          members: mergeMembers(current.members, agentMember ? [agentMember] : []),
          agentProfiles: mergeAgentProfiles(current.agentProfiles, [data.profile]),
          threads: mergeThreads(current.threads, [directThread, activeRoomThread].filter((thread): thread is WorkspaceThread => Boolean(thread))),
          workspace: { ...current.workspace, updatedAt: Date.now() },
        }));
        setAgentFeedback(
          directThread
            ? `Private chat with ${data.profile.displayName} started.`
            : activeRoomThread
            ? `${data.profile.displayName} added to this room.`
            : data.member
            ? `${data.profile.displayName} added to this workspace.`
            : "Agent saved to My agents. Add it to a workspace when you are ready.",
        );
        setAgentPurpose("");
        setAgentBehavior("");
        setAgentVisibility("workspace");
        setAgentMemoryScope("thread");
        setAgentCanSearchMessages(false);
        setAgentCanSummarize(true);
        setAgentCanCreateTasks(false);
        setAgentCreateTaskApproval("on_risk");
        setAgentCanUpdateTasks(false);

        setAgentCanCreateQuiz(false);
        setAgentCanGenerateCourse(false);
        setAgentCanSaveArtifact(false);
        setAgentCanSaveMemory(false);
        setAgentSkillPaths(["/skills/socratic-questioning"]);
        setAgentDelegateProfileIds([]);
        setAgentConnectionToolKeys([]);
        setCustomSkillName("");
        setCustomSkillDescription("");
        setCustomSkillInstructions("");
        setCustomSkillSource("workspace");
        setAgentCreateMode("template");
        setAgentAddTarget("workspace");
        if (agentMember) resetMemberPicker();
        return;
      }

      const displayName = memberName.trim();
      if (!displayName) return;
      const response = await fetch(`/api/workspaces/${view.workspace.id}/members`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName,
          role: memberRole || "Person",
          status: memberRole === "Agent" ? "active" : "invited",
        }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Member could not be added."));
      const data = (await response.json()) as { member: WorkspaceMember };
      setView((current) => ({
        ...current,
        members: mergeMembers(current.members, [data.member]),
        workspace: { ...current.workspace, updatedAt: Date.now() },
      }));
      setAgentFeedback("");
      resetMemberPicker();
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
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Task could not be created."));
      const data = (await response.json()) as {
        task: WorkspaceTask;
        agentMessages?: WorkspaceMessage[];
        agentRuns?: WorkspaceAgentRun[];
        agentRunEvents?: WorkspaceAgentRunEvent[];
        agentApprovals?: WorkspaceAgentApproval[];
        agentMemories?: WorkspaceAgentMemory[];
        agentArtifacts?: WorkspaceArtifact[];
      };
      setView((current) => ({
        ...current,
        tasks: [data.task, ...current.tasks.filter((task) => task.id !== data.task.id)],
        messages: mergeMessages(current.messages, data.agentMessages ?? []),
        agentRuns: mergeAgentRuns(current.agentRuns, data.agentRuns ?? []),
        agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, data.agentRunEvents ?? []),
        agentApprovals: mergeAgentApprovals(current.agentApprovals, data.agentApprovals ?? []),
        agentMemories: mergeAgentMemories(current.agentMemories, data.agentMemories ?? []),
        artifacts: mergeArtifacts(current.artifacts, data.agentArtifacts ?? []),
        threads: bumpThreadsForMessages(current.threads, data.agentMessages ?? []),
        workspace: { ...current.workspace, updatedAt: latestWorkspaceTimestamp(data.task.updatedAt, data.agentMessages) },
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
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Task could not be updated."));
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
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Task result could not be submitted."));
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
  async function loadEarlierMessages() {
    if (!activeThread || !messages.length || loadingEarlier) return;
    setLoadingEarlier(true);
    setError(null);
    try {
      const before = messages[0].createdAt;
      const params = new URLSearchParams({
        threadId: activeThread.id,
        before: String(before),
        limit: String(MESSAGE_PAGE_SIZE),
      });
      const response = await fetch(`/api/workspaces/${view.workspace.id}/messages?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Earlier messages could not be loaded."));
      const data = (await response.json()) as { messages?: WorkspaceMessage[]; hasMore?: boolean };
      setView((current) => ({
        ...current,
        messages: mergeMessages(current.messages, data.messages ?? []),
      }));
      if (!data.hasMore || !data.messages?.length) {
        setExhaustedThreadIds((current) => ({ ...current, [activeThread.id]: true }));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Earlier messages could not be loaded.");
    } finally {
      setLoadingEarlier(false);
    }
  }

  function insertAgentMention(member: WorkspaceMember) {
    setDraft((current) => {
      const mention = `@${member.displayName} `;
      if (!current.trim()) return mention;
      if (current.includes(mention)) return current;
      return `${current}${current.endsWith(" ") ? "" : " "}${mention}`;
    });
    window.requestAnimationFrame(() => composerInputRef.current?.focus());
  }

  function insertComposerMention(member: WorkspaceMember) {
    const input = composerInputRef.current;
    const caret = input?.selectionStart ?? draft.length;
    const range = getActiveAgentMentionRange(draft, caret);
    const mention = `@${member.displayName} `;
    const nextDraft = range
      ? `${draft.slice(0, range.start)}${mention}${draft.slice(range.end)}`
      : `${draft}${draft.endsWith(" ") || !draft ? "" : " "}${mention}`;
    const nextCaret = range ? range.start + mention.length : nextDraft.length;
    setDraft(nextDraft);
    setMentionIndex(0);
    window.requestAnimationFrame(() => {
      composerInputRef.current?.focus();
      composerInputRef.current?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!mentionPickerOpen) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionIndex((index) => (index + 1) % mentionCandidates.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionIndex((index) => (index - 1 + mentionCandidates.length) % mentionCandidates.length);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      setMentionIndex(0);
      return;
    }
    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertComposerMention(mentionCandidates[Math.min(mentionIndex, mentionCandidates.length - 1)]);
    }
  }

  function mentionAgentFromLibrary(profile: WorkspaceAgentProfile) {
    const member = agentMembers.find((entry) => entry.agentProfileId === profile.id);
    if (!member) {
      setAgentFeedback(`${profile.displayName} needs to be in this workspace before you can mention it.`);
      return;
    }
    insertAgentMention(member);
    setAgentFeedback(`Mention ready for ${profile.displayName}.`);
  }

  async function startDirectChatFromAgentLibrary(profile: WorkspaceAgentProfile) {
    setError(null);
    setAgentFeedback("");
    setStartingAgentDirectProfileId(profile.id);
    try {
      const existingMember = agentMembers.find((entry) => entry.agentProfileId === profile.id);
      const member = await ensureAgentWorkspaceMember(profile, existingMember);
      const existingThread = view.threads.find((thread) => thread.type === "direct" && thread.participantIds?.includes(member.id));
      if (existingThread) {
        setChatMode("direct");
        setActiveThreadId(existingThread.id);
      } else {
        await createAgentDirectThread(member, profile);
      }
      setAgentFeedback(`Private chat with ${profile.displayName} started.`);
    } catch (directError) {
      setError(directError instanceof Error ? directError.message : "Private chat could not be started.");
    } finally {
      setStartingAgentDirectProfileId("");
    }
  }

  function startAgentProfileEdit(profile: WorkspaceAgentProfile) {
    const toolState = readAgentToolState(profile.capabilities);
    setEditingAgentProfileId(profile.id);
    setAgentEditName(profile.displayName);
    setAgentEditPurpose(profile.description);
    setAgentEditBehavior(profile.systemPrompt);
    setAgentEditVisibility(profile.visibility);
    setAgentEditMemoryScope(profile.memoryScope);
    setAgentEditCanSearchMessages(toolState.canSearchMessages);
    setAgentEditCanSummarize(toolState.canSummarize);
    setAgentEditCanCreateTasks(toolState.canCreateTasks);
    setAgentEditCreateTaskApproval(toolState.createTaskApproval);
    setAgentEditCanUpdateTasks(toolState.canUpdateTasks);
    setAgentEditCanCreateQuiz(toolState.canCreateQuiz);
    setAgentEditCanGenerateCourse(toolState.canGenerateCourse);
    setAgentEditCanSaveArtifact(toolState.canSaveArtifact);
    setAgentEditCanSaveMemory(toolState.canSaveMemory);
    setAgentEditSkillPaths(readAgentSkillPaths(profile.capabilities));
    setAgentEditDelegateProfileIds(readAgentDelegateProfileIds(profile.capabilities));
    setAgentEditConnectionToolKeys(filterAvailableAgentConnectionToolKeys(readAgentConnectionToolKeys(profile.capabilities), view.agentConnections));
  }

  async function saveAgentProfileEdit(event: React.FormEvent<HTMLFormElement>, profile: WorkspaceAgentProfile) {
    event.preventDefault();
    setError(null);
    const nextCapabilities = buildAgentCapabilityInputs({
      name: agentEditName.trim() || profile.displayName,
      canSearchMessages: agentEditCanSearchMessages,
      canSummarize: agentEditCanSummarize,
      canCreateTasks: agentEditCanCreateTasks,
      createTaskApproval: agentEditCreateTaskApproval,
      canUpdateTasks: agentEditCanUpdateTasks,
      canCreateQuiz: agentEditCanCreateQuiz,
      canGenerateCourse: agentEditCanGenerateCourse,
      canSaveArtifact: agentEditCanSaveArtifact,
      canSaveMemory: agentEditCanSaveMemory,
      existingCapabilities: profile.capabilities,
      selectedSkillPaths: agentEditSkillPaths,
      selectedDelegateProfileIds: agentEditDelegateProfileIds.filter((profileId) => profileId !== profile.id),
      selectedConnectionToolKeys: filterAvailableAgentConnectionToolKeys(agentEditConnectionToolKeys, view.agentConnections),
    });
    const capabilityPayload = hasEnabledAgentCapabilities(nextCapabilities) ? nextCapabilities : undefined;
    const canPreserveHiddenAgentCapabilities = !capabilityPayload && profile.capabilities.length === 0;
    if (!capabilityPayload && !canPreserveHiddenAgentCapabilities) {
      setError("Choose at least one way this agent can help.");
      return;
    }
    if (!agentEditPurpose.trim()) {
      setError("Describe this agent's purpose first.");
      return;
    }
    if (!agentEditBehavior.trim()) {
      setError("Describe how this agent should behave first.");
      return;
    }
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agents/${profile.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: agentEditName.trim() || profile.displayName,
          description: agentEditPurpose.trim(),
          systemPrompt: agentEditBehavior.trim(),
          visibility: agentEditVisibility,
          memoryScope: agentEditMemoryScope,
          ...(capabilityPayload ? { capabilities: capabilityPayload } : {}),
        }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent could not be updated."));
      const data = (await response.json()) as { profile: WorkspaceAgentProfile };
      setView((current) => ({
        ...current,
        agentProfiles: mergeAgentProfiles(current.agentProfiles, [data.profile]),
        members: mergeMembers(
          current.members,
          current.members
            .filter((member) => member.agentProfileId === data.profile.id)
            .map((member) => ({ ...member, displayName: data.profile.displayName })),
        ),
        workspace: { ...current.workspace, updatedAt: data.profile.updatedAt },
      }));
      setEditingAgentProfileId("");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Agent could not be updated.");
    }
  }

  async function decideAgentApproval(approval: WorkspaceAgentApproval, decision: "approved" | "denied") {
    if (decidingApprovalIds[approval.id]) return;
    setDecidingApprovalIds((current) => ({ ...current, [approval.id]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-approvals/${approval.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent approval could not be updated."));
      const data = (await response.json()) as {
        approval: WorkspaceAgentApproval;
        approvals?: WorkspaceAgentApproval[];
        run: WorkspaceAgentRun;
        agentRunEvents?: WorkspaceAgentRunEvent[];
        task?: WorkspaceTask;
        message?: WorkspaceMessage;
        artifact?: WorkspaceArtifact;
        memory?: WorkspaceAgentMemory;
      };
      const nextMessages = data.message ? [data.message] : [];
      setView((current) => ({
        ...current,
        tasks: data.task ? [data.task, ...current.tasks.filter((task) => task.id !== data.task?.id)] : current.tasks,
        messages: mergeMessages(current.messages, nextMessages),
        artifacts: mergeArtifacts(current.artifacts, data.artifact ? [data.artifact] : []),
        agentApprovals: mergeAgentApprovals(current.agentApprovals, data.approvals ?? [data.approval]),
        agentRuns: mergeAgentRuns(current.agentRuns, [data.run]),
        agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, data.agentRunEvents ?? []),
        agentMemories: mergeAgentMemories(current.agentMemories, data.memory ? [data.memory] : []),
        threads: bumpThreadsForMessages(current.threads, nextMessages),
        workspace: { ...current.workspace, updatedAt: Date.now() },
      }));
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : "Agent approval could not be updated.");
    } finally {
      setDecidingApprovalIds((current) => {
        const next = { ...current };
        delete next[approval.id];
        return next;
      });
    }
  }

  async function cancelAgentRun(run: WorkspaceAgentRun) {
    if (cancellingRunIds[run.id] || !isCancellableAgentRun(run.status)) return;
    setCancellingRunIds((current) => ({ ...current, [run.id]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-runs/${run.id}/cancel`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled from workspace chat." }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent run could not be cancelled."));
      const data = (await response.json()) as {
        run: WorkspaceAgentRun;
        agentRunEvents?: WorkspaceAgentRunEvent[];
        agentApprovals?: WorkspaceAgentApproval[];
      };
      setView((current) => ({
        ...current,
        agentRuns: mergeAgentRuns(current.agentRuns, [data.run]),
        agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, data.agentRunEvents ?? []),
        agentApprovals: mergeAgentApprovals(current.agentApprovals, data.agentApprovals ?? []),
        workspace: { ...current.workspace, updatedAt: Date.now() },
      }));
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Agent run could not be cancelled.");
    } finally {
      setCancellingRunIds((current) => {
        const next = { ...current };
        delete next[run.id];
        return next;
      });
    }
  }

  async function retryAgentRun(run: WorkspaceAgentRun) {
    if (retryingRunIds[run.id] || !isRetryableAgentRun(run.status)) return;
    setRetryingRunIds((current) => ({ ...current, [run.id]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-runs/${run.id}/retry`, {
        method: "POST",
        headers: { "content-type": "application/json" },
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent run could not be retried."));
      const data = (await response.json()) as {
        agentMessages?: WorkspaceMessage[];
        agentRuns?: WorkspaceAgentRun[];
        agentRunEvents?: WorkspaceAgentRunEvent[];
        agentApprovals?: WorkspaceAgentApproval[];
        agentMemories?: WorkspaceAgentMemory[];
        agentArtifacts?: WorkspaceArtifact[];
        task?: WorkspaceTask;
      };
      const nextMessages = data.agentMessages ?? [];
      setView((current) => ({
        ...current,
        tasks: data.task ? [data.task, ...current.tasks.filter((task) => task.id !== data.task?.id)] : current.tasks,
        messages: mergeMessages(current.messages, nextMessages),
        artifacts: mergeArtifacts(current.artifacts, data.agentArtifacts ?? []),
        agentRuns: mergeAgentRuns(current.agentRuns, data.agentRuns ?? []),
        agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, data.agentRunEvents ?? []),
        agentApprovals: mergeAgentApprovals(current.agentApprovals, data.agentApprovals ?? []),
        agentMemories: mergeAgentMemories(current.agentMemories, data.agentMemories ?? []),
        threads: bumpThreadsForMessages(current.threads, nextMessages),
        workspace: { ...current.workspace, updatedAt: latestWorkspaceTimestamp(Date.now(), nextMessages) },
      }));
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Agent run could not be retried.");
    } finally {
      setRetryingRunIds((current) => {
        const next = { ...current };
        delete next[run.id];
        return next;
      });
    }
  }

  async function archiveAgentMemory(memory: WorkspaceAgentMemory) {
    if (archivingMemoryIds[memory.id]) return;
    setArchivingMemoryIds((current) => ({ ...current, [memory.id]: true }));
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-memories/${memory.id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent memory could not be archived."));
      const data = (await response.json()) as { memory: WorkspaceAgentMemory };
      setView((current) => ({
        ...current,
        agentMemories: current.agentMemories.filter((entry) => entry.id !== data.memory.id),
        workspace: { ...current.workspace, updatedAt: Date.now() },
      }));
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Agent memory could not be archived.");
    } finally {
      setArchivingMemoryIds((current) => {
        const next = { ...current };
        delete next[memory.id];
        return next;
      });
    }
  }

  async function restoreAgentMemory(memory: WorkspaceAgentMemory) {
    setError(null);
    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/agent-memories/${memory.id}?intent=restore`, {
        method: "POST",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Agent memory could not be restored."));
      const data = (await response.json()) as { memory: WorkspaceAgentMemory };
      setView((current) => ({
        ...current,
        agentMemories: mergeAgentMemories(current.agentMemories, data.memory ? [data.memory] : []),
        workspace: { ...current.workspace, updatedAt: Date.now() },
      }));
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : "Agent memory could not be restored.");
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !activeThread || sending) return;
    setSending(true);
    setError(null);
    setDraft("");
    const optimisticMessage: WorkspaceMessage = {
      id: `wmsg_pending_${Date.now()}`,
      workspaceId: view.workspace.id,
      threadId: activeThread.id,
      senderName: "You",
      senderKind: "human",
      content,
      createdAt: Date.now(),
    };
    setView((current) => ({
      ...current,
      messages: mergeMessages(current.messages, [optimisticMessage]),
      threads: bumpThreadsForMessages(current.threads, [optimisticMessage]),
      workspace: { ...current.workspace, updatedAt: optimisticMessage.createdAt },
    }));

    try {
      const response = await fetch(`/api/workspaces/${view.workspace.id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId: activeThread.id, content }),
      });
      if (!response.ok) throw new Error(await readWorkspaceApiError(response, "Message could not be sent."));
      const data = (await response.json()) as {
        message: WorkspaceMessage;
        agentMessages?: WorkspaceMessage[];
        agentRuns?: WorkspaceAgentRun[];
        agentRunEvents?: WorkspaceAgentRunEvent[];
        agentApprovals?: WorkspaceAgentApproval[];
        agentMemories?: WorkspaceAgentMemory[];
        agentArtifacts?: WorkspaceArtifact[];
      };
      const nextMessages = [data.message, ...(data.agentMessages ?? [])];
      setView((current) => ({
        ...current,
        messages: mergeMessages(removeMessageById(current.messages, optimisticMessage.id), nextMessages),
        artifacts: mergeArtifacts(current.artifacts, data.agentArtifacts ?? []),
        agentRuns: mergeAgentRuns(current.agentRuns, data.agentRuns ?? []),
        agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, data.agentRunEvents ?? []),
        agentApprovals: mergeAgentApprovals(current.agentApprovals, data.agentApprovals ?? []),
        agentMemories: mergeAgentMemories(current.agentMemories, data.agentMemories ?? []),
        threads: bumpThreadsForMessages(current.threads, nextMessages),
        workspace: { ...current.workspace, updatedAt: latestWorkspaceTimestamp(data.message.createdAt, data.agentMessages) },
      }));
    } catch (sendError) {
      setView((current) => ({
        ...current,
        messages: removeMessageById(current.messages, optimisticMessage.id),
      }));
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
            <strong>Chats</strong>
          </div>
          <div className="workspace-directory-actions">
            <button type="button" aria-label="New chat" title="New chat" onClick={() => setNewThreadOpen((open) => !open)}>+</button>
          </div>
        </div>

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
                  const member = visibleMembers.find((entry) => entry.id === memberId);
                  setNewThreadParticipantId(memberId);
                  if (member && !newThreadName.trim()) setNewThreadName(member.displayName);
                }}
              >
                <option value="">Private to me</option>
                {visibleMembers.map((member) => (
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
          unreadCounts={unreadCounts}
          onSelect={selectThread}
        />
      </aside>

      <section className="workspace-room" aria-label="Workspace chat">
        <div className="workspace-room-header">
          <div>
            <strong>{activeThread ? `${activeThread.type === "room" ? "# " : ""}${activeThread.name}` : view.workspace.name}</strong>
            <span>
              {activeThread
                ? `${visibleMembers.length} members / ${agentCount(visibleMembers)} agents / ${activeTaskCount} active tasks`
                : `${visibleMembers.length} members / ${chatCount} chats / ${view.tasks.length} tasks`}
            </span>
          </div>
          <div className="workspace-room-actions">
            <span className="workspace-live-dot">Live</span>
            <button type="button" onClick={() => setDetailsOpen((open) => !open)}>{detailsOpen ? "Hide panel" : "Panel"}</button>
            <button type="button" onClick={() => { setDetailsOpen(true); openMemberPicker("Person"); }}>Invite</button>
            <button type="button" onClick={() => { setTaskTitle(`Follow up from ${activeThread?.name ?? "workspace"}`); setDetailsOpen(true); }}>New task</button>
          </div>
        </div>

        <div className={`workspace-message-list ${!activeThread ? "workspace-message-list-start" : ""}`}>
          {activeThread && messages.length >= MESSAGE_PAGE_SIZE && !exhaustedThreadIds[activeThread.id] ? (
            <button type="button" className="workspace-load-earlier" disabled={loadingEarlier} onClick={() => void loadEarlierMessages()}>
              {loadingEarlier ? "Loading earlier" : "Load earlier"}
            </button>
          ) : null}
          {!activeThread ? (
            <WorkspaceStartState
              workspaceName={view.workspace.name}
              chatMode={chatMode}
              newThreadType={newThreadType}
              newThreadName={newThreadName}
              newThreadDescription={newThreadDescription}
              newThreadParticipantId={newThreadParticipantId}
              members={visibleMembers}
              onModeChange={switchMode}
              onThreadTypeChange={setNewThreadType}
              onThreadNameChange={setNewThreadName}
              onThreadDescriptionChange={setNewThreadDescription}
              onThreadParticipantChange={(memberId) => {
                const member = visibleMembers.find((entry) => entry.id === memberId);
                setNewThreadParticipantId(memberId);
                if (member && !newThreadName.trim()) setNewThreadName(member.displayName);
              }}
              onCreateThread={createThread}
              onOpenMemberPicker={(role) => {
                setDetailsOpen(true);
                openMemberPicker(role);
              }}
            />
          ) : activeThreadActivityLoading ? (
            <ActiveChatLoadingState thread={activeThread} />
          ) : messages.length === 0 ? (
            <ActiveChatEmptyState
              thread={activeThread}
              onAddPerson={() => {
                setDetailsOpen(true);
                openMemberPicker("Person");
              }}
              onAddAgent={() => {
                setDetailsOpen(true);
                openMemberPicker("Agent");
              }}
              onCreateTask={() => {
                setTaskTitle(`Follow up from ${activeThread.name}`);
                setDetailsOpen(true);
              }}
            />
          ) : null}
          {messages.map((message) => {
            const agentRun = agentRunsByOutputMessageId.get(message.id);
            return (
              <article key={message.id} className={`workspace-message ${message.senderKind}`}>
                <div className="workspace-avatar" aria-hidden="true">{message.senderName.slice(0, 1)}</div>
                <div className="workspace-message-body">
                  <div className="workspace-message-meta">
                    <strong>{message.senderName}</strong>
                    <span>{formatTime(message.createdAt)}</span>
                  </div>
                  {agentRun ? (
                    <>
                      <AgentRunStatusChip
                        run={agentRun}
                        events={agentRunEventsByRunId.get(agentRun.id) ?? []}
                        expanded={Boolean(expandedAgentRunIds[agentRun.id])}
                        onToggle={() => setExpandedAgentRunIds((current) => ({ ...current, [agentRun.id]: !current[agentRun.id] }))}
                      />
                      {expandedAgentRunIds[agentRun.id] ? (
                        <AgentRunInlineDetail
                          run={agentRun}
                          events={agentRunEventsByRunId.get(agentRun.id) ?? []}
                          approvals={agentApprovalsByRunId.get(agentRun.id) ?? []}
                          cancelling={Boolean(cancellingRunIds[agentRun.id])}
                          retrying={Boolean(retryingRunIds[agentRun.id])}
                          onCancel={() => void cancelAgentRun(agentRun)}
                          onRetry={() => void retryAgentRun(agentRun)}
                        />
                      ) : null}
                      <AgentApprovalCard
                        approvals={agentApprovalsByRunId.get(agentRun.id) ?? []}
                        decidingApprovalIds={decidingApprovalIds}
                        onDecision={(approval, decision) => void decideAgentApproval(approval, decision)}
                      />
                    </>
                  ) : null}
                  <p>{message.content}</p>
                  {message.artifact ? (
                    <MessageArtifact artifact={message.artifact} sourceArtifact={artifactsBySourceMessageId.get(message.id)} />
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        <WorkspaceComposer
          activeThread={activeThread}
          composerInputRef={composerInputRef}
          draft={draft}
          error={error}
          mentionCandidates={mentionCandidates}
          mentionIndex={mentionIndex}
          mentionPickerOpen={mentionPickerOpen}
          sending={sending}
          onDraftChange={setDraft}
          onSelectionChange={setSelectionStart}
          onInsertMention={insertComposerMention}
          onKeyDown={handleComposerKeyDown}
          onSubmit={sendMessage}
        />
      </section>

      <details
        className="workspace-side-drawer"
        aria-label="Workspace panel"
        open={detailsOpen}
        onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
      >
        <summary>
          <span>Workspace panel</span>
        </summary>
        <aside className="workspace-side" aria-label="Workspace status">
          <section className="workspace-panel workspace-members-panel">
            <div className="workspace-panel-header">
              <strong>Members</strong>
              <div className="workspace-panel-header-actions">
                <span>{visibleMembers.length}</span>
                <Link href="/workspace/agents">Agents</Link>
                <button
                  type="button"
                  aria-label="Add member"
                  aria-expanded={memberPickerOpen}
                  onClick={() => (memberPickerOpen ? resetMemberPicker() : openMemberPicker())}
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
                  className="workspace-member-picker-search"
                  aria-label="Search people or agents"
                  value={memberPickerQuery}
                  onChange={(event) => {
                    setMemberPickerQuery(event.target.value);
                    if (memberRole === "Person") setMemberName(event.target.value);
                  }}
                  placeholder="Search people or agents"
                />
                {memberRole === "Agent" ? (
                  <>
                    <div className="workspace-agent-create-switch" aria-label="Agent create mode">
                      <button type="button" className={agentCreateMode === "template" ? "active" : ""} onClick={() => setAgentCreateMode("template")}>
                        Templates
                      </button>
                      <button type="button" className={agentCreateMode === "existing" ? "active" : ""} onClick={() => setAgentCreateMode("existing")}>
                        Add existing agent
                      </button>
                      <button type="button" className={agentCreateMode === "custom" ? "active" : ""} onClick={() => setAgentCreateMode("custom")}>
                        Custom agent
                      </button>
                    </div>
                    <div className="workspace-agent-add-target" aria-label="Agent destination">
                      <button type="button" className={agentAddTarget === "workspace" ? "active" : ""} onClick={() => setAgentAddTarget("workspace")}>
                        Add to workspace
                      </button>
                      <button type="button" className={agentAddTarget === "direct" ? "active" : ""} onClick={() => setAgentAddTarget("direct")}>
                        Start private chat
                      </button>
                    </div>
                    {agentCreateMode === "template" ? (
                      <div className="workspace-agent-template-list" aria-label="Agent templates">
                        {loadingAgentTemplates && !agentTemplates.length ? (
                          <span className="workspace-agent-template-empty">Loading agents...</span>
                        ) : null}
                        {filteredAgentTemplates.map((template) => (
                          <button
                            key={template.key}
                            type="button"
                            className={selectedAgentTemplateKey === template.key ? "active" : ""}
                            onClick={() => {
                              setSelectedAgentTemplateKey(template.key);
                              setMemberName(template.displayName);
                              setAgentPurpose(template.description);
                              setAgentBehavior(template.systemPrompt);
                              setAgentMemoryScope(template.memoryScope);
                              const toolState = readAgentToolState(template.capabilities);
                              setAgentCanSearchMessages(toolState.canSearchMessages);
                              setAgentCanSummarize(toolState.canSummarize);
                              setAgentCanCreateTasks(toolState.canCreateTasks);
                              setAgentCreateTaskApproval(toolState.createTaskApproval);
                              setAgentCanUpdateTasks(toolState.canUpdateTasks);
                              setAgentCanCreateQuiz(toolState.canCreateQuiz);
                              setAgentCanGenerateCourse(toolState.canGenerateCourse);
                              setAgentCanSaveArtifact(toolState.canSaveArtifact);
                              setAgentCanSaveMemory(toolState.canSaveMemory);
                              setAgentSkillPaths(readAgentSkillPaths(template.capabilities));
                              setAgentDelegateProfileIds(readAgentDelegateProfileIds(template.capabilities));
                              setAgentConnectionToolKeys(readAgentConnectionToolKeys(template.capabilities));
                            }}
                          >
                            <strong>{template.displayName}</strong>
                            <span>{template.description}</span>
                            <AgentPickerCapabilityHints hints={formatAgentPickerCapabilityHints(template.capabilities, template.memoryScope)} />
                          </button>
                        ))}
                        {!loadingAgentTemplates && agentTemplates.length > 0 && !filteredAgentTemplates.length ? (
                          <span className="workspace-agent-template-empty">No matching agents.</span>
                        ) : null}
                      </div>
                    ) : agentCreateMode === "existing" ? (
                      <div className="workspace-agent-template-list" aria-label="Saved agents">
                        {filteredSavedAgentProfiles.map((profile) => (
                          <button
                            key={profile.id}
                            type="button"
                            className={selectedExistingAgentProfileId === profile.id ? "active" : ""}
                            onClick={() => {
                              setSelectedExistingAgentProfileId(profile.id);
                              setMemberName(profile.displayName);
                            }}
                          >
                            <strong>{profile.displayName}</strong>
                            <span>{profile.description}</span>
                            <AgentPickerCapabilityHints hints={formatAgentPickerCapabilityHints(profile.capabilities, profile.memoryScope)} />
                            <small>{profile.visibility === "private" ? "Personal agent" : "Workspace agent"}</small>
                          </button>
                        ))}
                        {!savedAgentProfiles.length ? <span className="workspace-agent-template-empty">No saved agents yet. Create a personal agent first.</span> : null}
                        {savedAgentProfiles.length > 0 && !filteredSavedAgentProfiles.length ? <span className="workspace-agent-template-empty">No matching saved agents.</span> : null}
                      </div>
                    ) : (
                      <div className="workspace-agent-custom-fields">
                        <textarea
                          aria-label="Agent purpose"
                          value={agentPurpose}
                          onChange={(event) => setAgentPurpose(event.target.value)}
                          placeholder="What should this agent help with?"
                          maxLength={AGENT_PURPOSE_MAX_LENGTH}
                          rows={2}
                        />
                        <textarea
                          aria-label="Agent behavior"
                          value={agentBehavior}
                          onChange={(event) => setAgentBehavior(event.target.value)}
                          placeholder="How should this agent work in chat?"
                          maxLength={AGENT_BEHAVIOR_MAX_LENGTH}
                          rows={3}
                        />
                        <select
                          aria-label="Agent visibility"
                          value={agentVisibility}
                          onChange={(event) => setAgentVisibility(event.target.value as WorkspaceAgentProfile["visibility"])}
                        >
                          <option value="workspace">Workspace agent</option>
                          <option value="private">Personal agent</option>
                        </select>
                        {agentVisibility === "private" ? <small>Save to my agents. You can add it to this workspace later.</small> : null}
                        <select
                          aria-label="Agent memory scope"
                          value={agentMemoryScope}
                          onChange={(event) => setAgentMemoryScope(event.target.value as WorkspaceAgentProfile["memoryScope"])}
                        >
                          <option value="thread">Remembers this chat</option>
                          <option value="workspace">Remembers this workspace</option>
                          <option value="none">No memory after each run</option>
                          <option value="user">Remembers my learning preferences</option>
                        </select>
                        <AgentSkillControls
                          selectedSkillPaths={agentSkillPaths}
                          storedSkills={workspaceAgentSkills}
                          loadingStoredSkills={loadingWorkspaceAgentSkills}
                          editingSkillPath={editingSkillPath}
                          deletingSkillPath={deletingSkillPath}
                          skillHistoryPath={skillHistoryPath}
                          skillVersionsByPath={skillVersionsByPath}
                          loadingSkillHistoryPath={loadingSkillHistoryPath}
                          restoringSkillVersionKey={restoringSkillVersionKey}
                          onToggle={(path) => setAgentSkillPaths((current) => toggleAgentSkill(current, path))}
                          onEdit={startWorkspaceAgentSkillEdit}
                          onDelete={(skill) => void deleteWorkspaceAgentSkill(skill)}
                          onHistory={(skill) => void loadWorkspaceAgentSkillVersions(skill)}
                          onRestore={(path, version) => void restoreWorkspaceAgentSkillVersion(path, version)}
                        />
                        <WorkspaceAgentSkillEditForm
                          editingSkillPath={editingSkillPath}
                          skillEditName={skillEditName}
                          skillEditDescription={skillEditDescription}
                          skillEditInstructions={skillEditInstructions}
                          updatingSkillPath={updatingSkillPath}
                          onNameChange={setSkillEditName}
                          onDescriptionChange={setSkillEditDescription}
                          onInstructionsChange={setSkillEditInstructions}
                          onSave={() => void updateWorkspaceAgentSkill()}
                          onCancel={() => setEditingSkillPath("")}
                        />
                        <AgentDelegateControls
                          profiles={visibleAgentProfiles}
                          selectedProfileIds={agentDelegateProfileIds}
                          onToggle={(profileId) => setAgentDelegateProfileIds((current) => toggleAgentDelegate(current, profileId))}
                        />
                        <AgentConnectionControls
                          connections={view.agentConnections}
                          selectedToolKeys={agentConnectionToolKeys}
                          onToggle={(key) => setAgentConnectionToolKeys((current) => toggleAgentConnectionTool(current, key))}
                        />
                        <div className="workspace-agent-skill-create" aria-label="Create custom skill">
                          <select aria-label="Custom skill source" value={customSkillSource} onChange={(event) => setCustomSkillSource(event.target.value as "workspace" | "user")}>
                            <option value="workspace">Workspace skill</option>
                            <option value="user">Personal skill</option>
                          </select>
                          <input aria-label="Custom skill name" value={customSkillName} onChange={(event) => setCustomSkillName(event.target.value)} placeholder="Custom skill name" />
                          <textarea aria-label="Custom skill description" value={customSkillDescription} onChange={(event) => setCustomSkillDescription(event.target.value)} placeholder="When should the agent use this skill?" rows={2} />
                          <textarea aria-label="Custom skill instructions" value={customSkillInstructions} onChange={(event) => setCustomSkillInstructions(event.target.value)} placeholder="How should the agent behave?" rows={3} />
                          <button type="button" onClick={() => void createWorkspaceAgentSkill("create")}>Create skill</button>
                        </div>
                        <AgentActionControls
                          canSearchMessages={agentCanSearchMessages}
                          onSearchMessagesChange={setAgentCanSearchMessages}
                          canSummarize={agentCanSummarize}
                          onSummarizeChange={setAgentCanSummarize}
                          canCreateTasks={agentCanCreateTasks}
                          onCreateTasksChange={setAgentCanCreateTasks}
                          createTaskApproval={agentCreateTaskApproval}
                          onCreateTaskApprovalChange={setAgentCreateTaskApproval}
                          canUpdateTasks={agentCanUpdateTasks}
                          onUpdateTasksChange={setAgentCanUpdateTasks}
                          canCreateQuiz={agentCanCreateQuiz}
                          onCreateQuizChange={setAgentCanCreateQuiz}
                          canGenerateCourse={agentCanGenerateCourse}
                          onGenerateCourseChange={setAgentCanGenerateCourse}
                          canSaveArtifact={agentCanSaveArtifact}
                          onSaveArtifactChange={setAgentCanSaveArtifact}
                          canSaveMemory={agentCanSaveMemory}
                          onSaveMemoryChange={setAgentCanSaveMemory}
                        />
                      </div>
                    )}
                    <input
                      aria-label="Agent display name"
                      value={memberName}
                      onChange={(event) => setMemberName(event.target.value)}
                      disabled={agentCreateMode === "existing"}
                      placeholder={
                        agentCreateMode === "template"
                          ? agentTemplates.find((template) => template.key === selectedAgentTemplateKey)?.displayName ?? "Agent name"
                          : agentCreateMode === "existing"
                            ? savedAgentProfiles.find((profile) => profile.id === selectedExistingAgentProfileId)?.displayName ?? "Saved agent"
                          : "Agent name"
                      }
                    />
                  </>
                ) : (
                  <>
                    {filteredPeopleMembers.length ? (
                      <div className="workspace-people-picker-list" aria-label="Existing people">
                        {filteredPeopleMembers.map((member) => (
                          <button type="button" key={member.id} onClick={() => void startDirectChatWithPerson(member)}>
                            <strong>{member.displayName}</strong>
                            <span>{member.role}</span>
                            <small>Private chat</small>
                          </button>
                        ))}
                      </div>
                    ) : peopleMembers.length ? (
                      <span className="workspace-agent-template-empty">No matching people.</span>
                    ) : null}
                    <input
                      aria-label="Invite name"
                      value={memberName}
                      onChange={(event) => {
                        setMemberName(event.target.value);
                        setMemberPickerQuery(event.target.value);
                      }}
                      placeholder="Name or email"
                    />
                  </>
                )}
                <div className="workspace-member-popover-actions">
                  <button type="button" onClick={resetMemberPicker}>Cancel</button>
                  <button type="submit">
                    {memberRole === "Agent" && agentAddTarget === "direct"
                      ? "Start private chat"
                      : memberRole === "Agent" && agentCreateMode === "custom"
                        ? (agentVisibility === "private" ? "Save to my agents" : "Add")
                        : "Add"}
                  </button>
                </div>
                {agentFeedback ? <p className="workspace-agent-feedback">{agentFeedback}</p> : null}
              </form>
            ) : null}
            <ul className="workspace-member-list">
              {visibleMembers.map((member) => {
                const agentProfile = member.agentProfileId ? view.agentProfiles.find((profile) => profile.id === member.agentProfileId) : undefined;
                return (
                  <li key={member.id}>
                    <span className="workspace-member-avatar" aria-hidden="true">{member.displayName.slice(0, 1)}</span>
                    <span>
                      <strong>{member.displayName}</strong>
                      <small>{member.role}{member.status ? ` / ${member.status}` : ""}</small>
                      {agentProfile ? <small>{agentProfile.description}</small> : null}
                    </span>
                    {isAgentMember(member) ? (
                      <div className="workspace-member-agent-actions">
                        <button type="button" className="workspace-member-mention" onClick={() => insertAgentMention(member)}>
                          @
                        </button>
                        {agentProfile ? (
                          <button type="button" aria-label={`Edit agent ${member.displayName}`} onClick={() => startAgentProfileEdit(agentProfile)}>
                            Edit agent
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {agentProfile && editingAgentProfileId === agentProfile.id ? (
                      <form className="workspace-agent-edit-form" onSubmit={(event) => saveAgentProfileEdit(event, agentProfile)}>
                        <input
                          aria-label="Agent edit name"
                          value={agentEditName}
                          onChange={(event) => setAgentEditName(event.target.value)}
                          placeholder="Agent name"
                        />
                        <textarea
                          aria-label="Agent edit purpose"
                          value={agentEditPurpose}
                          onChange={(event) => setAgentEditPurpose(event.target.value)}
                          placeholder="What should this agent help with?"
                          maxLength={AGENT_PURPOSE_MAX_LENGTH}
                          rows={2}
                        />
                        <textarea
                          aria-label="Agent edit behavior"
                          value={agentEditBehavior}
                          onChange={(event) => setAgentEditBehavior(event.target.value)}
                          placeholder="How should this agent work?"
                          maxLength={AGENT_BEHAVIOR_MAX_LENGTH}
                          rows={3}
                        />
                        <select
                          aria-label="Agent edit visibility"
                          value={agentEditVisibility}
                          onChange={(event) => setAgentEditVisibility(event.target.value as WorkspaceAgentProfile["visibility"])}
                        >
                          <option value="workspace">Workspace agent</option>
                          <option value="private">Personal agent</option>
                        </select>
                        <select
                          aria-label="Agent edit memory scope"
                          value={agentEditMemoryScope}
                          onChange={(event) => setAgentEditMemoryScope(event.target.value as WorkspaceAgentProfile["memoryScope"])}
                        >
                          <option value="thread">Remembers this chat</option>
                          <option value="workspace">Remembers this workspace</option>
                          <option value="none">No memory after each run</option>
                          <option value="user">Remembers my learning preferences</option>
                        </select>
                        <AgentSkillControls
                          selectedSkillPaths={agentEditSkillPaths}
                          storedSkills={workspaceAgentSkills}
                          loadingStoredSkills={loadingWorkspaceAgentSkills}
                          editingSkillPath={editingSkillPath}
                          deletingSkillPath={deletingSkillPath}
                          skillHistoryPath={skillHistoryPath}
                          skillVersionsByPath={skillVersionsByPath}
                          loadingSkillHistoryPath={loadingSkillHistoryPath}
                          restoringSkillVersionKey={restoringSkillVersionKey}
                          onToggle={(path) => setAgentEditSkillPaths((current) => toggleAgentSkill(current, path))}
                          onEdit={startWorkspaceAgentSkillEdit}
                          onDelete={(skill) => void deleteWorkspaceAgentSkill(skill)}
                          onHistory={(skill) => void loadWorkspaceAgentSkillVersions(skill)}
                          onRestore={(path, version) => void restoreWorkspaceAgentSkillVersion(path, version)}
                        />
                        <WorkspaceAgentSkillEditForm
                          editingSkillPath={editingSkillPath}
                          skillEditName={skillEditName}
                          skillEditDescription={skillEditDescription}
                          skillEditInstructions={skillEditInstructions}
                          updatingSkillPath={updatingSkillPath}
                          onNameChange={setSkillEditName}
                          onDescriptionChange={setSkillEditDescription}
                          onInstructionsChange={setSkillEditInstructions}
                          onSave={() => void updateWorkspaceAgentSkill()}
                          onCancel={() => setEditingSkillPath("")}
                        />
                        <AgentDelegateControls
                          profiles={visibleAgentProfiles.filter((candidate) => candidate.id !== agentProfile.id)}
                          selectedProfileIds={agentEditDelegateProfileIds}
                          onToggle={(profileId) => setAgentEditDelegateProfileIds((current) => toggleAgentDelegate(current, profileId))}
                        />
                        <AgentConnectionControls
                          connections={view.agentConnections}
                          selectedToolKeys={agentEditConnectionToolKeys}
                          onToggle={(key) => setAgentEditConnectionToolKeys((current) => toggleAgentConnectionTool(current, key))}
                        />
                        <div className="workspace-agent-skill-create" aria-label="Create custom skill">
                          <select aria-label="Custom skill source" value={customEditSkillSource} onChange={(event) => setCustomEditSkillSource(event.target.value as "workspace" | "user")}>
                            <option value="workspace">Workspace skill</option>
                            <option value="user">Personal skill</option>
                          </select>
                          <input aria-label="Custom skill name" value={customEditSkillName} onChange={(event) => setCustomEditSkillName(event.target.value)} placeholder="Custom skill name" />
                          <textarea aria-label="Custom skill description" value={customEditSkillDescription} onChange={(event) => setCustomEditSkillDescription(event.target.value)} placeholder="When should the agent use this skill?" rows={2} />
                          <textarea aria-label="Custom skill instructions" value={customEditSkillInstructions} onChange={(event) => setCustomEditSkillInstructions(event.target.value)} placeholder="How should the agent behave?" rows={3} />
                          <button type="button" onClick={() => void createWorkspaceAgentSkill("edit")}>Create skill</button>
                        </div>
                        <AgentActionControls
                          canSearchMessages={agentEditCanSearchMessages}
                          onSearchMessagesChange={setAgentEditCanSearchMessages}
                          canSummarize={agentEditCanSummarize}
                          onSummarizeChange={setAgentEditCanSummarize}
                          canCreateTasks={agentEditCanCreateTasks}
                          onCreateTasksChange={setAgentEditCanCreateTasks}
                          createTaskApproval={agentEditCreateTaskApproval}
                          onCreateTaskApprovalChange={setAgentEditCreateTaskApproval}
                          canUpdateTasks={agentEditCanUpdateTasks}
                          onUpdateTasksChange={setAgentEditCanUpdateTasks}
                          canCreateQuiz={agentEditCanCreateQuiz}
                          onCreateQuizChange={setAgentEditCanCreateQuiz}
                          canGenerateCourse={agentEditCanGenerateCourse}
                          onGenerateCourseChange={setAgentEditCanGenerateCourse}
                          canSaveArtifact={agentEditCanSaveArtifact}
                          onSaveArtifactChange={setAgentEditCanSaveArtifact}
                          canSaveMemory={agentEditCanSaveMemory}
                          onSaveMemoryChange={setAgentEditCanSaveMemory}
                        />
                        <div className="workspace-agent-edit-actions">
                          <button type="button" onClick={() => setEditingAgentProfileId("")}>Cancel</button>
                          <button type="submit">Save</button>
                        </div>
                      </form>
                    ) : null}
                  </li>
                );
              })}
            </ul>
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
  emptyText,
  unreadCounts,
  onSelect,
}: {
  title: string;
  threads: WorkspaceThread[];
  activeThreadId?: string;
  emptyText: string;
  unreadCounts: Record<string, number>;
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
          {unreadCounts[thread.id] ? <span className="workspace-unread-badge">{unreadCounts[thread.id]}</span> : null}
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
  onOpenMemberPicker,
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
  onOpenMemberPicker: (role: "Person" | "Agent") => void;
}) {
  const emptyLabel = chatMode === "direct" ? "No private chats yet" : "Empty workspace";
  const emptyCopy =
    chatMode === "direct"
      ? "Start a focused private chat with a person or an agent. Group rooms stay available for shared context."
      : "Create the first real conversation. Use a group chat for shared context, or a private chat for focused work with one person or agent.";
  return (
    <section className="workspace-start-state" aria-label="Start workspace">
      <div className="workspace-start-copy">
        <span className="course-block-tag">{emptyLabel}</span>
        <h1>{workspaceName}</h1>
        <p>{emptyCopy}</p>
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
          <button type="button" onClick={() => onOpenMemberPicker("Person")}>Add a person</button>
          <button type="button" onClick={() => onOpenMemberPicker("Agent")}>Add an agent</button>
          <button type="submit">Create {newThreadType === "room" ? "group" : "private chat"}</button>
        </div>
      </form>
    </section>
  );
}

function ActiveChatEmptyState({
  thread,
  onAddPerson,
  onAddAgent,
  onCreateTask,
}: {
  thread: WorkspaceThread;
  onAddPerson: () => void;
  onAddAgent: () => void;
  onCreateTask: () => void;
}) {
  return (
    <div className="workspace-empty-state active-chat-empty">
      <span className="course-block-tag">{thread.type === "room" ? "Group chat" : "Private chat"}</span>
      <strong>No messages yet</strong>
      <span>Start from real collaborators or a task. Messages, agent runs, and artifacts will appear here when work begins.</span>
      <div className="workspace-empty-actions" aria-label="Start this chat">
        <button type="button" onClick={onAddPerson}>Add a person</button>
        <button type="button" onClick={onAddAgent}>Add an agent</button>
        <button type="button" onClick={onCreateTask}>New task</button>
      </div>
    </div>
  );
}

function ActiveChatLoadingState({ thread }: { thread: WorkspaceThread }) {
  return (
    <div className="workspace-empty-state active-chat-empty">
      <span className="course-block-tag">{thread.type === "room" ? "Group chat" : "Private chat"}</span>
      <strong>Loading messages...</strong>
      <span>Recent messages and agent activity are being restored.</span>
    </div>
  );
}

function MessageArtifact({
  artifact,
  sourceArtifact,
}: {
  artifact: WorkspaceMessageArtifact;
  sourceArtifact?: WorkspaceArtifact;
}) {
  const display = readWorkspaceArtifactDisplay(artifact, sourceArtifact);
  const displayPayload = display.payload;
  const displayTitle = sourceArtifact?.title ?? artifact.title;
  const displayDescription = sourceArtifact?.description ?? artifact.description;
  const kind = display.kind ?? workspaceMessageArtifactKind(displayPayload);
  return (
    <article className={`workspace-assignment-card workspace-artifact-message-card ${kind} inline`}>
      <div>
        <span className="course-block-tag">{workspaceMessageArtifactLabel(kind)}</span>
        {display.source === "record" ? <span className="workspace-artifact-record-source">Artifact record</span> : null}
        <h2>{displayTitle}</h2>
        <p>{displayDescription}</p>
      </div>
      <div className="workspace-assignment-groups">
        {displayPayload.groups.map((group) => <span key={group}>{group}</span>)}
      </div>
    </article>
  );
}

function readWorkspaceArtifactDisplay(artifact: WorkspaceMessageArtifact, sourceArtifact?: WorkspaceArtifact) {
  return {
    source: sourceArtifact ? "record" as const : "legacy" as const,
    payload: sourceArtifact?.payload ?? artifact,
    kind: sourceArtifact?.kind,
  };
}

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function workspaceMessageArtifactKind(artifact: WorkspaceMessageArtifact): WorkspaceArtifact["kind"] {
  const groups = new Set(artifact.groups.map((group) => group.trim().toLowerCase()).filter(Boolean));
  if (groups.has("course")) return "course";
  if (groups.has("task result")) return "task_result";
  return "saved_artifact";
}

function workspaceMessageArtifactLabel(kind: WorkspaceArtifact["kind"]) {
  const labels: Record<WorkspaceArtifact["kind"], string> = {
    course: "Course artifact",
    saved_artifact: "Saved artifact",
    task_result: "Task result",
  };
  return labels[kind];
}

function workspaceAgentMemoryScopeLabel(scope: WorkspaceAgentMemory["scope"]) {
  const labels: Record<WorkspaceAgentMemory["scope"], string> = {
    thread: "This chat",
    workspace: "Workspace",
    user: "My preferences",
  };
  return labels[scope] ?? scope;
}

function shortId(value: string) {
  return value.length <= 12 ? value : `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function AgentDelegateControls({
  profiles,
  selectedProfileIds,
  onToggle,
}: {
  profiles: WorkspaceAgentProfile[];
  selectedProfileIds: string[];
  onToggle: (profileId: string) => void;
}) {
  return (
    <div className="workspace-agent-delegate-controls" aria-label="Agents this agent can delegate to">
      <strong>Agents this agent can delegate to</strong>
      {profiles.length ? profiles.map((profile) => (
        <label key={profile.id}>
          <input type="checkbox" checked={selectedProfileIds.includes(profile.id)} onChange={() => onToggle(profile.id)} />
          <span>{profile.displayName}</span>
        </label>
      )) : <span>No other agents yet.</span>}
    </div>
  );
}

function AgentConnectionControls({
  connections,
  selectedToolKeys,
  onToggle,
}: {
  connections: WorkspaceAgentConnection[];
  selectedToolKeys: string[];
  onToggle: (key: string) => void;
}) {
  const availableConnections = connections.filter((connection) => connection.status !== "disabled" && connection.allowedToolNames.length);
  return (
    <div className="workspace-agent-connection-controls" aria-label="Connections this agent can use">
      <strong>Connections this agent can use</strong>
      <small>External connection tools always need approval before use.</small>
      {availableConnections.length ? (
        availableConnections.map((connection) => (
          <div key={connection.id} className="workspace-agent-connection-tool-group">
            <span>{connection.displayName}</span>
            {connection.allowedToolNames.map((toolName) => {
              const key = connectionToolKey(connection.id, toolName);
              return (
                <label key={key}>
                  <input type="checkbox" checked={selectedToolKeys.includes(key)} onChange={() => onToggle(key)} />
                  <span>{toolName}</span>
                  <small>External / approval required</small>
                </label>
              );
            })}
          </div>
        ))
      ) : (
        <span>No connections saved yet.</span>
      )}
    </div>
  );
}

function AgentActionControls({
  canSearchMessages,
  onSearchMessagesChange,
  canSummarize,
  onSummarizeChange,
  canCreateTasks,
  onCreateTasksChange,
  createTaskApproval,
  onCreateTaskApprovalChange,
  canUpdateTasks,
  onUpdateTasksChange,
  canCreateQuiz,
  onCreateQuizChange,
  canGenerateCourse,
  onGenerateCourseChange,
  canSaveArtifact,
  onSaveArtifactChange,
  canSaveMemory,
  onSaveMemoryChange,
}: {
  canSearchMessages: boolean;
  onSearchMessagesChange: (value: boolean) => void;
  canSummarize: boolean;
  onSummarizeChange: (value: boolean) => void;
  canCreateTasks: boolean;
  onCreateTasksChange: (value: boolean) => void;
  createTaskApproval: "on_risk" | "always";
  onCreateTaskApprovalChange: (value: "on_risk" | "always") => void;
  canUpdateTasks: boolean;
  onUpdateTasksChange: (value: boolean) => void;
  canCreateQuiz: boolean;
  onCreateQuizChange: (value: boolean) => void;
  canGenerateCourse: boolean;
  onGenerateCourseChange: (value: boolean) => void;
  canSaveArtifact: boolean;
  onSaveArtifactChange: (value: boolean) => void;
  canSaveMemory: boolean;
  onSaveMemoryChange: (value: boolean) => void;
}) {
  return (
    <div className="workspace-agent-action-controls" aria-label="Allowed actions">
      <div className="workspace-agent-action-group">
        <strong>Context actions</strong>
        <AgentActionToggle checked={canSearchMessages} onChange={onSearchMessagesChange} label="Can search workspace messages" />
        <AgentActionToggle checked={canSummarize} onChange={onSummarizeChange} label="Can summarize chat" />
      </div>
      <div className="workspace-agent-action-group">
        <strong>Task actions</strong>
        <AgentActionToggle checked={canCreateTasks} onChange={onCreateTasksChange} label="Can create tasks" />
        {canCreateTasks ? (
          <select
            aria-label="Create task approval"
            value={createTaskApproval}
            onChange={(event) => onCreateTaskApprovalChange(event.target.value as "on_risk" | "always")}
          >
            <option value="on_risk">Ask when risky</option>
            <option value="always">Always ask first</option>
          </select>
        ) : null}
        <AgentActionToggle checked={canUpdateTasks} onChange={onUpdateTasksChange} label="Can update tasks" />
      </div>
      <div className="workspace-agent-action-group">
        <strong>Learning artifact actions</strong>
        <AgentActionToggle checked={canCreateQuiz} onChange={onCreateQuizChange} label="Can create practice quizzes" />
        <AgentActionToggle checked={canGenerateCourse} onChange={onGenerateCourseChange} label="Can generate course drafts" />
        <AgentActionToggle checked={canSaveArtifact} onChange={onSaveArtifactChange} label="Can save learning artifacts" />
      </div>
      <div className="workspace-agent-action-group">
        <strong>Memory actions</strong>
        <AgentActionToggle checked={canSaveMemory} onChange={onSaveMemoryChange} label="Can save reviewable memories" />
      </div>
    </div>
  );
}

function AgentActionToggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function AgentSkillControls({
  selectedSkillPaths,
  storedSkills,
  loadingStoredSkills,
  editingSkillPath,
  deletingSkillPath,
  skillHistoryPath,
  skillVersionsByPath,
  loadingSkillHistoryPath,
  restoringSkillVersionKey,
  onToggle,
  onEdit,
  onDelete,
  onHistory,
  onRestore,
}: {
  selectedSkillPaths: string[];
  storedSkills: WorkspaceAgentSkillOption[];
  loadingStoredSkills: boolean;
  editingSkillPath?: string;
  deletingSkillPath?: string;
  skillHistoryPath?: string;
  skillVersionsByPath?: Record<string, WorkspaceAgentSkillVersion[]>;
  loadingSkillHistoryPath?: string;
  restoringSkillVersionKey?: string;
  onToggle: (path: string) => void;
  onEdit?: (skill: WorkspaceAgentSkillOption) => void;
  onDelete?: (skill: WorkspaceAgentSkillOption) => void;
  onHistory?: (skill: WorkspaceAgentSkillOption) => void;
  onRestore?: (path: string, version: number) => void;
}) {
  return (
    <div className="workspace-agent-skill-controls" aria-label="Ways this agent works">
      {AGENT_SKILL_OPTIONS.map((skill) => (
        <label key={skill.path}>
          <input type="checkbox" checked={selectedSkillPaths.includes(skill.path)} onChange={() => onToggle(skill.path)} />
          {skill.label}
        </label>
      ))}
      {storedSkills.map((skill) => {
        const versions = skillVersionsByPath?.[skill.path] ?? [];
        const historyOpen = skillHistoryPath === skill.path;
        return (
          <div key={skill.path} className={editingSkillPath === skill.path ? "workspace-agent-skill-row editing" : "workspace-agent-skill-row"} title={skill.description}>
            <label>
              <input type="checkbox" checked={selectedSkillPaths.includes(skill.path)} onChange={() => onToggle(skill.path)} />
              <span>{skill.name}</span>
            </label>
            <div className="workspace-agent-skill-meta">
              <small>Version {skill.version ?? 1}</small>
              <span className="workspace-agent-skill-source">{formatWorkspaceAgentSkillSource(skill.source)}</span>
            </div>
            <div className="workspace-agent-skill-actions">
              <button type="button" onClick={() => onEdit?.(skill)}>Edit skill</button>
              <button type="button" onClick={() => onHistory?.(skill)}>Skill history</button>
              <button type="button" disabled={deletingSkillPath === skill.path} onClick={() => onDelete?.(skill)}>
                {deletingSkillPath === skill.path ? "Deleting..." : "Delete skill"}
              </button>
            </div>
            {historyOpen ? (
              <div className="workspace-agent-skill-history" aria-label="Skill history">
                {loadingSkillHistoryPath === skill.path ? <span>Loading skill history...</span> : null}
                {!loadingSkillHistoryPath && !versions.length ? <span>No saved versions yet.</span> : null}
                {versions.map((version) => {
                  const restoreKey = `${skill.path}:${version.version}`;
                  return (
                    <div key={version.version} className="workspace-agent-skill-version">
                      <div>
                        <strong>Version {version.version}</strong>
                        <span>{version.description}</span>
                      </div>
                      <button type="button" disabled={version.version === skill.version || restoringSkillVersionKey === restoreKey} onClick={() => onRestore?.(skill.path, version.version)}>
                        {restoringSkillVersionKey === restoreKey ? "Restoring..." : `Restore version ${version.version}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
      {loadingStoredSkills ? <span>Loading custom skills...</span> : null}
    </div>
  );
}

function formatWorkspaceAgentSkillSource(source: WorkspaceAgentSkillOption["source"]) {
  return source === "user" ? "Personal skill" : "Workspace skill";
}

function WorkspaceAgentLibraryPanel({
  agentProfiles,
  agentMembers,
  agentRuns,
  activeThread,
  startingDirectProfileId,
  onMentionAgent,
  onStartDirectChat,
}: {
  agentProfiles: WorkspaceAgentProfile[];
  agentMembers: WorkspaceMember[];
  agentRuns: WorkspaceAgentRun[];
  activeThread?: WorkspaceThread;
  startingDirectProfileId: string;
  onMentionAgent: (profile: WorkspaceAgentProfile) => void;
  onStartDirectChat: (profile: WorkspaceAgentProfile) => void;
}) {
  const joinedProfileIds = new Set(agentMembers.flatMap((member) => (member.agentProfileId ? [member.agentProfileId] : [])));
  const personalAgents = agentProfiles.filter((profile) => profile.visibility === "private");
  const workspaceAgents = agentProfiles.filter((profile) => profile.visibility !== "private");
  const previewProfiles = [...personalAgents, ...workspaceAgents.filter((profile) => !personalAgents.some((entry) => entry.id === profile.id))].slice(0, 6);
  return (
    <section className="workspace-panel workspace-agent-library-panel" aria-label="Agent library">
      <div className="workspace-panel-header">
        <strong>Agent library</strong>
        <span>{agentProfiles.length}</span>
      </div>
      <p>Review real saved agents without turning the workspace into a bot dashboard. Add saved agents from the same + flow.</p>
      <div className="workspace-agent-library-summary" aria-label="Agent library summary">
        <span>My agents: {personalAgents.length}</span>
        <span>Workspace agents: {workspaceAgents.length}</span>
      </div>
      {previewProfiles.length ? (
        <ul className="workspace-agent-library-list">
          {previewProfiles.map((profile) => {
            const joinedMember = agentMembers.find((member) => member.agentProfileId === profile.id);
            const runCount = agentRuns.filter((run) => run.agentProfileId === profile.id).length;
            const canMention = Boolean(joinedMember && activeThread);
            const directStarting = startingDirectProfileId === profile.id;
            const capabilities = formatAgentLibraryCapabilities(profile);
            return (
              <li key={profile.id} className="workspace-agent-library-card">
                <div>
                  <strong>{profile.displayName}</strong>
                  <span>{profile.description}</span>
                </div>
                <div className="workspace-agent-library-capabilities" aria-label={`${profile.displayName} capabilities`}>
                  {capabilities.map((capability) => (
                    <span key={capability}>{capability}</span>
                  ))}
                </div>
                <div className="workspace-agent-library-card-meta">
                  <small>{profile.visibility === "private" ? "Personal agent" : "Workspace agent"}</small>
                  <small>{joinedProfileIds.has(profile.id) ? "In workspace" : "Saved agent"}</small>
                  <small>{runCount ? `${runCount} runs` : "No runs yet"}</small>
                </div>
                <div className="workspace-agent-library-actions">
                  <button
                    type="button"
                    disabled={!canMention}
                    title={canMention ? `Mention ${profile.displayName} in the current chat` : "Add this agent to the workspace before mentioning it"}
                    onClick={() => onMentionAgent(profile)}
                  >
                    Mention in chat
                  </button>
                  <button type="button" disabled={directStarting} onClick={() => onStartDirectChat(profile)}>
                    {directStarting ? "Starting..." : "Start direct chat"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="workspace-agent-library-empty">No saved agents yet.</span>
      )}
    </section>
  );
}

function AgentPickerCapabilityHints({ hints }: { hints: string[] }) {
  if (!hints.length) return null;
  return (
    <div className="workspace-agent-picker-hints" aria-label="Agent capability hints">
      {hints.map((hint) => (
        <small key={hint}>{hint}</small>
      ))}
    </div>
  );
}

function formatAgentLibraryCapabilities(profile: WorkspaceAgentProfile) {
  const enabledCapabilities = profile.capabilities.filter((capability) => capability.enabled);
  const skillCount = enabledCapabilities.filter((capability) => capability.kind === "skill").length;
  const actionCount = enabledCapabilities.filter((capability) => capability.kind === "internal_tool").length;
  const connectionCount = enabledCapabilities.filter((capability) => capability.kind === "mcp_tool").length;
  const delegateCount = enabledCapabilities.filter((capability) => capability.kind === "subagent").length;
  return [
    `Skills: ${skillCount}`,
    `Actions: ${actionCount}`,
    connectionCount ? `Connections: ${connectionCount}` : "",
    delegateCount ? `Delegates: ${delegateCount}` : "",
    `Memory: ${formatAgentLibraryMemory(profile.memoryScope)}`,
  ].filter(Boolean);
}

function formatAgentLibraryMemory(memoryScope: WorkspaceAgentProfile["memoryScope"]) {
  if (memoryScope === "none") return "off";
  if (memoryScope === "user") return "personal";
  return memoryScope;
}

function formatAgentPickerCapabilityHints(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>, memoryScope: WorkspaceAgentProfile["memoryScope"]) {
  const enabledCapabilities = capabilities.filter((capability) => capability.enabled);
  const skillCount = enabledCapabilities.filter((capability) => capability.kind === "skill").length;
  const actionCount = enabledCapabilities.filter((capability) => capability.kind === "internal_tool").length;
  const connectionCount = enabledCapabilities.filter((capability) => capability.kind === "mcp_tool").length;
  return [
    skillCount ? `${skillCount} skills` : "",
    actionCount ? `${actionCount} actions` : "",
    connectionCount ? `${connectionCount} connections` : "",
    `Memory: ${formatAgentLibraryMemory(memoryScope)}`,
  ].filter(Boolean).slice(0, 3);
}

function agentPickerSearchValues(profile: WorkspaceAgentProfile | WorkspaceAgentTemplate) {
  return [
    profile.displayName,
    profile.description,
    "key" in profile ? profile.key : profile.handle,
    "visibility" in profile ? profile.visibility : "",
    profile.memoryScope,
    formatAgentLibraryMemory(profile.memoryScope),
    ...profile.capabilities.flatMap((capability) => {
      if (!capability.enabled) return [];
      if (capability.kind === "skill") return [capability.path, readableCapabilityName(capability.path), skillLabelForPath(capability.path), capability.source];
      if (capability.kind === "internal_tool") return [capability.toolName, readableCapabilityName(capability.toolName), capability.approval];
      if (capability.kind === "mcp_tool") return [capability.toolName, readableCapabilityName(capability.toolName), capability.connectionId, capability.approval];
      return [capability.agentProfileId, "delegate", "subagent"];
    }),
  ];
}

function skillLabelForPath(path: string) {
  return AGENT_SKILL_OPTIONS.find((skill) => skill.path === path)?.label ?? "";
}

function readableCapabilityName(value: string) {
  return value.split("/").pop()?.replace(/[_-]+/g, " ") ?? value;
}

function agentPickerMatchesQuery(query: string, values: string[]) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return values.some((value) => value.toLowerCase().includes(normalizedQuery));
}

function WorkspaceAgentConnectionPanel({
  connections,
  connectionName,
  onConnectionNameChange,
  connectionScope,
  onConnectionScopeChange,
  connectionTransport,
  onConnectionTransportChange,
  connectionRef,
  onConnectionRefChange,
  connectionTools,
  onConnectionToolsChange,
  savingConnection,
  updatingConnectionIds,
  onCreateConnection,
  onToggleConnectionStatus,
}: {
  connections: WorkspaceAgentConnection[];
  connectionName: string;
  onConnectionNameChange: (value: string) => void;
  connectionScope: WorkspaceAgentConnection["scope"];
  onConnectionScopeChange: (value: WorkspaceAgentConnection["scope"]) => void;
  connectionTransport: WorkspaceAgentConnection["transport"];
  onConnectionTransportChange: (value: WorkspaceAgentConnection["transport"]) => void;
  connectionRef: string;
  onConnectionRefChange: (value: string) => void;
  connectionTools: string;
  onConnectionToolsChange: (value: string) => void;
  savingConnection: boolean;
  updatingConnectionIds: Record<string, boolean>;
  onCreateConnection: (event: React.FormEvent<HTMLFormElement>) => void;
  onToggleConnectionStatus: (connection: WorkspaceAgentConnection) => void;
}) {
  return (
    <section className="workspace-panel workspace-agent-connection-panel" aria-label="Connections">
      <div className="workspace-panel-header">
        <strong>Connections</strong>
        <span>{connections.length}</span>
      </div>
      <p>Register external capabilities first. Agents can use them only after a profile explicitly allowlists a tool.</p>
      <form className="workspace-quick-form compact workspace-agent-connection-form" onSubmit={onCreateConnection}>
        <input aria-label="Connection name" value={connectionName} onChange={(event) => onConnectionNameChange(event.target.value)} placeholder="Connection name" />
        <select
          aria-label="Connection scope"
          value={connectionScope}
          onChange={(event) => onConnectionScopeChange(event.target.value as WorkspaceAgentConnection["scope"])}
        >
          <option value="workspace">Workspace connection</option>
          <option value="user">Personal connection</option>
        </select>
        <select
          aria-label="Connection transport"
          value={connectionTransport}
          onChange={(event) => onConnectionTransportChange(event.target.value as WorkspaceAgentConnection["transport"])}
        >
          <option value="http">HTTP</option>
          <option value="sse">SSE</option>
          <option value="stdio">Local process</option>
        </select>
        <input aria-label="Connection reference" value={connectionRef} onChange={(event) => onConnectionRefChange(event.target.value)} placeholder="Reference or secret key id" />
        <textarea
          aria-label="Allowed connection tools"
          value={connectionTools}
          onChange={(event) => onConnectionToolsChange(event.target.value)}
          placeholder="Allowed tools, comma or line separated"
          rows={2}
        />
        <button type="submit" disabled={savingConnection}>{savingConnection ? "Saving..." : "Save connection"}</button>
      </form>
      {connections.length ? (
        <ul className="workspace-agent-connection-list">
          {connections.slice(0, 6).map((connection) => (
            <li key={connection.id} className="workspace-agent-connection-card">
              <div>
                <strong>{connection.displayName}</strong>
                <span>{connection.allowedToolNames.join(", ")}</span>
              </div>
              <small>{connection.scope === "user" ? "Personal connection" : "Workspace connection"}</small>
              <small>{connection.status === "disabled" ? "Disabled" : connection.transport.toUpperCase()}</small>
              <button
                type="button"
                disabled={Boolean(updatingConnectionIds[connection.id])}
                onClick={() => onToggleConnectionStatus(connection)}
              >
                {updatingConnectionIds[connection.id]
                  ? "Updating..."
                  : connection.status === "disabled"
                    ? "Enable connection"
                    : "Disable connection"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <span className="workspace-agent-connection-empty">No connections saved yet.</span>
      )}
    </section>
  );
}

function WorkspaceAgentMemoryPanel({
  agentMemories,
  activeThreadId,
  agentProfiles,
  archivingMemoryIds,
  onArchive,
}: {
  agentMemories: WorkspaceAgentMemory[];
  activeThreadId?: string;
  agentProfiles: WorkspaceAgentProfile[];
  archivingMemoryIds: Record<string, boolean>;
  onArchive: (memory: WorkspaceAgentMemory) => void;
}) {
  const visibleMemories = agentMemories
    .filter((memory) => memory.scope !== "thread" || !activeThreadId || memory.threadId === activeThreadId)
    .slice(0, 5);
  return (
    <section className="workspace-panel workspace-agent-memory-panel" aria-label="Memory review">
      <div className="workspace-panel-header">
        <strong>Memory review</strong>
        <span>{visibleMemories.length}</span>
      </div>
      <p>Review what agents can remember. These are real saved memory records, not hidden prompt text or mock activity.</p>
      {visibleMemories.length ? (
        <ul className="workspace-agent-memory-list">
          {visibleMemories.map((memory) => {
            const profile = agentProfiles.find((entry) => entry.id === memory.agentProfileId);
            return (
              <li key={memory.id} className="workspace-agent-memory-card">
                <div>
                  <span className={`workspace-agent-memory-scope ${memory.scope}`}>{workspaceAgentMemoryScopeLabel(memory.scope)}</span>
                  <strong>{memory.title}</strong>
                  <p>{memory.summary}</p>
                </div>
                <div className="workspace-agent-memory-meta">
                  {profile ? <span>Agent: {profile.displayName}</span> : null}
                  {memory.sourceRunId ? <span>Source run: {shortId(memory.sourceRunId)}</span> : null}
                  {memory.sourceMessageId ? <span>Source message: {shortId(memory.sourceMessageId)}</span> : null}
                </div>
                <div className="workspace-agent-memory-actions">
                  <button type="button" disabled={Boolean(archivingMemoryIds[memory.id])} onClick={() => onArchive(memory)}>
                    {archivingMemoryIds[memory.id] ? "Archiving..." : "Archive memory"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="workspace-agent-memory-empty">
          <strong>No memories saved yet</strong>
          <span>When an agent saves reviewable context, it will appear here with scope and source links.</span>
        </div>
      )}
    </section>
  );
}

function WorkspaceAgentSkillReviewPanel({
  skills,
  loadingSkills,
  skillHistoryPath,
  skillVersionsByPath,
  loadingSkillHistoryPath,
  restoringSkillVersionKey,
  onEdit,
  onHistory,
  onRestore,
}: {
  skills: WorkspaceAgentSkillOption[];
  loadingSkills: boolean;
  skillHistoryPath: string;
  skillVersionsByPath: Record<string, WorkspaceAgentSkillVersion[]>;
  loadingSkillHistoryPath: string;
  restoringSkillVersionKey: string;
  onEdit: (skill: WorkspaceAgentSkillOption) => void;
  onHistory: (skill: WorkspaceAgentSkillOption) => void;
  onRestore: (path: string, version: number) => void;
}) {
  return (
    <section className="workspace-panel workspace-agent-skill-review-panel" aria-label="Skill library">
      <div className="workspace-panel-header">
        <strong>Skill library</strong>
        <a href="/workspace/review?tab=skills">Review skills</a>
        <span>{skills.length}</span>
      </div>
      <p>Review skills, inspect version history, and restore earlier behavior without opening every agent builder.</p>
      {loadingSkills ? <span className="workspace-agent-skill-review-empty">Loading skills...</span> : null}
      {!loadingSkills && !skills.length ? <span className="workspace-agent-skill-review-empty">No custom skills yet.</span> : null}
      {skills.map((skill) => {
        const versions = skillVersionsByPath[skill.path] ?? [];
        const historyOpen = skillHistoryPath === skill.path;
        return (
          <article key={skill.path} className="workspace-agent-skill-review-card">
            <header>
              <div>
                <strong>{skill.name}</strong>
                <span>{skill.description}</span>
              </div>
              <span className="workspace-agent-skill-source">{formatWorkspaceAgentSkillSource(skill.source)}</span>
            </header>
            <div className="workspace-agent-skill-review-meta">
              <span>Version {skill.version}</span>
              <span>{skill.path}</span>
            </div>
            <div className="workspace-agent-skill-actions">
              <button type="button" onClick={() => onEdit(skill)}>Edit skill</button>
              <button type="button" onClick={() => onHistory(skill)}>{historyOpen ? "Hide history" : "Review skills"}</button>
            </div>
            {historyOpen ? (
              <div className="workspace-agent-skill-history" aria-label="Skill history">
                {loadingSkillHistoryPath === skill.path ? <span>Loading skill history...</span> : null}
                {!loadingSkillHistoryPath && !versions.length ? <span>No saved versions yet.</span> : null}
                {versions.map((version) => {
                  const restoreKey = `${skill.path}:${version.version}`;
                  return (
                    <div key={version.version} className="workspace-agent-skill-version">
                      <div>
                        <strong>Version {version.version}</strong>
                        <span>{version.description}</span>
                      </div>
                      <button type="button" disabled={version.version === skill.version || restoringSkillVersionKey === restoreKey} onClick={() => onRestore(skill.path, version.version)}>
                        {restoringSkillVersionKey === restoreKey ? "Restoring..." : `Restore version ${version.version}`}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </section>
  );
}

function WorkspaceAgentSkillEditForm({
  editingSkillPath,
  skillEditName,
  skillEditDescription,
  skillEditInstructions,
  updatingSkillPath,
  onNameChange,
  onDescriptionChange,
  onInstructionsChange,
  onSave,
  onCancel,
}: {
  editingSkillPath: string;
  skillEditName: string;
  skillEditDescription: string;
  skillEditInstructions: string;
  updatingSkillPath: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (!editingSkillPath) return null;
  return (
    <div className="workspace-agent-skill-edit" aria-label="Edit custom skill">
      <input aria-label="Skill edit name" value={skillEditName} onChange={(event) => onNameChange(event.target.value)} placeholder="Skill edit name" />
      <textarea aria-label="Skill edit description" value={skillEditDescription} onChange={(event) => onDescriptionChange(event.target.value)} placeholder="When should the agent use this skill?" rows={2} />
      <textarea aria-label="Skill edit instructions" value={skillEditInstructions} onChange={(event) => onInstructionsChange(event.target.value)} placeholder="Updated instructions" rows={3} />
      <div>
        <button type="button" onClick={onCancel}>Cancel</button>
        <button type="button" disabled={updatingSkillPath === editingSkillPath} onClick={onSave}>
          {updatingSkillPath === editingSkillPath ? "Saving skill..." : "Save skill"}
        </button>
      </div>
    </div>
  );
}

function AgentRunStatusChip({
  run,
  events,
  expanded,
  onToggle,
}: {
  run: WorkspaceAgentRun;
  events: WorkspaceAgentRunEvent[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const lastEvent = events.at(-1);
  const deepAgentThreadId = events
    .map((event) => readPayloadString(event.payload, "deepAgentThreadId"))
    .find(Boolean);
  return (
    <button
      type="button"
      className={`workspace-agent-run-chip ${run.status}`}
      aria-expanded={expanded}
      onClick={onToggle}
      title={deepAgentThreadId ? `Run ${run.id} / ${deepAgentThreadId}` : `Run ${run.id}`}
    >
      <span className="workspace-agent-run-dot" aria-hidden="true" />
      <strong>{formatRunStatus(run.status)}</strong>
      <span>{formatRunTrigger(run.trigger)}</span>
      {lastEvent ? <span>{lastEvent.label}</span> : null}
      {events.length ? <span>{events.length} events</span> : null}
      <span>{expanded ? "Hide" : "Details"}</span>
    </button>
  );
}

function AgentRunInlineDetail({
  run,
  events,
  approvals,
  cancelling,
  retrying,
  onCancel,
  onRetry,
}: {
  run: WorkspaceAgentRun;
  events: WorkspaceAgentRunEvent[];
  approvals: WorkspaceAgentApproval[];
  cancelling: boolean;
  retrying: boolean;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const visibleEvents = events.slice(-6);
  return (
    <section className="workspace-agent-run-detail" aria-label="Run details">
      <header>
        <strong>Run details</strong>
        <span>{run.id}</span>
      </header>
      <div className="workspace-agent-run-summary">
        <span>Status: {formatRunStatus(run.status)}</span>
        <span>Trigger: {formatRunTrigger(run.trigger)}</span>
        {run.error ? <span>Error: {run.error}</span> : null}
        {approvals.length ? <span>Approvals: {approvals.map((approval) => approval.status).join(", ")}</span> : null}
      </div>
      {isCancellableAgentRun(run.status) ? (
        <div className="workspace-agent-run-actions">
          <button type="button" disabled={cancelling} onClick={onCancel}>
            {cancelling ? "Cancelling..." : "Cancel run"}
          </button>
        </div>
      ) : null}
      {isRetryableAgentRun(run.status) ? (
        <div className="workspace-agent-run-actions">
          <button type="button" disabled={retrying} onClick={onRetry}>
            {retrying ? "Retrying..." : "Retry run"}
          </button>
        </div>
      ) : null}
      <ul className="workspace-agent-run-events">
        {visibleEvents.map((event) => (
          <li key={event.id}>
            <span>{formatTime(event.createdAt)}</span>
            <strong>{event.label}</strong>
            <small>{event.type}</small>
          </li>
        ))}
        {!visibleEvents.length ? <li>No run events recorded yet.</li> : null}
      </ul>
    </section>
  );
}

function AgentApprovalCard({
  approvals,
  decidingApprovalIds,
  onDecision,
}: {
  approvals: WorkspaceAgentApproval[];
  decidingApprovalIds: Record<string, boolean>;
  onDecision: (approval: WorkspaceAgentApproval, decision: "approved" | "denied") => void;
}) {
  const pending = approvals.find((approval) => approval.status === "pending");
  if (!pending) return null;
  const busy = Boolean(decidingApprovalIds[pending.id]);
  const display = readWorkspaceApprovalDisplay(pending);
  return (
    <div className="workspace-agent-approval-card">
      <div>
        <span>Needs approval</span>
        <strong>{display.title}</strong>
        <p>{display.description}</p>
        <div className="workspace-agent-approval-meta" aria-label="Approval request details">
          <span>Requested action</span>
          <strong>{display.action}</strong>
          {display.item ? (
            <>
              <span>Requested item</span>
              <strong>{display.item}</strong>
            </>
          ) : null}
        </div>
      </div>
      <div className="workspace-agent-approval-actions">
        <button type="button" disabled={busy} onClick={() => onDecision(pending, "approved")}>
          Approve
        </button>
        <button type="button" disabled={busy} onClick={() => onDecision(pending, "denied")}>
          Deny
        </button>
      </div>
    </div>
  );
}

function readWorkspaceApprovalDisplay(approval: WorkspaceAgentApproval) {
  const policy = readRecord(approval.policy);
  const input = readRecord(approval.input);
  const visibleLabel = readString(policy?.visibleLabel);
  const actionDescription = readString(policy?.actionDescription) ?? readString(policy?.description);
  const title = visibleLabel ?? formatToolName(approval.toolName);
  const inputTitle =
    readString(input?.title) ??
    readString(input?.topic) ??
    readString(input?.learningGoal) ??
    readString(input?.taskId);
  return {
    title,
    description: actionDescription ?? "Review this action before the agent changes workspace state.",
    action: formatToolName(approval.toolName),
    item: inputTitle,
  };
}

function readRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readPayloadString(payload: unknown, key: string) {
  if (!payload || typeof payload !== "object") return undefined;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function formatToolName(toolName: string) {
  return toolName.replace(/_/g, " ");
}

function formatRunStatus(status: WorkspaceAgentRun["status"]) {
  return status.replace(/_/g, " ");
}

function formatRunTrigger(trigger: WorkspaceAgentRun["trigger"]) {
  return trigger.replace(/_/g, " ");
}

function isCancellableAgentRun(status: WorkspaceAgentRun["status"]) {
  return status === "queued" || status === "running" || status === "waiting_for_approval";
}

function isRetryableAgentRun(status: WorkspaceAgentRun["status"]) {
  return status === "failed" || status === "cancelled";
}

function formatTaskAssigneeOption(member: WorkspaceMember) {
  return `${member.displayName} / ${isAgentMember(member) ? "Agent collaborator" : "Person collaborator"}`;
}

function readAgentToolState(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  const searchMessages = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "search_workspace_messages");
  const summarize = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "summarize_thread");
  const createTask = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "create_workspace_task");
  const updateTask = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "update_workspace_task");
  const createQuiz = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "create_quiz");
  const generateCourse = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "generate_course");
  const saveArtifact = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "save_learning_artifact");
  const saveMemory = capabilities.find((capability) => capability.kind === "internal_tool" && capability.toolName === "save_agent_memory");
  return {
    canSearchMessages: Boolean(searchMessages?.enabled),
    canSummarize: Boolean(summarize?.enabled),
    canCreateTasks: Boolean(createTask?.enabled),
    canUpdateTasks: Boolean(updateTask?.enabled),
    canCreateQuiz: Boolean(createQuiz?.enabled),
    canGenerateCourse: Boolean(generateCourse?.enabled),
    canSaveArtifact: Boolean(saveArtifact?.enabled),
    canSaveMemory: Boolean(saveMemory?.enabled),
    createTaskApproval:
      createTask?.kind === "internal_tool" && (createTask.approval === "always" || createTask.approval === "on_risk")
        ? createTask.approval
        : "on_risk",
  };
}

function readAgentSkillPaths(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  return capabilities.flatMap((capability) => (capability.kind === "skill" && capability.enabled ? [capability.path] : []));
}

function readAgentDelegateProfileIds(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  return capabilities.flatMap((capability) => (capability.kind === "subagent" && capability.enabled ? [capability.agentProfileId] : []));
}

function readAgentConnectionToolKeys(capabilities: Array<WorkspaceAgentCapability | WorkspaceAgentCapabilityInput>) {
  return capabilities.flatMap((capability) => (capability.kind === "mcp_tool" && capability.enabled ? [connectionToolKey(capability.connectionId, capability.toolName)] : []));
}

function filterAvailableAgentConnectionToolKeys(keys: string[], connections: WorkspaceAgentConnection[]) {
  const availableKeys = new Set(
    connections
      .filter((connection) => connection.status !== "disabled")
      .flatMap((connection) => connection.allowedToolNames.map((toolName) => connectionToolKey(connection.id, toolName))),
  );
  return keys.filter((key) => availableKeys.has(key));
}

function connectionToolKey(connectionId: string, toolName: string) {
  return `${encodeURIComponent(connectionId)}:${encodeURIComponent(toolName)}`;
}

function connectionToolFromKey(key: string) {
  const separator = key.indexOf(":");
  if (separator < 1) return undefined;
  const connectionId = decodeURIComponent(key.slice(0, separator));
  const toolName = decodeURIComponent(key.slice(separator + 1));
  return connectionId && toolName ? { connectionId, toolName } : undefined;
}

function toggleAgentSkill(current: string[], path: string) {
  return current.includes(path) ? current.filter((entry) => entry !== path) : [...current, path];
}

function toggleAgentDelegate(current: string[], profileId: string) {
  return current.includes(profileId) ? current.filter((entry) => entry !== profileId) : [...current, profileId];
}

function toggleAgentConnectionTool(current: string[], key: string) {
  return current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key];
}

function buildAgentCapabilityInputs(input: {
  name: string;
  canSearchMessages: boolean;
  canSummarize: boolean;
  canCreateTasks: boolean;
  createTaskApproval: "on_risk" | "always";
  canUpdateTasks: boolean;
  canCreateQuiz: boolean;
  canGenerateCourse: boolean;
  canSaveArtifact: boolean;
  canSaveMemory: boolean;
  existingCapabilities?: WorkspaceAgentCapability[];
  selectedSkillPaths?: string[];
  selectedDelegateProfileIds?: string[];
  selectedConnectionToolKeys?: string[];
}): WorkspaceAgentCapabilityInput[] {
  const selectedSkillPaths = input.selectedSkillPaths ?? [];
  const baseCapabilities =
    input.existingCapabilities
      ?.flatMap((capability): WorkspaceAgentCapabilityInput[] => {
        if (capability.kind === "internal_tool" || capability.kind === "skill" || capability.kind === "subagent" || input.selectedConnectionToolKeys) return [];
        if (capability.kind === "mcp_tool") {
          return [{
            kind: "mcp_tool",
            connectionId: capability.connectionId,
            toolName: capability.toolName,
            approval: capability.approval,
            enabled: capability.enabled,
          }];
        }
        return [];
      }) ?? [];
  const capabilities: WorkspaceAgentCapabilityInput[] = [
    ...baseCapabilities,
    ...selectedSkillPaths.map((path): WorkspaceAgentCapabilityInput => ({
      kind: "skill",
      source: path.startsWith("/workspace-skills/") ? "workspace" : path.startsWith("/user-skills/") ? "user" : "system",
      path,
      enabled: true,
    })),
    ...(input.selectedDelegateProfileIds ?? []).map((agentProfileId): WorkspaceAgentCapabilityInput => ({
      kind: "subagent",
      agentProfileId,
      enabled: true,
    })),
    ...(input.selectedConnectionToolKeys ?? [])
      .map(connectionToolFromKey)
      .filter((selection): selection is { connectionId: string; toolName: string } => Boolean(selection))
      .map((selection): WorkspaceAgentCapabilityInput => ({
        kind: "mcp_tool",
        connectionId: selection.connectionId,
        toolName: selection.toolName,
        approval: "always",
        enabled: true,
      })),
  ];
  if (input.canSearchMessages) {
    capabilities.push({ kind: "internal_tool", toolName: "search_workspace_messages", approval: "never", enabled: true });
  }
  if (input.canSummarize) {
    capabilities.push({ kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true });
  }
  if (input.canCreateTasks) {
    capabilities.push({ kind: "internal_tool", toolName: "create_workspace_task", approval: input.createTaskApproval, enabled: true });
  }
  if (input.canUpdateTasks) {
    capabilities.push({ kind: "internal_tool", toolName: "update_workspace_task", approval: "on_risk", enabled: true });
  }

  if (input.canCreateQuiz) {
    capabilities.push({ kind: "internal_tool", toolName: "create_quiz", approval: "never", enabled: true });
  }
  if (input.canGenerateCourse) {
    capabilities.push({ kind: "internal_tool", toolName: "generate_course", approval: "always", enabled: true });
  }
  if (input.canSaveArtifact) {
    capabilities.push({ kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true });
  }
  if (input.canSaveMemory) {
    capabilities.push({ kind: "internal_tool", toolName: "save_agent_memory", approval: "always", enabled: true });
  }
  return capabilities;
}

function hasEnabledAgentCapabilities(capabilities: WorkspaceAgentCapabilityInput[]) {
  return capabilities.some((capability) => capability.enabled);
}
