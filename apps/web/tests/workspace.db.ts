#!/usr/bin/env tsx

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";
import { tool } from "@langchain/core/tools";
import { eq, inArray } from "drizzle-orm";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { z } from "zod";
import { getDb, hasDatabaseUrl } from "../src/lib/db/client.ts";
import { users, workspaceAgentCapabilities } from "../src/lib/db/schema.ts";
import { runMigrations } from "../src/lib/db/migrate.ts";
import {
  archiveWorkspaceAgentMemory,
  archiveWorkspaceAgentMemories,
  cancelWorkspaceAgentRun,
  createWorkspace,
  createWorkspaceAgentConnection,
  createWorkspaceAgentMember,
  createWorkspaceAgentProfile,
  createWorkspaceAgentMemory,
  createWorkspaceMember,
  createWorkspaceMessage,
  createWorkspaceTask,
  createWorkspaceThread,
  deleteWorkspaceAgentMemory,
  decideWorkspaceAgentApproval,
  getWorkspaceAgentRunDetail,
  listWorkspaceAgentMemories,
  getWorkspaceView,
  joinWorkspace,
  listWorkspaceAgentRuns,
  listWorkspaceMessages,
  retryWorkspaceAgentRun,
  restoreWorkspaceAgentMemory,
  runWorkspaceAgentTask,
  runWorkspaceAgentTurn,
  seedWorkspaceAgentRunForTest,
  updateWorkspaceAgentConnection,
  updateWorkspaceThread,
  updateWorkspaceAgentProfile,
  updateWorkspaceTask,
} from "../src/lib/workspaces/store.ts";
import { WorkspaceToolApprovalRequiredError, buildWorkspaceGuardedToolSpecs } from "../src/lib/workspaces/agent-tools.ts";
import {
  buildWorkspaceDeepAgentPersistenceDependencies,
  createDbWorkspaceAgentSkillBackend,
  createWorkspacePostgresDeepAgentPersistenceFactories,
  resumeWorkspaceDeepAgentApproval,
  runWorkspaceDeepAgentStream,
} from "../src/lib/workspaces/agent-runtime.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
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

async function assertRealPostgresDeepAgentPersistenceAdapter(databaseUrl: string) {
  const [checkpointModule, storeModule] = await Promise.all([
    import("@langchain/langgraph-checkpoint-postgres"),
    import("@langchain/langgraph-checkpoint-postgres/store"),
  ]);
  const PostgresSaver = (checkpointModule as any).PostgresSaver;
  const PostgresStore = (storeModule as any).PostgresStore;
  assert(PostgresSaver, "LangGraph PostgresSaver adapter is installed");
  assert(PostgresStore, "LangGraph PostgresStore adapter is installed");
  const factories = createWorkspacePostgresDeepAgentPersistenceFactories({
    PostgresSaver,
    PostgresStore,
    schema: process.env.PRIMORIA_WORKSPACE_DEEPAGENT_POSTGRES_SCHEMA || "public",
  });
  const persistence = buildWorkspaceDeepAgentPersistenceDependencies({
    mode: "postgres",
    databaseUrl,
    interruptOn: {
      create_workspace_task: {
        allowedDecisions: ["approve", "reject"],
        description: "Create task requires workspace approval.",
      },
    },
    ...factories,
  });
  const checkpointer = await persistence.createCheckpointer?.();
  const store = await persistence.createStore?.();
  assert(checkpointer, "real Postgres DeepAgent persistence creates a checkpointer");
  assert(store, "real Postgres DeepAgent persistence creates a store");

  let toolInvoked = false;
  const model = fakeModel()
    .respondWithTools([{ name: "create_workspace_task", args: { title: "DB persisted task" }, id: "db_postgres_tool_call" }])
    .respond(new AIMessage("DB Postgres DeepAgent resumed."));
  const taskTool = tool(
    async () => {
      toolInvoked = true;
      return JSON.stringify({ ok: true, taskId: "db_postgres_task" });
    },
    {
      name: "create_workspace_task",
      description: "Create a workspace task after approval.",
      schema: z.object({ title: z.string() }),
    },
  );
  const agent = await createDeepAgent({
    model,
    tools: [taskTool],
    systemPrompt: "Use the task tool when asked.",
    interruptOn: {
      create_workspace_task: {
        allowedDecisions: ["approve", "reject"],
        description: "Create task requires workspace approval.",
      },
    },
    checkpointer,
    store,
    backend: new FilesystemBackend({ rootDir: process.cwd(), virtualMode: true }),
  });
  const runtimeInput = {
    config: {
      name: "db-postgres-deepagent",
      model: "fake",
      tools: [
        {
          name: "create_workspace_task",
          description: "Create a workspace task after approval.",
          policy: {
            toolName: "create_workspace_task",
            visibleLabel: "Create task",
            risk: "write",
            approval: "always",
          },
        },
      ],
      systemPrompt: "Use the task tool when asked.",
      skills: [],
      subagents: [],
      interruptOn: {
        create_workspace_task: {
          allowedDecisions: ["approve", "reject"],
          description: "Create task requires workspace approval.",
        },
      },
    },
    context: {
      workspaceName: "DB Postgres DeepAgent Workspace",
      thread: {
        id: "db_postgres_thread",
        workspaceId: "db_postgres_workspace",
        type: "room",
        name: "DB Postgres Room",
        createdAt: 1,
        updatedAt: 1,
      },
      member: {
        id: "db_postgres_agent_member",
        workspaceId: "db_postgres_workspace",
        displayName: "DB Postgres Agent",
        role: "Agent",
        agentProfileId: "db_postgres_agent_profile",
      },
      recentMessages: [],
      openTasks: [],
    },
    threadId: `db-postgres-deepagent-${Date.now()}`,
    prompt: "Create a persisted task.",
    profile: {
      id: "db_postgres_agent_profile",
      workspaceId: "db_postgres_workspace",
      ownerId: "db_postgres_owner",
      displayName: "DB Postgres Agent",
      handle: "db-postgres-agent",
      description: "Exercises real Postgres DeepAgent approval resume.",
      visibility: "workspace",
      systemPrompt: "Use the task tool when asked.",
      memoryScope: "thread",
      capabilities: [],
      createdAt: 1,
      updatedAt: 1,
    },
    member: {
      id: "db_postgres_agent_member",
      workspaceId: "db_postgres_workspace",
      displayName: "DB Postgres Agent",
      role: "Agent",
      agentProfileId: "db_postgres_agent_profile",
    },
  };
  const waiting = await runWorkspaceDeepAgentStream(agent as any, runtimeInput as any);
  assert(waiting.status === "waiting_for_approval", "real Postgres DeepAgent checkpointer persists a HITL interrupt");
  assert(toolInvoked === false, "real Postgres DeepAgent does not execute the gated tool before approval");
  const resumed = await resumeWorkspaceDeepAgentApproval(
    agent as any,
    {
      id: "db_postgres_approval",
      workspaceId: "db_postgres_workspace",
      threadId: "db_postgres_thread",
      runId: "db_postgres_run",
      agentProfileId: "db_postgres_agent_profile",
      agentMemberId: "db_postgres_agent_member",
      toolName: "create_workspace_task",
      status: "pending",
      input: { title: "DB persisted task" },
      policy: { visibleLabel: "Create task" },
      deepAgentThreadId: runtimeInput.threadId,
      requestedAt: Date.now(),
    },
    "approved",
    runtimeInput as any,
  );
  assert(toolInvoked, "real Postgres DeepAgent approval resume executes the interrupted tool");
  assert(resumed.content === "DB Postgres DeepAgent resumed.", "real Postgres DeepAgent approval resume returns the final model response");
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
    await assertRealPostgresDeepAgentPersistenceAdapter(process.env.DATABASE_URL!);
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
    const ownerMember = ownerView.members.find((member) => member.displayName === "Workspace Owner");
    assert(ownerMember, "owner member exists");
    assert(direct.participantIds?.includes(ownerMember.id), "direct records owner participant");

    const message = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "private db direct message",
      senderName: "Workspace Owner",
    });
    assert(message.threadId === direct.id, "direct message created");

    const agent = await createWorkspaceMember(ownerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Agent",
      role: "Agent",
      status: "active",
    });
    const agentMessage = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Agent please handle this DB direct thread?",
      senderName: "Workspace Owner",
    });
    const agentTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: agentMessage,
    });
    assert(agentTurn.messages.length === 1, "DB agent mention creates response");

    const agentTask = await createWorkspaceTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      title: "DB agent task",
      assigneeId: agent.id,
    });
    const agentTaskRun = await runWorkspaceAgentTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      task: agentTask,
    });
    assert(agentTaskRun.task?.status === "done", "DB agent task run completes assigned task");
    assert(agentTaskRun.events.some((event) => event.type === "status" && event.label === "runtime_configured"), "DB agent task run records runtime event");
    assert(agentTaskRun.artifacts?.some((artifact) => artifact.sourceRunId === agentTaskRun.runs[0].id && artifact.kind === "task_result"), "DB agent task run returns first-class task result artifact for client merge");
    const dbTaskResultArtifact = agentTaskRun.artifacts?.find((artifact) => artifact.sourceRunId === agentTaskRun.runs[0].id && artifact.kind === "task_result");
    assert(dbTaskResultArtifact, "DB agent task run returns a task result artifact record");
    assert(dbTaskResultArtifact.reviewStatus === "needs_review", "DB task result artifacts default to needs_review");
    let outsiderRejectedHiddenArtifactReviewTask = false;
    const publicThread = ownerView.threads.find((thread) => thread.type === "room");
    assert(publicThread, "DB workspace has a public room for source-artifact visibility checks");
    try {
      await createWorkspaceTask(outsiderId, {
        workspaceId: ownerView.workspace.id,
        threadId: publicThread.id,
        title: "Attach hidden direct artifact",
        sourceArtifactId: dbTaskResultArtifact.id,
        sourceRunId: dbTaskResultArtifact.sourceRunId,
      });
    } catch (error) {
      outsiderRejectedHiddenArtifactReviewTask = error instanceof Error && error.message.includes("Thread not found");
    }
    assert(outsiderRejectedHiddenArtifactReviewTask, "DB non-participant cannot create a review task linked to a hidden direct artifact");
    const dbArtifactReviewTask = await createWorkspaceTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      title: `Review ${dbTaskResultArtifact.title}`,
      scope: "Task result",
      progress: "new",
      sourceArtifactId: dbTaskResultArtifact.id,
      sourceRunId: dbTaskResultArtifact.sourceRunId,
    });
    assert(dbArtifactReviewTask.sourceArtifactId === dbTaskResultArtifact.id, "DB artifact review task keeps source artifact id");
    assert(dbArtifactReviewTask.sourceRunId === dbTaskResultArtifact.sourceRunId, "DB artifact review task keeps source run id");

    const dbReopenCandidate = await createWorkspaceTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      title: "DB task reopen clears stale result",
      assigneeId: agent.id,
    });
    const dbSubmittedReopenCandidate = await updateWorkspaceTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      taskId: dbReopenCandidate.id,
      status: "done",
      progress: "submitted",
      resultSummary: "DB result should not survive reopen.",
    });
    assert(dbSubmittedReopenCandidate.submittedAt, "DB submitted reopen candidate records submitted timestamp");
    const dbReopenedTask = await updateWorkspaceTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      taskId: dbReopenCandidate.id,
      status: "open",
      progress: "needs another DB attempt",
    });
    assert(dbReopenedTask.status === "open", "DB reopened task is open");
    assert(dbReopenedTask.progress === "needs another DB attempt", "DB reopened task keeps new progress");
    assert(!dbReopenedTask.resultSummary, "DB reopened task clears stale result summary");
    assert(!dbReopenedTask.submittedAt, "DB reopened task clears stale submitted timestamp");
    let rejectedMissingAgentProfileMember = false;
    try {
      await createWorkspaceMember(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Orphan Agent Member",
        role: "Agent",
        agentProfileId: "wagent_missing_member_profile",
      });
    } catch (error) {
      rejectedMissingAgentProfileMember = error instanceof Error && error.message.includes("Agent profile not found");
    }
    assert(rejectedMissingAgentProfileMember, "DB member creation rejects missing agent profile references before persistence");

    const coachProfile = await createWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      templateKey: "socratic-coach",
      displayName: "DB Coach",
    });
    const duplicateCoachProfile = await createWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      templateKey: "socratic-coach",
      displayName: "DB Coach",
    });
    assert(duplicateCoachProfile.id === coachProfile.id, "DB default template agents reuse the existing workspace profile");
    const firstCoachMemberForDedupe = await createWorkspaceAgentMember(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: coachProfile.id,
    });
    const duplicateCoachMemberForDedupe = await createWorkspaceAgentMember(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: coachProfile.id,
    });
    assert(duplicateCoachMemberForDedupe.id === firstCoachMemberForDedupe.id, "DB adding the same agent profile to a workspace is idempotent");
    assert(coachProfile.capabilities.some((capability) => capability.kind === "skill"), "DB agent profile inherits capabilities");
    const customizedCoachProfile = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: coachProfile.id,
      displayName: "DB Learning Guide",
      description: "Custom DB guide",
      systemPrompt: "Guide DB learners with short questions and explicit checkpoints.",
      memoryScope: "workspace",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
        { kind: "internal_tool", toolName: "create_workspace_task", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "update_workspace_task", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "share_learning_app", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "render_interactive_widget", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "generate_course", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "save_agent_memory", approval: "always", enabled: true },
      ],
    });
    assert(customizedCoachProfile.id === coachProfile.id, "DB updated agent profile keeps identity");
    assert(customizedCoachProfile.handle === "db-coach", "DB updated agent profile keeps stable handle");
    assert(customizedCoachProfile.displayName === "DB Learning Guide", "DB updated agent profile changes display name");
    assert(customizedCoachProfile.capabilities.length === 8, "DB updated agent profile replaces capabilities");
    const customProfile = await createWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Maker",
      description: "Builds custom DB learning artifacts",
      systemPrompt: "Help DB users turn goals into concrete learning artifacts.",
      visibility: "private",
      memoryScope: "none",
      capabilities: [
        { kind: "skill", source: "workspace", path: `/workspace-skills/${ownerView.workspace.id}/db-custom-maker`, enabled: true },
        { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      ],
    });
    assert(!customProfile.templateKey, "DB custom agent profile does not require a template");
    assert(customProfile.visibility === "private", "DB custom agent profile keeps visibility");
    assert(customProfile.memoryScope === "none", "DB custom agent profile keeps memory scope");
    assert(customProfile.capabilities.some((capability) => capability.kind === "skill" && capability.source === "workspace"), "DB custom agent profile stores portable workspace skill");
    let rejectedSystemSkillWithWorkspacePath = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Bad System Skill Agent",
        description: "Should not persist mismatched skill source.",
        systemPrompt: "Help only when configured.",
        capabilities: [
          { kind: "skill", source: "system", path: `/workspace-skills/${ownerView.workspace.id}/wrong-source`, enabled: true },
        ],
      });
    } catch (error) {
      rejectedSystemSkillWithWorkspacePath = error instanceof Error && error.message.includes("Skill source");
    }
    assert(rejectedSystemSkillWithWorkspacePath, "DB agent profile rejects system skill capabilities with workspace portable paths");
    let rejectedUnknownSystemSkill = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Bad Unknown System Skill Agent",
        description: "Should not persist system skills that are not in the supported skill pack.",
        systemPrompt: "Help only when configured.",
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/not-a-real-system-skill", enabled: true },
        ],
      });
    } catch (error) {
      rejectedUnknownSystemSkill = error instanceof Error && error.message.includes("System skill not found");
    }
    assert(rejectedUnknownSystemSkill, "DB agent profile rejects unknown system skill capabilities before persistence");
    let rejectedUserSkillWithSystemPath = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Bad User Skill Agent",
        description: "Should not persist system paths as user skills.",
        systemPrompt: "Help only when configured.",
        capabilities: [
          { kind: "skill", source: "user", path: "/skills/db-custom-maker", enabled: true },
        ],
      });
    } catch (error) {
      rejectedUserSkillWithSystemPath = error instanceof Error && error.message.includes("Skill source");
    }
    assert(rejectedUserSkillWithSystemPath, "DB agent profile rejects user skill capabilities that are not user portable ids");
    let rejectedWorkspaceSkillWrongScope = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        capabilities: [
          { kind: "skill", source: "workspace", path: "/workspace-skills/other_workspace/wrong-scope", enabled: true },
        ],
      });
    } catch (error) {
      rejectedWorkspaceSkillWrongScope = error instanceof Error && error.message.includes("Skill source");
    }
    assert(rejectedWorkspaceSkillWrongScope, "DB agent profile update rejects workspace skill paths outside the current workspace scope");
    let rejectedUnknownSystemSkillUpdate = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/not-a-real-system-skill", enabled: true },
        ],
      });
    } catch (error) {
      rejectedUnknownSystemSkillUpdate = error instanceof Error && error.message.includes("System skill not found");
    }
    assert(rejectedUnknownSystemSkillUpdate, "DB agent profile update rejects unknown system skill capabilities before persistence");
    let rejectedMissingDelegateAgent = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Missing Delegate Agent",
        description: "Should not persist delegate ids that cannot be resolved.",
        systemPrompt: "Delegate only to real agents.",
        capabilities: [
          { kind: "subagent", agentProfileId: "wagent_missing_delegate", enabled: true },
        ],
      });
    } catch (error) {
      rejectedMissingDelegateAgent = error instanceof Error && error.message.includes("Agent profile not found");
    }
    assert(rejectedMissingDelegateAgent, "DB agent profile rejects subagent capabilities pointing at missing profiles");
    let rejectedSelfDelegateAgent = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        capabilities: [
          { kind: "subagent", agentProfileId: customProfile.id, enabled: true },
        ],
      });
    } catch (error) {
      rejectedSelfDelegateAgent = error instanceof Error && error.message.includes("delegate to itself");
    }
    assert(rejectedSelfDelegateAgent, "DB agent profile rejects self-delegating subagent capabilities");
    let rejectedUnknownInternalTool = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Unsafe Tool Agent",
        description: "Should not persist unknown tools.",
        systemPrompt: "Help only when configured.",
        capabilities: [
          { kind: "internal_tool", toolName: "run_shell_command", approval: "always", enabled: true },
        ],
      });
    } catch (error) {
      rejectedUnknownInternalTool = error instanceof Error && error.message.includes("Unknown internal tool");
    }
    assert(rejectedUnknownInternalTool, "DB agent profile rejects unknown internal tool capabilities before persistence");
    let rejectedUnknownInternalToolUpdate = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        capabilities: [
          { kind: "internal_tool", toolName: "execute_code", approval: "always", enabled: true },
        ],
      });
    } catch (error) {
      rejectedUnknownInternalToolUpdate = error instanceof Error && error.message.includes("Unknown internal tool");
    }
    assert(rejectedUnknownInternalToolUpdate, "DB agent profile update rejects unknown internal tool capabilities before persistence");
    let rejectedAlwaysToolDowngrade = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Downgraded Memory Agent",
        description: "Should not downgrade memory approval.",
        systemPrompt: "Help only when configured.",
        capabilities: [
          { kind: "internal_tool", toolName: "save_agent_memory", approval: "on_risk", enabled: true },
        ],
      });
    } catch (error) {
      rejectedAlwaysToolDowngrade = error instanceof Error && error.message.includes("approval");
    }
    assert(rejectedAlwaysToolDowngrade, "DB agent profile rejects downgrading always-approval internal tools");
    let rejectedOnRiskToolDowngrade = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        capabilities: [
          { kind: "internal_tool", toolName: "generate_course", approval: "never", enabled: true },
        ],
      });
    } catch (error) {
      rejectedOnRiskToolDowngrade = error instanceof Error && error.message.includes("approval");
    }
    assert(rejectedOnRiskToolDowngrade, "DB agent profile update rejects downgrading on-risk internal tools to never");
    let rejectedMissingCustomPurpose = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB No Purpose Agent",
        systemPrompt: "Help only when configured.",
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
        ],
      });
    } catch (error) {
      rejectedMissingCustomPurpose = error instanceof Error && error.message.includes("purpose");
    }
    assert(rejectedMissingCustomPurpose, "DB custom agent profile requires an explicit purpose instead of using fallback copy");
    let rejectedMissingCustomBehavior = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB No Behavior Agent",
        description: "Has a purpose but no behavior.",
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
        ],
      });
    } catch (error) {
      rejectedMissingCustomBehavior = error instanceof Error && error.message.includes("behavior");
    }
    assert(rejectedMissingCustomBehavior, "DB custom agent profile requires explicit behavior instructions instead of using fallback prompt");
    let rejectedBlankCustomPurposeUpdate = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        description: " ",
      });
    } catch (error) {
      rejectedBlankCustomPurposeUpdate = error instanceof Error && error.message.includes("purpose");
    }
    assert(rejectedBlankCustomPurposeUpdate, "DB agent profile update rejects blank purpose text");
    let rejectedBlankCustomBehaviorUpdate = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        systemPrompt: " ",
      });
    } catch (error) {
      rejectedBlankCustomBehaviorUpdate = error instanceof Error && error.message.includes("behavior");
    }
    assert(rejectedBlankCustomBehaviorUpdate, "DB agent profile update rejects blank behavior text");
    let rejectedLongCustomPurpose = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Long Purpose Agent",
        description: "Purpose ".repeat(80),
        systemPrompt: "Help only when configured.",
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
        ],
      });
    } catch (error) {
      rejectedLongCustomPurpose = error instanceof Error && error.message.includes("purpose");
    }
    assert(rejectedLongCustomPurpose, "DB custom agent profile rejects overlong purpose text at the store layer");
    let rejectedLongCustomBehavior = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        systemPrompt: "Behavior ".repeat(800),
      });
    } catch (error) {
      rejectedLongCustomBehavior = error instanceof Error && error.message.includes("behavior");
    }
    assert(rejectedLongCustomBehavior, "DB agent profile update rejects overlong behavior text at the store layer");
    let rejectedEmptyCustomAgent = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Empty Agent",
        description: "Should not be runnable without explicit capabilities.",
        systemPrompt: "Help only when configured.",
        capabilities: [],
      });
    } catch (error) {
      rejectedEmptyCustomAgent = error instanceof Error && error.message.includes("at least one");
    }
    assert(rejectedEmptyCustomAgent, "DB custom agent profile rejects empty capabilities instead of inventing a fake skill");
    let rejectedDisabledOnlyCustomAgent = false;
    try {
      await updateWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        capabilities: [
          { kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: false },
        ],
      });
    } catch (error) {
      rejectedDisabledOnlyCustomAgent = error instanceof Error && error.message.includes("at least one");
    }
    assert(rejectedDisabledOnlyCustomAgent, "DB agent profile update rejects disabled-only capabilities");

    let joinerRejectedWorkspaceConnectionCreate = false;
    try {
      await createWorkspaceAgentConnection(joinerId, {
        workspaceId: ownerView.workspace.id,
        scope: "workspace",
        displayName: "DB Joiner Workspace Sources",
        transport: "http",
        configRef: "connection://db-joiner-workspace-sources",
        allowedToolNames: ["search_sources"],
      });
    } catch (error) {
      joinerRejectedWorkspaceConnectionCreate = error instanceof Error && error.message.includes("owner");
    }
    assert(joinerRejectedWorkspaceConnectionCreate, "DB non-owner workspace member cannot create workspace-scoped agent connections");

    const workspaceConnection = await createWorkspaceAgentConnection(ownerId, {
      workspaceId: ownerView.workspace.id,
      scope: "workspace",
      displayName: "DB Workspace Sources",
      transport: "http",
      configRef: "connection://db-workspace-sources",
      allowedToolNames: ["workspace_search"],
    });
    assert(workspaceConnection.scope === "workspace", "DB workspace owner can create workspace-scoped agent connections");

    const userConnection = await createWorkspaceAgentConnection(ownerId, {
      workspaceId: ownerView.workspace.id,
      scope: "user",
      displayName: "DB Personal Sources",
      transport: "http",
      configRef: "connection://db-personal-sources",
      allowedToolNames: ["search_sources", "search_sources"],
    });
    assert(userConnection.allowedToolNames.length === 1, "DB connection normalizes duplicate tool names");
    const disabledUserConnection = await updateWorkspaceAgentConnection(ownerId, {
      workspaceId: ownerView.workspace.id,
      connectionId: userConnection.id,
      status: "disabled",
    });
    assert(disabledUserConnection.status === "disabled", "DB connection can be disabled without deleting history");
    let rejectedDisabledConnectionCapability = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Disabled Connected Researcher",
        description: "Should not use disabled connections.",
        systemPrompt: "Do research.",
        capabilities: [
          { kind: "mcp_tool", connectionId: userConnection.id, toolName: "search_sources", approval: "always", enabled: true },
        ],
      });
    } catch (error) {
      rejectedDisabledConnectionCapability = error instanceof Error && error.message.includes("not found");
    }
    assert(rejectedDisabledConnectionCapability, "DB disabled connections cannot be allowlisted by new agent profiles");
    const reenabledUserConnection = await updateWorkspaceAgentConnection(ownerId, {
      workspaceId: ownerView.workspace.id,
      connectionId: userConnection.id,
      status: "available",
    });
    assert(reenabledUserConnection.status === "available", "DB disabled connection can be re-enabled from the registry");
    const mcpProfile = await createWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Connected Researcher",
      description: "Uses an approved personal connection after explicit allowlisting.",
      systemPrompt: "Use connected tools only when the user asks for sourced research.",
      memoryScope: "thread",
      capabilities: [
        { kind: "mcp_tool", connectionId: userConnection.id, toolName: "search_sources", approval: "always", enabled: true },
      ],
    });
    assert(
      mcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === userConnection.id && capability.approval === "always"),
      "DB agent profile can allowlist a real personal connection tool",
    );
    const joinerPersonalConnection = await createWorkspaceAgentConnection(joinerId, {
      workspaceId: ownerView.workspace.id,
      scope: "user",
      displayName: "DB Joiner Private Sources",
      transport: "http",
      configRef: "connection://db-joiner-private-sources",
      allowedToolNames: ["joiner_lookup"],
    });
    const joinerPrivateDelegateProfile = await createWorkspaceAgentProfile(joinerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Joiner Private Delegate",
      description: "Private delegate owned by the joiner.",
      systemPrompt: "Help the owner privately.",
      visibility: "private",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
      ],
    });
    const joinerSharedMcpProfile = await createWorkspaceAgentProfile(joinerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Joiner Connected Helper",
      description: "A shared helper with private owner-only capabilities.",
      systemPrompt: "Use private capabilities only when their owner runs this helper.",
      visibility: "workspace",
      capabilities: [
        { kind: "mcp_tool", connectionId: joinerPersonalConnection.id, toolName: "joiner_lookup", approval: "always", enabled: true },
        { kind: "subagent", agentProfileId: joinerPrivateDelegateProfile.id, enabled: true },
      ],
    });
    assert(
      joinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === joinerPersonalConnection.id),
      "DB profile owner can allowlist their own personal connection on a workspace-shared agent",
    );
    assert(
      joinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === joinerPrivateDelegateProfile.id),
      "DB profile owner can delegate a workspace-shared agent to their own private saved agent",
    );
    const ownerViewAfterJoinerConnection = await getWorkspaceView(ownerId, ownerView.workspace.id);
    const ownerVisibleJoinerSharedMcpProfile = ownerViewAfterJoinerConnection.agentProfiles.find((profile) => profile.id === joinerSharedMcpProfile.id);
    assert(ownerVisibleJoinerSharedMcpProfile, "DB workspace owner sees another member's workspace-shared agent profile");
    assert(!ownerViewAfterJoinerConnection.agentConnections.some((connection) => connection.id === joinerPersonalConnection.id), "DB workspace owner does not see another member's personal agent connection");
    assert(!ownerViewAfterJoinerConnection.agentProfiles.some((profile) => profile.id === joinerPrivateDelegateProfile.id), "DB workspace owner does not see another member's private delegate profile");
    assert(
      !ownerVisibleJoinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === joinerPersonalConnection.id),
      "DB workspace owner view hides mcp_tool metadata for another member's personal connection",
    );
    assert(
      !ownerVisibleJoinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === joinerPrivateDelegateProfile.id),
      "DB workspace owner view hides subagent capability metadata for another member's private delegate",
    );
    const ownerEditedJoinerSharedMcpProfile = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: joinerSharedMcpProfile.id,
      displayName: "DB Owner Renamed Joiner Helper",
    });
    assert(
      !ownerEditedJoinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === joinerPersonalConnection.id),
      "DB workspace owner edit response does not leak another member's personal connection capability metadata",
    );
    assert(
      !ownerEditedJoinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === joinerPrivateDelegateProfile.id),
      "DB workspace owner edit response does not leak another member's private delegate capability metadata",
    );
    const ownerReconfiguredJoinerSharedMcpProfile = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: joinerSharedMcpProfile.id,
      description: "Owner added visible planning behavior without seeing the private connection.",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
      ],
    });
    assert(
      ownerReconfiguredJoinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "skill" && capability.path === "/skills/project-breakdown"),
      "DB workspace owner edit response includes visible capability changes",
    );
    assert(
      !ownerReconfiguredJoinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === joinerPersonalConnection.id),
      "DB workspace owner visible capability edit still does not leak another member's personal connection metadata",
    );
    assert(
      !ownerReconfiguredJoinerSharedMcpProfile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === joinerPrivateDelegateProfile.id),
      "DB workspace owner visible capability edit still does not leak another member's private delegate metadata",
    );
    const joinerViewAfterOwnerCapabilityEdit = await getWorkspaceView(joinerId, ownerView.workspace.id);
    const joinerVisibleOwnSharedMcpProfile = joinerViewAfterOwnerCapabilityEdit.agentProfiles.find((profile) => profile.id === joinerSharedMcpProfile.id);
    assert(joinerVisibleOwnSharedMcpProfile, "DB profile owner still sees their workspace-shared connected agent after owner edit");
    assert(
      joinerVisibleOwnSharedMcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === joinerPersonalConnection.id),
      "DB workspace owner visible capability edit preserves hidden personal connection capability for its owner",
    );
    assert(
      joinerVisibleOwnSharedMcpProfile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === joinerPrivateDelegateProfile.id),
      "DB workspace owner visible capability edit preserves hidden private delegate capability for its owner",
    );
    let rejectedConnectionApprovalDowngrade = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Unsafe Connected Researcher",
        description: "Should not use external tools without approval.",
        systemPrompt: "Do research.",
        capabilities: [
          { kind: "mcp_tool", connectionId: userConnection.id, toolName: "search_sources", approval: "never", enabled: true },
        ],
      });
    } catch (error) {
      rejectedConnectionApprovalDowngrade = error instanceof Error && error.message.includes("approval");
    }
    assert(rejectedConnectionApprovalDowngrade, "DB agent profile rejects external connection tools without always approval");
    let joinerRejectedPersonalConnectionUpdate = false;
    try {
      await updateWorkspaceAgentConnection(joinerId, {
        workspaceId: ownerView.workspace.id,
        connectionId: userConnection.id,
        status: "disabled",
      });
    } catch (error) {
      joinerRejectedPersonalConnectionUpdate = error instanceof Error && error.message.includes("not found");
    }
    assert(joinerRejectedPersonalConnectionUpdate, "DB joiner cannot manage another user's personal agent connection");
    let joinerRejectedWorkspaceConnectionUpdate = false;
    try {
      await updateWorkspaceAgentConnection(joinerId, {
        workspaceId: ownerView.workspace.id,
        connectionId: workspaceConnection.id,
        status: "disabled",
      });
    } catch (error) {
      joinerRejectedWorkspaceConnectionUpdate = error instanceof Error && error.message.includes("owner");
    }
    assert(joinerRejectedWorkspaceConnectionUpdate, "DB non-owner workspace member cannot manage workspace-scoped agent connections");
    let rejectedUnknownConnectionTool = false;
    try {
      await createWorkspaceAgentProfile(ownerId, {
        workspaceId: ownerView.workspace.id,
        displayName: "DB Bad Connected Researcher",
        description: "Should not persist an unallowlisted connection tool.",
        systemPrompt: "Do research.",
        capabilities: [
          { kind: "mcp_tool", connectionId: userConnection.id, toolName: "write_sources", approval: "always", enabled: true },
        ],
      });
    } catch (error) {
      rejectedUnknownConnectionTool = error instanceof Error && error.message.includes("not allowed");
    }
    assert(rejectedUnknownConnectionTool, "DB agent profile rejects mcp_tool capabilities not allowlisted by the connection");

    const secondOwnerWorkspace = await createWorkspace(ownerId, {
      name: `DB Second Workspace ${runId}`,
      ownerName: "Workspace Owner",
    });
    const secondOwnerView = await getWorkspaceView(ownerId, secondOwnerWorkspace.workspace.id);
    assert(
      secondOwnerView.agentProfiles.some((profile) => profile.id === customProfile.id && profile.workspaceId === ownerView.workspace.id && profile.visibility === "private"),
      "DB owner sees personal agent profile in saved-agent library across workspaces",
    );
    const reusedPersonalAgent = await createWorkspaceAgentMember(ownerId, {
      workspaceId: secondOwnerWorkspace.workspace.id,
      profileId: customProfile.id,
    });
    assert(reusedPersonalAgent.agentProfileId === customProfile.id, "DB saved personal agent can be added to another workspace without cloning");
    const secondWorkspaceJoiner = await joinWorkspace(joinerId, {
      inviteCode: secondOwnerWorkspace.workspace.inviteCode ?? secondOwnerWorkspace.workspace.id,
      displayName: "DB Second Workspace Collaborator",
    });
    assert(secondWorkspaceJoiner.workspace.id === secondOwnerWorkspace.workspace.id, "DB joiner can join second workspace for personal-agent visibility regression");
    const secondJoinerAfterPersonalAgentAdd = await getWorkspaceView(joinerId, secondOwnerWorkspace.workspace.id);
    assert(
      secondJoinerAfterPersonalAgentAdd.members.some((member) => member.agentProfileId === customProfile.id),
      "DB collaborator sees the reused personal agent as a workspace member",
    );
    assert(
      secondJoinerAfterPersonalAgentAdd.agentProfiles.some((profile) => profile.id === customProfile.id && profile.visibility === "private"),
      "DB collaborator sees the private personal agent profile after it participates as a member in that workspace",
    );
    const renamedPersonalAgentFromSecondWorkspace = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: secondOwnerWorkspace.workspace.id,
      profileId: customProfile.id,
      displayName: "DB Maker Everywhere",
      description: "Edited from a second DB workspace.",
      capabilities: customProfile.capabilities.map((capability) => {
        if (capability.kind === "skill") return { kind: "skill", source: capability.source, path: capability.path, enabled: capability.enabled };
        if (capability.kind === "internal_tool") return { kind: "internal_tool", toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
        if (capability.kind === "mcp_tool") return { kind: "mcp_tool", connectionId: capability.connectionId, toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
        return { kind: "subagent", agentProfileId: capability.agentProfileId, enabled: capability.enabled };
      }),
    });
    assert(renamedPersonalAgentFromSecondWorkspace.displayName === "DB Maker Everywhere", "DB personal agent can be edited from another workspace");
    const secondOwnerAfterAgent = await getWorkspaceView(ownerId, secondOwnerWorkspace.workspace.id);
    assert(
      secondOwnerAfterAgent.members.some((member) => member.id === reusedPersonalAgent.id && member.agentProfileId === customProfile.id && member.displayName === "DB Maker Everywhere"),
      "DB second workspace updates reused personal agent member name after cross-workspace edit",
    );
    const ownerViewAfterPersonalEdit = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(
      ownerViewAfterPersonalEdit.agentProfiles.some((profile) => profile.id === customProfile.id && profile.displayName === "DB Maker Everywhere"),
      "DB cross-workspace personal agent edit persists to the original profile record",
    );
    const joinerAfterPersonalEdit = await getWorkspaceView(joinerId, ownerView.workspace.id);
    assert(
      !joinerAfterPersonalEdit.agentProfiles.some((profile) => profile.id === customProfile.id),
      "DB joiner does not see another user's private saved agent before it is added as a workspace member",
    );
    let joinerRejectedPrivateAgentAdd = false;
    try {
      await createWorkspaceAgentMember(joinerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
      });
    } catch (error) {
      joinerRejectedPrivateAgentAdd = error instanceof Error && error.message.includes("Agent profile not found");
    }
    assert(joinerRejectedPrivateAgentAdd, "DB joiner cannot add another user's private saved agent by profile id");
    let joinerRejectedPrivateAgentEdit = false;
    try {
      await updateWorkspaceAgentProfile(joinerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customProfile.id,
        displayName: "DB Stolen Maker",
      });
    } catch (error) {
      joinerRejectedPrivateAgentEdit = error instanceof Error && error.message.includes("Agent profile not found");
    }
    assert(joinerRejectedPrivateAgentEdit, "DB joiner cannot edit another user's private saved agent by profile id");
    let joinerRejectedWorkspaceAgentEdit = false;
    try {
      await updateWorkspaceAgentProfile(joinerId, {
        workspaceId: ownerView.workspace.id,
        profileId: customizedCoachProfile.id,
        displayName: "DB Hijacked Learning Guide",
        capabilities: [
          { kind: "skill", source: "system", path: "/skills/source-grounded-research", enabled: true },
        ],
      });
    } catch (error) {
      joinerRejectedWorkspaceAgentEdit = error instanceof Error && error.message.includes("owner");
    }
    assert(joinerRejectedWorkspaceAgentEdit, "DB workspace members cannot edit another user's shared workspace agent profile by id");
    const joinerOwnedWorkspaceProfile = await createWorkspaceAgentProfile(joinerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Joiner Owned Agent",
      description: "A collaborator-owned workspace agent for permission checks.",
      systemPrompt: "Help with collaborator-owned workspace tasks.",
      visibility: "workspace",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
      ],
    });
    const ownerManagedJoinerProfile = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: joinerOwnedWorkspaceProfile.id,
      displayName: "DB Owner Managed Joiner Agent",
      description: "Workspace owner may manage this shared agent without taking ownership.",
      systemPrompt: "Keep the profile owner stable when workspace owner updates capability policy.",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
      ],
    });
    assert(ownerManagedJoinerProfile.ownerId === joinerId, "DB workspace owner edit does not change shared profile owner");
    const ownerManagedJoinerCapabilityRows = await getDb()
      .select({ ownerId: workspaceAgentCapabilities.ownerId })
      .from(workspaceAgentCapabilities)
      .where(eq(workspaceAgentCapabilities.profileId, joinerOwnedWorkspaceProfile.id));
    assert(
      ownerManagedJoinerCapabilityRows.length > 0 && ownerManagedJoinerCapabilityRows.every((row) => row.ownerId === joinerId),
      "DB workspace owner edit keeps capability rows owned by the profile owner for audit",
    );
    let joinerRejectedPrivateDelegateCapability = false;
    try {
      await updateWorkspaceAgentProfile(joinerId, {
        workspaceId: ownerView.workspace.id,
        profileId: joinerOwnedWorkspaceProfile.id,
        capabilities: [
          { kind: "subagent", agentProfileId: customProfile.id, enabled: true },
        ],
      });
    } catch (error) {
      joinerRejectedPrivateDelegateCapability = error instanceof Error && error.message.includes("Agent profile not found");
    }
    assert(joinerRejectedPrivateDelegateCapability, "DB joiner cannot smuggle another user's private saved agent as a delegate capability");

    const delegatedCoachProfile = await updateWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: customizedCoachProfile.id,
      displayName: "DB Learning Guide",
      description: "Custom DB guide",
      systemPrompt: "Guide DB learners with short questions and explicit checkpoints.",
      memoryScope: "workspace",
      capabilities: [
        { kind: "skill", source: "system", path: "/skills/project-breakdown", enabled: true },
        { kind: "internal_tool", toolName: "create_workspace_task", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "update_workspace_task", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "share_learning_app", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "render_interactive_widget", approval: "always", enabled: true },
        { kind: "internal_tool", toolName: "generate_course", approval: "always", enabled: true },
        { kind: "subagent", agentProfileId: customProfile.id, enabled: true },
      ],
    });
    assert(
      delegatedCoachProfile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === customProfile.id && capability.enabled),
      "DB updated agent profile stores delegate subagent capability",
    );
    const delegatedProfileView = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(
      delegatedProfileView.agentProfiles.some(
        (profile) =>
          profile.id === customizedCoachProfile.id &&
          profile.capabilities.some((capability) => capability.kind === "subagent" && capability.agentProfileId === customProfile.id && capability.enabled),
      ),
      "DB workspace view persists delegate subagent capability",
    );

    const coachMember = await createWorkspaceAgentMember(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: delegatedCoachProfile.id,
    });
    const researcherMember = await createWorkspaceAgentMember(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: mcpProfile.id,
    });
    assert(researcherMember.agentProfileId === mcpProfile.id, "DB second profile-backed agent member references profile");

    const dbThreadMemory = await createWorkspaceAgentMemory(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      agentProfileId: delegatedCoachProfile.id,
      scope: "thread",
      title: "DB learner preference",
      summary: "The learner prefers concise checkpoints before long explanations.",
    });
    assert(dbThreadMemory.threadId === direct.id, "DB thread memory links to visible thread");

    const dbWorkspaceMemory = await createWorkspaceAgentMemory(ownerId, {
      workspaceId: ownerView.workspace.id,
      agentProfileId: delegatedCoachProfile.id,
      scope: "workspace",
      title: "DB workspace learning goal",
      summary: "The workspace is collecting reusable project-based study plans.",
    });
    assert(dbWorkspaceMemory.scope === "workspace", "DB workspace memory keeps explicit scope");
    let outsiderRejectedHiddenMemorySource = false;
    try {
      await createWorkspaceAgentMemory(outsiderId, {
        workspaceId: ownerView.workspace.id,
        agentProfileId: delegatedCoachProfile.id,
        scope: "workspace",
        title: "Hidden direct source",
        summary: "Should not attach hidden direct provenance.",
        sourceRunId: agentTaskRun.runs[0].id,
        sourceMessageId: message.id,
      });
    } catch (error) {
      outsiderRejectedHiddenMemorySource = error instanceof Error && error.message.includes("Thread not found");
    }
    assert(outsiderRejectedHiddenMemorySource, "DB non-participant cannot create memory linked to a hidden direct run/message");
    assert(coachMember.agentProfileId === delegatedCoachProfile.id, "DB agent member references profile");
    const coachDirect = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "direct",
      name: "DB Learning Guide DM",
      description: "private DB agent chat",
      participantIds: [coachMember.id],
    });
    const directAgentMessage = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: coachDirect.id,
      content: "Help me reason about DB indexing without a mention.",
      senderName: "Workspace Owner",
    });
    const directAgentTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: coachDirect.id,
      message: directAgentMessage,
    });
    assert(directAgentTurn.messages.length === 1, "DB direct chat with an agent auto-runs the agent without mention");
    assert(directAgentTurn.messages[0].senderName === "DB Learning Guide", "DB direct agent chat responds as the agent");
    assert(directAgentTurn.runs.length === 1, "DB direct agent chat creates a run");
    assert(directAgentTurn.runs[0].trigger === "direct_chat", "DB direct agent chat records direct_chat trigger");
    assert(directAgentTurn.runs[0].inputMessageId === directAgentMessage.id, "DB direct agent chat links input message");
    assert(directAgentTurn.runs[0].outputMessageId === directAgentTurn.messages[0].id, "DB direct agent chat links output message");
    assert(directAgentTurn.events.some((event) => event.type === "status" && event.label === "completed"), "DB direct agent chat records completion event");

    const dbSkillBackend = createDbWorkspaceAgentSkillBackend();
    const dbRuntimeSkill = await dbSkillBackend.store({
      workspaceId: ownerView.workspace.id,
      ownerId,
      source: "workspace",
      name: "DB Runtime Review",
      description: "Review DB learning work from durable skill storage.",
      instructions: "Use the durable DB runtime skill and keep feedback short.",
    });
    const dbPortableSkillProfile = await createWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Skill Composer",
      description: "Uses a durable workspace skill during runtime config.",
      systemPrompt: "Use the durable workspace skill when available.",
      memoryScope: "thread",
      capabilities: [
        { kind: "skill", source: "workspace", path: dbRuntimeSkill.path, enabled: true },
      ],
    });
    const dbPortableSkillMember = await createWorkspaceAgentMember(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: dbPortableSkillProfile.id,
    });
    const dbPortableSkillDirect = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "direct",
      name: "DB Skill Composer DM",
      participantIds: [dbPortableSkillMember.id],
    });
    const dbPortableSkillMessage = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: dbPortableSkillDirect.id,
      content: "Use the DB runtime review skill.",
      senderName: "Workspace Owner",
    });
    const dbPortableSkillTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: dbPortableSkillDirect.id,
      message: dbPortableSkillMessage,
      runner: async (runtimeInput) => {
        assert(runtimeInput.config.skills.includes(dbRuntimeSkill.path), "DB durable portable skill reaches runtime config");
        return {
          content: "DB durable skill was available.",
          events: [
            {
              type: "status",
              label: "runtime_configured",
              payload: { skills: runtimeInput.config.skills },
            },
          ],
        };
      },
    });
    assert(dbPortableSkillTurn.messages[0].content === "DB durable skill was available.", "DB portable skill agent run uses custom runner output");
    assert(
      dbPortableSkillTurn.events.some((event) => event.label === "runtime_configured" && Array.isArray(asRecord(event.payload).skills)),
      "DB portable skill agent run persists runtime skill configuration event",
    );

    const coachMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide ask me a guiding question",
      senderName: "Workspace Owner",
    });
    const coachTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: coachMention,
    });
    assert(coachTurn.messages.length === 1, "DB profile-backed agent mention creates response");
    assert(coachTurn.runs.length === 1, "DB profile-backed agent mention creates run");
    assert(coachTurn.events.some((event) => event.type === "status" && event.label === "completed"), "DB profile-backed agent mention records completion event");
    assert(coachTurn.events.some((event) => event.type === "status" && event.label === "runtime_configured"), "DB profile-backed agent mention records runtime event");
    assert(coachTurn.runs[0].agentProfileId === customizedCoachProfile.id, "DB profile-backed run references profile");
    assert(coachTurn.runs[0].inputMessageId === coachMention.id, "DB profile-backed run references input message");
    assert(coachTurn.runs[0].outputMessageId === coachTurn.messages[0].id, "DB profile-backed run references output message");
    const dbAfterCoachRunMemoryView = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(
      dbAfterCoachRunMemoryView.agentMemories.some(
        (memory) => memory.sourceRunId === coachTurn.runs[0].id && memory.scope === "workspace" && memory.sourceMessageId === coachTurn.messages[0].id,
      ),
      "DB completed workspace-scope agent run automatically creates a reviewable run summary memory",
    );
    const dbUserMemoryProfile = await createWorkspaceAgentProfile(ownerId, {
      workspaceId: ownerView.workspace.id,
      displayName: "DB Personal Memory Agent",
      description: "Keeps private DB preferences explicit and reviewed.",
      systemPrompt: "Help with learning preferences, but do not auto-write private user memory.",
      visibility: "private",
      memoryScope: "user",
      capabilities: customProfile.capabilities.map((capability) => {
        if (capability.kind === "skill") return { kind: "skill", source: capability.source, path: capability.path, enabled: capability.enabled };
        if (capability.kind === "internal_tool") return { kind: "internal_tool", toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
        if (capability.kind === "mcp_tool") return { kind: "mcp_tool", connectionId: capability.connectionId, toolName: capability.toolName, approval: capability.approval, enabled: capability.enabled };
        return { kind: "subagent", agentProfileId: capability.agentProfileId, enabled: capability.enabled };
      }),
    });
    const dbUserMemoryAgent = await createWorkspaceAgentMember(ownerId, {
      workspaceId: ownerView.workspace.id,
      profileId: dbUserMemoryProfile.id,
    });
    const dbUserMemoryDirect = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "direct",
      name: "DB Personal Memory Agent DM",
      participantIds: [dbUserMemoryAgent.id],
    });
    const dbUserMemoryMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: dbUserMemoryDirect.id,
      content: "Remember this privately only when I approve it.",
      senderName: "Workspace Owner",
    });
    const dbUserMemoryTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: dbUserMemoryDirect.id,
      message: dbUserMemoryMention,
      runner: async () => ({ content: "I can use private context, but I will not save it automatically." }),
    });
    assert(dbUserMemoryAgent.agentProfileId === dbUserMemoryProfile.id, "DB user-scope memory agent member references profile");
    assert(dbUserMemoryTurn.runs[0].agentProfileId === dbUserMemoryProfile.id, "DB user-scope memory run references profile");
    assert(dbUserMemoryTurn.memories?.length === 0, "DB completed user-scope agent run returns no automatic memory for client merge");
    const dbAfterUserMemoryRunView = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(!dbAfterUserMemoryRunView.agentMemories.some((memory) => memory.sourceRunId === dbUserMemoryTurn.runs[0].id), "DB completed user-scope agent run does not auto-write workspace-visible memory");
    assert(
      coachTurn.events.some((event) => {
        if (event.type !== "status" || event.label !== "started" || typeof event.payload !== "object" || event.payload === null || !("triggerDecision" in event.payload)) return false;
        const decision = event.payload.triggerDecision;
        return typeof decision === "object" && decision !== null && "reason" in decision && decision.reason === "mention";
      }),
      "DB profile-backed started event records trigger decision",
    );
    const dbCoachStartedEvent = coachTurn.events.find((event) => event.type === "status" && event.label === "started");
    assert(dbCoachStartedEvent, "DB profile-backed started event exists");
    const dbCoachStartedPayload = asRecord(dbCoachStartedEvent.payload);
    const dbCoachProfileSnapshot = asRecord(dbCoachStartedPayload.agentProfileSnapshot);
    assert(dbCoachProfileSnapshot.displayName === "DB Learning Guide", "DB started event snapshots profile display name for historical audit");
    assert(dbCoachProfileSnapshot.handle === customizedCoachProfile.handle, "DB started event snapshots profile handle for historical audit");
    assert(dbCoachProfileSnapshot.memoryScope === "workspace", "DB started event snapshots profile memory scope for historical audit");
    const dbCoachSnapshotCapabilities = Array.isArray(dbCoachProfileSnapshot.capabilities) ? dbCoachProfileSnapshot.capabilities : [];
    assert(
      dbCoachSnapshotCapabilities.some((capability) => asRecord(capability).kind === "internal_tool" && asRecord(capability).toolName === "create_workspace_task"),
      "DB started event snapshots enabled profile capabilities for historical audit",
    );
    assert(coachTurn.messages[0].senderName === "DB Learning Guide", "DB profile-backed agent uses profile name");

    const coordinatorMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@agents who should help with this DB plan?",
      senderName: "Workspace Owner",
    });
    const coordinatorTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: coordinatorMention,
    });
    assert(coordinatorTurn.runs.length >= 1, "DB generic agent mention creates coordinator-selected run");
    assert(coordinatorTurn.runs.every((run) => run.trigger === "coordinator"), "DB generic agent mention records coordinator trigger");
    assert(
      coordinatorTurn.events.some((event) => {
        if (event.type !== "status" || event.label !== "started" || typeof event.payload !== "object" || event.payload === null || !("triggerDecision" in event.payload)) return false;
        const decision = event.payload.triggerDecision;
        return typeof decision === "object" && decision !== null && "reason" in decision && decision.reason === "coordinator";
      }),
      "DB coordinator started event records coordinator trigger decision",
    );

    const mentionOnlyRoom = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "room",
      name: "DB mention-only agent room",
      description: "agents only answer named mentions",
      agentTriggerMode: "mention_only",
    });
    assert(mentionOnlyRoom.agentTriggerMode === "mention_only", "DB mention-only room persists agent trigger mode");
    const mentionOnlyGeneric = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: mentionOnlyRoom.id,
      content: "@agents stay quiet unless I name someone in DB",
      senderName: "Workspace Owner",
    });
    const mentionOnlyGenericTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: mentionOnlyRoom.id,
      message: mentionOnlyGeneric,
    });
    assert(mentionOnlyGenericTurn.runs.length === 0, "DB mention-only room suppresses generic coordinator agent triggers");
    const mentionOnlyNamed = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: mentionOnlyRoom.id,
      content: "@DB Learning Guide named mentions still work in DB",
      senderName: "Workspace Owner",
    });
    const mentionOnlyNamedTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: mentionOnlyRoom.id,
      message: mentionOnlyNamed,
    });
    assert(mentionOnlyNamedTurn.runs.length === 1, "DB mention-only room still runs explicitly named agents");
    assert(mentionOnlyNamedTurn.runs[0].trigger === "mention", "DB mention-only named agent run keeps mention trigger");

    const quietReviewRoom = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "room",
      name: "DB quiet review agent room",
      description: "agents do not post into chat automatically",
      agentTriggerMode: "quiet_review",
    });
    assert(quietReviewRoom.agentTriggerMode === "quiet_review", "DB quiet review room persists agent trigger mode");
    const quietReviewMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: quietReviewRoom.id,
      content: "@DB Learning Guide do not auto-post in this DB room",
      senderName: "Workspace Owner",
    });
    const quietReviewTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: quietReviewRoom.id,
      message: quietReviewMention,
    });
    assert(quietReviewTurn.runs.length === 0, "DB quiet review room suppresses chat auto-runs even for named mentions");

    const editableModeRoom = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "room",
      name: "DB editable agent mode room",
      description: "agent mode can change after creation",
      agentTriggerMode: "room_default",
    });
    const updatedModeRoom = await updateWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: editableModeRoom.id,
      agentTriggerMode: "mention_only",
    });
    assert(updatedModeRoom.agentTriggerMode === "mention_only", "DB room agent trigger mode can be edited after creation");
    const updatedModeView = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(
      updatedModeView.threads.some((thread) => thread.id === editableModeRoom.id && thread.agentTriggerMode === "mention_only"),
      "DB edited room agent trigger mode appears in workspace view",
    );
    const editedRoomGeneric = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: editableModeRoom.id,
      content: "@agents edited DB mode should suppress coordinator",
      senderName: "Workspace Owner",
    });
    const editedRoomGenericTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: editableModeRoom.id,
      message: editedRoomGeneric,
    });
    assert(editedRoomGenericTurn.runs.length === 0, "DB edited mention-only room suppresses generic coordinator triggers");

    const allowlistedRoom = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "room",
      name: "DB allowlisted agent room",
      description: "only selected agents can answer",
      agentTriggerMode: "room_default",
      allowedAgentProfileIds: [delegatedCoachProfile.id],
    });
    assert(allowlistedRoom.allowedAgentProfileIds?.[0] === delegatedCoachProfile.id, "DB room stores allowed agent profile ids");
    const blockedResearcherMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      content: "@DB Connected Researcher should not answer in this room",
      senderName: "Workspace Owner",
    });
    const blockedResearcherTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      message: blockedResearcherMention,
    });
    assert(blockedResearcherTurn.runs.length === 0, "DB room agent allowlist suppresses named agents outside the allowlist");
    let rejectedUnknownAllowedAgent = false;
    try {
      await createWorkspaceThread(ownerId, {
        workspaceId: ownerView.workspace.id,
        type: "room",
        name: "DB invalid agent allowlist room",
        allowedAgentProfileIds: ["wagent_missing_profile"],
      });
    } catch (error) {
      rejectedUnknownAllowedAgent = error instanceof Error && error.message.includes("Allowed agent");
    }
    assert(rejectedUnknownAllowedAgent, "DB room agent allowlist rejects profiles that are not workspace agent members");
    const allowedCoachMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      content: "@DB Learning Guide you are allowed here",
      senderName: "Workspace Owner",
    });
    const allowedCoachTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      message: allowedCoachMention,
    });
    assert(allowedCoachTurn.runs.length === 1, "DB room agent allowlist keeps selected named agents active");
    assert(allowedCoachTurn.runs[0].agentProfileId === delegatedCoachProfile.id, "DB allowlisted room runs the selected agent profile");
    const updatedAllowlistedRoom = await updateWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      allowedAgentProfileIds: [mcpProfile.id],
    });
    assert(updatedAllowlistedRoom.allowedAgentProfileIds?.[0] === mcpProfile.id, "DB room agent allowlist can be edited");
    let rejectedUnknownAllowedAgentUpdate = false;
    try {
      await updateWorkspaceThread(ownerId, {
        workspaceId: ownerView.workspace.id,
        threadId: allowlistedRoom.id,
        allowedAgentProfileIds: ["wagent_missing_profile"],
      });
    } catch (error) {
      rejectedUnknownAllowedAgentUpdate = error instanceof Error && error.message.includes("Allowed agent");
    }
    assert(rejectedUnknownAllowedAgentUpdate, "DB room agent allowlist update rejects profiles that are not workspace agent members");
    const allowedResearcherMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      content: "@DB Connected Researcher you are allowed after the edit",
      senderName: "Workspace Owner",
    });
    const allowedResearcherTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      message: allowedResearcherMention,
    });
    assert(allowedResearcherTurn.runs.length === 1, "DB edited room agent allowlist activates the newly selected agent");
    assert(allowedResearcherTurn.runs[0].agentProfileId === mcpProfile.id, "DB edited allowlisted room runs the newly selected profile");
    const disabledAgentsRoom = await updateWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      allowedAgentProfileIds: [],
    });
    assert(Array.isArray(disabledAgentsRoom.allowedAgentProfileIds) && disabledAgentsRoom.allowedAgentProfileIds.length === 0, "DB room agent allowlist can be emptied to disable all room agents");
    const disabledAgentMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      content: "@DB Connected Researcher no agents are allowed now",
      senderName: "Workspace Owner",
    });
    const disabledAgentTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: allowlistedRoom.id,
      message: disabledAgentMention,
    });
    assert(disabledAgentTurn.runs.length === 0, "DB empty room agent allowlist suppresses all named agent triggers");

    const failedCoachMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide try a failing DB runtime",
      senderName: "Workspace Owner",
    });
    const failedCoachTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: failedCoachMention,
      runner: async () => ({
        content: "partial DB runtime output",
        error: "db runtime unavailable",
        events: [{ type: "status", label: "deepagent_failed", payload: { error: "db runtime unavailable" } }],
      }),
    });
    assert(failedCoachTurn.runs[0].status === "failed", "DB failed runtime persists failed status");
    assert(failedCoachTurn.runs[0].error === "db runtime unavailable", "DB failed runtime persists error");
    assert(failedCoachTurn.events.some((event) => event.label === "deepagent_failed"), "DB failed runtime persists failure event");
    const retriedFailedTurn = await retryWorkspaceAgentRun(ownerId, {
      workspaceId: ownerView.workspace.id,
      runId: failedCoachTurn.runs[0].id,
      runner: async () => ({
        content: "DB retry completed with a better explanation.",
        events: [{ type: "status", label: "retry_runtime_called", payload: { sourceRunId: failedCoachTurn.runs[0].id } }],
      }),
    });
    assert(retriedFailedTurn.runs.length === 1, "DB retry failed run creates a new run");
    assert(retriedFailedTurn.runs[0].id !== failedCoachTurn.runs[0].id, "DB retry creates a new run id");
    assert(retriedFailedTurn.runs[0].status === "completed", "DB retry failed run can complete");
    assert(retriedFailedTurn.runs[0].inputMessageId === failedCoachMention.id, "DB retry failed run reuses original input message");
    assert(retriedFailedTurn.runs[0].trigger === failedCoachTurn.runs[0].trigger, "DB retry failed run preserves trigger kind");
    assert(retriedFailedTurn.messages[0].content.includes("DB retry completed"), "DB retry failed run writes output message");
    assert(retriedFailedTurn.events.some((event) => event.label === "retried"), "DB retry records source run event");
    assert(retriedFailedTurn.memories?.some((memory) => memory.sourceRunId === retriedFailedTurn.runs[0].id), "DB retry completed run returns reviewable memory for client merge");

    const failedAgentTask = await createWorkspaceTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      title: "DB failing agent task",
      assigneeId: coachMember.id,
    });
    const failedAgentTaskRun = await runWorkspaceAgentTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      task: failedAgentTask,
      runner: async () => ({
        content: "partial DB task output",
        error: "db task runtime unavailable",
        events: [{ type: "status", label: "deepagent_failed", payload: { error: "db task runtime unavailable" } }],
      }),
    });
    assert(failedAgentTaskRun.task?.status === "open", "DB failed agent task remains open");
    assert(failedAgentTaskRun.task?.progress === "agent run failed", "DB failed agent task records failed progress");
    assert(failedAgentTaskRun.runs[0].status === "failed", "DB failed agent task persists failed run");

    const approvalMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide create an approved-risk task",
      senderName: "Workspace Owner",
    });
    const approvalTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvalMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "create_workspace_task",
            payload: { input: { title: "DB worksheet" }, policy: { visibleLabel: "Create task", risk: "write" } },
          },
        ],
      }),
    });
    assert(approvalTurn.approvals?.length === 1, "DB waiting runtime creates durable pending approval");
    assert(approvalTurn.approvals?.[0]?.status === "pending", "DB waiting runtime starts pending");
    const deniedApproval = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvalTurn.approvals?.[0]?.id ?? "",
      decision: "denied",
      decidedBy: "Workspace Owner",
      reason: "DB test denial",
    });
    assert(deniedApproval.approval.status === "denied", "DB approval decision persists denied status");
    assert(deniedApproval.run.status === "cancelled", "DB denied approval cancels waiting run");
    assert(deniedApproval.events.some((event) => event.label === "approval_denied"), "DB approval decision records audit event");
    const deniedDecisionEvent = deniedApproval.events.find((event) => event.label === "approval_denied");
    assert((deniedDecisionEvent?.payload as any).resumeDecision.type === "reject", "DB denied decision event records DeepAgent reject resume decision");
    assert((deniedDecisionEvent?.payload as any).resumeDecision.message === "DB test denial", "DB denied decision event keeps reviewer feedback for DeepAgent resume");
    assert((deniedDecisionEvent?.payload as any).deepAgentThreadId, "DB denied decision event records resume thread id");
    const repeatedDeniedApproval = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvalTurn.approvals?.[0]?.id ?? "",
      decision: "denied",
      decidedBy: "Workspace Owner",
    });
    assert(repeatedDeniedApproval.approval.status === "denied", "DB repeating the same approval decision is idempotent");
    assert(repeatedDeniedApproval.events.length === 0, "DB repeating the same approval decision does not create duplicate audit events");
    const flippedDeniedApproval = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvalTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    }).catch((error) => error);
    assert(flippedDeniedApproval instanceof Error && flippedDeniedApproval.message.includes("already denied"), "DB decided approvals cannot be flipped to the opposite decision");

    const externalApprovalMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide search approved external sources",
      senderName: "Workspace Owner",
    });
    const externalApprovalTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: externalApprovalMention,
      runner: async (runtimeInput) => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "mcp_conn_sources_search_sources",
            payload: {
              input: { query: "db derivative intuition" },
              policy: {
                toolName: "mcp_conn_sources_search_sources",
                visibleLabel: "DB Source Search: search_sources",
                risk: "external",
                approval: "always",
              },
              deepAgentThreadId: runtimeInput.threadId,
            },
          },
        ],
      }),
    });
    const approvedExternal = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: externalApprovalTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedExternal.approval.status === "approved", "DB external tool approval persists approved status");
    assert(approvedExternal.run.status === "waiting_for_approval", "DB approved external tool waits for DeepAgent resume instead of pretending to complete");
    const externalResumeEvent = approvedExternal.events.find((event) => event.label === "deepagent_resume_required");
    assert(externalResumeEvent, "DB approved external tool records a visible DeepAgent resume-required audit event");
    assert((externalResumeEvent?.payload as any).deepAgentThreadId, "DB external resume-required event records resume thread id");
    assert((externalResumeEvent?.payload as any).resumeDecision.type === "approve", "DB external resume-required event records approve resume decision");

    const externalResumeMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide resume an approved external source search",
      senderName: "Workspace Owner",
    });
    const externalResumeTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: externalResumeMention,
      runner: async (runtimeInput) => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "mcp_conn_sources_search_sources",
            payload: {
              input: { query: "db chain rule visual proof" },
              policy: {
                toolName: "mcp_conn_sources_search_sources",
                visibleLabel: "DB Source Search: search_sources",
                risk: "external",
                approval: "always",
              },
              deepAgentThreadId: runtimeInput.threadId,
            },
          },
        ],
      }),
    });
    const externalResumeApproval = externalResumeTurn.approvals?.[0];
    let resumeRunnerCalled = false;
    const resumedExternal = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: externalResumeApproval?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
      runner: async (runtimeInput) => {
        resumeRunnerCalled = true;
        assert(runtimeInput.threadId === externalResumeApproval?.deepAgentThreadId, "DB external resume reuses persisted DeepAgent thread id");
        assert((runtimeInput.resumeCommand as any)?.resume?.decisions?.[0]?.type === "approve", "DB external resume sends approve decision to DeepAgent");
        return {
          content: "DB external source result is ready.",
          status: "completed",
          events: [{ type: "status", label: "deepagent_resumed", payload: { deepAgentThreadId: runtimeInput.threadId } }],
        };
      },
    });
    assert(resumeRunnerCalled, "DB approved external tool resumes through injected runner");
    assert(resumedExternal.run.status === "completed", "DB approved external tool completes after successful DeepAgent resume");
    assert(resumedExternal.message?.content === "DB external source result is ready.", "DB approved external resume persists the agent follow-up message");
    assert(resumedExternal.events.some((event) => event.label === "deepagent_resumed"), "DB approved external resume records resume event");
    assert(!resumedExternal.events.some((event) => event.label === "deepagent_resume_required"), "DB successful external resume does not ask for manual resume fallback");

    const externalFailMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide resume an external source search that fails",
      senderName: "Workspace Owner",
    });
    const externalFailTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: externalFailMention,
      runner: async (runtimeInput) => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "mcp_conn_sources_search_sources",
            payload: {
              input: { query: "db failing source search" },
              policy: {
                toolName: "mcp_conn_sources_search_sources",
                visibleLabel: "DB Source Search: search_sources",
                risk: "external",
                approval: "always",
              },
              deepAgentThreadId: runtimeInput.threadId,
            },
          },
        ],
      }),
    });
    const failedExternal = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: externalFailTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
      runner: async (runtimeInput) => {
        assert((runtimeInput.resumeCommand as any)?.resume?.decisions?.[0]?.type === "approve", "DB failed external resume still sends approve decision to DeepAgent");
        throw new Error("db external source unavailable");
      },
    });
    assert(failedExternal.approval.status === "approved", "DB failed external resume still records the user approval decision");
    assert(failedExternal.run.status === "failed", "DB failed external resume marks the run failed");
    assert(failedExternal.run.error === "db external source unavailable", "DB failed external resume stores the resume error on the run");
    assert(!failedExternal.message, "DB failed external resume does not create a misleading agent message");
    assert(failedExternal.events.some((event) => event.label === "deepagent_resume_failed"), "DB failed external resume records explicit failure event");
    assert(failedExternal.events.some((event) => event.label === "failed"), "DB failed external resume records terminal failed event");
    const staleApprovalSeed = await seedWorkspaceAgentRunForTest(ownerId, {
      run: {
        workspaceId: ownerView.workspace.id,
        threadId: direct.id,
        agentProfileId: delegatedCoachProfile.id,
        agentMemberId: coachMember.id,
        trigger: "manual",
        status: "failed",
        error: "DB terminal run should not accept approval decisions",
      },
      events: [
        {
          type: "approval_request",
          label: "create_workspace_task",
          payload: { input: { title: "DB stale approval task" }, policy: { visibleLabel: "Create task", risk: "write" } },
        },
        {
          type: "status",
          label: "failed",
          payload: { error: "DB terminal run should not accept approval decisions" },
        },
      ],
      createApprovals: true,
    });
    assert(staleApprovalSeed.agentApprovals[0]?.status === "pending", "DB test seed can create stale pending approval on a terminal run");
    const rejectedTerminalApproval = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: staleApprovalSeed.agentApprovals[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    }).catch((error) => error);
    assert(rejectedTerminalApproval instanceof Error && rejectedTerminalApproval.message.includes("terminal run"), "DB terminal runs reject pending approval decisions");
    const afterRejectedTerminalApproval = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(
      afterRejectedTerminalApproval.agentApprovals.some((approval) => approval.id === staleApprovalSeed.agentApprovals[0]?.id && approval.status === "pending"),
      "DB rejected terminal approval decision leaves stale approval unchanged for audit repair",
    );
    assert(
      !afterRejectedTerminalApproval.agentRunEvents.some((event) => event.runId === staleApprovalSeed.agentRuns[0].id && event.label === "approval_approved"),
      "DB rejected terminal approval decision does not append approval events",
    );

    const siblingApprovalThread = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "room",
      name: "DB sibling approval room",
      description: "approval invariant regression",
    });
    const siblingApprovalMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: siblingApprovalThread.id,
      content: "@DB Learning Guide request two approval-gated actions",
      senderName: "Workspace Owner",
    });
    const siblingApprovalTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: siblingApprovalThread.id,
      message: siblingApprovalMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "create_workspace_task",
            payload: { input: { title: "DB one approved action" }, policy: { visibleLabel: "Create task", risk: "write" } },
          },
          {
            type: "approval_request",
            label: "save_agent_memory",
            payload: { input: { title: "DB stale sibling memory", summary: "Should not remain pending." }, policy: { visibleLabel: "Save memory", risk: "write" } },
          },
        ],
      }),
    });
    assert(siblingApprovalTurn.approvals?.length === 2, "DB multi-approval run creates two pending approvals");
    const taskSiblingApproval = siblingApprovalTurn.approvals?.find((approval) => approval.toolName === "create_workspace_task");
    const memorySiblingApproval = siblingApprovalTurn.approvals?.find((approval) => approval.toolName === "save_agent_memory");
    const approvedSibling = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: taskSiblingApproval?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedSibling.run.status === "completed", "DB approving one action can complete the waiting run");
    assert(approvedSibling.approvals?.some((approval) => approval.id === taskSiblingApproval?.id && approval.status === "approved"), "DB decision response includes approved active approval");
    assert(approvedSibling.approvals?.some((approval) => approval.id === memorySiblingApproval?.id && approval.status === "expired"), "DB terminal run expires sibling pending approval");
    assert(approvedSibling.events.some((event) => event.label === "pending_approvals_expired"), "DB terminal run expiration records audit event");

    const cancellableMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide prepare a cancellable DB task",
      senderName: "Workspace Owner",
    });
    const cancellableTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: cancellableMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "create_workspace_task",
            payload: { input: { title: "Cancelled DB worksheet" }, policy: { visibleLabel: "Create task", risk: "write" } },
          },
        ],
      }),
    });
    const cancelledRun = await cancelWorkspaceAgentRun(ownerId, {
      workspaceId: ownerView.workspace.id,
      runId: cancellableTurn.runs[0].id,
      cancelledBy: "Workspace Owner",
      reason: "DB test cancellation",
    });
    assert(cancelledRun.run.status === "cancelled", "DB cancel run marks waiting run cancelled");
    assert(cancelledRun.run.completedAt, "DB cancel run sets completedAt");
    assert(cancelledRun.events.some((event) => event.label === "cancelled"), "DB cancel run records cancellation event");
    assert(cancelledRun.approvals.some((approval) => approval.status === "expired"), "DB cancel run expires pending approvals");
    const cancelledAgain = await cancelWorkspaceAgentRun(ownerId, {
      workspaceId: ownerView.workspace.id,
      runId: cancellableTurn.runs[0].id,
    });
    assert(cancelledAgain.events.length === 0, "DB cancel run is idempotent for terminal runs");
    const retriedCancelledRun = await retryWorkspaceAgentRun(ownerId, {
      workspaceId: ownerView.workspace.id,
      runId: cancellableTurn.runs[0].id,
      runner: async () => ({ content: "DB cancelled run retry completed." }),
    });
    assert(retriedCancelledRun.runs[0].id !== cancellableTurn.runs[0].id, "DB retry cancelled run creates a new run");
    assert(retriedCancelledRun.runs[0].status === "completed", "DB retry cancelled run can complete");
    assert(retriedCancelledRun.runs[0].inputMessageId === cancellableMention.id, "DB retry cancelled run reuses original input message");
    assert(retriedCancelledRun.messages[0].content.includes("DB cancelled run retry completed"), "DB retry cancelled run writes output message");

    const approvedMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide create the approved DB task",
      senderName: "Workspace Owner",
    });
    const approvedTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvedMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "create_workspace_task",
            payload: { input: { title: "Approved DB worksheet", scope: "Shared", progress: "ready" } },
          },
        ],
      }),
    });
    const approvedApproval = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvedTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedApproval.approval.status === "approved", "DB approved tool decision persists approved status");
    assert(approvedApproval.run.status === "completed", "DB approved tool execution completes waiting run");
    assert(approvedApproval.task?.title === "Approved DB worksheet", "DB approved create task tool creates a task");
    assert(approvedApproval.message?.content.includes("Approved DB worksheet"), "DB approved create task tool creates visible message");
    assert(approvedApproval.run.taskId === approvedApproval.task?.id, "DB approved tool execution links run to created task");
    assert(approvedApproval.run.outputMessageId === approvedApproval.message?.id, "DB approved tool execution links run to final message");
    const approvedDecisionEvent = approvedApproval.events.find((event) => event.label === "approval_approved");
    assert((approvedDecisionEvent?.payload as any).resumeDecision.type === "approve", "DB approved decision event records DeepAgent approve resume decision");
    assert((approvedDecisionEvent?.payload as any).deepAgentThreadId, "DB approved decision event records resume thread id");
    const viewAfterApprovedDecision = await getWorkspaceView(ownerId, ownerView.workspace.id);
    const persistedApprovedDecisionEvent = viewAfterApprovedDecision.agentRunEvents.find((event) => event.id === approvedDecisionEvent?.id);
    assert((persistedApprovedDecisionEvent?.payload as any).resumeDecision.type === "approve", "DB persisted workspace view keeps approved resume decision metadata");

    const guardedCreateTask = buildWorkspaceGuardedToolSpecs(customizedCoachProfile, {
      workspaceName: ownerView.workspace.name,
      thread: direct,
      member: coachMember,
      recentMessages: ["Learner: Please turn this into DB practice."],
      openTasks: [],
    }).find((spec) => spec.name === "create_workspace_task");
    assert(guardedCreateTask?.invoke, "DB guarded create task tool is invokable from runtime context");
    const guardedInput = {
      title: "Guarded DB integration worksheet",
      scope: "Shared",
      progress: "ready",
      assigneeId: agent.id,
      dueAt: "2026-06-01",
    };
    const guardedApprovalError = await guardedCreateTask.invoke(guardedInput).catch((error) => error);
    assert(guardedApprovalError instanceof WorkspaceToolApprovalRequiredError, "DB guarded create task raises approval interrupt before writing");
    assert(guardedApprovalError.input === guardedInput, "DB guarded approval preserves exact tool input payload for approval resume");
    const guardedApprovalMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide use the guarded create task tool",
      senderName: "Workspace Owner",
    });
    const guardedApprovalTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: guardedApprovalMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: guardedApprovalError.policy.toolName,
            payload: {
              input: guardedApprovalError.input,
              policy: guardedApprovalError.policy,
            },
          },
        ],
      }),
    });
    const approvedGuardedTool = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: guardedApprovalTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedGuardedTool.task?.title === "Guarded DB integration worksheet", "DB approved guarded create task uses tool payload title");
    assert(approvedGuardedTool.task?.assigneeId === agent.id, "DB approved guarded create task preserves requested assignee");
    assert(approvedGuardedTool.task?.dueAt === "2026-06-01", "DB approved guarded create task preserves due date");
    assert(approvedGuardedTool.message?.senderName === "DB Learning Guide", "DB approved guarded create task writes agent message");
    assert(approvedGuardedTool.events.some((event) => event.type === "tool_start" && event.label === "create_workspace_task"), "DB approved guarded create task records tool_start");
    assert(approvedGuardedTool.events.some((event) => event.type === "tool_end" && event.label === "create_workspace_task"), "DB approved guarded create task records tool_end");

    const approvalUpdateTarget = await createWorkspaceTask(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      title: "DB approval update target",
      scope: "Shared",
      progress: "needs update",
    });
    const approvedUpdateMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide update the approved DB task",
      senderName: "Workspace Owner",
    });
    const approvedUpdateTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvedUpdateMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "update_workspace_task",
            payload: {
              input: {
                taskId: approvalUpdateTarget.id,
                status: "done",
                progress: "approved update",
                resultSummary: "DB updated after approval.",
              },
            },
          },
        ],
      }),
    });
    const approvedUpdate = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvedUpdateTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedUpdate.task?.id === approvalUpdateTarget.id, "DB approved update tool returns updated task");
    assert(approvedUpdate.task?.status === "done", "DB approved update tool updates task status");
    assert(approvedUpdate.task?.resultSummary === "DB updated after approval.", "DB approved update tool stores result summary");
    assert(approvedUpdate.message?.content.includes("DB approval update target"), "DB approved update tool creates visible message");
    assert(approvedUpdate.run.status === "completed", "DB approved update tool completes waiting run");
    assert(approvedUpdate.run.taskId === approvalUpdateTarget.id, "DB approved update tool links run to updated task");
    assert(approvedUpdate.run.outputMessageId === approvedUpdate.message?.id, "DB approved update tool links run to final message");
    assert(approvedUpdate.events.some((event) => event.type === "tool_start" && event.label === "update_workspace_task"), "DB approved update tool records tool_start");

    const approvedMemoryMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide remember my DB hint preference",
      senderName: "Workspace Owner",
    });
    const approvedMemoryTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvedMemoryMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "save_agent_memory",
            payload: { input: { title: "DB hint preference", summary: "DB learner prefers checkpoints before answers.", scope: "user" } },
          },
        ],
      }),
    });
    assert(approvedMemoryTurn.approvals?.[0]?.toolName === "save_agent_memory", "DB save memory approval request records requested tool");
    const approvedMemory = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvedMemoryTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedMemory.memory?.scope === "user", "DB approved save memory tool creates user-scope memory only after approval");
    assert(approvedMemory.memory?.title === "DB hint preference", "DB approved save memory preserves title");
    assert(approvedMemory.run.status === "completed", "DB approved save memory completes waiting run");
    assert(approvedMemory.events.some((event) => event.label === "save_agent_memory" && event.type === "tool_end"), "DB approved save memory records tool_end");
    const joinerAfterApprovedUserMemory = await getWorkspaceView(joinerId, ownerView.workspace.id);
    assert(!joinerAfterApprovedUserMemory.agentMemories.some((entry) => entry.id === approvedMemory.memory?.id), "DB user-scope memory is hidden from other workspace members");
    const joinerApprovedMemoryRunDetail = await getWorkspaceAgentRunDetail(joinerId, {
      workspaceId: ownerView.workspace.id,
      runId: approvedMemory.run.id,
    });
    assert(
      !joinerApprovedMemoryRunDetail.memories?.some((entry) => entry.id === approvedMemory.memory?.id),
      "DB run detail hides another user's user-scope memory even when the run thread is visible",
    );
    let joinerRejectedUserMemoryArchive = false;
    try {
      await archiveWorkspaceAgentMemory(joinerId, {
        workspaceId: ownerView.workspace.id,
        memoryId: approvedMemory.memory?.id ?? "",
      });
    } catch (error) {
      joinerRejectedUserMemoryArchive = error instanceof Error && error.message.includes("Agent memory not found");
    }
    assert(joinerRejectedUserMemoryArchive, "DB other workspace members cannot archive someone else's user-scope memory by id");
    assert(approvedUpdate.events.some((event) => event.type === "tool_end" && event.label === "update_workspace_task"), "DB approved update tool records tool_end");

    const approvedAppMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide share an approved DB app",
      senderName: "Workspace Owner",
    });
    const approvedAppTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvedAppMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "share_learning_app",
            payload: {
              input: {
                appId: "db_approved_app",
                version: 4,
                title: "DB Approved App",
                description: "DB approved app card.",
                primaryAction: "Open app",
              },
            },
          },
        ],
      }),
    });
    const approvedApp = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvedAppTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedApp.message?.artifact?.type === "app", "DB approved share app creates app artifact message");
    assert(approvedApp.message?.artifact?.type === "app" && approvedApp.message.artifact.appId === "db_approved_app", "DB approved share app preserves app id");
    assert(approvedApp.run.status === "completed", "DB approved share app completes waiting run");
    assert(approvedApp.events.some((event) => event.type === "artifact" && event.label === "share_learning_app"), "DB approved share app records artifact event");

    const approvedWidgetMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide render an approved DB widget",
      senderName: "Workspace Owner",
    });
    const approvedWidgetTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvedWidgetMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "render_interactive_widget",
            payload: {
              input: {
                appId: "db_approved_widget",
                version: 2,
                title: "DB Approved Widget",
                description: "DB approved interactive widget.",
                html: "<section><h1>DB widget</h1></section>",
                primaryAction: "Open widget",
              },
            },
          },
        ],
      }),
    });
    const approvedWidget = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvedWidgetTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedWidget.message?.artifact?.type === "app", "DB approved render widget creates app artifact message");
    assert(approvedWidget.message?.artifact?.type === "app" && approvedWidget.message.artifact.appId === "db_approved_widget", "DB approved render widget preserves app id");
    assert(approvedWidget.message?.artifact?.type === "app" && approvedWidget.message.artifact.template?.type === "html", "DB approved render widget stores html template snapshot");
    assert(approvedWidget.run.status === "completed", "DB approved render widget completes waiting run");
    assert(approvedWidget.events.some((event) => event.type === "artifact" && event.label === "render_interactive_widget"), "DB approved render widget records artifact event");

    const approvedCourseMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide generate an approved DB course",
      senderName: "Workspace Owner",
    });
    const approvedCourseTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvedCourseMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "generate_course",
            payload: {
              input: {
                title: "DB Derivative Course",
                topic: "DB derivative intuition",
                description: "DB course draft.",
                modules: [
                  { title: "Slope model", objective: "Connect graph slope to change." },
                  { title: "Rate model", objective: "Bridge average and instantaneous rate." },
                ],
                assessments: ["Explain DB derivative intuition."],
              },
            },
          },
        ],
      }),
    });
    const approvedCourse = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvedCourseTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedCourse.message?.artifact?.type === "task", "DB approved generate course creates course artifact card");
    assert(approvedCourse.message?.artifact?.type === "task" && approvedCourse.message.artifact.title === "DB Derivative Course", "DB approved generate course preserves title");
    assert(approvedCourse.message?.artifact?.type === "task" && approvedCourse.message.artifact.groups.includes("Course"), "DB approved generate course marks artifact as course");
    assert(approvedCourse.artifact?.kind === "course", "DB approved generate course returns first-class course artifact");
    assert(approvedCourse.run.status === "completed", "DB approved generate course completes waiting run");
    const approvedCourseArtifactEvent = approvedCourse.events.find((event) => event.type === "artifact" && event.label === "generate_course");
    assert(approvedCourseArtifactEvent, "DB approved generate course records artifact event");
    const approvedCourseArtifactPayload = asRecord(approvedCourseArtifactEvent.payload);
    assert(approvedCourseArtifactPayload.artifactId === approvedCourse.artifact.id, "DB approved generate course artifact event references first-class artifact id");
    assert(approvedCourseArtifactPayload.artifactKind === "course", "DB approved generate course artifact event carries semantic kind");
    assert(approvedCourseArtifactPayload.artifactTitle === "DB Derivative Course", "DB approved generate course artifact event carries compact title");
    assert(approvedCourseArtifactPayload.sourceMessageId === approvedCourse.message.id, "DB approved generate course artifact event references source message id");
    assert(!("artifact" in approvedCourseArtifactPayload), "DB approved generate course artifact event does not embed full artifact record");
    const approvedCourseToolEndPayload = asRecord(approvedCourse.events.find((event) => event.type === "tool_end" && event.label === "generate_course")?.payload);
    assert(!("artifact" in approvedCourseToolEndPayload), "DB approved generate course tool event does not embed full artifact record");

    const approvedArtifactMention = await createWorkspaceMessage(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      content: "@DB Learning Guide save an approved DB artifact",
      senderName: "Workspace Owner",
    });
    const approvedArtifactTurn = await runWorkspaceAgentTurn(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: direct.id,
      message: approvedArtifactMention,
      runner: async () => ({
        content: "",
        status: "waiting_for_approval",
        events: [
          {
            type: "approval_request",
            label: "save_learning_artifact",
            payload: {
              input: {
                title: "DB Approved Artifact",
                description: "DB saved plan from the agent.",
                groups: ["Plan"],
              },
            },
          },
        ],
      }),
    });
    const approvedArtifact = await decideWorkspaceAgentApproval(ownerId, {
      workspaceId: ownerView.workspace.id,
      approvalId: approvedArtifactTurn.approvals?.[0]?.id ?? "",
      decision: "approved",
      decidedBy: "Workspace Owner",
    });
    assert(approvedArtifact.message?.artifact?.type === "task", "DB approved save artifact creates artifact card");
    assert(approvedArtifact.message?.artifact?.type === "task" && approvedArtifact.message.artifact.title === "DB Approved Artifact", "DB approved save artifact preserves title");
    assert(approvedArtifact.artifact?.kind === "saved_artifact", "DB approved save artifact returns first-class saved artifact record");
    assert(approvedArtifact.artifact?.sourceRunId === approvedArtifact.run.id, "DB approved save artifact links first-class artifact to source run");
    assert(approvedArtifact.run.status === "completed", "DB approved save artifact completes waiting run");
    const approvedSavedArtifactEvent = approvedArtifact.events.find((event) => event.type === "artifact" && event.label === "save_learning_artifact");
    assert(approvedSavedArtifactEvent, "DB approved save artifact records artifact event");
    const approvedSavedArtifactPayload = asRecord(approvedSavedArtifactEvent.payload);
    assert(approvedSavedArtifactPayload.artifactId === approvedArtifact.artifact.id, "DB approved save artifact event references first-class artifact id");
    assert(approvedSavedArtifactPayload.artifactKind === "saved_artifact", "DB approved save artifact event carries semantic kind");
    assert(approvedSavedArtifactPayload.artifactTitle === "DB Approved Artifact", "DB approved save artifact event carries compact title");
    assert(approvedSavedArtifactPayload.sourceMessageId === approvedArtifact.message.id, "DB approved save artifact event references source message id");
    assert(!("artifact" in approvedSavedArtifactPayload), "DB approved save artifact event does not embed full artifact record");
    const approvedSavedArtifactToolEndPayload = asRecord(approvedArtifact.events.find((event) => event.type === "tool_end" && event.label === "save_learning_artifact")?.payload);
    assert(!("artifact" in approvedSavedArtifactToolEndPayload), "DB approved save artifact tool event does not embed full artifact record");

    const ownerAfter = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(ownerAfter.threads.some((thread) => thread.id === direct.id), "owner sees direct");
    assert(ownerAfter.threads.some((thread) => thread.id === coachDirect.id), "owner sees direct agent chat");
    assert(ownerAfter.messages.some((entry) => entry.id === message.id), "owner sees direct message");
    assert(ownerAfter.messages.some((entry) => entry.id === agentTurn.messages[0].id), "owner sees agent response");
    assert(ownerAfter.members.some((entry) => entry.id === coachMember.id && entry.agentProfileId === customizedCoachProfile.id), "owner sees profile-backed agent member");
    assert(
      ownerAfter.agentProfiles.some(
        (entry) =>
          entry.id === customizedCoachProfile.id &&
          entry.displayName === "DB Learning Guide" &&
          entry.memoryScope === "workspace" &&
          entry.capabilities.some((capability) => capability.kind === "internal_tool" && capability.toolName === "create_workspace_task" && capability.approval === "always"),
      ),
      "owner sees updated agent profile in workspace view",
    );
    assert(ownerAfter.agentProfiles.some((entry) => entry.id === customProfile.id && entry.visibility === "private"), "owner sees custom agent profile in workspace view");
    assert(ownerAfter.agentConnections.some((entry) => entry.id === userConnection.id && entry.scope === "user"), "owner sees personal agent connection in workspace view");
    assert(ownerAfter.agentRuns.some((entry) => entry.id === coachTurn.runs[0].id && entry.status === "completed"), "owner sees persisted agent run");
    assert(ownerAfter.agentRuns.some((entry) => entry.id === directAgentTurn.runs[0].id && entry.trigger === "direct_chat"), "owner sees persisted direct agent chat run");
    assert(ownerAfter.agentRuns.some((entry) => entry.id === retriedFailedTurn.runs[0].id && entry.status === "completed"), "owner sees retried failed run");
    assert(ownerAfter.agentRuns.some((entry) => entry.id === retriedCancelledRun.runs[0].id && entry.status === "completed"), "owner sees retried cancelled run");
    assert(ownerAfter.agentRunEvents.some((entry) => entry.runId === coachTurn.runs[0].id && entry.label === "completed"), "owner sees persisted agent run event");
    assert(ownerAfter.agentRuns.some((entry) => entry.id === failedCoachTurn.runs[0].id && entry.status === "failed"), "owner sees persisted failed agent run");
    assert(ownerAfter.agentRunEvents.some((entry) => entry.runId === failedCoachTurn.runs[0].id && entry.label === "deepagent_failed"), "owner sees persisted failed run event");
    assert(ownerAfter.agentApprovals.some((entry) => entry.id === deniedApproval.approval.id && entry.status === "denied"), "owner sees persisted denied approval");
    assert(ownerAfter.agentRuns.some((entry) => entry.id === deniedApproval.run.id && entry.status === "cancelled"), "owner sees cancelled approval run");
    assert(ownerAfter.agentApprovals.some((entry) => entry.id === approvedApproval.approval.id && entry.status === "approved"), "owner sees persisted approved approval");
    assert(ownerAfter.agentRuns.some((entry) => entry.id === approvedApproval.run.id && entry.status === "completed"), "owner sees completed approved approval run");
    assert(
      ownerAfter.agentRuns.some((entry) => entry.id === approvedApproval.run.id && entry.taskId === approvedApproval.task?.id && entry.outputMessageId === approvedApproval.message?.id),
      "owner sees approved tool run links",
    );
    assert(ownerAfter.tasks.some((entry) => entry.id === approvedApproval.task?.id), "owner sees approved tool task");
    assert(ownerAfter.messages.some((entry) => entry.id === approvedApproval.message?.id), "owner sees approved tool message");
    assert(
      ownerAfter.tasks.some((entry) => entry.id === dbArtifactReviewTask.id && entry.sourceArtifactId === dbTaskResultArtifact.id),
      "owner sees DB artifact review task provenance",
    );
    assert(ownerAfter.tasks.some((entry) => entry.id === approvedGuardedTool.task?.id && entry.assigneeId === agent.id), "owner sees approved guarded tool task");
    assert(ownerAfter.messages.some((entry) => entry.id === approvedGuardedTool.message?.id), "owner sees approved guarded tool message");
    assert(ownerAfter.tasks.some((entry) => entry.id === approvedUpdate.task?.id && entry.status === "done" && entry.resultSummary === "DB updated after approval."), "owner sees approved update task");
    assert(ownerAfter.messages.some((entry) => entry.id === approvedUpdate.message?.id), "owner sees approved update message");
    assert(ownerAfter.messages.some((entry) => entry.id === approvedApp.message?.id && entry.artifact?.type === "app"), "owner sees approved app artifact message");
    assert(ownerAfter.messages.some((entry) => entry.id === approvedArtifact.message?.id && entry.artifact?.type === "task"), "owner sees approved saved artifact message");
    assert(ownerAfter.artifacts.some((entry) => entry.sourceMessageId === approvedApp.message?.id && entry.kind === "app"), "owner sees approved app in first-class artifacts view");
    assert(ownerAfter.artifacts.some((entry) => entry.sourceRunId === approvedCourse.run.id && entry.kind === "course"), "owner sees approved course in first-class artifacts view");
    assert(ownerAfter.artifacts.some((entry) => entry.sourceRunId === approvedArtifact.run.id && entry.title === "DB Approved Artifact" && entry.kind === "saved_artifact"), "owner sees approved saved artifact in first-class artifacts view");
    assert(ownerAfter.agentMemories.some((entry) => entry.id === dbThreadMemory.id && entry.title === "DB learner preference"), "owner sees persisted thread agent memory");
    assert(ownerAfter.agentMemories.some((entry) => entry.id === dbWorkspaceMemory.id && entry.scope === "workspace"), "owner sees persisted workspace agent memory");
    assert(ownerAfter.agentMemories.some((entry) => entry.id === approvedMemory.memory?.id && entry.scope === "user"), "owner sees approved user-scope memory in their reviewable memory list");
    assert(ownerAfter.agentMemories.some((entry) => entry.sourceRunId === coachTurn.runs[0].id && entry.title.includes("DB Learning Guide")), "owner sees automatic DB run summary memory");
    assert(!ownerAfter.agentMemories.some((entry) => entry.sourceRunId === dbUserMemoryTurn.runs[0].id), "DB user-scope agent runs do not create automatic workspace-visible memory");
    assert(!ownerAfter.agentMemories.some((entry) => entry.sourceRunId === agentTurn.runs[0].id), "DB legacy implicit agent does not create automatic memory without profile-backed membership");
    assert(!ownerAfter.agentMemories.some((entry) => entry.sourceRunId === failedCoachTurn.runs[0].id), "DB failed agent runs do not create automatic memory");
    assert(ownerAfter.agentMemories.every((entry) => !entry.archivedAt), "DB workspace view hides archived agent memories by default");
    const dbArchivedThreadMemory = await archiveWorkspaceAgentMemory(ownerId, {
      workspaceId: ownerView.workspace.id,
      memoryId: dbThreadMemory.id,
    });
    assert(dbArchivedThreadMemory.archivedAt, "DB archiving an agent memory records archived timestamp");
    const ownerAfterMemoryArchive = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(!ownerAfterMemoryArchive.agentMemories.some((entry) => entry.id === dbThreadMemory.id), "DB archived agent memory is hidden from default workspace view");
    assert(ownerAfterMemoryArchive.agentMemories.some((entry) => entry.id === dbWorkspaceMemory.id), "DB archiving one memory keeps other memories visible");
    const dbBulkMemoryA = await createWorkspaceAgentMemory(ownerId, {
      workspaceId: ownerView.workspace.id,
      agentProfileId: delegatedCoachProfile.id,
      scope: "workspace",
      title: "DB bulk archive A",
      summary: "Temporary DB memory for bulk archive regression.",
    });
    const dbBulkMemoryB = await createWorkspaceAgentMemory(ownerId, {
      workspaceId: ownerView.workspace.id,
      agentProfileId: delegatedCoachProfile.id,
      scope: "workspace",
      title: "DB bulk archive B",
      summary: "Second temporary DB memory for bulk archive regression.",
    });
    const dbBulkArchivedMemories = await archiveWorkspaceAgentMemories(ownerId, {
      workspaceId: ownerView.workspace.id,
      memoryIds: [dbBulkMemoryA.id, dbBulkMemoryB.id],
    });
    assert(dbBulkArchivedMemories.length === 2, "DB bulk archiving memories returns archived records");
    assert(dbBulkArchivedMemories.every((memory) => memory.archivedAt), "DB bulk archived memories record archived timestamps");
    const ownerAfterBulkMemoryArchive = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(!ownerAfterBulkMemoryArchive.agentMemories.some((entry) => dbBulkArchivedMemories.some((memory) => memory.id === entry.id)), "DB bulk archived memories are hidden from workspace view");
    const dbArchivedMemoryAudit = await listWorkspaceAgentMemories(ownerId, {
      workspaceId: ownerView.workspace.id,
      includeArchived: true,
    });
    assert(dbArchivedMemoryAudit.memories.some((memory) => memory.id === dbArchivedThreadMemory.id && memory.archivedAt), "DB archived memory remains queryable for audit");
    assert(dbBulkArchivedMemories.every((archived) => dbArchivedMemoryAudit.memories.some((memory) => memory.id === archived.id && memory.archivedAt)), "DB bulk archived memories remain queryable for audit");
    const outsiderMemoryAudit = await listWorkspaceAgentMemories(outsiderId, {
      workspaceId: ownerView.workspace.id,
      includeArchived: true,
    });
    assert(!outsiderMemoryAudit.memories.some((memory) => memory.threadId === direct.id), "DB memory audit hides private direct thread memories from non-participants");
    const dbRestoredThreadMemory = await restoreWorkspaceAgentMemory(ownerId, {
      workspaceId: ownerView.workspace.id,
      memoryId: dbArchivedThreadMemory.id,
    });
    assert(!dbRestoredThreadMemory.archivedAt, "DB restoring an archived agent memory clears archived timestamp");
    const ownerAfterMemoryRestore = await getWorkspaceView(ownerId, ownerView.workspace.id);
    assert(ownerAfterMemoryRestore.agentMemories.some((entry) => entry.id === dbArchivedThreadMemory.id), "DB restored agent memory returns to default workspace view");
    const dbDeletedBulkMemory = await deleteWorkspaceAgentMemory(ownerId, {
      workspaceId: ownerView.workspace.id,
      memoryId: dbBulkArchivedMemories[0].id,
    });
    assert(dbDeletedBulkMemory.id === dbBulkArchivedMemories[0].id, "DB deleting an agent memory returns the deleted record");
    const dbAfterMemoryDeleteAudit = await listWorkspaceAgentMemories(ownerId, {
      workspaceId: ownerView.workspace.id,
      includeArchived: true,
    });
    assert(!dbAfterMemoryDeleteAudit.memories.some((memory) => memory.id === dbDeletedBulkMemory.id), "DB deleted agent memory is removed from audit history");
    assert(ownerAfter.messages.some((entry) => entry.id === coachTurn.messages[0].id), "owner sees profile-backed agent response");
    assert(ownerAfter.messages.some((entry) => entry.id === directAgentMessage.id), "owner sees direct agent chat human message");
    assert(ownerAfter.messages.some((entry) => entry.id === directAgentTurn.messages[0].id), "owner sees direct agent chat response");
    assert(ownerAfter.tasks.some((entry) => entry.id === agentTask.id && entry.status === "done"), "owner sees completed agent task");
    assert(ownerAfter.tasks.some((entry) => entry.id === failedAgentTask.id && entry.status === "open" && entry.progress === "agent run failed"), "owner sees failed task state");
    const listedRuns = await listWorkspaceAgentRuns(ownerId, { workspaceId: ownerView.workspace.id, threadId: direct.id });
    assert(listedRuns.runs.some((entry) => entry.id === coachTurn.runs[0].id), "DB agent runs can be listed for a thread");
    assert(listedRuns.events.some((entry) => entry.runId === coachTurn.runs[0].id), "DB agent run events can be listed for a thread");
    assert(listedRuns.approvals.some((entry) => entry.id === deniedApproval.approval.id && entry.status === "denied"), "DB agent approvals can be listed for a thread");
    assert(listedRuns.approvals.some((entry) => entry.id === approvedApproval.approval.id && entry.status === "approved"), "DB approved agent approvals can be listed for a thread");
    assert(listedRuns.approvals.some((entry) => entry.id === approvedGuardedTool.approval.id && entry.status === "approved"), "DB approved guarded tool approval can be listed for a thread");
    assert(listedRuns.approvals.some((entry) => entry.id === approvedUpdate.approval.id && entry.status === "approved"), "DB approved update approvals can be listed for a thread");
    const outsiderWorkspaceRuns = await listWorkspaceAgentRuns(outsiderId, { workspaceId: ownerView.workspace.id });
    assert(!outsiderWorkspaceRuns.runs.some((entry) => entry.threadId === direct.id), "DB workspace-level run listing hides private direct runs from non-participants");
    assert(!outsiderWorkspaceRuns.events.some((entry) => entry.threadId === direct.id), "DB workspace-level run event listing hides private direct events from non-participants");
    assert(!outsiderWorkspaceRuns.approvals.some((entry) => entry.threadId === direct.id), "DB workspace-level approval listing hides private direct approvals from non-participants");
    const dbRunDetail = await getWorkspaceAgentRunDetail(ownerId, {
      workspaceId: ownerView.workspace.id,
      runId: coachTurn.runs[0].id,
    });
    assert(dbRunDetail.run.id === coachTurn.runs[0].id, "DB agent run detail returns the requested run");
    assert(dbRunDetail.events.some((entry) => entry.runId === coachTurn.runs[0].id), "DB agent run detail returns persisted events");
    assert(dbRunDetail.inputMessage?.id === coachMention.id, "DB agent run detail returns linked input message");
    assert(dbRunDetail.outputMessage?.id === coachTurn.messages[0].id, "DB agent run detail returns linked output message");
    assert(dbRunDetail.memories?.some((entry) => entry.sourceRunId === coachTurn.runs[0].id), "DB agent run detail returns linked run memories");
    const dbApprovedRunDetail = await getWorkspaceAgentRunDetail(ownerId, {
      workspaceId: ownerView.workspace.id,
      runId: approvedApproval.run.id,
    });
    assert(dbApprovedRunDetail.approvals.some((entry) => entry.id === approvedApproval.approval.id), "DB agent run detail returns linked approval decisions");
    assert(dbApprovedRunDetail.task?.id === approvedApproval.task?.id, "DB agent run detail returns linked task output");
    assert(dbApprovedRunDetail.artifacts?.some((entry) => entry.sourceRunId === approvedApproval.run.id), "DB agent run detail returns linked artifacts");

    const pagedThread = await createWorkspaceThread(ownerId, {
      workspaceId: ownerView.workspace.id,
      type: "room",
      name: "DB paged room",
      description: "pagination DB room",
    });
    for (let index = 1; index <= 65; index += 1) {
      await createWorkspaceMessage(ownerId, {
        workspaceId: ownerView.workspace.id,
        threadId: pagedThread.id,
        content: `paged db message ${index}`,
        senderName: "Workspace Owner",
      });
    }
    const pagedView = await getWorkspaceView(ownerId, ownerView.workspace.id);
    const visiblePagedMessages = pagedView.messages.filter((entry) => entry.threadId === pagedThread.id);
    assert(visiblePagedMessages.length === 50, "DB workspace view limits messages per thread");
    assert(visiblePagedMessages[0].content === "paged db message 16", "DB workspace view keeps newest message window");
    const earlierPage = await listWorkspaceMessages(ownerId, {
      workspaceId: ownerView.workspace.id,
      threadId: pagedThread.id,
      before: visiblePagedMessages[0].createdAt,
      limit: 10,
    });
    assert(earlierPage.messages.length === 10, "DB earlier message page returns requested limit");
    assert(earlierPage.hasMore, "DB earlier message page reports remaining messages");
    assert(earlierPage.messages[0].content === "paged db message 6", "DB earlier message page is chronological");

    const joinerAfter = await getWorkspaceView(joinerId, ownerView.workspace.id);
    assert(joinerAfter.threads.some((thread) => thread.id === direct.id), "joiner participant sees direct");
    assert(joinerAfter.messages.some((entry) => entry.id === message.id), "joiner participant sees direct message");
    assert(
      !joinerAfter.agentProfiles.some((profile) => profile.id === customProfile.id),
      "DB joiner does not see owner's private saved agent profile unless it is added as a workspace member",
    );
    assert(!joinerAfter.agentConnections.some((connection) => connection.id === userConnection.id), "DB joiner does not see owner's personal agent connection");
    const joinerVisibleConnectionIds = new Set(joinerAfter.agentConnections.map((connection) => connection.id));
    const joinerMcpProfile = joinerAfter.agentProfiles.find((profile) => profile.id === mcpProfile.id);
    assert(joinerMcpProfile, "DB joiner sees workspace-visible connected agent profile");
    assert(
      !joinerMcpProfile.capabilities.some((capability) => capability.kind === "mcp_tool" && capability.connectionId === userConnection.id),
      "DB joiner does not see mcp_tool capability metadata for owner's hidden personal connection",
    );
    assert(
      joinerAfter.agentProfiles.every((profile) =>
        profile.capabilities.every((capability) => capability.kind !== "mcp_tool" || joinerVisibleConnectionIds.has(capability.connectionId)),
      ),
      "DB workspace view only exposes mcp_tool capabilities for visible connections",
    );

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
