import { and, asc, desc, eq, inArray, lt, or } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "../db/client";
import type { WorkspaceAgentRuntimeEvent, WorkspaceAgentRuntimeRunner, WorkspaceAgentRuntimeRunnerInput } from "./agent-runtime";
import {
  buildAgentRunEvent,
  buildPendingWorkspaceAgentApprovals,
  buildWorkspaceAgentProfileRunSnapshot,
  buildWorkspaceRuntimeVisibleMessages,
  createWorkspaceAgentRunId,
  isTerminalAgentRunStatus,
  readObject,
  readOptionalNumber,
  readOptionalString,
  readStringArray,
} from "./agent-run-helpers";
import {
  rowToWorkspaceAgentApproval,
  rowToWorkspaceAgentRun,
  rowToWorkspaceAgentRunEvent,
  rowToWorkspaceMessage,
} from "./agent-run-persistence";
import { rowToWorkspaceMember } from "./workspace-member-service";
import {
  assertAgentCapabilityConnections as assertAgentCapabilityConnectionsWithContext,
  normalizeConnectionToolNames,
  requireWorkspaceAgentConnection as requireWorkspaceAgentConnectionWithContext,
  type WorkspaceAgentConnectionServiceContext,
} from "./agent-connection-service";
import {
  assertDbWorkspaceAgentMemorySourceVisibility as assertDbWorkspaceAgentMemorySourceVisibilityWithContext,
  assertLocalWorkspaceAgentMemorySourceVisibility,
  isDbWorkspaceAgentMemoryVisibleToOwner,
  isLocalWorkspaceAgentMemoryVisibleToOwner,
  rowToWorkspaceAgentMemory,
  type WorkspaceAgentMemoryServiceContext,
} from "./agent-memory-service";
import {
  assertAgentConnectionToolCapabilities,
  assertAgentInternalToolCapabilities,
  assertAgentProfileHasRunnableCapability,
  assertAgentProfileTextGuardrails,
  assertAgentSkillCapabilityPaths,
  buildAgentCapabilities,
  createUniqueAgentHandle,
  slugifyAgentHandle,
  WORKSPACE_AGENT_TEMPLATES,
} from "./agent-profile-rules";
import {
  capabilityToDbRow,
  filterAgentCapabilitiesByVisibleConnections,
  groupAgentCapabilitiesByProfileId,
  rowToWorkspaceAgentConnection,
  rowToWorkspaceAgentProfile,
} from "./agent-profile-persistence";
import {
  assertCanManageWorkspaceAgentProfile as assertCanManageWorkspaceAgentProfileWithContext,
  listDbVisibleAgentProfileIds,
  mergeHiddenReferenceCapabilityInputsForDbUpdate,
  requireWorkspaceAgentProfile as requireWorkspaceAgentProfileWithContext,
  type WorkspaceAgentProfileServiceContext,
} from "./agent-profile-service";
import {
  decideWorkspaceAgentsForMessage,
  isWorkspaceAgentMember,
  type WorkspaceAgentTriggerDecision,
  type WorkspaceAgentParticipant,
} from "./agent-triggers";
import { notifyWorkspaceChanged } from "./events";
import {
  alignWorkspaceArtifactCompatibilitySnapshot,
  buildWorkspaceArtifactFromMessage,
  buildWorkspaceArtifactRecord,
  dbWorkspaceArtifactValues,
  defaultWorkspaceArtifactReviewStatus,
  inferWorkspaceArtifactKind,
  rowToWorkspaceArtifact,
  upsertWorkspaceArtifact,
  type WorkspaceArtifactMessageBundle,
  type WorkspaceArtifactSeedInput,
} from "./workspace-artifact-service";
import {
  assertDbWorkspaceTaskSourceVisibility as assertDbWorkspaceTaskSourceVisibilityWithContext,
  assertLocalWorkspaceTaskSourceVisibility,
  buildTaskMetadata,
  readTaskMetadata,
  rowToWorkspaceTask,
  type WorkspaceTaskServiceContext,
} from "./workspace-task-service";
import {
  buildDbThreadParticipantRows,
  buildLocalDirectParticipantIds,
  groupThreadMembersByThreadId,
  isDbThreadVisibleToOwner,
  normalizeParticipantIds,
  normalizeWorkspaceThreadAgentTriggerMode,
  normalizeWorkspaceThreadAllowedAgentProfileIds,
  rowToWorkspaceThread,
} from "./workspace-thread-service";
import { rowToWorkspaceSummary } from "./workspace-summary-service";
import { buildMessage, bumpThread, limitMessagesPerThread, MESSAGE_WINDOW_PER_THREAD, nextMessageTimestamp } from "./workspace-message-service";
import { withMessageWindow, withPersonalAgentLibrary, withVisibleAgentMemories, withWorkspaceList } from "./workspace-local-view-service";
import {
  listDbVisibleWorkspaceThreadIds,
  requireDbThread,
  requireDbWorkspace,
  requireDbWorkspaceOwner,
  usesDatabase,
} from "./workspace-access-service";
import {
  buildWorkspaceAgentEventView,
  buildWorkspaceAgentPageEventView,
  buildWorkspaceAgentRunResultEventView,
} from "./agent-event-views";
import {
  workspaceAgentCapabilities,
  workspaceAgentConnections,
  workspaceAgentApprovals,
  workspaceAgentMemories,
  workspaceAgentRunEvents,
  workspaceAgentRuns,
  workspaceAgentProfiles,
  workspaceArtifacts,
  workspaceMembers,
  workspaceMessages,
  workspaces,
  workspaceTasks,
  workspaceThreadMembers,
  workspaceThreads,
} from "../db/schema";
import type {
  ArchiveWorkspaceAgentMemoryInput,
  ArchiveWorkspaceAgentMemoriesInput,
  CreateWorkspaceAgentConnectionInput,
  CreateWorkspaceAgentMemberInput,
  CreateWorkspaceAgentMemoryInput,
  CreateWorkspaceAgentProfileInput,
  CreateWorkspaceMemberInput,
  CreateWorkspaceMessageInput,
  CreateWorkspaceInput,
  CreateWorkspaceTaskInput,
  CreateWorkspaceThreadInput,
  DeleteWorkspaceAgentProfileInput,
  DeleteWorkspaceAgentMemoryInput,
  DecideWorkspaceAgentApprovalInput,
  JoinWorkspaceInput,
  ListWorkspaceAgentMemoriesInput,
  RestoreWorkspaceAgentMemoryInput,
  UpdateWorkspaceAgentProfileInput,
  UpdateWorkspaceAgentConnectionInput,
  UpdateWorkspaceThreadInput,
  UpdateWorkspaceTaskInput,
  CancelWorkspaceAgentRunInput,
  RetryWorkspaceAgentRunInput,
  WorkspaceAgentApproval,
  WorkspaceAgentApprovalDecisionResult,
  WorkspaceAgentMemory,
  WorkspaceAgentMemoryPage,
  WorkspaceArtifact,
  WorkspaceArtifactKind,
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceMessageArtifact,
  WorkspaceMessagePage,
  WorkspaceAgentCapability,
  WorkspaceAgentCapabilityInput,
  WorkspaceAgentConnection,
  WorkspaceAgentProfile,
  WorkspaceAgentRun,
  WorkspaceAgentRunCancelResult,
  WorkspaceAgentRunDetail,
  WorkspaceAgentRunEvent,
  WorkspaceAgentRunPage,
  WorkspaceAgentRunStatus,
  WorkspaceAgentRunTrigger,
  WorkspaceSummary,
  WorkspaceAgentRunResult,
  WorkspaceAgentTemplate,
  WorkspaceTask,
  WorkspaceThread,
  WorkspaceView,
} from "./types";

export { buildWorkspaceArtifactFromMessage } from "./workspace-artifact-service";

type WorkspaceAgentRuntimeModule = typeof import("./agent-runtime");

function loadWorkspaceAgentRuntime(): Promise<WorkspaceAgentRuntimeModule> {
  return import("./agent-runtime");
}

function buildWorkspaceAgentRunThreadId(input: {
  workspaceId: string;
  threadId: string;
  agentProfileId: string;
  runId: string;
}) {
  return `workspace:${input.workspaceId}:thread:${input.threadId}:agent:${input.agentProfileId}:run:${input.runId}`;
}

function composeWorkspaceTaskPlaceholderResult(agent: WorkspaceMember, task: WorkspaceTask) {
  const scope = task.scope || "Workspace";
  const title = summarizeWorkspacePrompt(task.title);
  return `${agent.displayName} prepared a first pass for ${scope}: ${title}. Next step: review it in this thread and reopen the task if it needs another iteration.`;
}

function summarizeWorkspacePrompt(value: string) {
  const sentence = value.replace(/\s+/g, " ").trim();
  if (sentence.length <= 160) return sentence;
  return `${sentence.slice(0, 157)}...`;
}

function emptyWorkspaceAgentRunResult(): WorkspaceAgentRunResult {
  return { messages: [], runs: [], events: [], agentEvents: [], agentSignals: [] };
}

function emptyWorkspaceAgentRunPage(): WorkspaceAgentRunPage {
  return { runs: [], events: [], agentEvents: [], agentSignals: [], approvals: [] };
}

const DB_WORKSPACE_VIEW_CACHE_TTL_MS = 30_000;
const DB_WORKSPACE_SHELL_CACHE_TTL_MS = 5 * 60_000;
const DB_SEED_WORKSPACE_CHECK_TTL_MS = 5 * 60_000;
const dbSeedWorkspacePromises = new Map<string, Promise<void>>();
const dbSeedWorkspaceCheckedUntil = new Map<string, number>();
const dbWorkspaceViewCache = new Map<string, { expiresAt: number; promise: Promise<WorkspaceView> }>();

type WorkspaceViewDbLoadMode = "full" | "shell";

function dbWorkspaceViewCacheKey(ownerId: string, workspaceId: string | null | undefined, mode: WorkspaceViewDbLoadMode) {
  return `${mode}:${ownerId}:${workspaceId ?? "__active__"}`;
}

function invalidateDbWorkspaceViewCache(ownerId?: string | null, workspaceId?: string | null) {
  if (!ownerId) return;
  if (!workspaceId) {
    for (const key of Array.from(dbWorkspaceViewCache.keys())) {
      if (key.startsWith(`full:${ownerId}:`) || key.startsWith(`shell:${ownerId}:`)) dbWorkspaceViewCache.delete(key);
    }
    return;
  }
  dbWorkspaceViewCache.delete(dbWorkspaceViewCacheKey(ownerId, workspaceId, "full"));
  dbWorkspaceViewCache.delete(dbWorkspaceViewCacheKey(ownerId, workspaceId, "shell"));
  dbWorkspaceViewCache.delete(dbWorkspaceViewCacheKey(ownerId, undefined, "full"));
  dbWorkspaceViewCache.delete(dbWorkspaceViewCacheKey(ownerId, undefined, "shell"));
}

function notifyWorkspaceUpdated(workspaceId: string, ownerId?: string | null) {
  invalidateDbWorkspaceViewCache(ownerId, workspaceId);
  notifyWorkspaceChanged(workspaceId);
}

const SEED_WORKSPACE_ID = "workspace_seed";
const SEED_GENERAL_THREAD_ID = "thread_general";
const SEED_INVITE_CODE = "PRIMORIA";

const LEGACY_SEED_THREAD_IDS = ["thread_product", "thread_artifacts", "thread_direct_primoria", "thread_direct_mina", "thread_direct_ops"];
const LEGACY_SEED_MEMBER_IDS = ["wm_jia", "wm_primoria", "wm_mina", "wm_leo", "wm_ops"];
const LEGACY_SEED_MESSAGE_IDS = ["m1", "m2", "m3", "m4", "m5", "m6", "dm1"];
const LEGACY_SEED_TASK_IDS = ["wt_launch", "wt_review", "wt_assets"];
type WorkspaceLocalStore = {
  views: WorkspaceView[];
  activeId: string;
  view: WorkspaceView;
};

declare global {
  var __primoriaWorkspaceLocalView: WorkspaceView | undefined;
  var __primoriaWorkspaceLocalViews: WorkspaceView[] | undefined;
  var __primoriaWorkspaceLocalActiveId: string | undefined;
  var __primoriaWorkspaceLocalStores: Record<string, WorkspaceLocalStore> | undefined;
}

function localStoreKey(ownerId?: string | null) {
  return ownerId ? `owner:${ownerId}` : "anonymous";
}

function assertLocalWorkspaceStoreAllowed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Workspace local storage is disabled in production. Configure DATABASE_URL and a persisted workspace owner.");
  }
}

function getLocalStore(ownerId?: string | null) {
  assertLocalWorkspaceStoreAllowed();
  const key = localStoreKey(ownerId);
  globalThis.__primoriaWorkspaceLocalStores ??= {};
  if (!globalThis.__primoriaWorkspaceLocalStores[key]?.views.length) {
    const seed = createSeedWorkspaceView(false);
    globalThis.__primoriaWorkspaceLocalStores[key] = { views: [seed], activeId: seed.workspace.id, view: seed };
    if (key === "anonymous") {
      globalThis.__primoriaWorkspaceLocalViews = [seed];
      globalThis.__primoriaWorkspaceLocalActiveId = seed.workspace.id;
      globalThis.__primoriaWorkspaceLocalView = seed;
    }
  }
  return globalThis.__primoriaWorkspaceLocalStores[key];
}

function getLocalViews(ownerId?: string | null) {
  return getLocalStore(ownerId).views;
}

function getLocalRawView(workspaceId?: string | null, ownerId?: string | null) {
  const store = getLocalStore(ownerId);
  const views = store.views;
  const targetId = workspaceId ?? store.activeId;
  const view = views.find((entry) => entry.workspace.id === targetId) ?? views[0];
  store.activeId = view.workspace.id;
  store.view = view;
  if (localStoreKey(ownerId) === "anonymous") {
    globalThis.__primoriaWorkspaceLocalActiveId = view.workspace.id;
    globalThis.__primoriaWorkspaceLocalView = view;
  }
  return view;
}

function getLocalView(workspaceId?: string | null, ownerId?: string | null) {
  const store = getLocalStore(ownerId);
  const view = getLocalRawView(workspaceId, ownerId);
  return withWorkspaceList(withVisibleAgentMemories(withMessageWindow(withPersonalAgentLibrary(view, store.views, ownerId)), ownerId), store.views);
}

function setLocalView(view: WorkspaceView, ownerId?: string | null) {
  const store = getLocalStore(ownerId);
  const views = store.views;
  const stored = { ...view, workspaces: [] };
  const nextViews = [stored, ...views.filter((entry) => entry.workspace.id !== view.workspace.id)].sort(
    (a, b) => b.workspace.updatedAt - a.workspace.updatedAt,
  );
  store.views = nextViews;
  store.activeId = view.workspace.id;
  store.view = stored;
  if (localStoreKey(ownerId) === "anonymous") {
    globalThis.__primoriaWorkspaceLocalViews = nextViews;
    globalThis.__primoriaWorkspaceLocalActiveId = view.workspace.id;
    globalThis.__primoriaWorkspaceLocalView = stored;
  }
  notifyWorkspaceUpdated(view.workspace.id, ownerId);
  return withWorkspaceList(withMessageWindow(stored), nextViews);
}

function createInviteCode() {
  return randomBytes(5).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

function createUniqueLocalInviteCode(ownerId?: string | null) {
  const existingCodes = new Set(getLocalViews(ownerId).map((view) => normalizeInviteCode(view.workspace.inviteCode ?? view.workspace.id)));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createInviteCode();
    if (!existingCodes.has(normalizeInviteCode(code))) return code;
  }
  throw new Error("Workspace invite code could not be generated.");
}

async function createUniqueDbInviteCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = createInviteCode();
    const rows = await getDb().select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.inviteCode, code)).limit(1);
    if (!rows[0]) return code;
  }
  throw new Error("Workspace invite code could not be generated.");
}

async function scopedSeedInviteCodeForOwner(ownerId: string) {
  const code = scopedSeedInviteCode(ownerId);
  const rows = await getDb().select({ ownerId: workspaces.ownerId }).from(workspaces).where(eq(workspaces.inviteCode, code)).limit(1);
  if (!rows[0] || rows[0].ownerId === ownerId) return code;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const fallbackCode = createInviteCode();
    const fallbackRows = await getDb().select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.inviteCode, fallbackCode)).limit(1);
    if (!fallbackRows[0]) return fallbackCode;
  }
  throw new Error("Workspace invite code could not be generated.");
}

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

function createUniqueLocalAgentHandle(workspaceId: string, baseHandle: string, ownerId?: string | null) {
  const existing = new Set(
    getLocalRawView(workspaceId, ownerId).agentProfiles.map((profile) => profile.handle.toLowerCase()),
  );
  return createUniqueAgentHandle(baseHandle, (handle) => existing.has(handle.toLowerCase()));
}

async function createUniqueDbAgentHandle(workspaceId: string, baseHandle: string) {
  return createUniqueAgentHandle(baseHandle, async (handle) => {
    const rows = await getDb()
      .select({ id: workspaceAgentProfiles.id })
      .from(workspaceAgentProfiles)
      .where(and(eq(workspaceAgentProfiles.workspaceId, workspaceId), eq(workspaceAgentProfiles.handle, handle)))
      .limit(1);
    return Boolean(rows[0]);
  });
}

const agentConnectionServiceContext: WorkspaceAgentConnectionServiceContext = {
  usesDatabase,
  getLocalViews,
  ensureSeedWorkspace,
  requireDbWorkspace,
};

const agentProfileServiceContext: WorkspaceAgentProfileServiceContext = {
  usesDatabase,
  getLocalViews,
  ensureSeedWorkspace,
  requireDbWorkspace,
  requireDbWorkspaceOwner,
};

const agentMemoryServiceContext: WorkspaceAgentMemoryServiceContext = {
  requireDbThread,
};

const workspaceTaskServiceContext: WorkspaceTaskServiceContext = {
  requireDbThread,
};

async function requireWorkspaceAgentConnection(
  ownerId: string | null | undefined,
  workspaceId: string,
  connectionId: string,
  options: { includeDisabled?: boolean } = {},
) {
  return requireWorkspaceAgentConnectionWithContext(agentConnectionServiceContext, ownerId, workspaceId, connectionId, options);
}

async function assertAgentCapabilityConnections(ownerId: string | null | undefined, workspaceId: string, capabilities: WorkspaceAgentCapabilityInput[]) {
  await assertAgentCapabilityConnectionsWithContext(agentConnectionServiceContext, ownerId, workspaceId, capabilities);
}

async function assertAgentSubagentCapabilities(
  ownerId: string | null | undefined,
  workspaceId: string,
  capabilities: WorkspaceAgentCapabilityInput[],
  currentProfileId?: string,
) {
  const targetProfileIds = Array.from(
    new Set(
      capabilities
        .filter((capability): capability is Extract<WorkspaceAgentCapabilityInput, { kind: "subagent" }> => capability.kind === "subagent" && capability.enabled)
        .map((capability) => capability.agentProfileId),
    ),
  );
  for (const targetProfileId of targetProfileIds) {
    if (currentProfileId && targetProfileId === currentProfileId) {
      throw new Error("Agent cannot delegate to itself.");
    }
    await requireWorkspaceAgentProfile(ownerId, workspaceId, targetProfileId);
  }
}

async function requireWorkspaceAgentProfile(ownerId: string | null | undefined, workspaceId: string, profileId: string) {
  return requireWorkspaceAgentProfileWithContext(agentProfileServiceContext, ownerId, workspaceId, profileId);
}

async function assertCanManageWorkspaceAgentProfile(ownerId: string | null | undefined, profile: WorkspaceAgentProfile) {
  await assertCanManageWorkspaceAgentProfileWithContext(agentProfileServiceContext, ownerId, profile);
}

export async function getWorkspaceView(ownerId?: string | null, workspaceId?: string | null): Promise<WorkspaceView> {
  if (!usesDatabase(ownerId)) return getLocalView(workspaceId, ownerId);
  try {
    await ensureSeedWorkspace(ownerId);
    return getCachedWorkspaceViewFromDb(ownerId, workspaceId, "full");
  } catch (error) {
    console.error("[workspace] database workspace view failed", error);
    throw error;
  }
}

export async function getWorkspaceShellView(ownerId?: string | null, workspaceId?: string | null): Promise<WorkspaceView> {
  if (!usesDatabase(ownerId)) return getLocalView(workspaceId, ownerId);
  try {
    return getCachedWorkspaceViewFromDb(ownerId, workspaceId, "shell");
  } catch (error) {
    console.error("[workspace] database workspace view failed", error);
    throw error;
  }
}

export function createWorkspacePlaceholderView(): WorkspaceView {
  return createSeedWorkspaceView(false);
}

export async function createWorkspaceAgentMemory(ownerId: string | null | undefined, input: CreateWorkspaceAgentMemoryInput): Promise<WorkspaceAgentMemory> {
  const title = input.title.trim();
  const summary = input.summary.trim();
  if (!title) throw new Error("Agent memory title is required.");
  if (!summary) throw new Error("Agent memory summary is required.");
  if (input.scope === "thread" && !input.threadId) throw new Error("Thread memory requires a thread id.");
  if ((input.scope === "workspace" || input.scope === "thread") && !input.workspaceId) throw new Error("Workspace memory requires a workspace id.");
  if (input.scope === "user" && !usesDatabase(ownerId) && !input.userId) throw new Error("User memory requires a user id.");
  const now = Date.now();

  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(input.workspaceId, ownerId);
    if (!current.agentProfiles.some((profile) => profile.id === input.agentProfileId)) throw new Error("Agent profile not found.");
    if (input.threadId && !current.threads.some((thread) => thread.id === input.threadId)) throw new Error("Thread not found.");
    assertLocalWorkspaceAgentMemorySourceVisibility(current, input);
    const memory: WorkspaceAgentMemory = {
      id: `wamem_${randomBytes(10).toString("base64url")}`,
      workspaceId: input.scope === "user" ? input.workspaceId : current.workspace.id,
      userId: input.userId ?? (ownerId || undefined),
      threadId: input.scope === "thread" ? input.threadId : undefined,
      agentProfileId: input.agentProfileId,
      scope: input.scope,
      title,
      summary,
      sourceRunId: input.sourceRunId,
      sourceMessageId: input.sourceMessageId,
      createdAt: now,
      updatedAt: now,
    };
    setLocalView(
      {
        ...current,
        agentMemories: [memory, ...current.agentMemories],
        workspace: { ...current.workspace, updatedAt: now },
      },
      ownerId,
    );
    return memory;
  }

  await requireDbWorkspace(ownerId, input.workspaceId);
  const profile = await requireWorkspaceAgentProfile(ownerId, input.workspaceId, input.agentProfileId);
  if (input.threadId) await requireDbThread(ownerId, input.workspaceId, input.threadId);
  await assertDbWorkspaceAgentMemorySourceVisibilityWithContext(agentMemoryServiceContext, ownerId, input.workspaceId, input);
  const memory: WorkspaceAgentMemory = {
    id: `wamem_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.scope === "user" ? input.workspaceId : profile.workspaceId,
    userId: input.userId ?? ownerId,
    threadId: input.scope === "thread" ? input.threadId : undefined,
    agentProfileId: profile.id,
    scope: input.scope,
    title,
    summary,
    sourceRunId: input.sourceRunId,
    sourceMessageId: input.sourceMessageId,
    createdAt: now,
    updatedAt: now,
  };
  await getDb().insert(workspaceAgentMemories).values({
    id: memory.id,
    workspaceId: memory.workspaceId ?? null,
    userId: memory.userId ?? null,
    threadId: memory.threadId ?? null,
    agentProfileId: memory.agentProfileId,
    scope: memory.scope,
    title: memory.title,
    summary: memory.summary,
    sourceRunId: memory.sourceRunId ?? null,
    sourceMessageId: memory.sourceMessageId ?? null,
    createdAt: new Date(memory.createdAt),
    updatedAt: new Date(memory.updatedAt),
    archivedAt: null,
  });
  notifyWorkspaceUpdated(input.workspaceId, ownerId);
  return memory;
}

export async function archiveWorkspaceAgentMemory(ownerId: string | null | undefined, input: ArchiveWorkspaceAgentMemoryInput): Promise<WorkspaceAgentMemory> {
  const now = Date.now();
  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(input.workspaceId, ownerId);
    const existing = current.agentMemories.find((memory) => memory.id === input.memoryId && memory.workspaceId === input.workspaceId && isLocalWorkspaceAgentMemoryVisibleToOwner(memory, ownerId));
    if (!existing) throw new Error("Agent memory not found.");
    const archived: WorkspaceAgentMemory = { ...existing, archivedAt: existing.archivedAt ?? now, updatedAt: now };
    setLocalView(
      {
        ...current,
        agentMemories: current.agentMemories.map((memory) => (memory.id === archived.id ? archived : memory)),
        workspace: { ...current.workspace, updatedAt: now },
      },
      ownerId,
    );
    return archived;
  }

  await requireDbWorkspace(ownerId, input.workspaceId);
  const rows = await getDb()
    .select()
    .from(workspaceAgentMemories)
    .where(and(eq(workspaceAgentMemories.id, input.memoryId), eq(workspaceAgentMemories.workspaceId, input.workspaceId)))
    .limit(1);
  const existing = rows[0];
  if (!existing || !isDbWorkspaceAgentMemoryVisibleToOwner(existing, ownerId)) throw new Error("Agent memory not found.");
  if (existing.threadId) await requireDbThread(ownerId, input.workspaceId, existing.threadId);
  const archivedAt = existing.archivedAt ?? new Date(now);
  await getDb()
    .update(workspaceAgentMemories)
    .set({ archivedAt, updatedAt: new Date(now) })
    .where(and(eq(workspaceAgentMemories.id, input.memoryId), eq(workspaceAgentMemories.workspaceId, input.workspaceId)));
  notifyWorkspaceUpdated(input.workspaceId, ownerId);
  return rowToWorkspaceAgentMemory({ ...existing, archivedAt, updatedAt: new Date(now) });
}

export async function archiveWorkspaceAgentMemories(ownerId: string | null | undefined, input: ArchiveWorkspaceAgentMemoriesInput): Promise<WorkspaceAgentMemory[]> {
  const memoryIds = Array.from(new Set(input.memoryIds.map((id) => id.trim()).filter(Boolean)));
  if (!memoryIds.length) return [];
  const now = Date.now();

  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(input.workspaceId, ownerId);
    const matches = current.agentMemories.filter((memory) => memory.workspaceId === input.workspaceId && memoryIds.includes(memory.id) && isLocalWorkspaceAgentMemoryVisibleToOwner(memory, ownerId));
    if (matches.length !== memoryIds.length) throw new Error("Agent memory not found.");
    const archivedById = new Map(
      matches.map((memory): [string, WorkspaceAgentMemory] => [
        memory.id,
        { ...memory, archivedAt: memory.archivedAt ?? now, updatedAt: now },
      ]),
    );
    setLocalView(
      {
        ...current,
        agentMemories: current.agentMemories.map((memory) => archivedById.get(memory.id) ?? memory),
        workspace: { ...current.workspace, updatedAt: now },
      },
      ownerId,
    );
    return memoryIds.map((id) => archivedById.get(id)).filter((memory): memory is WorkspaceAgentMemory => Boolean(memory));
  }

  await requireDbWorkspace(ownerId, input.workspaceId);
  const rows = await getDb()
    .select()
    .from(workspaceAgentMemories)
    .where(and(eq(workspaceAgentMemories.workspaceId, input.workspaceId), inArray(workspaceAgentMemories.id, memoryIds)));
  if (rows.length !== memoryIds.length || rows.some((row) => !isDbWorkspaceAgentMemoryVisibleToOwner(row, ownerId))) throw new Error("Agent memory not found.");
  for (const row of rows) {
    if (row.threadId) await requireDbThread(ownerId, input.workspaceId, row.threadId);
  }
  const archivedAt = new Date(now);
  await getDb()
    .update(workspaceAgentMemories)
    .set({ archivedAt, updatedAt: new Date(now) })
    .where(and(eq(workspaceAgentMemories.workspaceId, input.workspaceId), inArray(workspaceAgentMemories.id, memoryIds)));
  notifyWorkspaceUpdated(input.workspaceId, ownerId);
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return memoryIds
    .map((id) => rowsById.get(id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .map((row) => rowToWorkspaceAgentMemory({ ...row, archivedAt: row.archivedAt ?? archivedAt, updatedAt: new Date(now) }));
}

export async function restoreWorkspaceAgentMemory(ownerId: string | null | undefined, input: RestoreWorkspaceAgentMemoryInput): Promise<WorkspaceAgentMemory> {
  const now = Date.now();
  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(input.workspaceId, ownerId);
    const existing = current.agentMemories.find((memory) => memory.id === input.memoryId && memory.workspaceId === input.workspaceId && isLocalWorkspaceAgentMemoryVisibleToOwner(memory, ownerId));
    if (!existing) throw new Error("Agent memory not found.");
    const restored: WorkspaceAgentMemory = { ...existing, archivedAt: undefined, updatedAt: now };
    setLocalView(
      {
        ...current,
        agentMemories: current.agentMemories.map((memory) => (memory.id === restored.id ? restored : memory)),
        workspace: { ...current.workspace, updatedAt: now },
      },
      ownerId,
    );
    return restored;
  }

  await requireDbWorkspace(ownerId, input.workspaceId);
  const rows = await getDb()
    .select()
    .from(workspaceAgentMemories)
    .where(and(eq(workspaceAgentMemories.id, input.memoryId), eq(workspaceAgentMemories.workspaceId, input.workspaceId)))
    .limit(1);
  const existing = rows[0];
  if (!existing || !isDbWorkspaceAgentMemoryVisibleToOwner(existing, ownerId)) throw new Error("Agent memory not found.");
  if (existing.threadId) await requireDbThread(ownerId, input.workspaceId, existing.threadId);
  await getDb()
    .update(workspaceAgentMemories)
    .set({ archivedAt: null, updatedAt: new Date(now) })
    .where(and(eq(workspaceAgentMemories.id, input.memoryId), eq(workspaceAgentMemories.workspaceId, input.workspaceId)));
  notifyWorkspaceUpdated(input.workspaceId, ownerId);
  return rowToWorkspaceAgentMemory({ ...existing, archivedAt: null, updatedAt: new Date(now) });
}

export async function deleteWorkspaceAgentMemory(ownerId: string | null | undefined, input: DeleteWorkspaceAgentMemoryInput): Promise<WorkspaceAgentMemory> {
  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(input.workspaceId, ownerId);
    const existing = current.agentMemories.find((memory) => memory.id === input.memoryId && memory.workspaceId === input.workspaceId && isLocalWorkspaceAgentMemoryVisibleToOwner(memory, ownerId));
    if (!existing) throw new Error("Agent memory not found.");
    const now = Date.now();
    setLocalView(
      {
        ...current,
        agentMemories: current.agentMemories.filter((memory) => memory.id !== input.memoryId),
        workspace: { ...current.workspace, updatedAt: now },
      },
      ownerId,
    );
    return existing;
  }

  await requireDbWorkspace(ownerId, input.workspaceId);
  const rows = await getDb()
    .select()
    .from(workspaceAgentMemories)
    .where(and(eq(workspaceAgentMemories.id, input.memoryId), eq(workspaceAgentMemories.workspaceId, input.workspaceId)))
    .limit(1);
  const existing = rows[0];
  if (!existing || !isDbWorkspaceAgentMemoryVisibleToOwner(existing, ownerId)) throw new Error("Agent memory not found.");
  if (existing.threadId) await requireDbThread(ownerId, input.workspaceId, existing.threadId);
  await getDb()
    .delete(workspaceAgentMemories)
    .where(and(eq(workspaceAgentMemories.id, input.memoryId), eq(workspaceAgentMemories.workspaceId, input.workspaceId)));
  notifyWorkspaceUpdated(input.workspaceId, ownerId);
  return rowToWorkspaceAgentMemory(existing);
}

export async function listWorkspaceAgentMemories(ownerId: string | null | undefined, input: ListWorkspaceAgentMemoriesInput): Promise<WorkspaceAgentMemoryPage> {
  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    return {
      memories: current.agentMemories
        .filter((memory) => memory.workspaceId === input.workspaceId)
        .filter((memory) => isLocalWorkspaceAgentMemoryVisibleToOwner(memory, ownerId))
        .filter((memory) => !memory.threadId || current.threads.some((thread) => thread.id === memory.threadId))
        .filter((memory) => input.includeArchived || !memory.archivedAt)
        .sort((a, b) => b.updatedAt - a.updatedAt),
    };
  }

  await requireDbWorkspace(ownerId, input.workspaceId);
  const visibleThreadIds = new Set(await listDbVisibleWorkspaceThreadIds(ownerId, input.workspaceId));
  const rows = await getDb()
    .select()
    .from(workspaceAgentMemories)
    .where(eq(workspaceAgentMemories.workspaceId, input.workspaceId))
    .orderBy(desc(workspaceAgentMemories.updatedAt));
  return {
    memories: rows
      .filter((memory) => isDbWorkspaceAgentMemoryVisibleToOwner(memory, ownerId))
      .filter((memory) => !memory.threadId || visibleThreadIds.has(memory.threadId))
      .map(rowToWorkspaceAgentMemory)
      .filter((memory) => input.includeArchived || !memory.archivedAt),
  };
}

export async function createWorkspace(ownerId: string | null | undefined, input: CreateWorkspaceInput): Promise<WorkspaceView> {
  const name = input.name.trim();
  if (!name) throw new Error("Workspace name is required.");

  const now = Date.now();
  const inviteCode = usesDatabase(ownerId) ? await createUniqueDbInviteCode() : createUniqueLocalInviteCode(ownerId);
  const workspace: WorkspaceSummary = {
    id: `workspace_${randomBytes(10).toString("base64url")}`,
    name,
    inviteCode,
    createdAt: now,
    updatedAt: now,
  };
  const ownerName = input.ownerName?.trim() || "You";
  const generalThread: WorkspaceThread = {
    id: `wthread_${randomBytes(10).toString("base64url")}`,
    workspaceId: workspace.id,
    type: "room",
    name: "General",
    description: "shared room",
    agentTriggerMode: "room_default",
    allowedAgentProfileIds: undefined,
    createdAt: now,
    updatedAt: now,
  };
  const view: WorkspaceView = {
    workspace,
    workspaces: [workspace],
    members: [
      {
        id: `wmember_${randomBytes(10).toString("base64url")}`,
        workspaceId: workspace.id,
        displayName: ownerName,
        role: "Human",
        status: "owner",
      },
    ],
    agentProfiles: [],
    threads: [generalThread],
    messages: [],
    tasks: [],
    artifacts: [],
    agentRuns: [],
    agentRunEvents: [],
    agentApprovals: [],
    agentMemories: [],
    agentConnections: [],
    persisted: usesDatabase(ownerId),
  };

  if (!usesDatabase(ownerId)) {
    return setLocalView(view, ownerId);
  }

  try {
    const db = getDb();
    await db.transaction(async (tx) => {
      await tx.insert(workspaces).values({
        id: workspace.id,
        ownerId,
        name: workspace.name,
        inviteCode: workspace.inviteCode,
        createdAt: new Date(workspace.createdAt),
        updatedAt: new Date(workspace.updatedAt),
      });
      await tx.insert(workspaceMembers).values(
        view.members.map((member) => ({
          id: member.id,
          workspaceId: member.workspaceId,
          ownerId,
          displayName: member.displayName,
          role: member.role,
          status: member.status ?? null,
          agentProfileId: member.agentProfileId ?? null,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        })),
      );
      await tx.insert(workspaceThreads).values({
        id: generalThread.id,
        workspaceId: generalThread.workspaceId,
        ownerId,
        type: generalThread.type,
        name: generalThread.name,
        description: generalThread.description ?? null,
        agentTriggerMode: generalThread.agentTriggerMode ?? "room_default",
        allowedAgentProfileIds: generalThread.allowedAgentProfileIds ?? null,
        createdAt: new Date(generalThread.createdAt),
        updatedAt: new Date(generalThread.updatedAt),
      });
    });
    notifyWorkspaceUpdated(workspace.id, ownerId);
    return { ...view, workspaces: await listDbWorkspaceSummaries(ownerId) };
  } catch (error) {
    console.error("[workspace] database workspace creation failed", error);
    throw error;
  }
}

export function listWorkspaceAgentTemplates(): WorkspaceAgentTemplate[] {
  return WORKSPACE_AGENT_TEMPLATES.map((template) => ({
    ...template,
    capabilities: template.capabilities.map((capability) => ({ ...capability })),
  }));
}

export async function createWorkspaceAgentProfile(
  ownerId: string | null | undefined,
  input: CreateWorkspaceAgentProfileInput,
): Promise<WorkspaceAgentProfile> {
  const template = input.templateKey ? WORKSPACE_AGENT_TEMPLATES.find((entry) => entry.key === input.templateKey) : undefined;
  if (input.templateKey && !template) throw new Error("Agent template not found.");
  const displayName = input.displayName?.trim() || template?.displayName || "Workspace Agent";
  const canReuseTemplateProfile = Boolean(
    input.templateKey &&
      !input.description &&
      !input.systemPrompt &&
      !input.visibility &&
      !input.memoryScope &&
      !input.capabilities,
  );
  const reusableTemplateProfile = canReuseTemplateProfile
    ? (await getWorkspaceView(ownerId, input.workspaceId)).agentProfiles.find(
        (profile) =>
          profile.workspaceId === input.workspaceId &&
          profile.templateKey === input.templateKey &&
          profile.displayName.trim().toLowerCase() === displayName.toLowerCase() &&
          profile.visibility !== "private",
      )
    : undefined;
  if (reusableTemplateProfile) return reusableTemplateProfile;
  const capabilityInputs = input.capabilities ?? template?.capabilities ?? [];
  assertAgentProfileTextGuardrails({
    templateKey: input.templateKey,
    description: input.description,
    systemPrompt: input.systemPrompt,
  });
  assertAgentProfileHasRunnableCapability(capabilityInputs);
  assertAgentSkillCapabilityPaths(ownerId, input.workspaceId, capabilityInputs);
  assertAgentInternalToolCapabilities(capabilityInputs);
  assertAgentConnectionToolCapabilities(capabilityInputs);
  await assertAgentCapabilityConnections(ownerId, input.workspaceId, capabilityInputs);
  await assertAgentSubagentCapabilities(ownerId, input.workspaceId, capabilityInputs);
  const now = Date.now();
  const handle = await (usesDatabase(ownerId)
    ? createUniqueDbAgentHandle(input.workspaceId, slugifyAgentHandle(displayName))
    : createUniqueLocalAgentHandle(input.workspaceId, slugifyAgentHandle(displayName), ownerId));
  const profile: WorkspaceAgentProfile = {
    id: `wagent_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.workspaceId,
    ownerId: ownerId ?? undefined,
    displayName,
    handle,
    description: input.description?.trim() || template?.description || "Workspace learning teammate.",
    visibility: input.visibility ?? "workspace",
    templateKey: template?.key,
    systemPrompt: input.systemPrompt?.trim() || template?.systemPrompt || "You are a helpful learning teammate in a Primoria workspace.",
    defaultModel: undefined,
    memoryScope: input.memoryScope ?? template?.memoryScope ?? "thread",
    capabilities: buildAgentCapabilities(`wagent_pending`, capabilityInputs),
    createdAt: now,
    updatedAt: now,
  };
  profile.capabilities = buildAgentCapabilities(profile.id, capabilityInputs);

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    setLocalView({
      ...current,
      agentProfiles: [...current.agentProfiles, profile],
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return profile;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await getDb().transaction(async (tx) => {
      await tx.insert(workspaceAgentProfiles).values({
        id: profile.id,
        workspaceId: profile.workspaceId,
        ownerId,
        displayName: profile.displayName,
        handle: profile.handle,
        description: profile.description,
        visibility: profile.visibility,
        templateKey: profile.templateKey ?? null,
        systemPrompt: profile.systemPrompt,
        defaultModel: profile.defaultModel ?? null,
        memoryScope: profile.memoryScope,
        createdAt: new Date(profile.createdAt),
        updatedAt: new Date(profile.updatedAt),
      });
      if (profile.capabilities.length) {
        await tx.insert(workspaceAgentCapabilities).values(profile.capabilities.map((capability) => capabilityToDbRow(capability, profile)));
      }
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return profile;
  } catch (error) {
    console.error("[workspace] database agent profile persistence failed", error);
    throw error;
  }
}

export async function updateWorkspaceAgentProfile(
  ownerId: string | null | undefined,
  input: UpdateWorkspaceAgentProfileInput,
): Promise<WorkspaceAgentProfile> {
  const existing = await requireWorkspaceAgentProfile(ownerId, input.workspaceId, input.profileId);
  await assertCanManageWorkspaceAgentProfile(ownerId, existing);
  assertAgentProfileTextGuardrails({
    templateKey: existing.templateKey,
    description: input.description,
    systemPrompt: input.systemPrompt,
    requireDescription: false,
    requireSystemPrompt: false,
  });
  if (input.capabilities) {
    assertAgentProfileHasRunnableCapability(input.capabilities);
    assertAgentSkillCapabilityPaths(ownerId, existing.workspaceId, input.capabilities);
    assertAgentInternalToolCapabilities(input.capabilities);
    assertAgentConnectionToolCapabilities(input.capabilities);
    await assertAgentCapabilityConnections(ownerId, input.workspaceId, input.capabilities);
    await assertAgentSubagentCapabilities(ownerId, input.workspaceId, input.capabilities, existing.id);
  }
  const now = Date.now();
  const nextProfile: WorkspaceAgentProfile = {
    ...existing,
    displayName: input.displayName?.trim() || existing.displayName,
    description: input.description?.trim() ?? existing.description,
    systemPrompt: input.systemPrompt?.trim() ?? existing.systemPrompt,
    visibility: input.visibility ?? existing.visibility,
    memoryScope: input.memoryScope ?? existing.memoryScope,
    capabilities: input.capabilities ? buildAgentCapabilities(existing.id, input.capabilities) : existing.capabilities,
    updatedAt: now,
  };

  if (!usesDatabase(ownerId)) {
    const views = getLocalViews(ownerId);
    const sourceView = views.find((view) => view.agentProfiles.some((profile) => profile.id === existing.id));
    const current = getLocalRawView(input.workspaceId, ownerId);
    if (!sourceView) throw new Error("Agent profile not found.");
    const updatedSourceView: WorkspaceView = {
      ...sourceView,
      agentProfiles: sourceView.agentProfiles.map((profile) => (profile.id === existing.id ? nextProfile : profile)),
      members: sourceView.members.map((member) =>
        member.agentProfileId === existing.id
          ? { ...member, displayName: nextProfile.displayName }
          : member,
      ),
      workspace: { ...sourceView.workspace, updatedAt: now },
    };
    setLocalView(updatedSourceView, ownerId);
    if (current.workspace.id !== sourceView.workspace.id) {
      setLocalView({
        ...current,
        agentProfiles: current.agentProfiles.map((profile) => (profile.id === existing.id ? nextProfile : profile)),
        members: current.members.map((member) =>
          member.agentProfileId === existing.id
            ? { ...member, displayName: nextProfile.displayName }
            : member,
        ),
        workspace: { ...current.workspace, updatedAt: now },
      }, ownerId);
    }
    return nextProfile;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    const persistedCapabilityInputs = input.capabilities
      ? await mergeHiddenReferenceCapabilityInputsForDbUpdate(ownerId, input.workspaceId, existing.id, input.capabilities)
      : undefined;
    const persistedCapabilities = persistedCapabilityInputs ? buildAgentCapabilities(existing.id, persistedCapabilityInputs) : nextProfile.capabilities;
    await getDb().transaction(async (tx) => {
      await tx
        .update(workspaceAgentProfiles)
        .set({
          displayName: nextProfile.displayName,
          description: nextProfile.description,
          visibility: nextProfile.visibility,
          systemPrompt: nextProfile.systemPrompt,
          defaultModel: nextProfile.defaultModel ?? null,
          memoryScope: nextProfile.memoryScope,
          updatedAt: new Date(now),
        })
        .where(and(eq(workspaceAgentProfiles.id, existing.id), eq(workspaceAgentProfiles.workspaceId, existing.workspaceId)));
      if (input.capabilities) {
        await tx.delete(workspaceAgentCapabilities).where(eq(workspaceAgentCapabilities.profileId, existing.id));
        if (persistedCapabilities.length) {
          await tx.insert(workspaceAgentCapabilities).values(persistedCapabilities.map((capability) => capabilityToDbRow(capability, { ...nextProfile, capabilities: persistedCapabilities })));
        }
      }
      await tx
        .update(workspaceMembers)
        .set({ displayName: nextProfile.displayName, updatedAt: new Date(now) })
        .where(eq(workspaceMembers.agentProfileId, existing.id));
      await tx.update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
      if (existing.workspaceId !== input.workspaceId) {
        await tx.update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, existing.workspaceId));
      }
    });
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    if (existing.workspaceId !== input.workspaceId) notifyWorkspaceUpdated(existing.workspaceId, ownerId);
    return nextProfile;
  } catch (error) {
    console.error("[workspace] database agent profile update failed", error);
    throw error;
  }
}

export async function deleteWorkspaceAgentProfile(
  ownerId: string | null | undefined,
  input: DeleteWorkspaceAgentProfileInput,
): Promise<WorkspaceAgentProfile> {
  const existing = await requireWorkspaceAgentProfile(ownerId, input.workspaceId, input.profileId);
  await assertCanManageWorkspaceAgentProfile(ownerId, existing);
  const now = Date.now();

  if (!usesDatabase(ownerId)) {
    const views = getLocalViews(ownerId);
    for (const view of views) {
      const hasProfile = view.agentProfiles.some((profile) => profile.id === existing.id);
      const hasMember = view.members.some((member) => member.agentProfileId === existing.id);
      if (!hasProfile && !hasMember) continue;
      setLocalView({
        ...view,
        agentProfiles: view.agentProfiles.filter((profile) => profile.id !== existing.id),
        members: view.members.filter((member) => member.agentProfileId !== existing.id),
        workspace: { ...view.workspace, updatedAt: now },
      }, ownerId);
    }
    return existing;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await getDb().transaction(async (tx) => {
      await tx.delete(workspaceMembers).where(eq(workspaceMembers.agentProfileId, existing.id));
      await tx.delete(workspaceAgentProfiles).where(and(eq(workspaceAgentProfiles.id, existing.id), eq(workspaceAgentProfiles.workspaceId, existing.workspaceId)));
      await tx.update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, existing.workspaceId));
      if (existing.workspaceId !== input.workspaceId) {
        await tx.update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
      }
    });
    notifyWorkspaceUpdated(existing.workspaceId, ownerId);
    if (existing.workspaceId !== input.workspaceId) notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return existing;
  } catch (error) {
    console.error("[workspace] database agent profile delete failed", error);
    throw error;
  }
}

export async function createWorkspaceAgentMember(
  ownerId: string | null | undefined,
  input: CreateWorkspaceAgentMemberInput,
): Promise<WorkspaceMember> {
  const profile = await requireWorkspaceAgentProfile(ownerId, input.workspaceId, input.profileId);
  const current = await getWorkspaceView(ownerId, input.workspaceId);
  const existingMember = current.members.find((member) => member.agentProfileId === profile.id);
  if (existingMember) return existingMember;
  return createWorkspaceMember(ownerId, {
    workspaceId: input.workspaceId,
    displayName: profile.displayName,
    role: "Agent",
    status: "active",
    agentProfileId: profile.id,
  });
}

export async function createWorkspaceAgentConnection(
  ownerId: string | null | undefined,
  input: CreateWorkspaceAgentConnectionInput,
): Promise<WorkspaceAgentConnection> {
  const displayName = input.displayName.trim();
  const configRef = input.configRef.trim();
  const allowedToolNames = normalizeConnectionToolNames(input.allowedToolNames);
  if (!displayName) throw new Error("Connection name is required.");
  if (!configRef) throw new Error("Connection config reference is required.");
  if (!allowedToolNames.length) throw new Error("At least one allowed connection tool is required.");
  if (input.scope === "user" && !ownerId) throw new Error("User connection owner is required.");
  const now = Date.now();
  const connection: WorkspaceAgentConnection = {
    id: `wconn_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.scope === "workspace" ? input.workspaceId : undefined,
    ownerId: ownerId ?? undefined,
    scope: input.scope,
    displayName,
    transport: input.transport,
    configRef,
    allowedToolNames,
    status: "available",
    createdAt: now,
    updatedAt: now,
  };

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    setLocalView({
      ...current,
      agentConnections: [connection, ...current.agentConnections],
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return connection;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    if (input.scope === "workspace") await requireDbWorkspaceOwner(ownerId, input.workspaceId);
    await getDb().insert(workspaceAgentConnections).values({
      id: connection.id,
      workspaceId: connection.workspaceId ?? null,
      ownerId,
      scope: connection.scope,
      displayName: connection.displayName,
      transport: connection.transport,
      configRef: connection.configRef,
      allowedToolNames: connection.allowedToolNames,
      status: connection.status,
      createdAt: new Date(connection.createdAt),
      updatedAt: new Date(connection.updatedAt),
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return connection;
  } catch (error) {
    console.error("[workspace] database agent connection persistence failed", error);
    throw error;
  }
}

export async function updateWorkspaceAgentConnection(
  ownerId: string | null | undefined,
  input: UpdateWorkspaceAgentConnectionInput,
): Promise<WorkspaceAgentConnection> {
  const existing = await requireWorkspaceAgentConnection(ownerId, input.workspaceId, input.connectionId, { includeDisabled: true });
  const now = Date.now();
  const nextConnection: WorkspaceAgentConnection = {
    ...existing,
    displayName: input.displayName?.trim() || existing.displayName,
    configRef: input.configRef?.trim() || existing.configRef,
    allowedToolNames: input.allowedToolNames ? normalizeConnectionToolNames(input.allowedToolNames) : existing.allowedToolNames,
    status: input.status ?? existing.status,
    updatedAt: now,
  };
  if (!nextConnection.allowedToolNames.length) throw new Error("At least one allowed connection tool is required.");

  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(input.workspaceId, ownerId);
    setLocalView({
      ...current,
      agentConnections: current.agentConnections.map((connection) => (connection.id === existing.id ? nextConnection : connection)),
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return nextConnection;
  }

  try {
    if (nextConnection.scope === "workspace") await requireDbWorkspaceOwner(ownerId, input.workspaceId);
    await getDb()
      .update(workspaceAgentConnections)
      .set({
        displayName: nextConnection.displayName,
        configRef: nextConnection.configRef,
        allowedToolNames: nextConnection.allowedToolNames,
        status: nextConnection.status,
        updatedAt: new Date(now),
      })
      .where(eq(workspaceAgentConnections.id, existing.id));
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return nextConnection;
  } catch (error) {
    console.error("[workspace] database agent connection update failed", error);
    throw error;
  }
}

export async function joinWorkspace(ownerId: string | null | undefined, input: JoinWorkspaceInput): Promise<WorkspaceView> {
  const inviteCode = normalizeInviteCode(input.inviteCode);
  if (!inviteCode) throw new Error("Invite code is required.");
  const displayName = input.displayName?.trim() || "Guest";

  if (!usesDatabase(ownerId)) {
    const views = getLocalViews(ownerId);
    const view = views.find((entry) => normalizeInviteCode(entry.workspace.inviteCode ?? entry.workspace.id) === inviteCode);
    if (!view) throw new Error("Invite code not found.");
    const now = Date.now();
    const memberExists = view.members.some((member) => member.displayName.toLowerCase() === displayName.toLowerCase());
    const nextView = setLocalView({
      ...view,
      members: memberExists
        ? view.members
        : [
            ...view.members,
            {
              id: `wmember_${randomBytes(10).toString("base64url")}`,
              workspaceId: view.workspace.id,
              displayName,
              role: "Human",
              status: "joined",
            },
          ],
      workspace: { ...view.workspace, updatedAt: now },
    }, ownerId);
    return nextView;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    const rows = await getDb().select().from(workspaces).where(eq(workspaces.inviteCode, inviteCode)).limit(1);
    const workspace = rows[0];
    if (!workspace) throw new Error("Invite code not found.");

    const membership = await getDb()
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.ownerId, ownerId)))
      .limit(1);
    if (!membership[0]) {
      const now = new Date();
      await getDb().insert(workspaceMembers).values({
        id: `wmember_${randomBytes(10).toString("base64url")}`,
        workspaceId: workspace.id,
        ownerId,
        displayName,
        role: "Human",
        status: "joined",
        agentProfileId: null,
        createdAt: now,
        updatedAt: now,
      });
      await getDb().update(workspaces).set({ updatedAt: now }).where(eq(workspaces.id, workspace.id));
    }
    notifyWorkspaceUpdated(workspace.id, ownerId);
    return getWorkspaceViewFromDb(ownerId, workspace.id);
  } catch (error) {
    console.error("[workspace] database workspace join failed", error);
    throw error;
  }
}

export async function createWorkspaceMember(ownerId: string | null | undefined, input: CreateWorkspaceMemberInput): Promise<WorkspaceMember> {
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("Member name is required.");

  const now = Date.now();
  const member: WorkspaceMember = {
    id: `wmember_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.workspaceId,
    displayName,
    role: input.role?.trim() || "Human",
    status: input.status?.trim() || "invited",
    agentProfileId: input.agentProfileId,
  };
  if (member.agentProfileId) await requireWorkspaceAgentProfile(ownerId, input.workspaceId, member.agentProfileId);

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    setLocalView({
      ...current,
      members: [...current.members, member],
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return member;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await getDb().insert(workspaceMembers).values({
      id: member.id,
      workspaceId: member.workspaceId,
      ownerId,
      displayName: member.displayName,
      role: member.role,
      status: member.status ?? null,
      agentProfileId: member.agentProfileId ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return member;
  } catch (error) {
    console.error("[workspace] database member persistence failed", error);
    throw error;
  }
}

export async function createWorkspaceMessage(ownerId: string | null | undefined, input: CreateWorkspaceMessageInput): Promise<WorkspaceMessage> {
  const content = input.content.trim();
  if (!content) throw new Error("Message content is required.");
  const bundle = input.artifact
    ? buildWorkspaceArtifactMessageBundle({
        workspaceId: input.workspaceId,
        threadId: input.threadId,
        senderName: input.senderName?.trim() || "You",
        senderKind: input.senderKind ?? "human",
    content,
    title: input.artifact.title,
    description: input.artifact.description,
    payload: input.artifact,
    reviewStatus: "reviewed",
  })
    : undefined;

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    requireLocalThread(input.threadId, input.workspaceId, ownerId);
    const message = bundle?.message ?? buildMessage(input, content);
    const current = getLocalRawView(input.workspaceId, ownerId);
    const artifact = bundle?.artifact;
    setLocalView({
      ...current,
      messages: [...current.messages, message],
      artifacts: artifact ? upsertWorkspaceArtifact(current.artifacts, artifact) : current.artifacts,
      threads: bumpThread(current.threads, message.threadId, message.createdAt),
      workspace: { ...current.workspace, updatedAt: message.createdAt },
    }, ownerId);
    return message;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await requireDbThread(ownerId, input.workspaceId, input.threadId);
    const message = bundle?.message ?? buildMessage(input, content);
    const now = new Date(message.createdAt);
    const artifact = bundle?.artifact;
    await getDb().transaction(async (tx) => {
      await tx.insert(workspaceMessages).values({
        id: message.id,
        workspaceId: message.workspaceId,
        threadId: message.threadId,
        ownerId,
        senderName: message.senderName,
        senderKind: message.senderKind,
        content: message.content,
        artifact: message.artifact ?? null,
        createdAt: now,
      });
      if (artifact) {
        await tx.insert(workspaceArtifacts).values(dbWorkspaceArtifactValues(artifact, ownerId));
      }
      await tx.update(workspaceThreads).set({ updatedAt: now }).where(eq(workspaceThreads.id, message.threadId));
      await tx.update(workspaces).set({ updatedAt: now }).where(eq(workspaces.id, message.workspaceId));
    });
    notifyWorkspaceUpdated(message.workspaceId, ownerId);
    return message;
  } catch (error) {
    console.error("[workspace] database message persistence failed", error);
    throw error;
  }
}

export async function listWorkspaceMessages(
  ownerId: string | null | undefined,
  input: { workspaceId: string; threadId: string; before?: number; limit?: number },
): Promise<WorkspaceMessagePage> {
  const limit = Math.max(1, Math.min(input.limit ?? MESSAGE_WINDOW_PER_THREAD, 100));
  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    requireLocalThread(input.threadId, input.workspaceId, ownerId);
    const current = getLocalStore(ownerId).views.find((view) => view.workspace.id === input.workspaceId);
    if (!current) throw new Error("Workspace not found.");
    const messages = current.messages
      .filter((message) => message.threadId === input.threadId)
      .filter((message) => input.before === undefined || message.createdAt < input.before)
      .sort((a, b) => b.createdAt - a.createdAt);
    const page = messages.slice(0, limit + 1);
    return {
      messages: page.slice(0, limit).sort((a, b) => a.createdAt - b.createdAt),
      hasMore: page.length > limit,
    };
  }

  try {
    await requireDbThread(ownerId, input.workspaceId, input.threadId);
    const whereClause =
      input.before === undefined
        ? and(eq(workspaceMessages.workspaceId, input.workspaceId), eq(workspaceMessages.threadId, input.threadId))
        : and(
            eq(workspaceMessages.workspaceId, input.workspaceId),
            eq(workspaceMessages.threadId, input.threadId),
            lt(workspaceMessages.createdAt, new Date(input.before)),
          );
    const rows = await getDb()
      .select()
      .from(workspaceMessages)
      .where(whereClause)
      .orderBy(desc(workspaceMessages.createdAt))
      .limit(limit + 1);
    return {
      messages: rows.slice(0, limit).map(rowToWorkspaceMessage).sort((a, b) => a.createdAt - b.createdAt),
      hasMore: rows.length > limit,
    };
  } catch (error) {
    console.error("[workspace] database message page failed", error);
    throw error;
  }
}

export async function listWorkspaceAgentRuns(
  ownerId: string | null | undefined,
  input: { workspaceId: string; threadId?: string; limit?: number },
): Promise<WorkspaceAgentRunPage> {
  const limit = Math.max(1, Math.min(input.limit ?? 50, 100));
  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    if (input.threadId) requireLocalThread(input.threadId, input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    const runs = current.agentRuns
      .filter((run) => run.workspaceId === input.workspaceId)
      .filter((run) => !input.threadId || run.threadId === input.threadId)
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
    const runIds = new Set(runs.map((run) => run.id));
    const runEvents = current.agentRunEvents.filter((event) => runIds.has(event.runId)).sort((a, b) => a.createdAt - b.createdAt);
    const eventView = buildWorkspaceAgentPageEventView(runs, runEvents);
    return {
      runs: runs.sort((a, b) => a.startedAt - b.startedAt),
      events: runEvents,
      agentEvents: eventView.agentEvents,
      agentSignals: eventView.agentSignals,
      approvals: current.agentApprovals.filter((approval) => runIds.has(approval.runId)).sort((a, b) => a.requestedAt - b.requestedAt),
    };
  }

  try {
    if (input.threadId) {
      await requireDbThread(ownerId, input.workspaceId, input.threadId);
    } else {
      await requireDbWorkspace(ownerId, input.workspaceId);
    }
    const visibleThreadIds = input.threadId ? [input.threadId] : await listDbVisibleWorkspaceThreadIds(ownerId, input.workspaceId);
    if (!visibleThreadIds.length) return emptyWorkspaceAgentRunPage();
    const whereClause = and(eq(workspaceAgentRuns.workspaceId, input.workspaceId), inArray(workspaceAgentRuns.threadId, visibleThreadIds));
    const runRows = await getDb().select().from(workspaceAgentRuns).where(whereClause).orderBy(desc(workspaceAgentRuns.startedAt)).limit(limit);
    const runs = runRows.map(rowToWorkspaceAgentRun).sort((a, b) => a.startedAt - b.startedAt);
    if (!runs.length) return emptyWorkspaceAgentRunPage();
    const runIds = runs.map((run) => run.id);
    const [eventRows, approvalRows] = await Promise.all([
      getDb()
        .select()
        .from(workspaceAgentRunEvents)
        .where(inArray(workspaceAgentRunEvents.runId, runIds))
        .orderBy(asc(workspaceAgentRunEvents.createdAt)),
      getDb()
        .select()
        .from(workspaceAgentApprovals)
        .where(inArray(workspaceAgentApprovals.runId, runIds))
        .orderBy(asc(workspaceAgentApprovals.requestedAt)),
    ]);
    const events = eventRows.map(rowToWorkspaceAgentRunEvent);
    const eventView = buildWorkspaceAgentPageEventView(runs, events);
    return {
      runs,
      events,
      agentEvents: eventView.agentEvents,
      agentSignals: eventView.agentSignals,
      approvals: approvalRows.map(rowToWorkspaceAgentApproval),
    };
  } catch (error) {
    console.error("[workspace] database agent run page failed", error);
    throw error;
  }
}

export async function listWorkspaceThreadActivity(
  ownerId: string | null | undefined,
  input: { workspaceId: string; threadId: string; messageLimit?: number; runLimit?: number },
): Promise<WorkspaceMessagePage & WorkspaceAgentRunPage> {
  const messageLimit = Math.max(1, Math.min(input.messageLimit ?? MESSAGE_WINDOW_PER_THREAD, 100));
  const runLimit = Math.max(1, Math.min(input.runLimit ?? 20, 100));
  if (!usesDatabase(ownerId)) {
    const messagesPage = await listWorkspaceMessages(ownerId, {
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      limit: messageLimit,
    });
    const runsPage = await listWorkspaceAgentRuns(ownerId, {
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      limit: runLimit,
    });
    return { ...messagesPage, ...runsPage };
  }

  try {
    await requireDbThread(ownerId, input.workspaceId, input.threadId);
    const [messageRows, runRows] = await Promise.all([
      getDb()
        .select()
        .from(workspaceMessages)
        .where(and(eq(workspaceMessages.workspaceId, input.workspaceId), eq(workspaceMessages.threadId, input.threadId)))
        .orderBy(desc(workspaceMessages.createdAt))
        .limit(messageLimit + 1),
      getDb()
        .select()
        .from(workspaceAgentRuns)
        .where(and(eq(workspaceAgentRuns.workspaceId, input.workspaceId), eq(workspaceAgentRuns.threadId, input.threadId)))
        .orderBy(desc(workspaceAgentRuns.startedAt))
        .limit(runLimit),
    ]);
    const runs = runRows.map(rowToWorkspaceAgentRun).sort((a, b) => a.startedAt - b.startedAt);
    const runIds = runs.map((run) => run.id);
    const [eventRows, approvalRows] = runIds.length
      ? await Promise.all([
          getDb()
            .select()
            .from(workspaceAgentRunEvents)
            .where(inArray(workspaceAgentRunEvents.runId, runIds))
            .orderBy(asc(workspaceAgentRunEvents.createdAt)),
          getDb()
            .select()
            .from(workspaceAgentApprovals)
            .where(inArray(workspaceAgentApprovals.runId, runIds))
            .orderBy(asc(workspaceAgentApprovals.requestedAt)),
        ])
      : [[], []];

    const events = eventRows.map(rowToWorkspaceAgentRunEvent);
    const eventView = buildWorkspaceAgentPageEventView(runs, events);
    return {
      messages: messageRows.slice(0, messageLimit).map(rowToWorkspaceMessage).sort((a, b) => a.createdAt - b.createdAt),
      hasMore: messageRows.length > messageLimit,
      runs,
      events,
      agentEvents: eventView.agentEvents,
      agentSignals: eventView.agentSignals,
      approvals: approvalRows.map(rowToWorkspaceAgentApproval),
    };
  } catch (error) {
    console.error("[workspace] database thread activity failed", error);
    throw error;
  }
}

export async function getWorkspaceAgentRunDetail(
  ownerId: string | null | undefined,
  input: { workspaceId: string; runId: string },
): Promise<WorkspaceAgentRunDetail> {
  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    const run = current.agentRuns.find((entry) => entry.id === input.runId && entry.workspaceId === input.workspaceId);
    if (!run) throw new Error("Agent run not found.");
    const linkedMessageIds = new Set([run.inputMessageId, run.outputMessageId].filter((id): id is string => Boolean(id)));
    const runEvents = current.agentRunEvents.filter((event) => event.runId === run.id).sort((a, b) => a.createdAt - b.createdAt);
    const memories = current.agentMemories
      .filter((memory) => memory.sourceRunId === run.id && !memory.archivedAt && isLocalWorkspaceAgentMemoryVisibleToOwner(memory, ownerId))
      .sort((a, b) => a.createdAt - b.createdAt);
    const eventView = buildWorkspaceAgentRunResultEventView({ runs: [run], events: runEvents, memories });
    return {
      run,
      events: runEvents,
      agentEvents: eventView.agentEvents,
      agentSignals: eventView.agentSignals,
      approvals: current.agentApprovals.filter((approval) => approval.runId === run.id).sort((a, b) => a.requestedAt - b.requestedAt),
      inputMessage: run.inputMessageId ? current.messages.find((message) => message.id === run.inputMessageId) : undefined,
      outputMessage: run.outputMessageId ? current.messages.find((message) => message.id === run.outputMessageId) : undefined,
      task: run.taskId ? current.tasks.find((task) => task.id === run.taskId) : undefined,
      artifacts: current.artifacts
        .filter((artifact) => artifact.sourceRunId === run.id || (artifact.sourceMessageId ? linkedMessageIds.has(artifact.sourceMessageId) : false))
        .sort((a, b) => a.createdAt - b.createdAt),
      memories,
    };
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    const runRows = await getDb()
      .select()
      .from(workspaceAgentRuns)
      .where(and(eq(workspaceAgentRuns.id, input.runId), eq(workspaceAgentRuns.workspaceId, input.workspaceId)))
      .limit(1);
    const run = runRows[0] ? rowToWorkspaceAgentRun(runRows[0]) : undefined;
    if (!run) throw new Error("Agent run not found.");
    await requireDbThread(ownerId, input.workspaceId, run.threadId);

    const linkedMessageIds = [run.inputMessageId, run.outputMessageId].filter((id): id is string => Boolean(id));
    const [eventRows, approvalRows, messageRows, taskRows, artifactRows, memoryRows] = await Promise.all([
      getDb()
        .select()
        .from(workspaceAgentRunEvents)
        .where(eq(workspaceAgentRunEvents.runId, run.id))
        .orderBy(asc(workspaceAgentRunEvents.createdAt)),
      getDb()
        .select()
        .from(workspaceAgentApprovals)
        .where(eq(workspaceAgentApprovals.runId, run.id))
        .orderBy(asc(workspaceAgentApprovals.requestedAt)),
      linkedMessageIds.length
        ? getDb().select().from(workspaceMessages).where(and(eq(workspaceMessages.workspaceId, input.workspaceId), inArray(workspaceMessages.id, linkedMessageIds)))
        : Promise.resolve([]),
      run.taskId
        ? getDb()
            .select()
            .from(workspaceTasks)
            .where(and(eq(workspaceTasks.workspaceId, input.workspaceId), eq(workspaceTasks.id, run.taskId)))
            .limit(1)
        : Promise.resolve([]),
      getDb()
        .select()
        .from(workspaceArtifacts)
        .where(
          and(
            eq(workspaceArtifacts.workspaceId, input.workspaceId),
            linkedMessageIds.length
              ? or(eq(workspaceArtifacts.sourceRunId, run.id), inArray(workspaceArtifacts.sourceMessageId, linkedMessageIds))
              : eq(workspaceArtifacts.sourceRunId, run.id),
          ),
        )
        .orderBy(asc(workspaceArtifacts.createdAt)),
      getDb()
        .select()
        .from(workspaceAgentMemories)
        .where(and(eq(workspaceAgentMemories.sourceRunId, run.id), eq(workspaceAgentMemories.workspaceId, input.workspaceId)))
        .orderBy(asc(workspaceAgentMemories.createdAt)),
    ]);
    const events = eventRows.map(rowToWorkspaceAgentRunEvent);
    const memories = memoryRows
      .filter((memory) => isDbWorkspaceAgentMemoryVisibleToOwner(memory, ownerId))
      .map(rowToWorkspaceAgentMemory)
      .filter((memory) => !memory.archivedAt);
    const eventView = buildWorkspaceAgentRunResultEventView({ runs: [run], events, memories, task: taskRows[0] ? rowToWorkspaceTask(taskRows[0]) : undefined });
    const messages = messageRows.map(rowToWorkspaceMessage);
    return {
      run,
      events,
      agentEvents: eventView.agentEvents,
      agentSignals: eventView.agentSignals,
      approvals: approvalRows.map(rowToWorkspaceAgentApproval),
      inputMessage: run.inputMessageId ? messages.find((message) => message.id === run.inputMessageId) : undefined,
      outputMessage: run.outputMessageId ? messages.find((message) => message.id === run.outputMessageId) : undefined,
      task: taskRows[0] ? rowToWorkspaceTask(taskRows[0]) : undefined,
      artifacts: artifactRows.map(rowToWorkspaceArtifact),
      memories,
    };
  } catch (error) {
    console.error("[workspace] agent run detail failed", error);
    throw error;
  }
}

export async function cancelWorkspaceAgentRun(
  ownerId: string | null | undefined,
  input: CancelWorkspaceAgentRunInput,
): Promise<WorkspaceAgentRunCancelResult> {
  const now = Date.now();
  const reason = input.reason?.trim() || undefined;
  const cancelledBy = input.cancelledBy?.trim() || undefined;

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    const existingRun = current.agentRuns.find((run) => run.id === input.runId && run.workspaceId === input.workspaceId);
    if (!existingRun) throw new Error("Agent run not found.");
    requireLocalThread(existingRun.threadId, input.workspaceId, ownerId);
    if (isTerminalAgentRunStatus(existingRun.status)) {
      const runEvents = current.agentRunEvents.filter((event) => event.runId === existingRun.id);
      const eventView = buildWorkspaceAgentEventView(existingRun, runEvents);
      return {
        run: existingRun,
        events: [],
        agentEvents: eventView.agentEvents,
        agentSignals: eventView.agentSignals,
        approvals: current.agentApprovals.filter((approval) => approval.runId === existingRun.id),
      };
    }
    const run: WorkspaceAgentRun = {
      ...existingRun,
      status: "cancelled",
      completedAt: now,
    };
    const event = buildAgentRunEvent(run, "status", "cancelled", { reason, cancelledBy }, now);
    const approvals = current.agentApprovals.map((approval) =>
      approval.runId === run.id && approval.status === "pending"
        ? {
            ...approval,
            status: "expired" as const,
            decidedAt: now,
            decidedBy: cancelledBy,
            decisionReason: reason ?? "Run cancelled.",
          }
        : approval,
    );
    const runApprovals = approvals.filter((approval) => approval.runId === run.id);
    setLocalView({
      ...current,
      agentRuns: current.agentRuns.map((entry) => (entry.id === run.id ? run : entry)),
      agentRunEvents: [...current.agentRunEvents, event],
      agentApprovals: approvals,
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    const eventView = buildWorkspaceAgentEventView(run, [...current.agentRunEvents.filter((entry) => entry.runId === run.id), event]);
    return { run, events: [event], agentEvents: eventView.agentEvents, agentSignals: eventView.agentSignals, approvals: runApprovals };
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    const runRows = await getDb()
      .select()
      .from(workspaceAgentRuns)
      .where(and(eq(workspaceAgentRuns.id, input.runId), eq(workspaceAgentRuns.workspaceId, input.workspaceId)))
      .limit(1);
    const runRow = runRows[0];
    if (!runRow) throw new Error("Agent run not found.");
    await requireDbThread(ownerId, runRow.workspaceId, runRow.threadId);
    const existingRun = rowToWorkspaceAgentRun(runRow);
    if (isTerminalAgentRunStatus(existingRun.status)) {
      const [approvalRows, eventRows] = await Promise.all([
        getDb()
          .select()
          .from(workspaceAgentApprovals)
          .where(eq(workspaceAgentApprovals.runId, existingRun.id))
          .orderBy(asc(workspaceAgentApprovals.requestedAt)),
        getDb()
          .select()
          .from(workspaceAgentRunEvents)
          .where(eq(workspaceAgentRunEvents.runId, existingRun.id))
          .orderBy(asc(workspaceAgentRunEvents.createdAt)),
      ]);
      const eventView = buildWorkspaceAgentEventView(existingRun, eventRows.map(rowToWorkspaceAgentRunEvent));
      return { run: existingRun, events: [], agentEvents: eventView.agentEvents, agentSignals: eventView.agentSignals, approvals: approvalRows.map(rowToWorkspaceAgentApproval) };
    }
    const run: WorkspaceAgentRun = { ...existingRun, status: "cancelled", completedAt: now };
    const event = buildAgentRunEvent(run, "status", "cancelled", { reason, cancelledBy }, now);

    let approvalRows: Array<typeof workspaceAgentApprovals.$inferSelect> = [];
    await getDb().transaction(async (tx) => {
      await tx
        .update(workspaceAgentRuns)
        .set({ status: run.status, completedAt: new Date(now) })
        .where(eq(workspaceAgentRuns.id, run.id));
      await tx
        .update(workspaceAgentApprovals)
        .set({
          status: "expired",
          decidedAt: new Date(now),
          decidedBy: cancelledBy ?? null,
          decisionReason: reason ?? "Run cancelled.",
        })
        .where(and(eq(workspaceAgentApprovals.runId, run.id), eq(workspaceAgentApprovals.status, "pending")));
      await tx.insert(workspaceAgentRunEvents).values({
        id: event.id,
        runId: event.runId,
        workspaceId: event.workspaceId,
        threadId: event.threadId,
        ownerId,
        type: event.type,
        label: event.label,
        payload: event.payload ?? null,
        createdAt: new Date(event.createdAt),
      });
      await tx.update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
      approvalRows = await tx
        .select()
        .from(workspaceAgentApprovals)
        .where(eq(workspaceAgentApprovals.runId, run.id))
        .orderBy(asc(workspaceAgentApprovals.requestedAt));
    });
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    const eventRows = await getDb()
      .select()
      .from(workspaceAgentRunEvents)
      .where(eq(workspaceAgentRunEvents.runId, run.id))
      .orderBy(asc(workspaceAgentRunEvents.createdAt));
    const eventView = buildWorkspaceAgentEventView(run, eventRows.map(rowToWorkspaceAgentRunEvent));
    return { run, events: [event], agentEvents: eventView.agentEvents, agentSignals: eventView.agentSignals, approvals: approvalRows.map(rowToWorkspaceAgentApproval) };
  } catch (error) {
    console.error("[workspace] database agent run cancellation failed", error);
    throw error;
  }
}

export async function retryWorkspaceAgentRun(
  ownerId: string | null | undefined,
  input: RetryWorkspaceAgentRunInput & { runner?: WorkspaceAgentRuntimeRunner },
): Promise<WorkspaceAgentRunResult> {
  const view = await getWorkspaceView(ownerId, input.workspaceId);
  const sourceRun = view.agentRuns.find((run) => run.id === input.runId && run.workspaceId === input.workspaceId);
  if (!sourceRun) throw new Error("Agent run not found.");
  if (sourceRun.status !== "failed" && sourceRun.status !== "cancelled") {
    throw new Error("Only failed or cancelled agent runs can be retried.");
  }

  if (sourceRun.taskId && sourceRun.trigger === "task_assignment") {
    const task = view.tasks.find((entry) => entry.id === sourceRun.taskId && entry.workspaceId === input.workspaceId);
    if (!task) throw new Error("Retry task not found.");
    const result = await runWorkspaceAgentTask(ownerId, {
      workspaceId: input.workspaceId,
      task,
      runner: input.runner,
    });
    return addRetrySourceEvents(ownerId, input.workspaceId, sourceRun, result);
  }

  if (!sourceRun.inputMessageId) throw new Error("Retry input message not found.");
  const message = view.messages.find((entry) => entry.id === sourceRun.inputMessageId && entry.workspaceId === input.workspaceId);
  if (!message) throw new Error("Retry input message not found.");
  const result = await runWorkspaceAgentTurn(ownerId, {
    workspaceId: input.workspaceId,
    threadId: sourceRun.threadId,
    message,
    runner: input.runner,
  });
  return addRetrySourceEvents(ownerId, input.workspaceId, sourceRun, result);
}

export async function seedWorkspaceAgentRunForTest(
  ownerId: string | null | undefined,
  input: {
    run: Omit<WorkspaceAgentRun, "id" | "startedAt"> & { id?: string; startedAt?: number };
    events: Array<WorkspaceAgentRuntimeEvent & { createdAt?: number }>;
    outputMessage?: Omit<WorkspaceMessage, "id" | "createdAt"> & { id?: string; createdAt?: number };
    createApprovals?: boolean;
  },
): Promise<{ agentRuns: WorkspaceAgentRun[]; agentRunEvents: WorkspaceAgentRunEvent[]; agentApprovals: WorkspaceAgentApproval[]; agentMessages: WorkspaceMessage[] }> {
  if (process.env.NODE_ENV === "production") throw new Error("Test-only workspace seeding is unavailable in production.");
  if (usesDatabase(ownerId)) return seedDbWorkspaceAgentRunForTest(ownerId, input);
  requireLocalWorkspace(input.run.workspaceId, ownerId);
  requireLocalThread(input.run.threadId, input.run.workspaceId, ownerId);
  const current = getLocalRawView(input.run.workspaceId, ownerId);
  const agentMember = current.members.find((member) => member.id === input.run.agentMemberId);
  const agentProfile = current.agentProfiles.find((profile) => profile.id === input.run.agentProfileId);
  if (!agentMember || !agentProfile) throw new Error("Agent member/profile not found.");

  const outputMessage = input.outputMessage
    ? {
        ...input.outputMessage,
        id: input.outputMessage.id ?? `wmsg_${randomBytes(10).toString("base64url")}`,
        createdAt: input.outputMessage.createdAt ?? nextMessageTimestamp(),
      } satisfies WorkspaceMessage
    : undefined;
  const startedAt = input.run.startedAt ?? Date.now();
  const run: WorkspaceAgentRun = {
    ...input.run,
    id: input.run.id ?? createWorkspaceAgentRunId(),
    outputMessageId: input.run.outputMessageId ?? outputMessage?.id,
    startedAt,
  };
  const deepAgentThreadId = buildWorkspaceAgentRunThreadId({
    workspaceId: run.workspaceId,
    threadId: run.threadId,
    agentProfileId: run.agentProfileId,
    runId: run.id,
  });
  const events = input.events.map((event) => buildAgentRunEvent(run, event.type, event.label, event.payload, event.createdAt));
  const approvals = run.status === "waiting_for_approval" || input.createApprovals ? buildPendingWorkspaceAgentApprovals(run, events, deepAgentThreadId, Date.now()) : [];
  setLocalView({
    ...current,
    messages: outputMessage ? [...current.messages, outputMessage].sort((a, b) => a.createdAt - b.createdAt) : current.messages,
    threads: outputMessage ? bumpThread(current.threads, outputMessage.threadId, outputMessage.createdAt) : current.threads,
    agentRuns: [...current.agentRuns, run],
    agentRunEvents: [...current.agentRunEvents, ...events],
    agentApprovals: [...current.agentApprovals, ...approvals],
    workspace: { ...current.workspace, updatedAt: Date.now() },
  }, ownerId);
  return { agentRuns: [run], agentRunEvents: events, agentApprovals: approvals, agentMessages: outputMessage ? [outputMessage] : [] };
}

async function seedDbWorkspaceAgentRunForTest(
  ownerId: string,
  input: {
    run: Omit<WorkspaceAgentRun, "id" | "startedAt"> & { id?: string; startedAt?: number };
    events: Array<WorkspaceAgentRuntimeEvent & { createdAt?: number }>;
    outputMessage?: Omit<WorkspaceMessage, "id" | "createdAt"> & { id?: string; createdAt?: number };
    createApprovals?: boolean;
  },
): Promise<{ agentRuns: WorkspaceAgentRun[]; agentRunEvents: WorkspaceAgentRunEvent[]; agentApprovals: WorkspaceAgentApproval[]; agentMessages: WorkspaceMessage[] }> {
  await ensureSeedWorkspace(ownerId);
  await requireDbWorkspace(ownerId, input.run.workspaceId);
  await requireDbThread(ownerId, input.run.workspaceId, input.run.threadId);
  const view = await getWorkspaceViewFromDb(ownerId, input.run.workspaceId);
  const agentMember = view.members.find((member) => member.id === input.run.agentMemberId);
  const agentProfile = view.agentProfiles.find((profile) => profile.id === input.run.agentProfileId);
  if (!agentMember || !agentProfile) throw new Error("Agent member/profile not found.");

  const outputMessage = input.outputMessage
    ? {
        ...input.outputMessage,
        id: input.outputMessage.id ?? `wmsg_${randomBytes(10).toString("base64url")}`,
        createdAt: input.outputMessage.createdAt ?? nextMessageTimestamp(),
      } satisfies WorkspaceMessage
    : undefined;
  const startedAt = input.run.startedAt ?? Date.now();
  const run: WorkspaceAgentRun = {
    ...input.run,
    id: input.run.id ?? createWorkspaceAgentRunId(),
    outputMessageId: input.run.outputMessageId ?? outputMessage?.id,
    startedAt,
  };
  const deepAgentThreadId = buildWorkspaceAgentRunThreadId({
    workspaceId: run.workspaceId,
    threadId: run.threadId,
    agentProfileId: run.agentProfileId,
    runId: run.id,
  });
  const events = input.events.map((event) => buildAgentRunEvent(run, event.type, event.label, event.payload, event.createdAt));
  const approvals = run.status === "waiting_for_approval" || input.createApprovals ? buildPendingWorkspaceAgentApprovals(run, events, deepAgentThreadId, Date.now()) : [];

  await getDb().transaction(async (tx) => {
    if (outputMessage) {
      await tx.insert(workspaceMessages).values({
        id: outputMessage.id,
        workspaceId: outputMessage.workspaceId,
        threadId: outputMessage.threadId,
        ownerId,
        senderName: outputMessage.senderName,
        senderKind: outputMessage.senderKind,
        content: outputMessage.content,
        artifact: outputMessage.artifact ?? null,
        createdAt: new Date(outputMessage.createdAt),
      });
      await tx.update(workspaceThreads).set({ updatedAt: new Date(outputMessage.createdAt) }).where(eq(workspaceThreads.id, outputMessage.threadId));
    }
    await tx.insert(workspaceAgentRuns).values({
      id: run.id,
      workspaceId: run.workspaceId,
      threadId: run.threadId,
      ownerId,
      agentProfileId: run.agentProfileId,
      agentMemberId: run.agentMemberId ?? null,
      trigger: run.trigger,
      status: run.status,
      inputMessageId: run.inputMessageId ?? null,
      outputMessageId: run.outputMessageId ?? null,
      taskId: run.taskId ?? null,
      error: run.error ?? null,
      startedAt: new Date(run.startedAt),
      completedAt: run.completedAt ? new Date(run.completedAt) : null,
    });
    await tx.insert(workspaceAgentRunEvents).values(
      events.map((event) => ({
        id: event.id,
        runId: event.runId,
        workspaceId: event.workspaceId,
        threadId: event.threadId,
        ownerId,
        type: event.type,
        label: event.label,
        payload: event.payload ?? null,
        createdAt: new Date(event.createdAt),
      })),
    );
    if (approvals.length) {
      await tx.insert(workspaceAgentApprovals).values(
        approvals.map((approval) => ({
          id: approval.id,
          workspaceId: approval.workspaceId,
          threadId: approval.threadId,
          runId: approval.runId,
          ownerId,
          agentProfileId: approval.agentProfileId,
          agentMemberId: approval.agentMemberId ?? null,
          toolName: approval.toolName,
          status: approval.status,
          input: approval.input ?? null,
          policy: approval.policy ?? null,
          deepAgentThreadId: approval.deepAgentThreadId ?? null,
          requestedAt: new Date(approval.requestedAt),
          decidedAt: approval.decidedAt ? new Date(approval.decidedAt) : null,
          decidedBy: approval.decidedBy ?? null,
          decisionReason: approval.decisionReason ?? null,
        })),
      );
    }
    await tx.update(workspaces).set({ updatedAt: new Date(Date.now()) }).where(eq(workspaces.id, run.workspaceId));
  });
  notifyWorkspaceUpdated(run.workspaceId, ownerId);
  return { agentRuns: [run], agentRunEvents: events, agentApprovals: approvals, agentMessages: outputMessage ? [outputMessage] : [] };
}

export async function createWorkspaceThread(ownerId: string | null | undefined, input: CreateWorkspaceThreadInput): Promise<WorkspaceThread> {
  const name = input.name.trim();
  if (!name) throw new Error("Thread name is required.");

  const now = Date.now();
  const thread: WorkspaceThread = {
    id: `wthread_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.workspaceId,
    type: input.type,
    name,
    description: input.description?.trim() || (input.type === "direct" ? "private conversation" : "shared room"),
    agentTriggerMode: normalizeWorkspaceThreadAgentTriggerMode(input.agentTriggerMode),
    allowedAgentProfileIds: input.type === "room" ? normalizeWorkspaceThreadAllowedAgentProfileIds(input.allowedAgentProfileIds) : undefined,
    participantIds: input.type === "direct" ? normalizeParticipantIds(input.participantIds) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    assertWorkspaceThreadAllowedAgentProfileIdsForView(current, thread.allowedAgentProfileIds);
    const localThread: WorkspaceThread = {
      ...thread,
      participantIds: thread.type === "direct" ? buildLocalDirectParticipantIds(current.members, thread.participantIds) : undefined,
    };
    setLocalView({
      ...current,
      threads: [localThread, ...current.threads],
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return localThread;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await assertDbWorkspaceThreadAllowedAgentProfileIds(input.workspaceId, thread.allowedAgentProfileIds);
    const participantRows = input.type === "direct" ? await buildDbThreadParticipantRows(ownerId, input.workspaceId, thread.id, thread.participantIds, now) : [];
    await getDb().transaction(async (tx) => {
      await tx.insert(workspaceThreads).values({
        id: thread.id,
        workspaceId: thread.workspaceId,
        ownerId,
        type: thread.type,
        name: thread.name,
        description: thread.description ?? null,
        agentTriggerMode: thread.agentTriggerMode ?? "room_default",
        allowedAgentProfileIds: thread.allowedAgentProfileIds ?? null,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
      });
      if (participantRows.length) await tx.insert(workspaceThreadMembers).values(participantRows);
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return {
      ...thread,
      participantIds: thread.type === "direct" ? participantRows.map((row) => row.memberId) : undefined,
    };
  } catch (error) {
    console.error("[workspace] database thread persistence failed", error);
    throw error;
  }
}

export async function updateWorkspaceThread(ownerId: string | null | undefined, input: UpdateWorkspaceThreadInput): Promise<WorkspaceThread> {
  const now = Date.now();

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    requireLocalThread(input.threadId, input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    const existing = current.threads.find((thread) => thread.id === input.threadId && thread.workspaceId === input.workspaceId);
    if (!existing) throw new Error("Thread not found.");
    if (existing.type !== "room") throw new Error("Agent mode can only be changed for group chats.");
    const allowedAgentProfileIds = input.allowedAgentProfileIds === undefined
      ? existing.allowedAgentProfileIds
      : normalizeWorkspaceThreadAllowedAgentProfileIds(input.allowedAgentProfileIds);
    assertWorkspaceThreadAllowedAgentProfileIdsForView(current, allowedAgentProfileIds);
    const thread: WorkspaceThread = {
      ...existing,
      agentTriggerMode: normalizeWorkspaceThreadAgentTriggerMode(input.agentTriggerMode ?? existing.agentTriggerMode),
      allowedAgentProfileIds,
      updatedAt: now,
    };
    setLocalView({
      ...current,
      threads: current.threads.map((entry) => (entry.id === thread.id ? thread : entry)),
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return thread;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await requireDbThread(ownerId, input.workspaceId, input.threadId);
    const rows = await getDb()
      .select()
      .from(workspaceThreads)
      .where(and(eq(workspaceThreads.id, input.threadId), eq(workspaceThreads.workspaceId, input.workspaceId)))
      .limit(1);
    const existing = rows[0];
    if (!existing) throw new Error("Thread not found.");
    if (existing.type !== "room") throw new Error("Agent mode can only be changed for group chats.");
    const agentTriggerMode = normalizeWorkspaceThreadAgentTriggerMode(input.agentTriggerMode ?? existing.agentTriggerMode);
    const allowedAgentProfileIds =
      input.allowedAgentProfileIds === undefined
        ? normalizeWorkspaceThreadAllowedAgentProfileIds(existing.allowedAgentProfileIds)
        : normalizeWorkspaceThreadAllowedAgentProfileIds(input.allowedAgentProfileIds);
    await assertDbWorkspaceThreadAllowedAgentProfileIds(input.workspaceId, allowedAgentProfileIds);
    const updatedAt = new Date(now);
    await getDb().transaction(async (tx) => {
      await tx
        .update(workspaceThreads)
        .set({ agentTriggerMode, allowedAgentProfileIds: allowedAgentProfileIds ?? null, updatedAt })
        .where(and(eq(workspaceThreads.id, input.threadId), eq(workspaceThreads.workspaceId, input.workspaceId)));
      await tx.update(workspaces).set({ updatedAt }).where(eq(workspaces.id, input.workspaceId));
    });
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return rowToWorkspaceThread({ ...existing, agentTriggerMode, allowedAgentProfileIds: allowedAgentProfileIds ?? null, updatedAt });
  } catch (error) {
    console.error("[workspace] database thread update failed", error);
    throw error;
  }
}

export async function createWorkspaceTask(ownerId: string | null | undefined, input: CreateWorkspaceTaskInput): Promise<WorkspaceTask> {
  const now = Date.now();
  const task = await buildWorkspaceTaskForCreate(ownerId, input, now);

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    requireLocalThread(input.threadId, input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    assertLocalWorkspaceTaskSourceVisibility(current, task);
    setLocalView({
      ...current,
      tasks: [task, ...current.tasks],
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return task;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await requireDbThread(ownerId, input.workspaceId, input.threadId);
    await assertDbWorkspaceTaskSourceVisibilityWithContext(workspaceTaskServiceContext, ownerId, input.workspaceId, task);
    await getDb().insert(workspaceTasks).values({
      id: task.id,
      workspaceId: task.workspaceId,
      threadId: task.threadId,
      ownerId,
      title: task.title,
      scope: task.scope,
      status: task.status,
      progress: task.progress,
      dueAt: task.dueAt ?? null,
      metadata: buildTaskMetadata(task),
      createdAt: new Date(task.createdAt),
      updatedAt: new Date(task.updatedAt),
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return task;
  } catch (error) {
    console.error("[workspace] database task persistence failed", error);
    throw error;
  }
}

async function buildWorkspaceTaskForCreate(ownerId: string | null | undefined, input: CreateWorkspaceTaskInput, now: number): Promise<WorkspaceTask> {
  const title = input.title.trim();
  if (!title) throw new Error("Task title is required.");
  const assignee = await resolveTaskAssignee(ownerId, input.workspaceId, input.assigneeId);
  return {
    id: `wtask_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    title,
    scope: input.scope?.trim() || "Shared",
    status: "open",
    progress: input.progress?.trim() || "new",
    assigneeId: assignee?.id,
    assigneeName: assignee?.displayName,
    sourceArtifactId: input.sourceArtifactId,
    sourceRunId: input.sourceRunId,
    dueAt: input.dueAt?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export async function runWorkspaceAgentTurn(
  ownerId: string | null | undefined,
  input: { workspaceId: string; threadId: string; message: WorkspaceMessage; runner?: WorkspaceAgentRuntimeRunner },
): Promise<WorkspaceAgentRunResult> {
  if (input.message.senderKind !== "human") return emptyWorkspaceAgentRunResult();
  const view = await getWorkspaceView(ownerId, input.workspaceId);
  const thread = view.threads.find((entry) => entry.id === input.threadId);
  if (!thread) return emptyWorkspaceAgentRunResult();
  const triggerDecision = decideWorkspaceAgentsForMessage(view, thread, input.message.content);
  const agents = triggerDecision.agents;
  if (!agents.length) return emptyWorkspaceAgentRunResult();

  const recentVisibleMessages = view.messages
    .filter((message) => message.threadId === input.threadId && message.id !== input.message.id)
    .slice(-3);
  const recentMessages = recentVisibleMessages.map((message) => `${message.senderName}: ${message.content}`);
  const openTasks = view.tasks.filter((task) => task.threadId === input.threadId && task.status !== "done").slice(0, 3);
  const agentMemories = view.agentMemories.filter((memory) => memory.scope !== "thread" || memory.threadId === input.threadId).slice(0, 8);
  const messages: WorkspaceMessage[] = [];
  const runs: WorkspaceAgentRun[] = [];
  const events: WorkspaceAgentRunEvent[] = [];
  const approvals: WorkspaceAgentApproval[] = [];
  const memories: WorkspaceAgentMemory[] = [];
  const runtime = await loadWorkspaceAgentRuntime();

  for (const agent of agents.slice(0, 1)) {
    const profile = agent.profile ?? await ensureImplicitAgentProfile(ownerId, input.workspaceId, agent.member);
    const runId = createWorkspaceAgentRunId();
    const runtimeResult = await runtime.executeWorkspaceAgentRuntime(
      {
        runId,
        workspaceId: input.workspaceId,
        threadId: input.threadId,
        profile,
        workspaceName: view.workspace.name,
        thread,
        member: agent.member,
        recentMessages,
        visibleMessages: buildWorkspaceRuntimeVisibleMessages(recentVisibleMessages),
        openTasks,
        agentMemories,
        agentConnections: view.agentConnections,
        delegateProfiles: view.agentProfiles,
        prompt: input.message.content,
      },
      input.runner ?? runtime.resolveWorkspaceAgentRuntimeRunner(),
    );
    const runStatus = runtimeResult.status ?? (runtimeResult.error ? "failed" : "completed");
    const message = await createWorkspaceMessage(ownerId, {
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      senderName: agent.member.displayName,
      senderKind: "agent",
      content:
        runStatus === "waiting_for_approval"
          ? `${agent.member.displayName} is waiting for approval before continuing.`
          : runtimeResult.error
            ? `${agent.member.displayName} could not finish this run. ${runtimeResult.error}`
            : runtimeResult.content,
    });
    const persistedRun = await createCompletedWorkspaceAgentRun(ownerId, {
      runId,
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      agent: { member: agent.member, profile },
      trigger: triggerDecision.trigger,
      status: runStatus,
      error: runtimeResult.error,
      inputMessageId: input.message.id,
      outputMessageId: message.id,
      triggerDecision: {
        reason: triggerDecision.reason,
        confidence: triggerDecision.confidence,
        selectedAgentIds: agents.map((entry) => entry.member.id),
      },
      runtimeEvents: runtimeResult.events,
    });
    messages.push(message);
    runs.push(persistedRun.run);
    events.push(...persistedRun.events);
    approvals.push(...persistedRun.approvals);
    const memory = await maybeCreateWorkspaceAgentRunMemory(ownerId, profile, agent.member, persistedRun.run, message, runtimeResult.content);
    if (memory) memories.push(memory);
  }

  const eventView = buildWorkspaceAgentRunResultEventView({ runs, events, memories });
  return { messages, runs, events, agentEvents: eventView.agentEvents, agentSignals: eventView.agentSignals, approvals, memories };
}

export async function runWorkspaceAgentTask(
  ownerId: string | null | undefined,
  input: { workspaceId: string; task: WorkspaceTask; runner?: WorkspaceAgentRuntimeRunner },
): Promise<WorkspaceAgentRunResult> {
  if (!input.task.assigneeId) return emptyWorkspaceAgentRunResult();
  const view = await getWorkspaceView(ownerId, input.workspaceId);
  const assignee = view.members.find((member) => member.id === input.task.assigneeId);
  if (!assignee || !isWorkspaceAgentMember(assignee)) return emptyWorkspaceAgentRunResult();
  const agent: WorkspaceAgentParticipant = {
    member: assignee,
    profile: assignee.agentProfileId ? view.agentProfiles.find((profile) => profile.id === assignee.agentProfileId) : undefined,
  };
  const thread = view.threads.find((entry) => entry.id === input.task.threadId);
  if (!thread) return emptyWorkspaceAgentRunResult();
  const profile = agent.profile ?? await ensureImplicitAgentProfile(ownerId, input.workspaceId, agent.member);
  const recentVisibleMessages = view.messages
    .filter((message) => message.threadId === input.task.threadId)
    .slice(-3);
  const recentMessages = recentVisibleMessages.map((message) => `${message.senderName}: ${message.content}`);
  const openTasks = view.tasks.filter((task) => task.threadId === input.task.threadId && task.status !== "done").slice(0, 3);
  const agentMemories = view.agentMemories.filter((memory) => memory.scope !== "thread" || memory.threadId === input.task.threadId).slice(0, 8);
  const runId = createWorkspaceAgentRunId();
  const runtime = await loadWorkspaceAgentRuntime();
  const runtimeResult = await runtime.executeWorkspaceAgentRuntime(
    {
      runId,
      workspaceId: input.workspaceId,
      threadId: input.task.threadId,
      profile,
      workspaceName: view.workspace.name,
      thread,
      member: assignee,
      recentMessages,
      visibleMessages: buildWorkspaceRuntimeVisibleMessages(recentVisibleMessages),
      openTasks,
      agentMemories,
      agentConnections: view.agentConnections,
      delegateProfiles: view.agentProfiles,
      prompt: `Complete task: ${input.task.title}. Scope: ${input.task.scope || "Workspace"}.`,
    },
    input.runner ??
      runtime.resolveWorkspaceAgentRuntimeRunner() ??
      (async (runtimeInput) => ({
        content: composeWorkspaceTaskPlaceholderResult(assignee, input.task),
        events: [
          {
            type: "status",
            label: "runtime_configured",
            payload: {
              model: runtimeInput.config.model,
              skillCount: runtimeInput.config.skills.length,
              toolCount: runtimeInput.config.tools.length,
              deepAgentThreadId: runtimeInput.threadId,
              taskId: input.task.id,
            },
          },
        ],
      })),
  );

  const runStatus = runtimeResult.status ?? (runtimeResult.error ? "failed" : "completed");
  const resultSummary =
    runStatus === "waiting_for_approval"
      ? "Agent is waiting for approval before continuing."
      : runtimeResult.error
        ? `Agent run failed: ${runtimeResult.error}`
        : runtimeResult.content;
  const task = await updateWorkspaceTask(ownerId, {
    workspaceId: input.workspaceId,
    taskId: input.task.id,
    status: runStatus === "completed" ? "done" : "open",
    progress: runStatus === "waiting_for_approval" ? "waiting for approval" : runtimeResult.error ? "agent run failed" : "agent submitted",
    resultSummary,
  });
  const message = await createWorkspaceMessage(ownerId, {
    workspaceId: input.workspaceId,
    threadId: input.task.threadId,
    senderName: assignee.displayName,
    senderKind: "agent",
    content: runStatus === "completed" ? `Completed "${input.task.title}". ${resultSummary}` : `${assignee.displayName} is waiting for approval before continuing "${input.task.title}".`,
    artifact: {
      type: "task",
      title: input.task.title,
      description: resultSummary,
      groups: ["Task Result", input.task.scope || "Workspace"],
    },
  });
  const persistedRun = await createCompletedWorkspaceAgentRun(ownerId, {
    runId,
    workspaceId: input.workspaceId,
    threadId: input.task.threadId,
    agent: { member: assignee, profile },
    trigger: "task_assignment",
    status: runStatus,
    error: runtimeResult.error,
    outputMessageId: message.id,
    taskId: input.task.id,
    runtimeEvents: runtimeResult.events,
  });
  await linkWorkspaceArtifactToRun(ownerId, input.workspaceId, message.id, persistedRun.run.id);
  const artifact = buildWorkspaceArtifactFromMessage(message, persistedRun.run.id);
  const memory = await maybeCreateWorkspaceAgentRunMemory(ownerId, profile, assignee, persistedRun.run, message, resultSummary);

  const memories = memory ? [memory] : [];
  const artifacts = artifact ? [artifact] : [];
  const eventView = buildWorkspaceAgentRunResultEventView({ runs: [persistedRun.run], events: persistedRun.events, memories, task });
  return {
    messages: [message],
    runs: [persistedRun.run],
    events: persistedRun.events,
    agentEvents: eventView.agentEvents,
    agentSignals: eventView.agentSignals,
    approvals: persistedRun.approvals,
    memories,
    artifacts,
    task,
  };
}

async function maybeCreateWorkspaceAgentRunMemory(
  ownerId: string | null | undefined,
  profile: WorkspaceAgentProfile,
  member: WorkspaceMember,
  run: WorkspaceAgentRun,
  message: WorkspaceMessage,
  summary: string,
) {
  if (run.status !== "completed") return undefined;
  if (member.agentProfileId !== profile.id) return undefined;
  if (!isAutomaticAgentRunMemoryScope(profile.memoryScope)) return undefined;
  const cleanSummary = summary.trim();
  if (!cleanSummary) return undefined;
  return createWorkspaceAgentMemory(ownerId, {
    workspaceId: run.workspaceId,
    threadId: profile.memoryScope === "thread" ? run.threadId : undefined,
    agentProfileId: profile.id,
    scope: profile.memoryScope,
    title: `${profile.displayName} run summary`,
    summary: cleanSummary.length > 320 ? `${cleanSummary.slice(0, 317)}...` : cleanSummary,
    sourceRunId: run.id,
    sourceMessageId: message.id,
  });
}

function isAutomaticAgentRunMemoryScope(scope: WorkspaceAgentProfile["memoryScope"]) {
  return scope === "thread" || scope === "workspace";
}

export async function updateWorkspaceTask(ownerId: string | null | undefined, input: UpdateWorkspaceTaskInput): Promise<WorkspaceTask> {
  const status = input.status.trim();
  if (!status) throw new Error("Task status is required.");

  const now = Date.now();
  const assignee = input.assigneeId === undefined ? undefined : await resolveTaskAssignee(ownerId, input.workspaceId, input.assigneeId);

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    const existing = current.tasks.find((task) => task.id === input.taskId && task.workspaceId === input.workspaceId);
    if (!existing) throw new Error("Task not found.");
    const task = buildWorkspaceTaskUpdate(existing, input, assignee, now);
    setLocalView({
      ...current,
      tasks: current.tasks.map((entry) => (entry.id === task.id ? task : entry)),
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return task;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    const rows = await getDb()
      .select()
      .from(workspaceTasks)
      .where(and(eq(workspaceTasks.id, input.taskId), eq(workspaceTasks.workspaceId, input.workspaceId)))
      .limit(1);
    const existing = rows[0];
    if (!existing) throw new Error("Task not found.");
    await requireDbThread(ownerId, input.workspaceId, existing.threadId);
    const task = buildWorkspaceTaskUpdate({
      id: existing.id,
      workspaceId: existing.workspaceId,
      threadId: existing.threadId,
      title: existing.title,
      scope: existing.scope,
      status: existing.status,
      progress: existing.progress,
      ...readTaskMetadata(existing.metadata),
      dueAt: existing.dueAt ?? undefined,
      createdAt: existing.createdAt.getTime(),
      updatedAt: existing.updatedAt.getTime(),
    }, input, assignee, now);
    await getDb()
      .update(workspaceTasks)
      .set({ status: task.status, progress: task.progress, metadata: buildTaskMetadata(task), updatedAt: new Date(task.updatedAt) })
      .where(eq(workspaceTasks.id, task.id));
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    return task;
  } catch (error) {
    console.error("[workspace] database task update failed", error);
    throw error;
  }
}

function buildWorkspaceTaskUpdate(
  task: WorkspaceTask,
  input: UpdateWorkspaceTaskInput,
  assignee: WorkspaceMember | undefined,
  now: number,
): WorkspaceTask {
  const status = input.status.trim();
  const resultSummary = input.resultSummary?.trim();
  return {
    ...task,
    status,
    progress: input.progress?.trim() || (status === "done" ? "done" : task.progress),
    assigneeId: input.assigneeId === undefined ? task.assigneeId : assignee?.id,
    assigneeName: input.assigneeId === undefined ? task.assigneeName : assignee?.displayName,
    resultSummary: status === "done" ? resultSummary || task.resultSummary : undefined,
    submittedAt: status === "done" ? (resultSummary ? now : task.submittedAt) : undefined,
    updatedAt: now,
  };
}

function assertApprovalDecisionAllowedForRun(run: WorkspaceAgentRun) {
  if (isTerminalAgentRunStatus(run.status)) {
    throw new Error("Agent approval cannot be decided after terminal run state.");
  }
}

export async function decideWorkspaceAgentApproval(
  ownerId: string | null | undefined,
  input: DecideWorkspaceAgentApprovalInput & { runner?: WorkspaceAgentRuntimeRunner },
): Promise<WorkspaceAgentApprovalDecisionResult> {
  const now = Date.now();
  const decisionReason = input.reason?.trim() || undefined;

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalRawView(input.workspaceId, ownerId);
    const existingApproval = current.agentApprovals.find((approval) => approval.id === input.approvalId && approval.workspaceId === input.workspaceId);
    if (!existingApproval) throw new Error("Agent approval not found.");
    const existingRun = current.agentRuns.find((run) => run.id === existingApproval.runId);
    if (!existingRun) throw new Error("Agent run not found.");
    if (existingApproval.status !== "pending") {
      if (existingApproval.status !== input.decision) throw new Error(`Agent approval is already ${existingApproval.status}.`);
      const runEvents = current.agentRunEvents.filter((event) => event.runId === existingRun.id);
      const eventView = buildWorkspaceAgentEventView(existingRun, runEvents);
      return {
        approval: existingApproval,
        approvals: current.agentApprovals.filter((approval) => approval.runId === existingApproval.runId),
        run: existingRun,
        events: [],
        agentEvents: eventView.agentEvents,
        agentSignals: eventView.agentSignals,
      };
    }
    assertApprovalDecisionAllowedForRun(existingRun);
    const approval: WorkspaceAgentApproval = {
      ...existingApproval,
      status: input.decision,
      decidedAt: now,
      decidedBy: input.decidedBy?.trim() || undefined,
      decisionReason,
    };
    let run =
      input.decision === "denied" && existingRun.status === "waiting_for_approval"
        ? { ...existingRun, status: "cancelled" as const, completedAt: now }
        : existingRun;
    const decisionEvent = buildAgentRunEvent(run, "status", input.decision === "approved" ? "approval_approved" : "approval_denied",
      buildWorkspaceApprovalDecisionEventPayload(approval, input.decision),
      now,
    );
    const execution =
      input.decision === "approved" && existingApproval.status === "pending" && existingRun.status === "waiting_for_approval"
        ? await buildApprovedWorkspaceAgentToolExecution(ownerId, current, approval, run, now + 1, input.runner)
        : undefined;
    if (execution?.run) run = execution.run;
    const expiration = expirePendingWorkspaceApprovalsForTerminalRun(
      current.agentApprovals,
      run,
      approval,
      now + (execution?.events.length ?? 0) + 2,
    );
    const events = [decisionEvent, ...(execution?.events ?? []), ...(expiration.event ? [expiration.event] : [])];
    setLocalView({
      ...current,
      tasks: execution?.task ? [execution.task, ...current.tasks.filter((entry) => entry.id !== execution.task?.id)] : current.tasks,
      messages: execution?.message ? [...current.messages, execution.message].sort((a, b) => a.createdAt - b.createdAt) : current.messages,
      artifacts: execution?.artifact ? upsertWorkspaceArtifact(current.artifacts, execution.artifact) : current.artifacts,
      agentMemories: execution?.memory ? [execution.memory, ...current.agentMemories] : current.agentMemories,
      threads: execution?.message ? bumpThread(current.threads, execution.message.threadId, execution.message.createdAt) : current.threads,
      agentRuns: current.agentRuns.map((entry) => (entry.id === run.id ? run : entry)),
      agentRunEvents: [...current.agentRunEvents, ...events],
      agentApprovals: expiration.approvals,
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    const eventView = buildWorkspaceAgentRunResultEventView({
      runs: [run],
      events: [...current.agentRunEvents.filter((entry) => entry.runId === run.id), ...events],
      memories: execution?.memory ? [execution.memory] : [],
      task: execution?.task,
    });
    return {
      approval,
      approvals: expiration.runApprovals,
      run,
      events,
      agentEvents: eventView.agentEvents,
      agentSignals: eventView.agentSignals,
      task: execution?.task,
      message: execution?.message,
      artifact: execution?.artifact,
      memory: execution?.memory,
    };
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    const approvalRows = await getDb()
      .select()
      .from(workspaceAgentApprovals)
      .where(and(eq(workspaceAgentApprovals.id, input.approvalId), eq(workspaceAgentApprovals.workspaceId, input.workspaceId)))
      .limit(1);
    const approvalRow = approvalRows[0];
    if (!approvalRow) throw new Error("Agent approval not found.");
    await requireDbThread(ownerId, approvalRow.workspaceId, approvalRow.threadId);
    const runRows = await getDb()
      .select()
      .from(workspaceAgentRuns)
      .where(and(eq(workspaceAgentRuns.id, approvalRow.runId), eq(workspaceAgentRuns.workspaceId, approvalRow.workspaceId)))
      .limit(1);
    const runRow = runRows[0];
    if (!runRow) throw new Error("Agent run not found.");

    const existingApproval = rowToWorkspaceAgentApproval(approvalRow);
    const existingRun = rowToWorkspaceAgentRun(runRow);
    if (existingApproval.status !== "pending") {
      if (existingApproval.status !== input.decision) throw new Error(`Agent approval is already ${existingApproval.status}.`);
      const [siblingRows, eventRows] = await Promise.all([
        getDb()
          .select()
          .from(workspaceAgentApprovals)
          .where(eq(workspaceAgentApprovals.runId, existingApproval.runId))
          .orderBy(asc(workspaceAgentApprovals.requestedAt)),
        getDb()
          .select()
          .from(workspaceAgentRunEvents)
          .where(eq(workspaceAgentRunEvents.runId, existingRun.id))
          .orderBy(asc(workspaceAgentRunEvents.createdAt)),
      ]);
      const eventView = buildWorkspaceAgentEventView(existingRun, eventRows.map(rowToWorkspaceAgentRunEvent));
      return {
        approval: existingApproval,
        approvals: siblingRows.map(rowToWorkspaceAgentApproval),
        run: existingRun,
        events: [],
        agentEvents: eventView.agentEvents,
        agentSignals: eventView.agentSignals,
      };
    }
    assertApprovalDecisionAllowedForRun(existingRun);

    const approval: WorkspaceAgentApproval = {
      ...existingApproval,
      status: input.decision,
      decidedAt: now,
      decidedBy: input.decidedBy?.trim() || undefined,
      decisionReason,
    };
    let run: WorkspaceAgentRun =
      input.decision === "denied" && runRow.status === "waiting_for_approval"
        ? { ...existingRun, status: "cancelled", completedAt: now }
        : existingRun;
    const decisionEvent = buildAgentRunEvent(run, "status", input.decision === "approved" ? "approval_approved" : "approval_denied",
      buildWorkspaceApprovalDecisionEventPayload(approval, input.decision),
      now,
    );
    const view = await getWorkspaceViewFromDb(ownerId, input.workspaceId);
    const execution =
      input.decision === "approved" && approvalRow.status === "pending" && runRow.status === "waiting_for_approval"
        ? await buildApprovedWorkspaceAgentToolExecution(ownerId, view, approval, run, now + 1, input.runner)
        : undefined;
    if (execution?.run) run = execution.run;
    const expiration = expirePendingWorkspaceApprovalsForTerminalRun(
      view.agentApprovals,
      run,
      approval,
      now + (execution?.events.length ?? 0) + 2,
    );
    const events = [decisionEvent, ...(execution?.events ?? []), ...(expiration.event ? [expiration.event] : [])];
    let returnedApprovals: WorkspaceAgentApproval[] = expiration.runApprovals;

    await getDb().transaction(async (tx) => {
      if (execution?.task && execution.taskAction === "create") {
        await tx.insert(workspaceTasks).values({
          id: execution.task.id,
          workspaceId: execution.task.workspaceId,
          threadId: execution.task.threadId,
          ownerId,
          title: execution.task.title,
          scope: execution.task.scope,
          status: execution.task.status,
          progress: execution.task.progress,
          dueAt: execution.task.dueAt ?? null,
          metadata: buildTaskMetadata(execution.task),
          createdAt: new Date(execution.task.createdAt),
          updatedAt: new Date(execution.task.updatedAt),
        });
      }
      if (execution?.task && execution.taskAction === "update") {
        await tx
          .update(workspaceTasks)
          .set({
            status: execution.task.status,
            progress: execution.task.progress,
            metadata: buildTaskMetadata(execution.task),
            updatedAt: new Date(execution.task.updatedAt),
          })
          .where(eq(workspaceTasks.id, execution.task.id));
      }
      if (execution?.message) {
        await tx.insert(workspaceMessages).values({
          id: execution.message.id,
          workspaceId: execution.message.workspaceId,
          threadId: execution.message.threadId,
          ownerId,
          senderName: execution.message.senderName,
          senderKind: execution.message.senderKind,
          content: execution.message.content,
          artifact: execution.message.artifact ?? null,
          createdAt: new Date(execution.message.createdAt),
        });
        if (execution.artifact) {
          await tx.insert(workspaceArtifacts).values(dbWorkspaceArtifactValues(execution.artifact, ownerId));
        }
        await tx.update(workspaceThreads).set({ updatedAt: new Date(execution.message.createdAt) }).where(eq(workspaceThreads.id, execution.message.threadId));
      }
      if (execution?.memory) {
        await tx.insert(workspaceAgentMemories).values({
          id: execution.memory.id,
          workspaceId: execution.memory.workspaceId ?? null,
          userId: execution.memory.userId ?? null,
          threadId: execution.memory.threadId ?? null,
          agentProfileId: execution.memory.agentProfileId,
          scope: execution.memory.scope,
          title: execution.memory.title,
          summary: execution.memory.summary,
          sourceRunId: execution.memory.sourceRunId ?? null,
          sourceMessageId: execution.memory.sourceMessageId ?? null,
          createdAt: new Date(execution.memory.createdAt),
          updatedAt: new Date(execution.memory.updatedAt),
          archivedAt: null,
        });
      }
      await tx
        .update(workspaceAgentApprovals)
        .set({
          status: approval.status,
          decidedAt: new Date(now),
          decidedBy: approval.decidedBy ?? null,
          decisionReason: approval.decisionReason ?? null,
        })
        .where(eq(workspaceAgentApprovals.id, approval.id));
      if (expiration.expiredApprovals.length) {
        await tx
          .update(workspaceAgentApprovals)
          .set({
            status: "expired",
            decidedAt: new Date(expiration.expiredAt),
            decidedBy: approval.decidedBy ?? null,
            decisionReason: expiration.reason,
          })
          .where(and(eq(workspaceAgentApprovals.runId, run.id), eq(workspaceAgentApprovals.status, "pending")));
      }
      if (
        run.status !== runRow.status ||
        run.completedAt !== runRow.completedAt?.getTime() ||
        run.outputMessageId !== (runRow.outputMessageId ?? undefined) ||
        run.taskId !== (runRow.taskId ?? undefined) ||
        run.error !== (runRow.error ?? undefined)
      ) {
        await tx
          .update(workspaceAgentRuns)
          .set({
            status: run.status,
            outputMessageId: run.outputMessageId ?? null,
            taskId: run.taskId ?? null,
            error: run.error ?? null,
            completedAt: run.completedAt ? new Date(run.completedAt) : null,
          })
          .where(eq(workspaceAgentRuns.id, run.id));
      }
      await tx.insert(workspaceAgentRunEvents).values(
        events.map((event) => ({
          id: event.id,
          runId: event.runId,
          workspaceId: event.workspaceId,
          threadId: event.threadId,
          ownerId,
          type: event.type,
          label: event.label,
          payload: event.payload ?? null,
          createdAt: new Date(event.createdAt),
        })),
      );
      await tx
        .update(workspaces)
        .set({ updatedAt: new Date(Math.max(now, execution?.task?.updatedAt ?? 0, execution?.message?.createdAt ?? 0)) })
        .where(eq(workspaces.id, input.workspaceId));
      const updatedApprovalRows = await tx
        .select()
        .from(workspaceAgentApprovals)
        .where(eq(workspaceAgentApprovals.runId, run.id))
        .orderBy(asc(workspaceAgentApprovals.requestedAt));
      returnedApprovals = updatedApprovalRows.map(rowToWorkspaceAgentApproval);
    });
    notifyWorkspaceUpdated(input.workspaceId, ownerId);
    const eventRows = await getDb()
      .select()
      .from(workspaceAgentRunEvents)
      .where(eq(workspaceAgentRunEvents.runId, run.id))
      .orderBy(asc(workspaceAgentRunEvents.createdAt));
    const eventView = buildWorkspaceAgentRunResultEventView({
      runs: [run],
      events: eventRows.map(rowToWorkspaceAgentRunEvent),
      memories: execution?.memory ? [execution.memory] : [],
      task: execution?.task,
    });
    return {
      approval,
      approvals: returnedApprovals,
      run,
      events,
      agentEvents: eventView.agentEvents,
      agentSignals: eventView.agentSignals,
      task: execution?.task,
      message: execution?.message,
      artifact: execution?.artifact,
      memory: execution?.memory,
    };
  } catch (error) {
    console.error("[workspace] database agent approval decision failed", error);
    throw error;
  }
}


function buildWorkspaceApprovalDecisionEventPayload(approval: WorkspaceAgentApproval, decision: "approved" | "denied") {
  const resumeDecision =
    decision === "approved"
      ? { type: "approve" as const }
      : { type: "reject" as const, ...(approval.decisionReason ? { message: approval.decisionReason } : {}) };
  return {
    approvalId: approval.id,
    toolName: approval.toolName,
    decidedBy: approval.decidedBy,
    reason: approval.decisionReason,
    deepAgentThreadId: approval.deepAgentThreadId,
    resumeDecision,
  };
}

function expirePendingWorkspaceApprovalsForTerminalRun(
  approvals: WorkspaceAgentApproval[],
  run: WorkspaceAgentRun,
  decidedApproval: WorkspaceAgentApproval,
  expiredAt: number,
) {
  const reason = `Run ${run.status}.`;
  const shouldExpire = isTerminalAgentRunStatus(run.status);
  const expiredApprovals = shouldExpire
    ? approvals
        .filter((approval) => approval.runId === run.id)
        .filter((approval) => approval.id !== decidedApproval.id)
        .filter((approval) => approval.status === "pending")
        .map((approval): WorkspaceAgentApproval => ({
          ...approval,
          status: "expired",
          decidedAt: expiredAt,
          decidedBy: decidedApproval.decidedBy,
          decisionReason: reason,
        }))
    : [];
  const expiredById = new Map(expiredApprovals.map((approval) => [approval.id, approval]));
  const nextApprovals = approvals.map((approval) => {
    if (approval.id === decidedApproval.id) return decidedApproval;
    return expiredById.get(approval.id) ?? approval;
  });
  const event = expiredApprovals.length
    ? buildAgentRunEvent(
        run,
        "status",
        "pending_approvals_expired",
        {
          approvalIds: expiredApprovals.map((approval) => approval.id),
          activeApprovalId: decidedApproval.id,
          reason,
        },
        expiredAt,
      )
    : undefined;
  return {
    approvals: nextApprovals,
    runApprovals: nextApprovals.filter((approval) => approval.runId === run.id),
    expiredApprovals,
    expiredAt,
    reason,
    event,
  };
}

type ApprovedWorkspaceAgentToolExecution = {
  run: WorkspaceAgentRun;
  events: WorkspaceAgentRunEvent[];
  task?: WorkspaceTask;
  taskAction?: "create" | "update";
  message?: WorkspaceMessage;
  artifact?: WorkspaceArtifact;
  memory?: WorkspaceAgentMemory;
};

async function buildApprovedWorkspaceAgentToolExecution(
  ownerId: string | null | undefined,
  view: WorkspaceView,
  approval: WorkspaceAgentApproval,
  run: WorkspaceAgentRun,
  now: number,
  runner?: WorkspaceAgentRuntimeRunner,
): Promise<ApprovedWorkspaceAgentToolExecution | undefined> {
  if (
    approval.toolName !== "create_workspace_task" &&
    approval.toolName !== "update_workspace_task" &&
    approval.toolName !== "share_learning_app" &&
    approval.toolName !== "render_interactive_widget" &&
    approval.toolName !== "generate_course" &&
    approval.toolName !== "save_learning_artifact" &&
    approval.toolName !== "save_agent_memory"
  ) {
    if (isExternalWorkspaceApproval(approval)) {
      return buildApprovedExternalWorkspaceAgentExecution(view, approval, run, now, runner);
    }
    return undefined;
  }

  if (approval.toolName === "save_agent_memory") {
    return buildApprovedWorkspaceAgentMemoryExecution(ownerId, view, approval, run, now);
  }

  if (
    approval.toolName === "share_learning_app" ||
    approval.toolName === "render_interactive_widget" ||
    approval.toolName === "generate_course" ||
    approval.toolName === "save_learning_artifact"
  ) {
    return buildApprovedWorkspaceAgentArtifactExecution(view, approval, run, now);
  }

  const agent = view.members.find((member) => member.id === run.agentMemberId);
  const input = readObject(approval.input);
  const taskAction = approval.toolName === "update_workspace_task" ? "update" : "create";
  const task =
    taskAction === "create"
      ? await buildWorkspaceTaskForCreate(
          ownerId,
          {
            workspaceId: run.workspaceId,
            threadId: run.threadId,
            title: readOptionalString(input.title) || "Workspace follow-up",
            scope: readOptionalString(input.scope) || "Shared",
            progress: readOptionalString(input.progress) || "new",
            assigneeId: readOptionalString(input.assigneeId) || run.agentMemberId,
            dueAt: readOptionalString(input.dueAt),
          },
          now,
        )
      : await buildApprovedWorkspaceTaskUpdate(ownerId, view, run, input, now);
  const messageContent =
    taskAction === "create"
      ? `Created task "${task.title}" after approval.`
      : `Updated task "${task.title}" after approval.`;
  const message = buildMessage(
    {
      workspaceId: run.workspaceId,
      threadId: run.threadId,
      senderName: agent?.displayName ?? "Workspace Agent",
      senderKind: "agent",
      content: messageContent,
      artifact: {
        type: "task",
        title: task.title,
        description: task.resultSummary || task.progress || "Updated after approval.",
        groups: [task.scope || "Workspace"],
      },
    },
    messageContent,
  );
  const completedAt = Math.max(now, message.createdAt);
  const completedRun: WorkspaceAgentRun = {
    ...run,
    status: "completed",
    taskId: task.id,
    outputMessageId: message.id,
    completedAt,
  };
  const artifact = buildWorkspaceArtifactFromMessage(message, completedRun.id);
  const events = buildApprovedToolEvents(completedRun, approval, now, { taskId: task.id, outputMessageId: message.id, artifactId: artifact?.id });
  return { run: completedRun, events, task, taskAction, message, artifact };
}

async function buildApprovedExternalWorkspaceAgentExecution(
  view: WorkspaceView,
  approval: WorkspaceAgentApproval,
  run: WorkspaceAgentRun,
  now: number,
  runner?: WorkspaceAgentRuntimeRunner,
): Promise<ApprovedWorkspaceAgentToolExecution> {
  const runtime = await loadWorkspaceAgentRuntime();
  const runtimeRunner = runner ?? runtime.resolveWorkspaceAgentRuntimeRunner();
  if (!runtimeRunner) {
    return {
      run,
      events: [
        buildAgentRunEvent(
          run,
          "status",
          "deepagent_resume_required",
          {
            approvalId: approval.id,
            toolName: approval.toolName,
            deepAgentThreadId: approval.deepAgentThreadId,
            resumeDecision: { type: "approve" },
            reason: "External connection tool approval is recorded; DeepAgent must resume on the persisted thread before the tool executes.",
          },
          now,
        ),
      ],
    };
  }

  try {
    const runtimeInput = await buildWorkspaceExternalApprovalResumeRuntimeInput(view, approval, run);
    const result = await runtimeRunner(runtimeInput);
    const status = result.status ?? (result.error ? "failed" : "completed");
    const messageContent = result.content.trim();
    const agentName = runtimeInput.member.displayName || runtimeInput.profile.displayName || "Workspace Agent";
    const message =
      messageContent && status !== "waiting_for_approval"
        ? buildMessage(
            {
              workspaceId: run.workspaceId,
              threadId: run.threadId,
              senderName: agentName,
              senderKind: "agent",
              content: messageContent,
            },
            messageContent,
          )
        : undefined;
    const completedAt = isTerminalAgentRunStatus(status) ? Math.max(now, message?.createdAt ?? now) : undefined;
    const nextRun: WorkspaceAgentRun = {
      ...run,
      status,
      outputMessageId: message?.id ?? run.outputMessageId,
      completedAt,
      error: result.error,
    };
    const runtimeEvents = result.events ?? [];
    const resumeEventExists = runtimeEvents.some((event) => event.label === "deepagent_resumed");
    const events = [
      ...(resumeEventExists
        ? []
        : [
            buildAgentRunEvent(
              nextRun,
              "status",
              "deepagent_resumed",
              {
                approvalId: approval.id,
                toolName: approval.toolName,
                deepAgentThreadId: runtimeInput.threadId,
                resumeDecision: { type: "approve" },
              },
              now,
            ),
          ]),
      ...runtimeEvents.map((event, index) => buildAgentRunEvent(nextRun, event.type, event.label, event.payload, now + index + 1)),
      buildAgentRunEvent(
        nextRun,
        "status",
        status,
        {
          approvalId: approval.id,
          toolName: approval.toolName,
          outputMessageId: message?.id,
          error: result.error,
        },
        Math.max(now + runtimeEvents.length + 2, completedAt ?? now + runtimeEvents.length + 2),
      ),
    ];
    return { run: nextRun, events, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepAgent approval resume failed.";
    const failedRun: WorkspaceAgentRun = {
      ...run,
      status: "failed",
      completedAt: now,
      error: message,
    };
    return {
      run: failedRun,
      events: [
        buildAgentRunEvent(
          failedRun,
          "status",
          "deepagent_resume_failed",
          {
            approvalId: approval.id,
            toolName: approval.toolName,
            deepAgentThreadId: approval.deepAgentThreadId,
            error: message,
          },
          now,
        ),
        buildAgentRunEvent(failedRun, "status", "failed", { approvalId: approval.id, error: message }, now + 1),
      ],
    };
  }
}

async function buildWorkspaceExternalApprovalResumeRuntimeInput(
  view: WorkspaceView,
  approval: WorkspaceAgentApproval,
  run: WorkspaceAgentRun,
): Promise<WorkspaceAgentRuntimeRunnerInput> {
  const profile = view.agentProfiles.find((entry) => entry.id === run.agentProfileId);
  if (!profile) throw new Error("Agent profile not found for approval resume.");
  const thread = view.threads.find((entry) => entry.id === run.threadId);
  if (!thread) throw new Error("Thread not found for approval resume.");
  const member =
    view.members.find((entry) => entry.id === run.agentMemberId) ??
    view.members.find((entry) => entry.agentProfileId === profile.id) ??
    ({
      id: run.agentMemberId ?? `agent_${profile.id}`,
      workspaceId: run.workspaceId,
      displayName: profile.displayName,
      role: "Agent",
      agentProfileId: profile.id,
    } satisfies WorkspaceMember);
  const context = {
    workspaceName: view.workspace.name,
    thread,
    member,
    recentMessages: view.messages
      .filter((message) => message.threadId === run.threadId)
      .slice(-3)
      .map((message) => `${message.senderName}: ${message.content}`),
    visibleMessages: buildWorkspaceRuntimeVisibleMessages(view.messages.filter((message) => message.threadId === run.threadId).slice(-3)),
    openTasks: view.tasks.filter((task) => task.threadId === run.threadId && task.status !== "done").slice(0, 3),
    agentMemories: view.agentMemories.filter((memory) => memory.scope !== "thread" || memory.threadId === run.threadId).slice(0, 8),
    agentConnections: view.agentConnections,
  };
  const runtime = await loadWorkspaceAgentRuntime();
  const resume = runtime.buildWorkspaceDeepAgentApprovalResume(approval, "approved");
  return {
    config: runtime.buildWorkspaceDeepAgentConfig({
      ...context,
      profile,
      delegateProfiles: view.agentProfiles,
    }),
    context,
    threadId: resume.threadId,
    prompt: "",
    profile,
    member,
    resumeCommand: resume.command,
  };
}

function isExternalWorkspaceApproval(approval: WorkspaceAgentApproval) {
  return readObject(approval.policy).risk === "external";
}

function buildApprovedWorkspaceAgentMemoryExecution(
  ownerId: string | null | undefined,
  view: WorkspaceView,
  approval: WorkspaceAgentApproval,
  run: WorkspaceAgentRun,
  now: number,
): { run: WorkspaceAgentRun; events: WorkspaceAgentRunEvent[]; memory: WorkspaceAgentMemory } {
  const input = readObject(approval.input);
  const requestedScope = readOptionalString(input.scope);
  const scope: WorkspaceAgentMemory["scope"] = requestedScope === "user" || requestedScope === "workspace" || requestedScope === "thread" ? requestedScope : "thread";
  const title = readOptionalString(input.title) || "Learning memory";
  const summary = readOptionalString(input.summary) || readOptionalString(input.description) || "Saved after approval.";
  const memory: WorkspaceAgentMemory = {
    id: `wamem_${randomBytes(10).toString("base64url")}`,
    workspaceId: run.workspaceId,
    userId: ownerId || undefined,
    threadId: scope === "thread" ? run.threadId : undefined,
    agentProfileId: run.agentProfileId,
    scope,
    title,
    summary,
    sourceRunId: run.id,
    createdAt: now,
    updatedAt: now,
  };
  const completedRun: WorkspaceAgentRun = {
    ...run,
    status: "completed",
    completedAt: now,
  };
  const events = buildApprovedToolEvents(completedRun, approval, now, { memoryId: memory.id, memoryScope: memory.scope });
  return { run: completedRun, events, memory };
}

function buildApprovedWorkspaceAgentArtifactExecution(
  view: WorkspaceView,
  approval: WorkspaceAgentApproval,
  run: WorkspaceAgentRun,
  now: number,
): { run: WorkspaceAgentRun; events: WorkspaceAgentRunEvent[]; message: WorkspaceMessage; artifact: WorkspaceArtifact } {
  const agent = view.members.find((member) => member.id === run.agentMemberId);
  const input = readObject(approval.input);
  const title =
    readOptionalString(input.title) ||
    (approval.toolName === "share_learning_app"
      ? "Shared learning app"
      : approval.toolName === "render_interactive_widget"
        ? "Interactive widget"
        : approval.toolName === "generate_course"
          ? "Generated course"
          : "Saved learning artifact");
  const description =
    readOptionalString(input.description) ||
    readOptionalString(input.summary) ||
    (approval.toolName === "generate_course" ? describeGeneratedCourse(input) : "Shared by the agent after approval.");
  const artifactPayload: WorkspaceMessageArtifact =
    approval.toolName === "share_learning_app" || approval.toolName === "render_interactive_widget"
      ? {
          type: "app",
          appId: readOptionalString(input.appId),
          version: readOptionalNumber(input.version),
          template:
            approval.toolName === "render_interactive_widget"
              ? buildInteractiveWidgetTemplate(input, title, description)
              : readLearningAppTemplate(input.template),
          title,
          description,
          primaryAction: readOptionalString(input.primaryAction) || (approval.toolName === "render_interactive_widget" ? "Open widget" : "Open app"),
          secondaryAction: readOptionalString(input.secondaryAction),
        }
      : {
          type: "task",
          title,
          description,
          groups: readStringArray(input.groups, approval.toolName === "generate_course" ? ["Course", "Plan"] : ["Artifact"]),
        };
  const kind: WorkspaceArtifactKind | undefined =
    approval.toolName === "generate_course"
      ? "course"
      : approval.toolName === "save_learning_artifact"
        ? "saved_artifact"
        : approval.toolName === "share_learning_app" || approval.toolName === "render_interactive_widget"
          ? "app"
          : undefined;
  const messageContent =
    approval.toolName === "share_learning_app"
      ? `Shared app "${title}" after approval.`
      : approval.toolName === "render_interactive_widget"
        ? `Rendered widget "${title}" after approval.`
        : approval.toolName === "generate_course"
          ? `Generated course "${title}" after approval.`
          : `Saved artifact "${title}" after approval.`;
  const bundle = buildWorkspaceArtifactMessageBundle({
    workspaceId: run.workspaceId,
    threadId: run.threadId,
    senderName: agent?.displayName ?? "Workspace Agent",
    senderKind: "agent",
    content: messageContent,
    title,
    description,
    kind,
    payload: artifactPayload,
    sourceRunId: run.id,
    reviewStatus: defaultWorkspaceArtifactReviewStatus(kind ?? inferWorkspaceArtifactKind(artifactPayload)),
  });
  const { message } = bundle;
  const completedAt = Math.max(now, message.createdAt);
  const completedRun: WorkspaceAgentRun = {
    ...run,
    status: "completed",
    outputMessageId: message.id,
    completedAt,
  };
  const firstClassArtifact = { ...bundle.artifact, sourceRunId: completedRun.id };
  const artifactEventPayload = buildWorkspaceArtifactRunEventPayload(approval, firstClassArtifact, message);
  const events = buildApprovedToolEvents(completedRun, approval, now, artifactEventPayload);
  events.splice(2, 0, buildAgentRunEvent(completedRun, "artifact", approval.toolName, artifactEventPayload, now + 2));
  return { run: completedRun, events, message, artifact: firstClassArtifact };
}

function buildWorkspaceArtifactRunEventPayload(
  approval: WorkspaceAgentApproval,
  artifact: WorkspaceArtifact,
  message: WorkspaceMessage,
): Record<string, unknown> {
  return {
    approvalId: approval.id,
    outputMessageId: message.id,
    artifactId: artifact.id,
    artifactKind: artifact.kind,
    artifactTitle: artifact.title,
    sourceMessageId: artifact.sourceMessageId,
    sourceRunId: artifact.sourceRunId,
  };
}

function describeGeneratedCourse(input: Record<string, unknown>) {
  const topic = readOptionalString(input.topic);
  const modules = Array.isArray(input.modules) ? input.modules : [];
  const assessments = readStringArray(input.assessments, []);
  const pieces = [
    topic ? `Topic: ${topic}.` : undefined,
    modules.length ? `${modules.length} module${modules.length === 1 ? "" : "s"} drafted.` : undefined,
    assessments.length ? `${assessments.length} assessment checkpoint${assessments.length === 1 ? "" : "s"}.` : undefined,
  ].filter(Boolean);
  return pieces.join(" ") || "Generated course draft.";
}

function readLearningAppTemplate(value: unknown): Extract<WorkspaceMessageArtifact, { type: "app" }>["template"] | undefined {
  const template = readObject(value);
  const type = readOptionalString(template.type);
  if (type === "html") {
    const source = readOptionalString(template.source);
    return source ? { type: "html", source } : undefined;
  }
  if (type === "generator") {
    const prompt = readOptionalString(template.prompt);
    return prompt ? { type: "generator", prompt } : undefined;
  }
  return undefined;
}

function buildInteractiveWidgetTemplate(input: Record<string, unknown>, title: string, description: string): Extract<WorkspaceMessageArtifact, { type: "app" }>["template"] {
  const explicitTemplate = readLearningAppTemplate(input.template);
  if (explicitTemplate) return explicitTemplate;
  const html = readOptionalString(input.html) || readOptionalString(input.source);
  if (html) return { type: "html", source: html };
  const prompt = readOptionalString(input.prompt) || `Create an interactive learning widget titled "${title}". ${description}`;
  return { type: "generator", prompt };
}

function buildApprovedToolEvents(
  run: WorkspaceAgentRun,
  approval: WorkspaceAgentApproval,
  now: number,
  payload: Record<string, unknown>,
): WorkspaceAgentRunEvent[] {
  return [
    buildAgentRunEvent(run, "tool_start", approval.toolName, { approvalId: approval.id, input: approval.input }, now),
    buildAgentRunEvent(run, "tool_end", approval.toolName, { approvalId: approval.id, ...payload }, now + 1),
    buildAgentRunEvent(
      run,
      "status",
      "approval_tool_executed",
      { approvalId: approval.id, toolName: approval.toolName, ...payload },
      now + 2,
    ),
    buildAgentRunEvent(run, "status", "completed", payload, Math.max(now + 3, run.completedAt ?? now + 3)),
  ];
}

async function buildApprovedWorkspaceTaskUpdate(
  ownerId: string | null | undefined,
  view: WorkspaceView,
  run: WorkspaceAgentRun,
  input: Record<string, unknown>,
  now: number,
) {
  const taskId = readOptionalString(input.taskId);
  if (!taskId) throw new Error("Task id is required to update a workspace task.");
  const existing = view.tasks.find((task) => task.id === taskId && task.workspaceId === run.workspaceId && task.threadId === run.threadId);
  if (!existing) throw new Error("Task not found.");
  const assigneeId = readOptionalString(input.assigneeId);
  const assignee = assigneeId === undefined ? undefined : await resolveTaskAssignee(ownerId, run.workspaceId, assigneeId);
  return buildWorkspaceTaskUpdate(
    existing,
    {
      workspaceId: run.workspaceId,
      taskId,
      status: readOptionalString(input.status) || existing.status,
      progress: readOptionalString(input.progress),
      assigneeId,
      resultSummary: readOptionalString(input.resultSummary),
    },
    assignee,
    now,
  );
}

async function ensureSeedWorkspace(ownerId: string) {
  const checkedUntil = dbSeedWorkspaceCheckedUntil.get(ownerId);
  if (checkedUntil && checkedUntil > Date.now()) return;
  const existing = dbSeedWorkspacePromises.get(ownerId);
  if (existing) return existing;
  const promise = ensureSeedWorkspaceUncached(ownerId)
    .then(() => {
      dbSeedWorkspaceCheckedUntil.set(ownerId, Date.now() + DB_SEED_WORKSPACE_CHECK_TTL_MS);
    })
    .catch((error) => {
      dbSeedWorkspaceCheckedUntil.delete(ownerId);
      throw error;
    })
    .finally(() => {
      dbSeedWorkspacePromises.delete(ownerId);
    });
  dbSeedWorkspacePromises.set(ownerId, promise);
  return promise;
}

async function ensureSeedWorkspaceUncached(ownerId: string) {
  const existing = await getDb()
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, ownerId))
    .orderBy(desc(workspaces.updatedAt))
    .limit(1);
  if (existing[0]) return;

  const seed = createSeedWorkspaceView(true);
  await getDb().insert(workspaces).values({
    id: scopedSeedId(ownerId, seed.workspace.id),
    ownerId,
    name: seed.workspace.name,
    inviteCode: await scopedSeedInviteCodeForOwner(ownerId),
    createdAt: new Date(seed.workspace.createdAt),
    updatedAt: new Date(seed.workspace.updatedAt),
  });
  await getDb().insert(workspaceMembers).values(
    seed.members.map((member) => ({
      id: scopedSeedId(ownerId, member.id),
      workspaceId: scopedSeedId(ownerId, member.workspaceId),
      ownerId,
      displayName: member.displayName,
      role: member.role,
      status: member.status ?? null,
      agentProfileId: member.agentProfileId ?? null,
      createdAt: new Date(seed.workspace.createdAt),
      updatedAt: new Date(seed.workspace.updatedAt),
    })),
  );
  await getDb().insert(workspaceThreads).values(
    seed.threads.map((thread) => ({
      id: scopedSeedId(ownerId, thread.id),
      workspaceId: scopedSeedId(ownerId, thread.workspaceId),
      ownerId,
      type: thread.type,
      name: thread.name,
      description: thread.description ?? null,
      agentTriggerMode: thread.agentTriggerMode ?? "room_default",
      allowedAgentProfileIds: thread.allowedAgentProfileIds ?? null,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
    })),
  );
  const seedThreadMembers = seed.threads.flatMap((thread) => buildSeedThreadMemberRows(ownerId, thread, seed.members, seed.workspace.createdAt));
  if (seedThreadMembers.length) await getDb().insert(workspaceThreadMembers).values(seedThreadMembers);
  if (seed.messages.length) {
    const scopedMessages = seed.messages.map((message): WorkspaceMessage => ({
      ...message,
      id: scopedSeedId(ownerId, message.id),
      workspaceId: scopedSeedId(ownerId, message.workspaceId),
      threadId: scopedSeedId(ownerId, message.threadId),
    }));
    await getDb().insert(workspaceMessages).values(
      scopedMessages.map((message) => ({
        id: message.id,
        workspaceId: message.workspaceId,
        threadId: message.threadId,
        ownerId,
        senderName: message.senderName,
        senderKind: message.senderKind,
        content: message.content,
        artifact: message.artifact ?? null,
        createdAt: new Date(message.createdAt),
      })),
    );
    const seedArtifacts = scopedMessages.flatMap((message) => {
      const artifact = buildWorkspaceArtifactFromMessage(message);
      return artifact ? [artifact] : [];
    });
    if (seedArtifacts.length) await getDb().insert(workspaceArtifacts).values(seedArtifacts.map((artifact) => dbWorkspaceArtifactValues(artifact, ownerId)));
  }
  if (seed.tasks.length) {
    await getDb().insert(workspaceTasks).values(
      seed.tasks.map((task) => ({
        id: scopedSeedId(ownerId, task.id),
        workspaceId: scopedSeedId(ownerId, task.workspaceId),
        threadId: scopedSeedId(ownerId, task.threadId),
        ownerId,
        title: task.title,
        scope: task.scope,
        status: task.status,
        progress: task.progress,
        dueAt: task.dueAt ?? null,
        metadata: buildTaskMetadata(task),
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
      })),
    );
  }
}

async function removeLegacySeedWorkspaceMocks(ownerId: string) {
  const workspaceId = scopedSeedId(ownerId, SEED_WORKSPACE_ID);
  const legacyWorkspace = await getDb()
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, ownerId)))
    .limit(1);
  if (!legacyWorkspace[0]) return;

  const legacyThreadIds = LEGACY_SEED_THREAD_IDS.map((id) => scopedSeedId(ownerId, id));
  const legacyMemberIds = LEGACY_SEED_MEMBER_IDS.map((id) => scopedSeedId(ownerId, id));
  const legacyMessageIds = LEGACY_SEED_MESSAGE_IDS.map((id) => scopedSeedId(ownerId, id));
  const legacyTaskIds = LEGACY_SEED_TASK_IDS.map((id) => scopedSeedId(ownerId, id));
  const youMemberId = scopedSeedId(ownerId, "wm_you");
  const now = new Date();

  await getDb().delete(workspaceMessages).where(inArray(workspaceMessages.id, legacyMessageIds));
  await getDb().delete(workspaceTasks).where(inArray(workspaceTasks.id, legacyTaskIds));
  await getDb().delete(workspaceThreadMembers).where(inArray(workspaceThreadMembers.threadId, legacyThreadIds));
  await getDb().delete(workspaceThreads).where(inArray(workspaceThreads.id, legacyThreadIds));
  await getDb().delete(workspaceMembers).where(inArray(workspaceMembers.id, legacyMemberIds));
  await getDb()
    .update(workspaceThreads)
    .set({ description: "shared room", updatedAt: now })
    .where(and(eq(workspaceThreads.id, scopedSeedId(ownerId, SEED_GENERAL_THREAD_ID)), eq(workspaceThreads.workspaceId, workspaceId)));

  const existingYou = await getDb()
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, youMemberId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);
  if (!existingYou[0]) {
    await getDb().insert(workspaceMembers).values({
      id: youMemberId,
      workspaceId,
      ownerId,
      displayName: "You",
      role: "Human",
      status: "owner",
      agentProfileId: null,
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function listDbWorkspaceSummaries(ownerId: string): Promise<WorkspaceSummary[]> {
  const [ownedRows, memberRows] = await Promise.all([
    getDb()
      .select()
      .from(workspaces)
      .where(eq(workspaces.ownerId, ownerId))
      .orderBy(desc(workspaces.updatedAt)),
    getDb()
      .select()
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.ownerId, ownerId))
      .orderBy(desc(workspaces.updatedAt)),
  ]);
  const rows = [...ownedRows, ...memberRows.map((row) => row.workspaces)];
  const uniqueRows = Array.from(new Map(rows.map((workspace) => [workspace.id, workspace])).values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
  return uniqueRows.map(rowToWorkspaceSummary);
}

function getCachedWorkspaceViewFromDb(ownerId: string, workspaceId: string | null | undefined, mode: WorkspaceViewDbLoadMode): Promise<WorkspaceView> {
  const key = dbWorkspaceViewCacheKey(ownerId, workspaceId, mode);
  const now = Date.now();
  const cached = dbWorkspaceViewCache.get(key);
  if (cached && cached.expiresAt > now) return cached.promise;
  const promise = (mode === "shell" ? getWorkspaceShellViewFromDb(ownerId, workspaceId) : getWorkspaceViewFromDb(ownerId, workspaceId, mode)).catch((error) => {
    dbWorkspaceViewCache.delete(key);
    throw error;
  });
  dbWorkspaceViewCache.set(key, { expiresAt: now + (mode === "shell" ? DB_WORKSPACE_SHELL_CACHE_TTL_MS : DB_WORKSPACE_VIEW_CACHE_TTL_MS), promise });
  return promise;
}

async function getWorkspaceShellViewFromDb(ownerId: string, workspaceId?: string | null): Promise<WorkspaceView> {
  const summaries = await listDbWorkspaceSummaries(ownerId);
  const targetWorkspaceId = workspaceId ?? summaries[0]?.id;
  if (!targetWorkspaceId) return createSeedWorkspaceView(false);
  const workspace = summaries.find((entry) => entry.id === targetWorkspaceId);
  if (!workspace) return createSeedWorkspaceView(false);

  const [memberRows, threadRows, threadMemberRows] = await Promise.all([
    getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id)).orderBy(asc(workspaceMembers.createdAt)),
    getDb().select().from(workspaceThreads).where(eq(workspaceThreads.workspaceId, workspace.id)).orderBy(desc(workspaceThreads.updatedAt)),
    getDb().select().from(workspaceThreadMembers).where(eq(workspaceThreadMembers.workspaceId, workspace.id)).orderBy(asc(workspaceThreadMembers.createdAt)),
  ]);
  const membersByThreadId = groupThreadMembersByThreadId(threadMemberRows);
  const visibleThreadRows = threadRows.filter((thread) => isDbThreadVisibleToOwner(thread, ownerId, membersByThreadId.get(thread.id)));
  const visibleThreadIds = visibleThreadRows.map((thread) => thread.id);
  const messageRows = visibleThreadIds.length
    ? await getDb()
        .select()
        .from(workspaceMessages)
        .where(and(eq(workspaceMessages.workspaceId, workspace.id), inArray(workspaceMessages.threadId, visibleThreadIds)))
        .orderBy(desc(workspaceMessages.createdAt))
        .limit(MESSAGE_WINDOW_PER_THREAD)
    : [];

  return {
    workspace,
    workspaces: summaries,
    members: memberRows.map(rowToWorkspaceMember),
    agentProfiles: [],
    threads: visibleThreadRows.map((thread) => rowToWorkspaceThread(thread, membersByThreadId.get(thread.id)?.map((member) => member.memberId))),
    messages: messageRows.map(rowToWorkspaceMessage).sort((a, b) => a.createdAt - b.createdAt),
    tasks: [],
    artifacts: [],
    agentRuns: [],
    agentRunEvents: [],
    agentApprovals: [],
    agentMemories: [],
    agentConnections: [],
    persisted: true,
  };
}

async function getWorkspaceViewFromDb(ownerId: string, workspaceId?: string | null, mode: WorkspaceViewDbLoadMode = "full"): Promise<WorkspaceView> {
  const shellMode = mode === "shell";
  const summaries = await listDbWorkspaceSummaries(ownerId);
  const targetWorkspaceId = workspaceId ?? summaries[0]?.id;
  if (!targetWorkspaceId) return createSeedWorkspaceView(false);
  const hasAccess = summaries.some((workspace) => workspace.id === targetWorkspaceId);
  if (!hasAccess) return createSeedWorkspaceView(false);
  const workspaceRows = await getDb()
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, targetWorkspaceId))
    .orderBy(desc(workspaces.updatedAt))
    .limit(1);
  const workspace = workspaceRows[0];
  if (!workspace) return createSeedWorkspaceView(false);

  const memberRows = await getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id)).orderBy(asc(workspaceMembers.createdAt));
  const memberProfileIds = new Set(memberRows.flatMap((member) => (member.agentProfileId ? [member.agentProfileId] : [])));
  const [workspaceProfileRows, memberProfileRows, personalProfileRows, threadRows, threadMemberRows, taskRows, artifactRows, runRows, memoryRows, connectionRows] = await Promise.all([
    shellMode ? Promise.resolve([]) : getDb().select().from(workspaceAgentProfiles).where(eq(workspaceAgentProfiles.workspaceId, workspace.id)).orderBy(asc(workspaceAgentProfiles.createdAt)),
    !shellMode && memberProfileIds.size
      ? getDb()
          .select()
          .from(workspaceAgentProfiles)
          .where(inArray(workspaceAgentProfiles.id, Array.from(memberProfileIds)))
          .orderBy(asc(workspaceAgentProfiles.createdAt))
      : [],
    shellMode
      ? Promise.resolve([])
      : getDb()
          .select()
          .from(workspaceAgentProfiles)
          .where(and(eq(workspaceAgentProfiles.ownerId, ownerId), eq(workspaceAgentProfiles.visibility, "private")))
          .orderBy(asc(workspaceAgentProfiles.createdAt)),
    getDb().select().from(workspaceThreads).where(eq(workspaceThreads.workspaceId, workspace.id)).orderBy(desc(workspaceThreads.updatedAt)),
    getDb().select().from(workspaceThreadMembers).where(eq(workspaceThreadMembers.workspaceId, workspace.id)).orderBy(asc(workspaceThreadMembers.createdAt)),
    getDb()
      .select()
      .from(workspaceTasks)
      .where(eq(workspaceTasks.workspaceId, workspace.id))
      .orderBy(desc(workspaceTasks.updatedAt))
      .limit(shellMode ? 30 : 1000),
    getDb()
      .select()
      .from(workspaceArtifacts)
      .where(eq(workspaceArtifacts.workspaceId, workspace.id))
      .orderBy(desc(workspaceArtifacts.updatedAt))
      .limit(shellMode ? 30 : 1000),
    getDb()
      .select()
      .from(workspaceAgentRuns)
      .where(eq(workspaceAgentRuns.workspaceId, workspace.id))
      .orderBy(desc(workspaceAgentRuns.startedAt))
      .limit(shellMode ? 20 : 100),
    shellMode ? Promise.resolve([]) : getDb().select().from(workspaceAgentMemories).where(eq(workspaceAgentMemories.workspaceId, workspace.id)).orderBy(desc(workspaceAgentMemories.updatedAt)),
    shellMode
      ? Promise.resolve([])
      : getDb()
          .select()
          .from(workspaceAgentConnections)
          .where(or(eq(workspaceAgentConnections.workspaceId, workspace.id), eq(workspaceAgentConnections.ownerId, ownerId)))
          .orderBy(desc(workspaceAgentConnections.updatedAt)),
  ]);
  const visibleWorkspaceProfileRows = [...workspaceProfileRows, ...memberProfileRows].filter(
    (profile) => profile.visibility !== "private" || profile.ownerId === ownerId || memberProfileIds.has(profile.id),
  );
  const profileRows = Array.from(new Map([...visibleWorkspaceProfileRows, ...personalProfileRows].map((profile) => [profile.id, profile])).values());
  const profileIds = profileRows.map((profile) => profile.id);
  const capabilityRows = !shellMode && profileIds.length
    ? await getDb()
        .select()
        .from(workspaceAgentCapabilities)
        .where(inArray(workspaceAgentCapabilities.profileId, profileIds))
        .orderBy(asc(workspaceAgentCapabilities.createdAt))
    : [];
  const visibleAgentConnections = connectionRows.map(rowToWorkspaceAgentConnection).sort((a, b) => b.updatedAt - a.updatedAt);
  const capabilitiesByProfileId = filterAgentCapabilitiesByVisibleConnections(
    groupAgentCapabilitiesByProfileId(capabilityRows),
    visibleAgentConnections,
    new Set(profileIds),
  );
  const membersByThreadId = groupThreadMembersByThreadId(threadMemberRows);
  const visibleThreadRows = threadRows.filter((thread) => isDbThreadVisibleToOwner(thread, ownerId, membersByThreadId.get(thread.id)));
  const visibleThreadIds = new Set(visibleThreadRows.map((thread) => thread.id));
  const visibleRunRows = runRows.filter((run) => visibleThreadIds.has(run.threadId));
  const visibleRunIds = visibleRunRows.map((run) => run.id);
  const visibleThreadIdList = Array.from(visibleThreadIds);
  const messageThreadIds = shellMode ? visibleThreadIdList.slice(0, 1) : visibleThreadIdList;
  const messageRows = messageThreadIds.length
    ? await getDb()
        .select()
        .from(workspaceMessages)
        .where(and(eq(workspaceMessages.workspaceId, workspace.id), inArray(workspaceMessages.threadId, messageThreadIds)))
        .orderBy(desc(workspaceMessages.createdAt))
        .limit(shellMode ? MESSAGE_WINDOW_PER_THREAD : Math.max(MESSAGE_WINDOW_PER_THREAD, MESSAGE_WINDOW_PER_THREAD * visibleThreadIdList.length))
    : [];
  const [runEventRows, approvalRows] = visibleRunIds.length
    ? await Promise.all([
        getDb()
          .select()
          .from(workspaceAgentRunEvents)
          .where(inArray(workspaceAgentRunEvents.runId, visibleRunIds))
          .orderBy(asc(workspaceAgentRunEvents.createdAt)),
        getDb()
          .select()
          .from(workspaceAgentApprovals)
          .where(inArray(workspaceAgentApprovals.runId, visibleRunIds))
          .orderBy(asc(workspaceAgentApprovals.requestedAt)),
      ])
    : [[], []];

  return {
    workspace: rowToWorkspaceSummary(workspace),
    workspaces: summaries,
    members: memberRows.map(rowToWorkspaceMember),
    agentProfiles: profileRows.map((profile) => rowToWorkspaceAgentProfile(profile, capabilitiesByProfileId)),
    threads: visibleThreadRows.map((thread) => rowToWorkspaceThread(thread, membersByThreadId.get(thread.id)?.map((member) => member.memberId))),
    messages: messageRows.map(rowToWorkspaceMessage).sort((a, b) => a.createdAt - b.createdAt),
    tasks: taskRows.filter((task) => visibleThreadIds.has(task.threadId)).map(rowToWorkspaceTask),
    artifacts: artifactRows.filter((artifact) => visibleThreadIds.has(artifact.threadId)).map(rowToWorkspaceArtifact).sort((a, b) => b.updatedAt - a.updatedAt),
    agentRuns: visibleRunRows.map(rowToWorkspaceAgentRun).sort((a, b) => a.startedAt - b.startedAt),
    agentRunEvents: runEventRows.map(rowToWorkspaceAgentRunEvent).sort((a, b) => a.createdAt - b.createdAt),
    agentApprovals: approvalRows.map(rowToWorkspaceAgentApproval).sort((a, b) => a.requestedAt - b.requestedAt),
    agentMemories: memoryRows
      .filter((memory) => isDbWorkspaceAgentMemoryVisibleToOwner(memory, ownerId))
      .map(rowToWorkspaceAgentMemory)
      .filter((memory) => !memory.archivedAt && (!memory.threadId || visibleThreadIds.has(memory.threadId)))
      .sort((a, b) => b.updatedAt - a.updatedAt),
    agentConnections: visibleAgentConnections,
    persisted: true,
  };
}




async function linkWorkspaceArtifactToRun(ownerId: string | null | undefined, workspaceId: string, sourceMessageId: string, sourceRunId: string) {
  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(workspaceId, ownerId);
    const existing = current.artifacts.find((artifact) => artifact.sourceMessageId === sourceMessageId);
    if (!existing || existing.sourceRunId === sourceRunId) return existing;
    const linked = { ...existing, sourceRunId, reviewStatus: defaultWorkspaceArtifactReviewStatus(existing.kind), updatedAt: Math.max(existing.updatedAt, Date.now()) };
    setLocalView({
      ...current,
      artifacts: upsertWorkspaceArtifact(current.artifacts, linked),
      workspace: { ...current.workspace, updatedAt: linked.updatedAt },
    }, ownerId);
    return linked;
  }

  await getDb()
    .update(workspaceArtifacts)
    .set({ sourceRunId, reviewStatus: "needs_review", updatedAt: new Date() })
    .where(and(eq(workspaceArtifacts.workspaceId, workspaceId), eq(workspaceArtifacts.sourceMessageId, sourceMessageId)));
  notifyWorkspaceUpdated(workspaceId, ownerId);
  return undefined;
}

export function buildWorkspaceArtifactMessageBundle(
  input: WorkspaceArtifactSeedInput & {
    senderName: string;
    senderKind: WorkspaceMessage["senderKind"];
    content: string;
  },
): WorkspaceArtifactMessageBundle {
  const compatibilitySnapshot = alignWorkspaceArtifactCompatibilitySnapshot(input.payload, input.title, input.description);
  const message = buildMessage(
    {
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      senderName: input.senderName,
      senderKind: input.senderKind,
      content: input.content,
      artifact: compatibilitySnapshot,
    },
    input.content,
  );
  const artifact = buildWorkspaceArtifactRecord({
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    title: input.title,
    description: input.description,
    kind: input.kind,
    payload: compatibilitySnapshot,
    sourceMessageId: message.id,
    sourceRunId: input.sourceRunId,
    now: input.now ?? message.createdAt,
  });
  return { message, artifact };
}

function requireLocalWorkspace(workspaceId: string, ownerId?: string | null) {
  if (!getLocalViews(ownerId).some((view) => view.workspace.id === workspaceId)) throw new Error("Workspace not found.");
}

function requireLocalThread(threadId: string, workspaceId: string, ownerId?: string | null) {
  const thread = getLocalView(workspaceId, ownerId).threads.find((entry) => entry.id === threadId && entry.workspaceId === workspaceId);
  if (!thread) throw new Error("Thread not found.");
}

async function resolveTaskAssignee(ownerId: string | null | undefined, workspaceId: string, assigneeId?: string) {
  if (!assigneeId) return undefined;

  if (!usesDatabase(ownerId)) {
    const member = getLocalView(workspaceId, ownerId).members.find((entry) => entry.id === assigneeId && entry.workspaceId === workspaceId);
    if (!member) throw new Error("Assignee not found.");
    return member;
  }

  const rows = await getDb()
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, assigneeId), eq(workspaceMembers.workspaceId, workspaceId)))
    .limit(1);
  const member = rows[0];
  if (!member) throw new Error("Assignee not found.");
  return rowToWorkspaceMember(member);
}

function buildSeedThreadMemberRows(ownerId: string, thread: WorkspaceThread, members: WorkspaceMember[], createdAt: number) {
  if (thread.type !== "direct") return [];
  const fallbackMember = members[0];
  const participantIds = normalizeParticipantIds(thread.participantIds) ?? (fallbackMember ? [fallbackMember.id] : []);
  return participantIds.map((memberId) => ({
    id: scopedSeedId(ownerId, `wtmember_${thread.id}_${memberId}`),
    workspaceId: scopedSeedId(ownerId, thread.workspaceId),
    threadId: scopedSeedId(ownerId, thread.id),
    memberId: scopedSeedId(ownerId, memberId),
    ownerId,
    createdAt: new Date(createdAt),
  }));
}

async function createCompletedWorkspaceAgentRun(
  ownerId: string | null | undefined,
  seed: WorkspaceAgentRunSeed,
): Promise<{ run: WorkspaceAgentRun; events: WorkspaceAgentRunEvent[]; approvals: WorkspaceAgentApproval[] }> {
  const startedAt = Date.now();
  const status = seed.status ?? "completed";
  const isTerminalStatus = status === "completed" || status === "failed" || status === "cancelled";
  const completedAt = isTerminalStatus ? Math.max(startedAt + 1, Date.now()) : undefined;
  const statusAt = completedAt ?? Math.max(startedAt + 1, Date.now());
  const runProfile = await ensureImplicitAgentProfile(ownerId, seed.workspaceId, seed.agent.member);
  const agentProfileId = seed.agent.profile?.id ?? runProfile.id;
  const run: WorkspaceAgentRun = {
    id: seed.runId ?? createWorkspaceAgentRunId(),
    workspaceId: seed.workspaceId,
    threadId: seed.threadId,
    agentProfileId,
    agentMemberId: seed.agent.member.id,
    trigger: seed.trigger,
    status,
    inputMessageId: seed.inputMessageId,
    outputMessageId: seed.outputMessageId,
    taskId: seed.taskId,
    startedAt,
    completedAt,
    error: seed.error,
  };
  const deepAgentThreadId = buildWorkspaceAgentRunThreadId({
    workspaceId: run.workspaceId,
    threadId: run.threadId,
    agentProfileId: run.agentProfileId,
    runId: run.id,
  });
  const runtimeEvents = seed.runtimeEvents?.some((event) => event.type === "status" && event.label === "runtime_configured")
    ? seed.runtimeEvents
    : [
        ...(seed.runtimeEvents ?? []),
        {
          type: "status",
          label: "runtime_configured",
          payload: { deepAgentThreadId, source: "workspace_store" },
        } satisfies WorkspaceAgentRuntimeEvent,
      ];
  const events: WorkspaceAgentRunEvent[] = [
    buildAgentRunEvent(run, "status", "started", {
      trigger: run.trigger,
      triggerDecision: seed.triggerDecision,
      deepAgentThreadId,
      agentMemberId: run.agentMemberId,
      agentProfileId: run.agentProfileId,
      agentProfileSnapshot: buildWorkspaceAgentProfileRunSnapshot(runProfile),
    }),
    ...runtimeEvents.map((event) => buildAgentRunEvent(run, event.type, event.label, event.payload)),
    buildAgentRunEvent(run, "status", run.status, { outputMessageId: run.outputMessageId, taskId: run.taskId }, statusAt),
  ];
  const approvals = run.status === "waiting_for_approval" ? buildPendingWorkspaceAgentApprovals(run, events, deepAgentThreadId, statusAt) : [];

  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(seed.workspaceId, ownerId);
    setLocalView({
      ...current,
      agentRuns: [...current.agentRuns, run],
      agentRunEvents: [...current.agentRunEvents, ...events],
      agentApprovals: [...current.agentApprovals, ...approvals],
      workspace: { ...current.workspace, updatedAt: statusAt },
    }, ownerId);
    return { run, events, approvals };
  }

  await ensureSeedWorkspace(ownerId);
  await requireDbWorkspace(ownerId, seed.workspaceId);
  await requireDbThread(ownerId, seed.workspaceId, seed.threadId);
  await getDb().transaction(async (tx) => {
    await tx.insert(workspaceAgentRuns).values({
      id: run.id,
      workspaceId: run.workspaceId,
      threadId: run.threadId,
      ownerId,
      agentProfileId: run.agentProfileId,
      agentMemberId: run.agentMemberId ?? null,
      trigger: run.trigger,
      status: run.status,
      inputMessageId: run.inputMessageId ?? null,
      outputMessageId: run.outputMessageId ?? null,
      taskId: run.taskId ?? null,
      error: run.error ?? null,
      startedAt: new Date(run.startedAt),
      completedAt: run.completedAt ? new Date(run.completedAt) : null,
    });
    await tx.insert(workspaceAgentRunEvents).values(
      events.map((event) => ({
        id: event.id,
        runId: event.runId,
        workspaceId: event.workspaceId,
        threadId: event.threadId,
        ownerId,
        type: event.type,
        label: event.label,
        payload: event.payload ?? null,
        createdAt: new Date(event.createdAt),
      })),
    );
    if (approvals.length) {
      await tx.insert(workspaceAgentApprovals).values(
        approvals.map((approval) => ({
          id: approval.id,
          workspaceId: approval.workspaceId,
          threadId: approval.threadId,
          runId: approval.runId,
          ownerId,
          agentProfileId: approval.agentProfileId,
          agentMemberId: approval.agentMemberId ?? null,
          toolName: approval.toolName,
          status: approval.status,
          input: approval.input ?? null,
          policy: approval.policy ?? null,
          deepAgentThreadId: approval.deepAgentThreadId ?? null,
          requestedAt: new Date(approval.requestedAt),
          decidedAt: approval.decidedAt ? new Date(approval.decidedAt) : null,
          decidedBy: approval.decidedBy ?? null,
          decisionReason: approval.decisionReason ?? null,
        })),
      );
    }
  });
  await getDb().update(workspaces).set({ updatedAt: new Date(statusAt) }).where(eq(workspaces.id, seed.workspaceId));
  notifyWorkspaceUpdated(seed.workspaceId, ownerId);
  return { run, events, approvals };
}

async function addRetrySourceEvents(
  ownerId: string | null | undefined,
  workspaceId: string,
  sourceRun: WorkspaceAgentRun,
  result: WorkspaceAgentRunResult,
): Promise<WorkspaceAgentRunResult> {
  if (!result.runs.length) return result;
  const now = Date.now();
  const retryEvents = result.runs.map((run) =>
    buildAgentRunEvent(run, "status", "retried", {
      sourceRunId: sourceRun.id,
      sourceStatus: sourceRun.status,
    }, now),
  );

  if (!usesDatabase(ownerId)) {
    const current = getLocalRawView(workspaceId, ownerId);
    setLocalView({
      ...current,
      agentRunEvents: [...current.agentRunEvents, ...retryEvents],
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    const events = [...retryEvents, ...result.events];
    const eventView = buildWorkspaceAgentRunResultEventView({ runs: result.runs, events, memories: result.memories, task: result.task });
    return { ...result, events, agentEvents: eventView.agentEvents, agentSignals: eventView.agentSignals };
  }

  await getDb().transaction(async (tx) => {
    await tx.insert(workspaceAgentRunEvents).values(
      retryEvents.map((event) => ({
        id: event.id,
        runId: event.runId,
        workspaceId: event.workspaceId,
        threadId: event.threadId,
        ownerId,
        type: event.type,
        label: event.label,
        payload: event.payload ?? null,
        createdAt: new Date(event.createdAt),
      })),
    );
    await tx.update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, workspaceId));
  });
  notifyWorkspaceUpdated(workspaceId, ownerId);
  const events = [...retryEvents, ...result.events];
  const eventView = buildWorkspaceAgentRunResultEventView({ runs: result.runs, events, memories: result.memories, task: result.task });
  return { ...result, events, agentEvents: eventView.agentEvents, agentSignals: eventView.agentSignals };
}

async function ensureImplicitAgentProfile(ownerId: string | null | undefined, workspaceId: string, member: WorkspaceMember) {
  if (member.agentProfileId) return requireWorkspaceAgentProfile(ownerId, workspaceId, member.agentProfileId);
  const displayName = member.displayName.trim() || "Workspace Agent";
  return createWorkspaceAgentProfile(ownerId, {
    workspaceId,
    displayName,
    description: "Legacy workspace agent profile created for run audit.",
    systemPrompt: "You are a helpful learning teammate in a Primoria workspace.",
    visibility: "workspace",
    memoryScope: "thread",
    capabilities: [{ kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true }],
  });
}

type WorkspaceAgentRunSeed = {
  runId?: string;
  workspaceId: string;
  threadId: string;
  agent: WorkspaceAgentParticipant;
  trigger: WorkspaceAgentRunTrigger;
  inputMessageId?: string;
  outputMessageId?: string;
  taskId?: string;
  status?: WorkspaceAgentRunStatus;
  error?: string;
  triggerDecision?: Pick<WorkspaceAgentTriggerDecision, "reason" | "confidence"> & { selectedAgentIds?: string[] };
  runtimeEvents?: WorkspaceAgentRuntimeEvent[];
};

function createSeedWorkspaceView(persisted: boolean): WorkspaceView {
  const now = Date.now();
  const workspace: WorkspaceSummary = {
    id: SEED_WORKSPACE_ID,
    name: "Primoria",
    inviteCode: SEED_INVITE_CODE,
    createdAt: now,
    updatedAt: now,
  };
  const threads: WorkspaceThread[] = [
    {
      id: SEED_GENERAL_THREAD_ID,
      workspaceId: workspace.id,
      type: "room",
      name: "General",
      description: "shared room",
      agentTriggerMode: "room_default",
      allowedAgentProfileIds: undefined,
      createdAt: now,
      updatedAt: now,
    },
  ];
  return {
    workspace,
    workspaces: [workspace],
    members: [
      { id: "wm_you", workspaceId: workspace.id, displayName: "You", role: "Human", status: "owner" },
    ],
    agentProfiles: [],
    threads,
    messages: [],
    tasks: [],
    artifacts: [],
    agentRuns: [],
    agentRunEvents: [],
    agentApprovals: [],
    agentMemories: [],
    agentConnections: [],
    persisted,
  };
}

function assertWorkspaceThreadAllowedAgentProfileIdsForView(view: WorkspaceView, profileIds: string[] | undefined) {
  if (profileIds === undefined) return;
  const workspaceAgentProfileIds = new Set(
    view.members.flatMap((member) =>
      member.workspaceId === view.workspace.id && member.agentProfileId && isWorkspaceAgentMember(member)
        ? [member.agentProfileId]
        : [],
    ),
  );
  const missingProfileId = profileIds.find((profileId) => !workspaceAgentProfileIds.has(profileId));
  if (missingProfileId) throw new Error("Allowed agent must be a member of this workspace.");
}

async function assertDbWorkspaceThreadAllowedAgentProfileIds(workspaceId: string, profileIds: string[] | undefined) {
  if (profileIds === undefined) return;
  const rows = await getDb()
    .select({ agentProfileId: workspaceMembers.agentProfileId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));
  const workspaceAgentProfileIds = new Set(rows.flatMap((row) => (row.agentProfileId ? [row.agentProfileId] : [])));
  const missingProfileId = profileIds.find((profileId) => !workspaceAgentProfileIds.has(profileId));
  if (missingProfileId) throw new Error("Allowed agent must be a member of this workspace.");
}

function scopedSeedId(ownerId: string, id: string) {
  return `${ownerId}_${id}`;
}

function scopedSeedInviteCode(ownerId: string) {
  return `PRI${createHash("sha1").update(ownerId).digest("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)}`;
}
