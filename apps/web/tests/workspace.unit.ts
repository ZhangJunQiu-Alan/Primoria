#!/usr/bin/env tsx

import {
  createWorkspaceMessage,
  createWorkspaceTask,
  createWorkspaceThread,
  getWorkspaceView,
} from "../src/lib/workspaces/store.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  const view = await getWorkspaceView(null);
  assert(view.workspace.id, "workspace exists");
  assert(view.threads.some((thread) => thread.type === "room"), "rooms exist");
  assert(view.threads.some((thread) => thread.type === "direct"), "direct chats exist");
  assert(view.messages.length > 0, "seed messages exist");

  const direct = view.threads.find((thread) => thread.type === "direct");
  assert(direct, "direct thread exists");

  const newThread = await createWorkspaceThread(null, {
    workspaceId: view.workspace.id,
    type: "direct",
    name: "Unit direct",
    description: "test direct",
  });
  assert(newThread.type === "direct", "created thread type");

  const message = await createWorkspaceMessage(null, {
    workspaceId: view.workspace.id,
    threadId: newThread.id,
    content: "workspace unit test message",
    senderName: "Test User",
  });
  assert(message.content === "workspace unit test message", "created message content");
  assert(message.threadId === newThread.id, "created message thread");

  const task = await createWorkspaceTask(null, {
    workspaceId: view.workspace.id,
    threadId: newThread.id,
    title: "Workspace unit task",
    scope: "Private",
    progress: "new",
  });
  assert(task.title === "Workspace unit task", "created task title");
  assert(task.threadId === newThread.id, "created task thread");

  const nextView = await getWorkspaceView(null);
  assert(nextView.threads.some((entry) => entry.id === newThread.id), "created thread appears in workspace view");
  assert(
    nextView.messages.some((entry) => entry.id === message.id && entry.content === message.content),
    "created message appears in workspace view",
  );
  assert(nextView.tasks.some((entry) => entry.id === task.id), "created task appears in workspace view");
  process.stdout.write("[workspace.unit] ALL UNIT CHECKS PASSED\n");
}

void main().catch((error) => {
  process.stderr.write(`[workspace.unit] FAILED: ${(error as Error).message}\n`);
  process.exit(1);
});
