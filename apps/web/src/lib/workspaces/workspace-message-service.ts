import { randomBytes } from "node:crypto";
import type { CreateWorkspaceMessageInput, WorkspaceMessage, WorkspaceThread } from "./types";

export const MESSAGE_WINDOW_PER_THREAD = 50;

let lastWorkspaceMessageCreatedAt = 0;

export function buildMessage(input: CreateWorkspaceMessageInput, content: string): WorkspaceMessage {
  return {
    id: `wmsg_${randomBytes(10).toString("base64url")}`,
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    senderName: input.senderName?.trim() || "You",
    senderKind: input.senderKind ?? "human",
    content,
    artifact: input.artifact,
    createdAt: nextMessageTimestamp(),
  };
}

export function nextMessageTimestamp() {
  const now = Date.now();
  lastWorkspaceMessageCreatedAt = Math.max(now, lastWorkspaceMessageCreatedAt + 1);
  return lastWorkspaceMessageCreatedAt;
}

export function limitMessagesPerThread(messages: WorkspaceMessage[], limit: number) {
  const byThread = new Map<string, WorkspaceMessage[]>();
  for (const message of messages) {
    const threadMessages = byThread.get(message.threadId) ?? [];
    threadMessages.push(message);
    byThread.set(message.threadId, threadMessages);
  }
  return Array.from(byThread.values())
    .flatMap((threadMessages) => threadMessages.sort((a, b) => a.createdAt - b.createdAt).slice(-limit))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function bumpThread(threads: WorkspaceThread[], threadId: string, updatedAt: number) {
  return threads.map((thread) => (thread.id === threadId ? { ...thread, updatedAt } : thread));
}
