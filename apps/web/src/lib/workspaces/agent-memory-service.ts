import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { workspaceAgentMemories, workspaceAgentRuns, workspaceMessages } from "../db/schema";
import type { CreateWorkspaceAgentMemoryInput, WorkspaceAgentMemory, WorkspaceView } from "./types";

export type WorkspaceAgentMemoryServiceContext = {
  requireDbThread(ownerId: string, workspaceId: string, threadId: string): Promise<void>;
};

export function isLocalWorkspaceAgentMemoryVisibleToOwner(memory: WorkspaceAgentMemory, ownerId?: string | null) {
  return memory.scope !== "user" || !memory.userId || memory.userId === (ownerId ?? undefined);
}

export function isDbWorkspaceAgentMemoryVisibleToOwner(memory: typeof workspaceAgentMemories.$inferSelect, ownerId: string | null | undefined) {
  return memory.scope !== "user" || Boolean(ownerId && memory.userId === ownerId);
}

export function rowToWorkspaceAgentMemory(memory: typeof workspaceAgentMemories.$inferSelect): WorkspaceAgentMemory {
  return {
    id: memory.id,
    workspaceId: memory.workspaceId ?? undefined,
    userId: memory.userId ?? undefined,
    threadId: memory.threadId ?? undefined,
    agentProfileId: memory.agentProfileId,
    scope: memory.scope as WorkspaceAgentMemory["scope"],
    title: memory.title,
    summary: memory.summary,
    sourceRunId: memory.sourceRunId ?? undefined,
    sourceMessageId: memory.sourceMessageId ?? undefined,
    createdAt: memory.createdAt.getTime(),
    updatedAt: memory.updatedAt.getTime(),
    archivedAt: memory.archivedAt?.getTime(),
  };
}

export function assertLocalWorkspaceAgentMemorySourceVisibility(view: WorkspaceView, input: CreateWorkspaceAgentMemoryInput) {
  if (input.sourceRunId) {
    const run = view.agentRuns.find((entry) => entry.id === input.sourceRunId && entry.workspaceId === input.workspaceId);
    if (!run) throw new Error("Agent run not found.");
    if (input.scope === "thread" && input.threadId && run.threadId !== input.threadId) throw new Error("Memory source run must belong to the memory thread.");
  }
  if (input.sourceMessageId) {
    const message = view.messages.find((entry) => entry.id === input.sourceMessageId && entry.workspaceId === input.workspaceId);
    if (!message) throw new Error("Message not found.");
    if (input.scope === "thread" && input.threadId && message.threadId !== input.threadId) throw new Error("Memory source message must belong to the memory thread.");
  }
}

export async function assertDbWorkspaceAgentMemorySourceVisibility(
  context: WorkspaceAgentMemoryServiceContext,
  ownerId: string,
  workspaceId: string,
  input: CreateWorkspaceAgentMemoryInput,
) {
  if (input.sourceRunId) {
    const runRows = await getDb()
      .select()
      .from(workspaceAgentRuns)
      .where(and(eq(workspaceAgentRuns.id, input.sourceRunId), eq(workspaceAgentRuns.workspaceId, workspaceId)))
      .limit(1);
    const run = runRows[0];
    if (!run) throw new Error("Agent run not found.");
    await context.requireDbThread(ownerId, workspaceId, run.threadId);
    if (input.scope === "thread" && input.threadId && run.threadId !== input.threadId) throw new Error("Memory source run must belong to the memory thread.");
  }
  if (input.sourceMessageId) {
    const messageRows = await getDb()
      .select()
      .from(workspaceMessages)
      .where(and(eq(workspaceMessages.id, input.sourceMessageId), eq(workspaceMessages.workspaceId, workspaceId)))
      .limit(1);
    const message = messageRows[0];
    if (!message) throw new Error("Message not found.");
    await context.requireDbThread(ownerId, workspaceId, message.threadId);
    if (input.scope === "thread" && input.threadId && message.threadId !== input.threadId) throw new Error("Memory source message must belong to the memory thread.");
  }
}
