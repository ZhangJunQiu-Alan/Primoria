"use client";

import { isWorkspaceAgentMember } from "@/lib/workspaces/agent-triggers";
import type {
  WorkspaceAgentApproval,
  WorkspaceAgentConnection,
  WorkspaceAgentMemory,
  WorkspaceAgentProfile,
  WorkspaceAgentRun,
  WorkspaceAgentRunEvent,
  WorkspaceArtifact,
  WorkspaceMember,
  WorkspaceMessage,
  WorkspaceTask,
  WorkspaceThread,
  WorkspaceView,
} from "@/lib/workspaces/types";

export function getActiveAgentMentionRange(value: string, caret: number) {
  const beforeCaret = value.slice(0, caret);
  const at = beforeCaret.lastIndexOf("@");
  if (at === -1) return null;
  const beforeAt = at === 0 ? "" : beforeCaret[at - 1];
  if (beforeAt && !/\s/.test(beforeAt)) return null;
  const query = beforeCaret.slice(at + 1);
  if (/[\n\r]/.test(query)) return null;
  if (query.length > 40) return null;
  return { start: at, end: caret, query: query.trim() };
}

export function agentCount(members: WorkspaceView["members"]) {
  return members.filter(isWorkspaceAgentMember).length;
}

export function isAgentMember(member: WorkspaceMember) {
  return isWorkspaceAgentMember(member);
}

export function mergeWorkspaceViews(current: WorkspaceView, incoming: WorkspaceView): WorkspaceView {
  if (current.workspace.id !== incoming.workspace.id) return incoming;
  return {
    ...incoming,
    workspace: current.workspace.updatedAt > incoming.workspace.updatedAt ? current.workspace : incoming.workspace,
    workspaces: mergeWorkspaceSummaries(current.workspaces, incoming.workspaces),
    members: mergeMembers(current.members, incoming.members),
    agentProfiles: mergeAgentProfiles(current.agentProfiles, incoming.agentProfiles),
    threads: mergeThreads(current.threads, incoming.threads),
    messages: mergeMessages(current.messages, incoming.messages),
    tasks: mergeTasks(current.tasks, incoming.tasks),
    artifacts: mergeArtifacts(current.artifacts, incoming.artifacts),
    agentRuns: mergeAgentRuns(current.agentRuns, incoming.agentRuns),
    agentRunEvents: mergeAgentRunEvents(current.agentRunEvents, incoming.agentRunEvents),
    agentApprovals: mergeAgentApprovals(current.agentApprovals, incoming.agentApprovals),
    agentMemories: mergeAgentMemories(current.agentMemories, incoming.agentMemories),
    agentConnections: mergeAgentConnections(current.agentConnections, incoming.agentConnections),
    persisted: incoming.persisted,
  };
}

export function mergeWorkspaceSummaries(current: WorkspaceView["workspaces"], incoming: WorkspaceView["workspaces"]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((workspace) => [workspace.id, workspace]));
  for (const workspace of incoming) byId.set(workspace.id, workspace);
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function mergeThreads(current: WorkspaceThread[], incoming: WorkspaceThread[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((thread) => [thread.id, thread]));
  for (const thread of incoming) byId.set(thread.id, thread);
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function mergeTasks(current: WorkspaceTask[], incoming: WorkspaceTask[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((task) => [task.id, task]));
  for (const task of incoming) byId.set(task.id, task);
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function mergeMessages(current: WorkspaceMessage[], incoming: WorkspaceMessage[]) {
  if (!incoming.length) return current;
  let next = current;
  for (const message of incoming) {
    next = removeMatchingPendingMessage(next, message);
  }
  const seen = new Set(next.map((message) => message.id));
  return [...next, ...incoming.filter((message) => !seen.has(message.id))].sort((a, b) => a.createdAt - b.createdAt);
}

export function removeMessageById(messages: WorkspaceMessage[], messageId: string) {
  return messages.filter((message) => message.id !== messageId);
}

function removeMatchingPendingMessage(messages: WorkspaceMessage[], incoming: WorkspaceMessage) {
  if (incoming.id.startsWith("wmsg_pending_")) return messages;
  return messages.filter((message) => {
    if (!message.id.startsWith("wmsg_pending_")) return true;
    return !(
      message.workspaceId === incoming.workspaceId &&
      message.threadId === incoming.threadId &&
      message.senderKind === incoming.senderKind &&
      message.senderName === incoming.senderName &&
      message.content === incoming.content &&
      Math.abs(message.createdAt - incoming.createdAt) < 120_000
    );
  });
}

export function mergeAgentRuns(current: WorkspaceAgentRun[], incoming: WorkspaceAgentRun[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((run) => [run.id, run]));
  for (const run of incoming) byId.set(run.id, run);
  return Array.from(byId.values()).sort((a, b) => a.startedAt - b.startedAt);
}

export function mergeAgentRunEvents(current: WorkspaceAgentRunEvent[], incoming: WorkspaceAgentRunEvent[]) {
  if (!incoming.length) return current;
  const seen = new Set(current.map((event) => event.id));
  return [...current, ...incoming.filter((event) => !seen.has(event.id))].sort((a, b) => a.createdAt - b.createdAt);
}

export function mergeAgentApprovals(current: WorkspaceAgentApproval[], incoming: WorkspaceAgentApproval[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((approval) => [approval.id, approval]));
  for (const approval of incoming) byId.set(approval.id, approval);
  return Array.from(byId.values()).sort((a, b) => a.requestedAt - b.requestedAt);
}

export function mergeAgentMemories(current: WorkspaceAgentMemory[], incoming: WorkspaceAgentMemory[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((memory) => [memory.id, memory]));
  for (const memory of incoming) {
    if (memory.archivedAt) byId.delete(memory.id);
    else byId.set(memory.id, memory);
  }
  return Array.from(byId.values()).filter((memory) => !memory.archivedAt).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function mergeMembers(current: WorkspaceMember[], incoming: WorkspaceMember[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((member) => [member.id, member]));
  for (const member of incoming) byId.set(member.id, member);
  return Array.from(byId.values());
}

export function mergeAgentProfiles(current: WorkspaceAgentProfile[], incoming: WorkspaceAgentProfile[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((profile) => [profile.id, profile]));
  for (const profile of incoming) byId.set(profile.id, profile);
  return Array.from(byId.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function mergeAgentConnections(current: WorkspaceAgentConnection[], incoming: WorkspaceAgentConnection[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((connection) => [connection.id, connection]));
  for (const connection of incoming) byId.set(connection.id, connection);
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function mergeArtifacts(current: WorkspaceArtifact[], incoming: WorkspaceArtifact[]) {
  if (!incoming.length) return current;
  const byId = new Map(current.map((artifact) => [artifact.id, artifact]));
  for (const artifact of incoming) byId.set(artifact.id, artifact);
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function bumpThreadsForMessages(threads: WorkspaceThread[], messages: WorkspaceMessage[]) {
  if (!messages.length) return threads;
  const updatedAtByThread = new Map<string, number>();
  for (const message of messages) {
    updatedAtByThread.set(message.threadId, Math.max(updatedAtByThread.get(message.threadId) ?? 0, message.createdAt));
  }
  return threads.map((thread) => {
    const updatedAt = updatedAtByThread.get(thread.id);
    return updatedAt ? { ...thread, updatedAt } : thread;
  });
}

export function latestWorkspaceTimestamp(base: number, messages: WorkspaceMessage[] | undefined) {
  return Math.max(base, ...(messages ?? []).map((message) => message.createdAt));
}

function lastReadStorageKey(workspaceId: string) {
  return `primoria:workspace:${workspaceId}:last-read`;
}

export function readLastReadState(workspaceId: string): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(lastReadStorageKey(workspaceId));
    if (!stored) return {};
    const parsed = JSON.parse(stored);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function writeLastReadState(workspaceId: string, value: Record<string, number>) {
  try {
    window.localStorage.setItem(lastReadStorageKey(workspaceId), JSON.stringify(value));
  } catch {
    // Best-effort local read state.
  }
}
