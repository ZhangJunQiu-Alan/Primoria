#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { inArray } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../src/lib/db/client.ts";
import { users } from "../src/lib/db/schema.ts";
import { runMigrations } from "../src/lib/db/migrate.ts";
import {
  createWorkspace,
  createWorkspaceMessage,
  createWorkspaceThread,
  getWorkspaceView,
  joinWorkspace,
} from "../src/lib/workspaces/store.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function loadLocalEnv() {
  const envFile = join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return;
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
  }
}

async function cleanup(userIds: string[]) {
  if (!userIds.length) return;
  await getDb().delete(users).where(inArray(users.id, userIds));
}

async function main() {
  loadLocalEnv();
  if (!hasDatabaseUrl()) {
    process.stdout.write("[workspace.db] SKIPPED: DATABASE_URL is not configured\n");
    return;
  }

  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const ownerId = `test_workspace_owner_${runId}`;
  const joinerId = `test_workspace_joiner_${runId}`;
  const outsiderId = `test_workspace_outsider_${runId}`;
  const userIds = [ownerId, joinerId, outsiderId];

  await cleanup(userIds);
  try {
    await runMigrations();
    await getDb().insert(users).values([
      { id: ownerId, displayName: "Workspace Owner" },
      { id: joinerId, displayName: "Workspace Joiner" },
      { id: outsiderId, displayName: "Workspace Outsider" },
    ]);

    const ownerView = await createWorkspace(ownerId, {
      name: `DB Workspace ${runId}`,
      ownerName: "Workspace Owner",
    });
    assert(ownerView.workspace.inviteCode, "created DB workspace has invite code");

    const joinerView = await joinWorkspace(joinerId, {
      inviteCode: ownerView.workspace.inviteCode ?? "",
      displayName: "Workspace Joiner",
    });
    assert(joinerView.workspace.id === ownerView.workspace.id, "joiner joins workspace by invite code");
    const joinerMember = joinerView.members.find((member) => member.displayName === "Workspace Joiner");
    assert(joinerMember, "joined member exists");

    const outsiderView = await joinWorkspace(outsiderId, {
      inviteCode: ownerView.workspace.inviteCode ?? "",
      displayName: "Workspace Outsider",
    });
    const outsiderMember = outsiderView.members.find((member) => member.displayName === "Workspace Outsider");
    assert(outsiderMember, "outsider joined workspace as non-participant");

    const direct = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "direct",
      name: "Owner and Joiner",
      description: "private DB direct",
      participantIds: [joinerMember.id],
    });
    assert(direct.participantIds?.includes(joinerMember.id), "direct records joiner participant");

    const message = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "private db direct message",
      senderName: "Workspace Owner",
    });
    assert(message.threadId === direct.id, "direct message created");

    const ownerAfter = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(ownerAfter.threads.some((thread) => thread.id === direct.id), "owner sees direct");
    assert(ownerAfter.messages.some((entry) => entry.id === message.id), "owner sees direct message");

    const joinerAfter = await getWorkspaceView(joinerId, ownerView.workspace.id);
    assert(joinerAfter.threads.some((thread) => thread.id === direct.id), "joiner participant sees direct");
    assert(joinerAfter.messages.some((entry) => entry.id === message.id), "joiner participant sees direct message");

    const outsiderAfter = await getWorkspaceView(outsiderId, ownerView.workspace.id);
    assert(!outsiderAfter.threads.some((thread) => thread.id === direct.id), "non-participant does not see direct");
    assert(!outsiderAfter.messages.some((entry) => entry.id === message.id), "non-participant does not see direct message");

    process.stdout.write("[workspace.db] ALL DB CHECKS PASSED\n");
  } finally {
    await cleanup(userIds);
  }
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`[workspace.db] FAILED: ${(error as Error).message}\n`);
    process.exit(1);
  });
