#!/usr/bin/env tsx

import {
  createWorkspace,
  createWorkspaceMember,
  createWorkspaceMessage,
  createWorkspaceTask,
  createWorkspaceThread,
  getWorkspaceView,
  joinWorkspace,
  updateWorkspaceTask,
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

  const createdWorkspace = await createWorkspace(null, {
    name: "Unit workspace",
    ownerName: "Unit Owner",
  });
  assert(createdWorkspace.workspace.name === "Unit workspace", "created workspace name");
  assert(createdWorkspace.workspace.inviteCode, "created workspace invite code");
  assert(createdWorkspace.workspaces.some((workspace) => workspace.id === view.workspace.id), "workspace list keeps seed workspace");
  assert(createdWorkspace.workspaces.some((workspace) => workspace.id === createdWorkspace.workspace.id), "workspace list includes created workspace");
  assert(createdWorkspace.threads.some((thread) => thread.type === "room"), "created workspace has room");
  assert(createdWorkspace.members.some((member) => member.displayName === "Primoria Agent"), "created workspace has agent");
  assert(createdWorkspace.messages.length === 1, "created workspace has welcome message");

  const seedAgain = await getWorkspaceView(null, view.workspace.id);
  assert(seedAgain.workspace.id === view.workspace.id, "can switch back to seed workspace");
  const createdAgain = await getWorkspaceView(null, createdWorkspace.workspace.id);
  assert(createdAgain.workspace.id === createdWorkspace.workspace.id, "can switch to created workspace");

  const joined = await joinWorkspace(null, {
    inviteCode: createdWorkspace.workspace.inviteCode ?? "",
    displayName: "Joined User",
  });
  assert(joined.workspace.id === createdWorkspace.workspace.id, "joined workspace by invite code");
  assert(joined.members.some((member) => member.displayName === "Joined User"), "joined member appears");

  const newThread = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "room",
    name: "Unit room",
    description: "test room",
  });
  assert(newThread.type === "room", "created room thread type");

  const newDirect = await createWorkspaceThread(null, {
    workspaceId: createdWorkspace.workspace.id,
    type: "direct",
    name: "Unit direct",
    description: "test direct",
  });
  assert(newDirect.type === "direct", "created direct thread type");

  const member = await createWorkspaceMember(null, {
    workspaceId: createdWorkspace.workspace.id,
    displayName: "Unit Agent",
    role: "AI teammate",
    status: "testing",
  });
  assert(member.displayName === "Unit Agent", "created member name");

  const message = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "workspace unit test message",
    senderName: "Test User",
  });
  assert(message.content === "workspace unit test message", "created message content");
  assert(message.threadId === newThread.id, "created message thread");

  const appMessage = await createWorkspaceMessage(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    content: "workspace unit app card",
    senderName: "Test User",
    artifact: {
      type: "app",
      title: "Unit App",
      description: "test app card",
      primaryAction: "Open app",
      secondaryAction: "Create task",
    },
  });
  assert(appMessage.artifact?.type === "app", "created app artifact message");

  const task = await createWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    threadId: newThread.id,
    title: "Workspace unit task",
    scope: "Private",
    progress: "new",
    assigneeId: member.id,
  });
  assert(task.title === "Workspace unit task", "created task title");
  assert(task.threadId === newThread.id, "created task thread");
  assert(task.assigneeName === "Unit Agent", "created task assignee");

  const updatedTask = await updateWorkspaceTask(null, {
    workspaceId: createdWorkspace.workspace.id,
    taskId: task.id,
    status: "done",
    progress: "submitted",
    resultSummary: "Unit task result submitted.",
  });
  assert(updatedTask.status === "done", "updated task status");
  assert(updatedTask.assigneeId === member.id, "updated task keeps assignee");
  assert(updatedTask.resultSummary === "Unit task result submitted.", "updated task result summary");
  assert(updatedTask.submittedAt, "updated task submitted timestamp");

  const nextView = await getWorkspaceView(null);
  assert(nextView.threads.some((entry) => entry.id === newThread.id), "created thread appears in workspace view");
  assert(nextView.threads.some((entry) => entry.id === newDirect.id), "created direct appears in workspace view");
  assert(nextView.members.some((entry) => entry.id === member.id), "created member appears in workspace view");
  assert(
    nextView.messages.some((entry) => entry.id === message.id && entry.content === message.content),
    "created message appears in workspace view",
  );
  assert(nextView.messages.some((entry) => entry.id === appMessage.id && entry.artifact?.type === "app"), "created app card appears in workspace view");
  assert(
    nextView.tasks.some((entry) => entry.id === task.id && entry.status === "done" && entry.assigneeName === "Unit Agent" && entry.resultSummary),
    "updated assigned task appears in workspace view",
  );
  process.stdout.write("[workspace.unit] ALL UNIT CHECKS PASSED\n");
}

void main().catch((error) => {
  process.stderr.write(`[workspace.unit] FAILED: ${(error as Error).message}\n`);
  process.exit(1);
});
