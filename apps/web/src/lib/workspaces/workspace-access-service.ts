import { and, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { workspaceMembers, workspaces, workspaceThreadMembers, workspaceThreads } from "../db/schema";
import { groupThreadMembersByThreadId, isDbThreadVisibleToOwner } from "./workspace-thread-service";

export function usesDatabase(ownerId?: string | null): ownerId is string {
  return Boolean(hasDatabaseUrl() && ownerId && !ownerId.startsWith("local_"));
}

export async function requireDbWorkspace(ownerId: string, workspaceId: string) {
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

export async function requireDbWorkspaceOwner(ownerId: string, workspaceId: string) {
  const rows = await getDb()
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(and(eq(workspaces.id, workspaceId), eq(workspaces.ownerId, ownerId)))
    .limit(1);
  if (!rows[0]) throw new Error("Workspace owner permission is required.");
}

export async function requireDbThread(ownerId: string, workspaceId: string, threadId: string) {
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

export async function listDbVisibleWorkspaceThreadIds(ownerId: string, workspaceId: string) {
  const [threadRows, memberRows] = await Promise.all([
    getDb().select().from(workspaceThreads).where(eq(workspaceThreads.workspaceId, workspaceId)),
    getDb().select().from(workspaceThreadMembers).where(eq(workspaceThreadMembers.workspaceId, workspaceId)),
  ]);
  const membersByThreadId = groupThreadMembersByThreadId(memberRows);
  return threadRows
    .filter((thread) => isDbThreadVisibleToOwner(thread, ownerId, membersByThreadId.get(thread.id)))
    .map((thread) => thread.id);
}
