import { and, asc, desc, eq } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { copilotChatMessages, copilotChatThreads } from "../db/schema";
import type { CopilotThreadSummary } from "@/lib/copilot-thread-history";

export type CopilotStoredMessage = {
  id: string;
  threadId: string;
  role: string;
  content: string;
  metadata?: unknown;
  createdAt: number;
};

export async function listCopilotThreads(ownerId: string): Promise<CopilotThreadSummary[]> {
  if (!hasDatabaseUrl()) return [];
  const rows = await getDb()
    .select()
    .from(copilotChatThreads)
    .where(eq(copilotChatThreads.ownerId, ownerId))
    .orderBy(desc(copilotChatThreads.updatedAt));
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    preview: row.preview ?? undefined,
    messageCount: row.messageCount,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  }));
}

export async function upsertCopilotThread(ownerId: string, summary: CopilotThreadSummary) {
  if (!hasDatabaseUrl()) return;
  const createdAt = new Date(summary.createdAt);
  const updatedAt = new Date(summary.updatedAt);
  await getDb()
    .insert(copilotChatThreads)
    .values({
      id: summary.id,
      ownerId,
      title: summary.title || "New tutor chat",
      preview: summary.preview ?? null,
      messageCount: summary.messageCount ?? 0,
      createdAt,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: copilotChatThreads.id,
      set: {
        title: summary.title || "New tutor chat",
        preview: summary.preview ?? null,
        messageCount: summary.messageCount ?? 0,
        updatedAt,
      },
    });
}

export async function listCopilotMessages(ownerId: string, threadId: string): Promise<CopilotStoredMessage[]> {
  if (!hasDatabaseUrl()) return [];
  const thread = await getDb()
    .select({ id: copilotChatThreads.id })
    .from(copilotChatThreads)
    .where(and(eq(copilotChatThreads.id, threadId), eq(copilotChatThreads.ownerId, ownerId)))
    .limit(1);
  if (!thread[0]) return [];
  const rows = await getDb()
    .select()
    .from(copilotChatMessages)
    .where(and(eq(copilotChatMessages.threadId, threadId), eq(copilotChatMessages.ownerId, ownerId)))
    .orderBy(asc(copilotChatMessages.createdAt));
  return rows.map((row) => ({
    id: row.id,
    threadId: row.threadId,
    role: row.role,
    content: row.content,
    metadata: row.metadata ?? undefined,
    createdAt: row.createdAt.getTime(),
  }));
}

export async function upsertCopilotMessage(
  ownerId: string,
  threadId: string,
  message: { id: string; role: string; content: string; metadata?: unknown; createdAt?: number },
) {
  if (!hasDatabaseUrl()) return;
  const now = Date.now();
  await upsertCopilotThread(ownerId, {
    id: threadId,
    title: message.role === "user" ? message.content.slice(0, 48) || "New tutor chat" : "New tutor chat",
    preview: message.content.slice(0, 90),
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  });
  await getDb()
    .insert(copilotChatMessages)
    .values({
      id: message.id,
      threadId,
      ownerId,
      role: message.role,
      content: message.content,
      metadata: message.metadata ?? null,
      createdAt: new Date(message.createdAt ?? now),
    })
    .onConflictDoUpdate({
      target: copilotChatMessages.id,
      set: {
        role: message.role,
        content: message.content,
        metadata: message.metadata ?? null,
      },
    });
}
