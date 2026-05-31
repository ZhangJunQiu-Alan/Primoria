#!/usr/bin/env tsx

import { mergeAgentMemories } from "../src/components/workspace/workspace-client.tsx";
import type { WorkspaceAgentMemory } from "../src/lib/workspaces/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function memory(overrides: Partial<WorkspaceAgentMemory> = {}): WorkspaceAgentMemory {
  return {
    id: "memory_1",
    workspaceId: "workspace_merge",
    threadId: "thread_merge",
    agentProfileId: "agent_profile_merge",
    scope: "thread",
    title: "Preference",
    summary: "Learner prefers checkpoints.",
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  };
}

function main() {
  const existing = memory();
  const updated = memory({ summary: "Learner prefers one checkpoint.", updatedAt: 5 });
  const archived = memory({ archivedAt: 8, updatedAt: 8 });
  const other = memory({ id: "memory_2", title: "Goal", summary: "Build a course.", createdAt: 2, updatedAt: 3 });

  const merged = mergeAgentMemories([existing], [updated, other]);
  assert(merged.length === 2, "memory merge upserts incoming memories by id");
  assert(merged[0].id === updated.id && merged[0].summary === updated.summary, "memory merge keeps the newest incoming record");

  const afterArchive = mergeAgentMemories([updated, other], [archived]);
  assert(!afterArchive.some((entry) => entry.id === archived.id), "archived incoming memory removes the local visible memory");
  assert(afterArchive.some((entry) => entry.id === other.id), "archiving one memory keeps unrelated memories visible");

  process.stdout.write("[workspace-client-merge.unit] ALL MERGE CHECKS PASSED\n");
}

main();
