import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getDb } from "../db/client";
import { workspaceMembers, workspaceThreadMembers, workspaceThreads } from "../db/schema";
import { isWorkspaceAgentMember } from "./agent-triggers";
import { rowToWorkspaceMember } from "./workspace-member-service";
import type { WorkspaceMember, WorkspaceThread, WorkspaceThreadAgentTriggerMode, WorkspaceThreadType } from "./types";

export function normalizeWorkspaceThreadAgentTriggerMode(value: unknown): WorkspaceThreadAgentTriggerMode {
  return value === "mention_only" || value === "quiet_review" || value === "room_default" ? value : "room_default";
}

export function normalizeWorkspaceThreadAllowedAgentProfileIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const ids = Array.from(
    new Set(
      value.flatMap((entry) => {
        const id = typeof entry === "string" ? entry.trim() || undefined : undefined;
        return id ? [id] : [];
      }),
    ),
  );
  return ids;
}

export function isDbThreadVisibleToOwner(
  thread: typeof workspaceThreads.$inferSelect,
  ownerId: string,
  members: Array<typeof workspaceThreadMembers.$inferSelect> | undefined,
) {
  if (thread.type !== "direct") return true;
  if (members?.length) return members.some((member) => member.ownerId === ownerId);
  return thread.ownerId === ownerId;
}

export function groupThreadMembersByThreadId(rows: Array<typeof workspaceThreadMembers.$inferSelect>) {
  const grouped = new Map<string, Array<typeof workspaceThreadMembers.$inferSelect>>();
  for (const row of rows) {
    const existing = grouped.get(row.threadId) ?? [];
    existing.push(row);
    grouped.set(row.threadId, existing);
  }
  return grouped;
}

export function rowToWorkspaceThread(
  thread: typeof workspaceThreads.$inferSelect,
  participantIds?: string[],
): WorkspaceThread {
  return {
    id: thread.id,
    workspaceId: thread.workspaceId,
    type: thread.type as WorkspaceThreadType,
    name: thread.name,
    description: thread.description ?? undefined,
    agentTriggerMode: normalizeWorkspaceThreadAgentTriggerMode(thread.agentTriggerMode),
    allowedAgentProfileIds: normalizeWorkspaceThreadAllowedAgentProfileIds(thread.allowedAgentProfileIds),
    participantIds,
    createdAt: thread.createdAt.getTime(),
    updatedAt: thread.updatedAt.getTime(),
  };
}

export function normalizeParticipantIds(participantIds?: string[] | null) {
  const ids = (participantIds ?? []).map((id) => id.trim()).filter(Boolean);
  return ids.length ? Array.from(new Set(ids)) : undefined;
}

export function buildLocalDirectParticipantIds(members: WorkspaceMember[], participantIds: string[] | undefined) {
  const requestedMemberIds = new Set(normalizeParticipantIds(participantIds));
  const selectedMembers = members.filter((member) => requestedMemberIds.has(member.id));
  if (selectedMembers.length !== requestedMemberIds.size) throw new Error("Direct participant not found.");
  const currentOwnerMember = members.find((member) => member.status === "owner" && !isWorkspaceAgentMember(member)) ?? members.find((member) => !isWorkspaceAgentMember(member));
  const participants = Array.from(new Map([...(currentOwnerMember ? [currentOwnerMember] : []), ...selectedMembers].map((member) => [member.id, member])).values());
  return participants.map((member) => member.id);
}

export async function buildDbThreadParticipantRows(ownerId: string, workspaceId: string, threadId: string, participantIds: string[] | undefined, now: number) {
  const rows = await getDb().select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId));
  const requestedMemberIds = new Set(normalizeParticipantIds(participantIds));
  const selectedMembers = rows.filter((member) => requestedMemberIds.has(member.id));
  if (selectedMembers.length !== requestedMemberIds.size) throw new Error("Direct participant not found.");
  const currentOwnerMember = rows.find((member) => member.ownerId === ownerId && !isWorkspaceAgentMember(rowToWorkspaceMember(member)));
  const participants = Array.from(new Map([...(currentOwnerMember ? [currentOwnerMember] : []), ...selectedMembers].map((member) => [member.id, member])).values());
  return participants.map((member) => ({
    id: `wtmember_${randomBytes(10).toString("base64url")}`,
    workspaceId,
    threadId,
    memberId: member.id,
    ownerId: member.ownerId,
    createdAt: new Date(now),
  }));
}
