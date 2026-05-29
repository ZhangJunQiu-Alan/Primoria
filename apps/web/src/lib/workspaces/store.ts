import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { createHash, randomBytes } from "node:crypto";
import { getDb, hasDatabaseUrl } from "../db/client";
import {
  workspaceMembers,
  workspaceMessages,
  workspaces,
  workspaceTasks,
  workspaceThreadMembers,
  workspaceThreads,
} from "../db/schema";
import type {
  CreateWorkspaceMemberInput,
  CreateWorkspaceMessageInput,
  CreateWorkspaceInput,
  CreateWorkspaceTaskInput,
  CreateWorkspaceThreadInput,
  JoinWorkspaceInput,
  UpdateWorkspaceTaskInput,
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceMessageArtifact,
  WorkspaceSummary,
  WorkspaceTask,
  WorkspaceThread,
  WorkspaceThreadType,
  WorkspaceView,
} from "./types";

const SEED_WORKSPACE_ID = "workspace_seed";
const SEED_GENERAL_THREAD_ID = "thread_general";
const SEED_INVITE_CODE = "PRIMORIA";

const LEGACY_SEED_THREAD_IDS = ["thread_product", "thread_artifacts", "thread_direct_primoria", "thread_direct_mina", "thread_direct_ops"];
const LEGACY_SEED_MEMBER_IDS = ["wm_jia", "wm_primoria", "wm_mina", "wm_leo", "wm_ops"];
const LEGACY_SEED_MESSAGE_IDS = ["m1", "m2", "m3", "m4", "m5", "m6", "dm1"];
const LEGACY_SEED_TASK_IDS = ["wt_launch", "wt_review", "wt_assets"];

declare global {
  var __primoriaWorkspaceLocalView: WorkspaceView | undefined;
  var __primoriaWorkspaceLocalViews: WorkspaceView[] | undefined;
  var __primoriaWorkspaceLocalActiveId: string | undefined;
  var __primoriaWorkspaceLocalStores: Record<string, { views: WorkspaceView[]; activeId: string; view: WorkspaceView }> | undefined;
}

function localStoreKey(ownerId?: string | null) {
  return ownerId ? `owner:${ownerId}` : "anonymous";
}

function usesDatabase(ownerId?: string | null): ownerId is string {
  return Boolean(hasDatabaseUrl() && ownerId && !ownerId.startsWith("local_"));
}

function getLocalStore(ownerId?: string | null) {
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

function getLocalView(workspaceId?: string | null, ownerId?: string | null) {
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
  return withWorkspaceList(view, views);
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
  return withWorkspaceList(stored, nextViews);
}

function withWorkspaceList(view: WorkspaceView, views: WorkspaceView[]) {
  return {
    ...view,
    workspaces: views.map((entry) => entry.workspace).sort((a, b) => b.updatedAt - a.updatedAt),
  };
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

export async function getWorkspaceView(ownerId?: string | null, workspaceId?: string | null): Promise<WorkspaceView> {
  if (!usesDatabase(ownerId)) return getLocalView(workspaceId, ownerId);
  try {
    await ensureSeedWorkspace(ownerId);
    return getWorkspaceViewFromDb(ownerId, workspaceId);
  } catch (error) {
    console.error("[workspace] database workspace view failed", error);
    throw error;
  }
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
    threads: [generalThread],
    messages: [],
    tasks: [],
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
        createdAt: new Date(generalThread.createdAt),
        updatedAt: new Date(generalThread.updatedAt),
      });
    });
    return { ...view, workspaces: await listDbWorkspaceSummaries(ownerId) };
  } catch (error) {
    console.error("[workspace] database workspace creation failed", error);
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
        createdAt: now,
        updatedAt: now,
      });
      await getDb().update(workspaces).set({ updatedAt: now }).where(eq(workspaces.id, workspace.id));
    }
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
  };

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalView(input.workspaceId, ownerId);
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
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    return member;
  } catch (error) {
    console.error("[workspace] database member persistence failed", error);
    throw error;
  }
}

export async function createWorkspaceMessage(ownerId: string | null | undefined, input: CreateWorkspaceMessageInput): Promise<WorkspaceMessage> {
  const content = input.content.trim();
  if (!content) throw new Error("Message content is required.");

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    requireLocalThread(input.threadId, input.workspaceId, ownerId);
    const message = buildMessage(input, content);
    const current = getLocalView(input.workspaceId, ownerId);
    setLocalView({
      ...current,
      messages: [...current.messages, message],
      threads: bumpThread(current.threads, message.threadId, message.createdAt),
      workspace: { ...current.workspace, updatedAt: message.createdAt },
    }, ownerId);
    return message;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await requireDbThread(ownerId, input.workspaceId, input.threadId);
    const message = buildMessage(input, content);
    const now = new Date(message.createdAt);
    await getDb().insert(workspaceMessages).values({
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
    await getDb().update(workspaceThreads).set({ updatedAt: now }).where(eq(workspaceThreads.id, message.threadId));
    await getDb().update(workspaces).set({ updatedAt: now }).where(eq(workspaces.id, message.workspaceId));
    return message;
  } catch (error) {
    console.error("[workspace] database message persistence failed", error);
    throw error;
  }
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
    participantIds: input.type === "direct" ? normalizeParticipantIds(input.participantIds) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalView(input.workspaceId, ownerId);
    if (thread.type === "direct" && thread.participantIds?.some((participantId) => !current.members.some((member) => member.id === participantId))) {
      throw new Error("Direct participant not found.");
    }
    setLocalView({
      ...current,
      threads: [thread, ...current.threads],
      workspace: { ...current.workspace, updatedAt: now },
    }, ownerId);
    return thread;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    const participantRows = input.type === "direct" ? await buildDbThreadParticipantRows(ownerId, input.workspaceId, thread.id, thread.participantIds, now) : [];
    await getDb().transaction(async (tx) => {
      await tx.insert(workspaceThreads).values({
        id: thread.id,
        workspaceId: thread.workspaceId,
        ownerId,
        type: thread.type,
        name: thread.name,
        description: thread.description ?? null,
        createdAt: new Date(thread.createdAt),
        updatedAt: new Date(thread.updatedAt),
      });
      if (participantRows.length) await tx.insert(workspaceThreadMembers).values(participantRows);
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    return {
      ...thread,
      participantIds: thread.type === "direct" ? participantRows.map((row) => row.memberId) : undefined,
    };
  } catch (error) {
    console.error("[workspace] database thread persistence failed", error);
    throw error;
  }
}

export async function createWorkspaceTask(ownerId: string | null | undefined, input: CreateWorkspaceTaskInput): Promise<WorkspaceTask> {
  const title = input.title.trim();
  if (!title) throw new Error("Task title is required.");

  const now = Date.now();
  const assignee = await resolveTaskAssignee(ownerId, input.workspaceId, input.assigneeId);
  const task: WorkspaceTask = {
    id: `wtask_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    title,
    scope: input.scope?.trim() || "Shared",
    status: "open",
    progress: input.progress?.trim() || "new",
    assigneeId: assignee?.id,
    assigneeName: assignee?.displayName,
    dueAt: input.dueAt?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    requireLocalThread(input.threadId, input.workspaceId, ownerId);
    const current = getLocalView(input.workspaceId, ownerId);
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
    return task;
  } catch (error) {
    console.error("[workspace] database task persistence failed", error);
    throw error;
  }
}

export async function updateWorkspaceTask(ownerId: string | null | undefined, input: UpdateWorkspaceTaskInput): Promise<WorkspaceTask> {
  const status = input.status.trim();
  if (!status) throw new Error("Task status is required.");

  const now = Date.now();
  const assignee = input.assigneeId === undefined ? undefined : await resolveTaskAssignee(ownerId, input.workspaceId, input.assigneeId);
  const resultSummary = input.resultSummary?.trim();
  const applyPatch = (task: WorkspaceTask): WorkspaceTask => ({
    ...task,
    status,
    progress: input.progress?.trim() || (status === "done" ? "done" : task.progress),
    assigneeId: input.assigneeId === undefined ? task.assigneeId : assignee?.id,
    assigneeName: input.assigneeId === undefined ? task.assigneeName : assignee?.displayName,
    resultSummary: status === "done" ? resultSummary || task.resultSummary : undefined,
    submittedAt: status === "done" ? (resultSummary ? now : task.submittedAt) : undefined,
    updatedAt: now,
  });

  if (!usesDatabase(ownerId)) {
    requireLocalWorkspace(input.workspaceId, ownerId);
    const current = getLocalView(input.workspaceId, ownerId);
    const existing = current.tasks.find((task) => task.id === input.taskId && task.workspaceId === input.workspaceId);
    if (!existing) throw new Error("Task not found.");
    const task = applyPatch(existing);
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
    const task = applyPatch({
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
    });
    await getDb()
      .update(workspaceTasks)
      .set({ status: task.status, progress: task.progress, metadata: buildTaskMetadata(task), updatedAt: new Date(task.updatedAt) })
      .where(eq(workspaceTasks.id, task.id));
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    return task;
  } catch (error) {
    console.error("[workspace] database task update failed", error);
    throw error;
  }
}

async function ensureSeedWorkspace(ownerId: string) {
  const existing = await getDb()
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.ownerId, ownerId))
    .orderBy(desc(workspaces.updatedAt))
    .limit(1);
  if (existing[0]) {
    await removeLegacySeedWorkspaceMocks(ownerId);
    return;
  }

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
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
    })),
  );
  const seedThreadMembers = seed.threads.flatMap((thread) => buildSeedThreadMemberRows(ownerId, thread, seed.members, seed.workspace.createdAt));
  if (seedThreadMembers.length) await getDb().insert(workspaceThreadMembers).values(seedThreadMembers);
  if (seed.messages.length) {
    await getDb().insert(workspaceMessages).values(
      seed.messages.map((message) => ({
        id: scopedSeedId(ownerId, message.id),
        workspaceId: scopedSeedId(ownerId, message.workspaceId),
        threadId: scopedSeedId(ownerId, message.threadId),
        ownerId,
        senderName: message.senderName,
        senderKind: message.senderKind,
        content: message.content,
        artifact: message.artifact ?? null,
        createdAt: new Date(message.createdAt),
      })),
    );
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
      createdAt: now,
      updatedAt: now,
    });
  }
}

async function listDbWorkspaceSummaries(ownerId: string): Promise<WorkspaceSummary[]> {
  const ownedRows = await getDb()
    .select()
    .from(workspaces)
    .where(eq(workspaces.ownerId, ownerId))
    .orderBy(desc(workspaces.updatedAt));
  const memberRows = await getDb()
    .select()
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
    .where(eq(workspaceMembers.ownerId, ownerId))
    .orderBy(desc(workspaces.updatedAt));
  const rows = [...ownedRows, ...memberRows.map((row) => row.workspaces)];
  const uniqueRows = Array.from(new Map(rows.map((workspace) => [workspace.id, workspace])).values()).sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
  return uniqueRows.map((workspace): WorkspaceSummary => ({
    id: workspace.id,
    name: workspace.name,
    inviteCode: workspace.inviteCode ?? undefined,
    createdAt: workspace.createdAt.getTime(),
    updatedAt: workspace.updatedAt.getTime(),
  }));
}

async function getWorkspaceViewFromDb(ownerId: string, workspaceId?: string | null): Promise<WorkspaceView> {
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

  const [memberRows, threadRows, threadMemberRows, messageRows, taskRows] = await Promise.all([
    getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id)).orderBy(asc(workspaceMembers.createdAt)),
    getDb().select().from(workspaceThreads).where(eq(workspaceThreads.workspaceId, workspace.id)).orderBy(desc(workspaceThreads.updatedAt)),
    getDb().select().from(workspaceThreadMembers).where(eq(workspaceThreadMembers.workspaceId, workspace.id)).orderBy(asc(workspaceThreadMembers.createdAt)),
    getDb().select().from(workspaceMessages).where(eq(workspaceMessages.workspaceId, workspace.id)).orderBy(asc(workspaceMessages.createdAt)),
    getDb().select().from(workspaceTasks).where(eq(workspaceTasks.workspaceId, workspace.id)).orderBy(desc(workspaceTasks.updatedAt)),
  ]);
  const membersByThreadId = groupThreadMembersByThreadId(threadMemberRows);
  const visibleThreadRows = threadRows.filter((thread) => isDbThreadVisibleToOwner(thread, ownerId, membersByThreadId.get(thread.id)));
  const visibleThreadIds = new Set(visibleThreadRows.map((thread) => thread.id));

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      inviteCode: workspace.inviteCode ?? undefined,
      createdAt: workspace.createdAt.getTime(),
      updatedAt: workspace.updatedAt.getTime(),
    },
    workspaces: summaries,
    members: memberRows.map((member): WorkspaceMember => ({
      id: member.id,
      workspaceId: member.workspaceId,
      displayName: member.displayName,
      role: member.role,
      status: member.status ?? undefined,
    })),
    threads: visibleThreadRows.map((thread): WorkspaceThread => ({
      id: thread.id,
      workspaceId: thread.workspaceId,
      type: thread.type as WorkspaceThreadType,
      name: thread.name,
      description: thread.description ?? undefined,
      participantIds: membersByThreadId.get(thread.id)?.map((member) => member.memberId),
      createdAt: thread.createdAt.getTime(),
      updatedAt: thread.updatedAt.getTime(),
    })),
    messages: messageRows.filter((message) => visibleThreadIds.has(message.threadId)).map((message): WorkspaceMessage => ({
      id: message.id,
      workspaceId: message.workspaceId,
      threadId: message.threadId,
      senderName: message.senderName,
      senderKind: message.senderKind as WorkspaceMessage["senderKind"],
      content: message.content,
      artifact: (message.artifact ?? undefined) as WorkspaceMessageArtifact | undefined,
      createdAt: message.createdAt.getTime(),
    })),
    tasks: taskRows.filter((task) => visibleThreadIds.has(task.threadId)).map((task): WorkspaceTask => {
      const metadata = readTaskMetadata(task.metadata);
      return {
        id: task.id,
        workspaceId: task.workspaceId,
        threadId: task.threadId,
        title: task.title,
        scope: task.scope,
        status: task.status,
        progress: task.progress,
        assigneeId: metadata.assigneeId,
        assigneeName: metadata.assigneeName,
        resultSummary: metadata.resultSummary,
        submittedAt: metadata.submittedAt,
        dueAt: task.dueAt ?? undefined,
        createdAt: task.createdAt.getTime(),
        updatedAt: task.updatedAt.getTime(),
      };
    }),
    persisted: true,
  };
}

function buildMessage(input: CreateWorkspaceMessageInput, content: string): WorkspaceMessage {
  return {
    id: `wmsg_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    senderName: input.senderName?.trim() || "You",
    senderKind: input.senderKind ?? "human",
    content,
    artifact: input.artifact,
    createdAt: Date.now(),
  };
}

function requireLocalWorkspace(workspaceId: string, ownerId?: string | null) {
  if (!getLocalViews(ownerId).some((view) => view.workspace.id === workspaceId)) throw new Error("Workspace not found.");
}

function requireLocalThread(threadId: string, workspaceId: string, ownerId?: string | null) {
  const thread = getLocalView(workspaceId, ownerId).threads.find((entry) => entry.id === threadId && entry.workspaceId === workspaceId);
  if (!thread) throw new Error("Thread not found.");
}

async function requireDbWorkspace(ownerId: string, workspaceId: string) {
  const rows = await getDb()
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, ownerId)))
    .limit(1);
  if (rows[0]) return;
  const memberRows = await getDb()
    .select({ id: workspaceMembers.id })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.ownerId, ownerId)))
    .limit(1);
  if (!memberRows[0]) throw new Error("Workspace not found.");
}

async function requireDbThread(ownerId: string, workspaceId: string, threadId: string) {
  const [threadRows, memberRows] = await Promise.all([
    getDb()
      .select()
      .from(workspaceThreads)
      .where(and(eq(workspaceThreads.id, threadId), eq(workspaceThreads.workspaceId, workspaceId)))
      .limit(1),
    getDb().select().from(workspaceThreadMembers).where(eq(workspaceThreadMembers.threadId, threadId)),
  ]);
  const thread = threadRows[0];
  if (!thread || !isDbThreadVisibleToOwner(thread, ownerId, memberRows)) throw new Error("Thread not found.");
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
  return {
    id: member.id,
    workspaceId: member.workspaceId,
    displayName: member.displayName,
    role: member.role,
    status: member.status ?? undefined,
  } satisfies WorkspaceMember;
}

function normalizeParticipantIds(participantIds?: string[] | null) {
  const ids = (participantIds ?? []).map((id) => id.trim()).filter(Boolean);
  return ids.length ? Array.from(new Set(ids)) : undefined;
}

async function buildDbThreadParticipantRows(ownerId: string, workspaceId: string, threadId: string, participantIds: string[] | undefined, now: number) {
  const rows = await getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  const requestedMemberIds = new Set(normalizeParticipantIds(participantIds));
  const selectedMembers = rows.filter((member) => requestedMemberIds.has(member.id));
  if (selectedMembers.length !== requestedMemberIds.size) throw new Error("Direct participant not found.");
  const currentMembers = rows.filter((member) => member.ownerId === ownerId);
  const participants = Array.from(new Map([...currentMembers, ...selectedMembers].map((member) => [member.id, member])).values());
  return participants.map((member) => ({
    id: `wtmember_${randomBytes(10).toString("base64url")}`,
    workspaceId,
    threadId,
    memberId: member.id,
    ownerId: member.ownerId,
    createdAt: new Date(now),
  }));
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

function isDbThreadVisibleToOwner(
  thread: typeof workspaceThreads.$inferSelect,
  ownerId: string,
  members: Array<typeof workspaceThreadMembers.$inferSelect> | undefined,
) {
  if (thread.type !== "direct") return true;
  if (members?.length) return members.some((member) => member.ownerId === ownerId);
  return thread.ownerId === ownerId;
}

function groupThreadMembersByThreadId(rows: Array<typeof workspaceThreadMembers.$inferSelect>) {
  const grouped = new Map<string, Array<typeof workspaceThreadMembers.$inferSelect>>();
  for (const row of rows) {
    const existing = grouped.get(row.threadId) ?? [];
    existing.push(row);
    grouped.set(row.threadId, existing);
  }
  return grouped;
}

function buildTaskMetadata(task: WorkspaceTask) {
  if (!task.assigneeId && !task.assigneeName && !task.resultSummary && !task.submittedAt) return null;
  return {
    assigneeId: task.assigneeId,
    assigneeName: task.assigneeName,
    resultSummary: task.resultSummary,
    submittedAt: task.submittedAt,
  };
}

function readTaskMetadata(metadata: unknown): Pick<WorkspaceTask, "assigneeId" | "assigneeName" | "resultSummary" | "submittedAt"> {
  if (!metadata || typeof metadata !== "object") return {};
  const record = metadata as Record<string, unknown>;
  return {
    assigneeId: typeof record.assigneeId === "string" ? record.assigneeId : undefined,
    assigneeName: typeof record.assigneeName === "string" ? record.assigneeName : undefined,
    resultSummary: typeof record.resultSummary === "string" ? record.resultSummary : undefined,
    submittedAt: typeof record.submittedAt === "number" ? record.submittedAt : undefined,
  };
}

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
    { id: SEED_GENERAL_THREAD_ID, workspaceId: workspace.id, type: "room", name: "General", description: "shared room", createdAt: now, updatedAt: now },
  ];
  return {
    workspace,
    workspaces: [workspace],
    members: [
      { id: "wm_you", workspaceId: workspace.id, displayName: "You", role: "Human", status: "owner" },
    ],
    threads,
    messages: [],
    tasks: [],
    persisted,
  };
}

function bumpThread(threads: WorkspaceThread[], threadId: string, updatedAt: number) {
  return threads.map((thread) => (thread.id === threadId ? { ...thread, updatedAt } : thread));
}

function scopedSeedId(ownerId: string, id: string) {
  return `${ownerId}_${id}`;
}

function scopedSeedInviteCode(ownerId: string) {
  return `PRI${createHash("sha1").update(ownerId).digest("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5)}`;
}
