import { and, asc, desc, eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb, hasDatabaseUrl } from "../db/client";
import {
  workspaceMembers,
  workspaceMessages,
  workspaces,
  workspaceTasks,
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
const SEED_PRODUCT_THREAD_ID = "thread_product";
const SEED_ARTIFACTS_THREAD_ID = "thread_artifacts";
const SEED_PRIMORIA_DIRECT_ID = "thread_direct_primoria";
const SEED_MINA_DIRECT_ID = "thread_direct_mina";
const SEED_OPS_DIRECT_ID = "thread_direct_ops";

const SEED_INVITE_CODE = "PRIMORIA";

declare global {
  var __primoriaWorkspaceLocalView: WorkspaceView | undefined;
  var __primoriaWorkspaceLocalViews: WorkspaceView[] | undefined;
  var __primoriaWorkspaceLocalActiveId: string | undefined;
}

function getLocalViews() {
  if (!globalThis.__primoriaWorkspaceLocalViews?.length) {
    const seed = createSeedWorkspaceView(false);
    globalThis.__primoriaWorkspaceLocalViews = [seed];
    globalThis.__primoriaWorkspaceLocalActiveId = seed.workspace.id;
    globalThis.__primoriaWorkspaceLocalView = seed;
  }
  return globalThis.__primoriaWorkspaceLocalViews;
}

function getLocalView(workspaceId?: string | null) {
  const views = getLocalViews();
  const targetId = workspaceId ?? globalThis.__primoriaWorkspaceLocalActiveId;
  const view = views.find((entry) => entry.workspace.id === targetId) ?? views[0];
  globalThis.__primoriaWorkspaceLocalActiveId = view.workspace.id;
  globalThis.__primoriaWorkspaceLocalView = view;
  return withWorkspaceList(view, views);
}

function setLocalView(view: WorkspaceView) {
  const views = getLocalViews();
  const stored = { ...view, workspaces: [] };
  const nextViews = [stored, ...views.filter((entry) => entry.workspace.id !== view.workspace.id)].sort(
    (a, b) => b.workspace.updatedAt - a.workspace.updatedAt,
  );
  globalThis.__primoriaWorkspaceLocalViews = nextViews;
  globalThis.__primoriaWorkspaceLocalActiveId = view.workspace.id;
  globalThis.__primoriaWorkspaceLocalView = stored;
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

function normalizeInviteCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
}

export async function getWorkspaceView(ownerId?: string | null, workspaceId?: string | null): Promise<WorkspaceView> {
  if (!hasDatabaseUrl() || !ownerId) return getLocalView(workspaceId);
  try {
    await ensureSeedWorkspace(ownerId);
    return getWorkspaceViewFromDb(ownerId, workspaceId);
  } catch (error) {
    console.warn("[workspace] falling back to local workspace view", error);
    return getLocalView(workspaceId);
  }
}

export async function createWorkspace(ownerId: string | null | undefined, input: CreateWorkspaceInput): Promise<WorkspaceView> {
  const name = input.name.trim();
  if (!name) throw new Error("Workspace name is required.");

  const now = Date.now();
  const workspace: WorkspaceSummary = {
    id: `workspace_${randomBytes(10).toString("base64url")}`,
    name,
    inviteCode: createInviteCode(),
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
      {
        id: `wmember_${randomBytes(10).toString("base64url")}`,
        workspaceId: workspace.id,
        displayName: "Primoria Agent",
        role: "AI teammate",
        status: "ready",
      },
    ],
    threads: [generalThread],
    messages: [
      {
        id: `wmsg_${randomBytes(10).toString("base64url")}`,
        workspaceId: workspace.id,
        threadId: generalThread.id,
        senderName: "Primoria Agent",
        senderKind: "agent",
        content: `Created ${name}. Add people, start a direct chat, or share an app card when you are ready.`,
        createdAt: now,
      },
    ],
    tasks: [],
    persisted: Boolean(hasDatabaseUrl() && ownerId),
  };

  if (!hasDatabaseUrl() || !ownerId) {
    return setLocalView(view);
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
      const welcome = view.messages[0];
      await tx.insert(workspaceMessages).values({
        id: welcome.id,
        workspaceId: welcome.workspaceId,
        threadId: welcome.threadId,
        ownerId,
        senderName: welcome.senderName,
        senderKind: welcome.senderKind,
        content: welcome.content,
        artifact: null,
        createdAt: new Date(welcome.createdAt),
      });
    });
    return { ...view, workspaces: await listDbWorkspaceSummaries(ownerId) };
  } catch (error) {
    console.warn("[workspace] falling back to local workspace creation", error);
    return setLocalView({ ...view, persisted: false });
  }
}

export async function joinWorkspace(ownerId: string | null | undefined, input: JoinWorkspaceInput): Promise<WorkspaceView> {
  const inviteCode = normalizeInviteCode(input.inviteCode);
  if (!inviteCode) throw new Error("Invite code is required.");
  const displayName = input.displayName?.trim() || "Guest";

  if (!hasDatabaseUrl() || !ownerId) {
    const views = getLocalViews();
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
    });
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
    console.warn("[workspace] falling back to local workspace join", error);
    const views = getLocalViews();
    const view = views.find((entry) => normalizeInviteCode(entry.workspace.inviteCode ?? entry.workspace.id) === inviteCode);
    if (!view) throw error;
    const now = Date.now();
    return setLocalView({
      ...view,
      members: [
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
    });
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

  if (!hasDatabaseUrl() || !ownerId) {
    requireLocalWorkspace(input.workspaceId);
    const current = getLocalView();
    setLocalView({
      ...current,
      members: [...current.members, member],
      workspace: { ...current.workspace, updatedAt: now },
    });
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
    console.warn("[workspace] falling back to local member persistence", error);
    requireLocalWorkspace(input.workspaceId);
    const current = getLocalView();
    setLocalView({
      ...current,
      members: [...current.members, member],
      workspace: { ...current.workspace, updatedAt: now },
    });
    return member;
  }
}

export async function createWorkspaceMessage(ownerId: string | null | undefined, input: CreateWorkspaceMessageInput): Promise<WorkspaceMessage> {
  const content = input.content.trim();
  if (!content) throw new Error("Message content is required.");

  if (!hasDatabaseUrl() || !ownerId) {
    requireLocalWorkspace(input.workspaceId);
    requireLocalThread(input.threadId, input.workspaceId);
    const message = buildMessage(input, content);
    const current = getLocalView();
    setLocalView({
      ...current,
      messages: [...current.messages, message],
      threads: bumpThread(current.threads, message.threadId, message.createdAt),
      workspace: { ...current.workspace, updatedAt: message.createdAt },
    });
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
    console.warn("[workspace] falling back to local message persistence", error);
    requireLocalWorkspace(input.workspaceId);
    requireLocalThread(input.threadId, input.workspaceId);
    const message = buildMessage(input, content);
    const current = getLocalView();
    setLocalView({
      ...current,
      messages: [...current.messages, message],
      threads: bumpThread(current.threads, message.threadId, message.createdAt),
      workspace: { ...current.workspace, updatedAt: message.createdAt },
    });
    return message;
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
    createdAt: now,
    updatedAt: now,
  };

  if (!hasDatabaseUrl() || !ownerId) {
    requireLocalWorkspace(input.workspaceId);
    const current = getLocalView();
    setLocalView({
      ...current,
      threads: [thread, ...current.threads],
      workspace: { ...current.workspace, updatedAt: now },
    });
    return thread;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    await getDb().insert(workspaceThreads).values({
      id: thread.id,
      workspaceId: thread.workspaceId,
      ownerId,
      type: thread.type,
      name: thread.name,
      description: thread.description ?? null,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
    });
    await getDb().update(workspaces).set({ updatedAt: new Date(now) }).where(eq(workspaces.id, input.workspaceId));
    return thread;
  } catch (error) {
    console.warn("[workspace] falling back to local thread persistence", error);
    requireLocalWorkspace(input.workspaceId);
    const current = getLocalView();
    setLocalView({
      ...current,
      threads: [thread, ...current.threads],
      workspace: { ...current.workspace, updatedAt: now },
    });
    return thread;
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

  if (!hasDatabaseUrl() || !ownerId) {
    requireLocalWorkspace(input.workspaceId);
    requireLocalThread(input.threadId, input.workspaceId);
    const current = getLocalView();
    setLocalView({
      ...current,
      tasks: [task, ...current.tasks],
      workspace: { ...current.workspace, updatedAt: now },
    });
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
    console.warn("[workspace] falling back to local task persistence", error);
    requireLocalWorkspace(input.workspaceId);
    requireLocalThread(input.threadId, input.workspaceId);
    const current = getLocalView();
    setLocalView({
      ...current,
      tasks: [task, ...current.tasks],
      workspace: { ...current.workspace, updatedAt: now },
    });
    return task;
  }
}

export async function updateWorkspaceTask(ownerId: string | null | undefined, input: UpdateWorkspaceTaskInput): Promise<WorkspaceTask> {
  const status = input.status.trim();
  if (!status) throw new Error("Task status is required.");

  const now = Date.now();
  const assignee = input.assigneeId === undefined ? undefined : await resolveTaskAssignee(ownerId, input.workspaceId, input.assigneeId);
  const applyPatch = (task: WorkspaceTask): WorkspaceTask => ({
    ...task,
    status,
    progress: input.progress?.trim() || (status === "done" ? "done" : task.progress),
    assigneeId: input.assigneeId === undefined ? task.assigneeId : assignee?.id,
    assigneeName: input.assigneeId === undefined ? task.assigneeName : assignee?.displayName,
    resultSummary: input.resultSummary?.trim() || task.resultSummary,
    submittedAt: input.resultSummary?.trim() ? now : task.submittedAt,
    updatedAt: now,
  });

  if (!hasDatabaseUrl() || !ownerId) {
    requireLocalWorkspace(input.workspaceId);
    const current = getLocalView();
    const existing = current.tasks.find((task) => task.id === input.taskId && task.workspaceId === input.workspaceId);
    if (!existing) throw new Error("Task not found.");
    const task = applyPatch(existing);
    setLocalView({
      ...current,
      tasks: current.tasks.map((entry) => (entry.id === task.id ? task : entry)),
      workspace: { ...current.workspace, updatedAt: now },
    });
    return task;
  }

  try {
    await ensureSeedWorkspace(ownerId);
    await requireDbWorkspace(ownerId, input.workspaceId);
    const rows = await getDb()
      .select()
      .from(workspaceTasks)
      .where(and(eq(workspaceTasks.id, input.taskId), eq(workspaceTasks.workspaceId, input.workspaceId), eq(workspaceTasks.ownerId, ownerId)))
      .limit(1);
    const existing = rows[0];
    if (!existing) throw new Error("Task not found.");
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
    console.warn("[workspace] falling back to local task update", error);
    requireLocalWorkspace(input.workspaceId);
    const current = getLocalView();
    const existing = current.tasks.find((task) => task.id === input.taskId && task.workspaceId === input.workspaceId);
    if (!existing) throw new Error("Task not found.");
    const task = applyPatch(existing);
    setLocalView({
      ...current,
      tasks: current.tasks.map((entry) => (entry.id === task.id ? task : entry)),
      workspace: { ...current.workspace, updatedAt: now },
    });
    return task;
  }
}

async function ensureSeedWorkspace(ownerId: string) {
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
    inviteCode: seed.workspace.inviteCode,
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

  const [memberRows, threadRows, messageRows, taskRows] = await Promise.all([
    getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id)).orderBy(asc(workspaceMembers.createdAt)),
    getDb().select().from(workspaceThreads).where(eq(workspaceThreads.workspaceId, workspace.id)).orderBy(desc(workspaceThreads.updatedAt)),
    getDb().select().from(workspaceMessages).where(eq(workspaceMessages.workspaceId, workspace.id)).orderBy(asc(workspaceMessages.createdAt)),
    getDb().select().from(workspaceTasks).where(eq(workspaceTasks.workspaceId, workspace.id)).orderBy(desc(workspaceTasks.updatedAt)),
  ]);

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
    threads: threadRows.map((thread): WorkspaceThread => ({
      id: thread.id,
      workspaceId: thread.workspaceId,
      type: thread.type as WorkspaceThreadType,
      name: thread.name,
      description: thread.description ?? undefined,
      createdAt: thread.createdAt.getTime(),
      updatedAt: thread.updatedAt.getTime(),
    })),
    messages: messageRows.map((message): WorkspaceMessage => ({
      id: message.id,
      workspaceId: message.workspaceId,
      threadId: message.threadId,
      senderName: message.senderName,
      senderKind: message.senderKind as WorkspaceMessage["senderKind"],
      content: message.content,
      artifact: (message.artifact ?? undefined) as WorkspaceMessageArtifact | undefined,
      createdAt: message.createdAt.getTime(),
    })),
    tasks: taskRows.map((task): WorkspaceTask => {
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

function requireLocalWorkspace(workspaceId: string) {
  if (getLocalView().workspace.id !== workspaceId) throw new Error("Workspace not found.");
}

function requireLocalThread(threadId: string, workspaceId: string) {
  const thread = getLocalView().threads.find((entry) => entry.id === threadId && entry.workspaceId === workspaceId);
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
  const rows = await getDb()
    .select({ id: workspaceThreads.id })
    .from(workspaceThreads)
    .where(and(eq(workspaceThreads.id, threadId), eq(workspaceThreads.workspaceId, workspaceId), eq(workspaceThreads.ownerId, ownerId)))
    .limit(1);
  if (!rows[0]) throw new Error("Thread not found.");
}

async function resolveTaskAssignee(ownerId: string | null | undefined, workspaceId: string, assigneeId?: string) {
  if (!assigneeId) return undefined;

  if (!hasDatabaseUrl() || !ownerId) {
    const member = getLocalView(workspaceId).members.find((entry) => entry.id === assigneeId && entry.workspaceId === workspaceId);
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
    createdAt: now - 3_600_000,
    updatedAt: now - 120_000,
  };
  const threads: WorkspaceThread[] = [
    { id: SEED_GENERAL_THREAD_ID, workspaceId: workspace.id, type: "room", name: "General", description: "5 people / 2 agents", createdAt: now - 3_500_000, updatedAt: now - 60_000 },
    { id: SEED_PRODUCT_THREAD_ID, workspaceId: workspace.id, type: "room", name: "Product", description: "scope and decisions", createdAt: now - 3_400_000, updatedAt: now - 360_000 },
    { id: SEED_ARTIFACTS_THREAD_ID, workspaceId: workspace.id, type: "room", name: "Artifacts", description: "apps and drafts", createdAt: now - 3_300_000, updatedAt: now - 520_000 },
    { id: SEED_PRIMORIA_DIRECT_ID, workspaceId: workspace.id, type: "direct", name: "Primoria Agent", description: "AI teammate", createdAt: now - 3_200_000, updatedAt: now - 100_000 },
    { id: SEED_MINA_DIRECT_ID, workspaceId: workspace.id, type: "direct", name: "Mina", description: "human", createdAt: now - 3_100_000, updatedAt: now - 800_000 },
    { id: SEED_OPS_DIRECT_ID, workspaceId: workspace.id, type: "direct", name: "Ops Agent", description: "automation", createdAt: now - 3_000_000, updatedAt: now - 900_000 },
  ];
  return {
    workspace,
    workspaces: [workspace],
    members: [
      { id: "wm_jia", workspaceId: workspace.id, displayName: "Jia", role: "Human", status: "reviewing plan" },
      { id: "wm_primoria", workspaceId: workspace.id, displayName: "Primoria Agent", role: "AI teammate", status: "routing work" },
      { id: "wm_mina", workspaceId: workspace.id, displayName: "Mina", role: "Human", status: "setting priorities" },
      { id: "wm_leo", workspaceId: workspace.id, displayName: "Leo", role: "Human", status: "checking assets" },
      { id: "wm_ops", workspaceId: workspace.id, displayName: "Ops Agent", role: "AI teammate", status: "watching tasks" },
    ],
    threads,
    messages: [
      seedMessage("m1", workspace.id, SEED_GENERAL_THREAD_ID, "Jia", "human", "Let's turn the onboarding notes into a concrete launch checklist. Keep decisions, tasks, and shared apps in this room.", now - 240_000),
      seedMessage("m2", workspace.id, SEED_GENERAL_THREAD_ID, "Primoria Agent", "agent", "I found three active threads: product scope, content assets, and follow-up tasks. I drafted a shared plan card and linked the app prototype below.", now - 180_000),
      seedMessage("m3", workspace.id, SEED_GENERAL_THREAD_ID, "Mina", "human", "Can we separate what needs a human decision from what the agent can execute without waiting?", now - 120_000),
      seedMessage("m4", workspace.id, SEED_GENERAL_THREAD_ID, "Primoria Agent", "agent", "Yes. I marked two approval gates and converted the rest into executable tasks. The workspace will keep updates visible to everyone in the room.", now - 60_000),
      {
        ...seedMessage("m5", workspace.id, SEED_GENERAL_THREAD_ID, "Primoria Agent", "agent", "Shared a prototype review app.", now - 45_000),
        artifact: {
          type: "app",
          title: "Prototype Review App",
          description: "Open the latest artifact, collect notes, and turn accepted changes into workspace tasks.",
          primaryAction: "Open app",
          secondaryAction: "Share",
        },
      },
      {
        ...seedMessage("m6", workspace.id, SEED_GENERAL_THREAD_ID, "Primoria Agent", "agent", "Converted the current room context into a launch plan.", now - 30_000),
        artifact: {
          type: "task",
          title: "Launch Plan",
          description: "Tasks, owners, and agent actions generated from the current room context.",
          groups: ["Decisions / 2 pending", "Agent work / 6 queued", "Human work / 4 open"],
        },
      },
      seedMessage("dm1", workspace.id, SEED_PRIMORIA_DIRECT_ID, "Primoria Agent", "agent", "Send me a goal and I can turn it into a shared room update or a private task list.", now - 100_000),
    ],
    tasks: [
      { id: "wt_launch", workspaceId: workspace.id, threadId: SEED_GENERAL_THREAD_ID, title: "Launch checklist", scope: "Shared", status: "open", progress: "6 / 10 done", assigneeId: "wm_jia", assigneeName: "Jia", dueAt: "Today 18:00", createdAt: now - 300_000, updatedAt: now - 50_000 },
      { id: "wt_review", workspaceId: workspace.id, threadId: SEED_GENERAL_THREAD_ID, title: "Prototype review", scope: "Human decision", status: "open", progress: "2 approvals needed", assigneeId: "wm_mina", assigneeName: "Mina", dueAt: "Thu 14:00", createdAt: now - 280_000, updatedAt: now - 80_000 },
      { id: "wt_assets", workspaceId: workspace.id, threadId: SEED_ARTIFACTS_THREAD_ID, title: "Asset cleanup", scope: "Agent-assisted", status: "open", progress: "8 files queued", assigneeId: "wm_ops", assigneeName: "Ops Agent", dueAt: "Fri 18:00", createdAt: now - 260_000, updatedAt: now - 90_000 },
    ],
    persisted,
  };
}

function seedMessage(
  id: string,
  workspaceId: string,
  threadId: string,
  senderName: string,
  senderKind: WorkspaceMessage["senderKind"],
  content: string,
  createdAt: number,
): WorkspaceMessage {
  return { id, workspaceId, threadId, senderName, senderKind, content, createdAt };
}

function bumpThread(threads: WorkspaceThread[], threadId: string, updatedAt: number) {
  return threads.map((thread) => (thread.id === threadId ? { ...thread, updatedAt } : thread));
}

function scopedSeedId(ownerId: string, id: string) {
  return `${ownerId}_${id}`;
}
