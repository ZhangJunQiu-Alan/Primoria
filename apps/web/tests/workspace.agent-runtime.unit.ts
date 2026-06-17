#!/usr/bin/env tsx

import { existsSync } from "node:fs";
import { join } from "node:path";
import { AIMessage } from "@langchain/core/messages";
import { fakeModel } from "@langchain/core/testing";
import { tool } from "@langchain/core/tools";
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { z } from "zod";
import {
  WorkspaceToolApprovalRequiredError,
  buildWorkspaceDeepAgentConfig,
  buildWorkspaceAgentRunThreadId,
  buildWorkspaceAgentPrompt,
  buildWorkspaceAgentSubagentConfigs,
  buildWorkspaceDeepAgentCreateParams,
  createWorkspacePostgresDeepAgentPersistenceFactories,
  resolveWorkspaceAgentSkillPath,
  resolveWorkspaceDeepAgentPersistenceMode,
  buildWorkspaceDeepAgentPersistenceDependencies,
  composeWorkspacePlaceholderReply,
  createWorkspaceDeepAgentRunner,
  createWorkspaceDeepAgentFromDependencies,
  buildWorkspaceDeepAgentRuntimeHealth,
  isWorkspaceDeepAgentOperatorAuthorized,
  validateWorkspaceDeepAgentRuntimeEnvironment,
  resolveWorkspaceAgentRuntimeRunner,
  executeWorkspaceAgentRuntime,
  runWorkspaceDeepAgentStream,
  resolveWorkspaceInternalToolPolicies,
  buildWorkspaceDeepAgentApprovalResume,
  resumeWorkspaceDeepAgentApproval,
} from "../src/lib/workspaces/agent-runtime.ts";
import type { WorkspaceAgentApproval, WorkspaceAgentMemory, WorkspaceAgentProfile, WorkspaceMember, WorkspaceMessage, WorkspaceTask, WorkspaceThread } from "../src/lib/workspaces/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  const profile: WorkspaceAgentProfile = {
    id: "agent_profile_socratic",
    workspaceId: "workspace_runtime",
    ownerId: "owner_runtime",
    displayName: "Runtime Coach",
    handle: "runtime-coach",
    description: "Helps learners reason carefully.",
    visibility: "workspace",
    templateKey: "socratic-coach",
    systemPrompt: "Ask guiding questions before giving direct answers.",
    defaultModel: "test-model",
    memoryScope: "thread",
    capabilities: [
      { id: "cap_skill", profileId: "agent_profile_socratic", kind: "skill", source: "system", path: "/skills/socratic-questioning", enabled: true },
      { id: "cap_workspace_skill", profileId: "agent_profile_socratic", kind: "skill", source: "workspace", path: "/workspace-skills/workspace_runtime/runtime-peer-review", enabled: true },
      { id: "cap_user_skill", profileId: "agent_profile_socratic", kind: "skill", source: "user", path: "/user-skills/owner_runtime/my-runtime-hints", enabled: true },
      { id: "cap_disabled_skill", profileId: "agent_profile_socratic", kind: "skill", source: "system", path: "/skills/disabled", enabled: false },
      { id: "cap_read_tool", profileId: "agent_profile_socratic", kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      { id: "cap_write_tool", profileId: "agent_profile_socratic", kind: "internal_tool", toolName: "create_workspace_task", approval: "on_risk", enabled: true },
      { id: "cap_unknown_tool", profileId: "agent_profile_socratic", kind: "internal_tool", toolName: "unknown_tool", approval: "never", enabled: true },
      { id: "cap_delegate", profileId: "agent_profile_socratic", kind: "subagent", agentProfileId: "agent_profile_visualizer", enabled: true },
    ],
    createdAt: 1,
    updatedAt: 2,
  };
  const member: WorkspaceMember = {
    id: "member_agent",
    workspaceId: "workspace_runtime",
    displayName: "Runtime Coach",
    role: "Agent",
    status: "active",
    agentProfileId: profile.id,
  };
  const thread: WorkspaceThread = {
    id: "thread_runtime",
    workspaceId: "workspace_runtime",
    type: "room",
    name: "Runtime Room",
    createdAt: 10,
    updatedAt: 11,
  };
  const message: WorkspaceMessage = {
    id: "message_runtime",
    workspaceId: "workspace_runtime",
    threadId: thread.id,
    senderName: "Learner",
    senderKind: "human",
    content: "@Runtime Coach explain gradient descent?",
    createdAt: 12,
  };
  const openTask: WorkspaceTask = {
    id: "task_runtime",
    workspaceId: "workspace_runtime",
    threadId: thread.id,
    title: "Review learning plan",
    scope: "Shared",
    status: "open",
    progress: "new",
    createdAt: 13,
    updatedAt: 14,
  };
  const delegateProfile: WorkspaceAgentProfile = {
    id: "agent_profile_visualizer",
    workspaceId: "workspace_runtime",
    ownerId: "owner_runtime",
    displayName: "Runtime Visualizer",
    handle: "runtime-visualizer",
    description: "Turns ideas into compact visual explanations.",
    visibility: "workspace",
    templateKey: "visualizer",
    systemPrompt: "Use simple diagrams and examples.",
    memoryScope: "thread",
    capabilities: [
      { id: "cap_delegate_skill", profileId: "agent_profile_visualizer", kind: "skill", source: "system", path: "/skills/visual-explainer", enabled: true },
      { id: "cap_delegate_read", profileId: "agent_profile_visualizer", kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      { id: "cap_delegate_write", profileId: "agent_profile_visualizer", kind: "internal_tool", toolName: "share_learning_app", approval: "on_risk", enabled: true },
    ],
    createdAt: 3,
    updatedAt: 4,
  };
  const unselectedDelegateProfile: WorkspaceAgentProfile = {
    ...delegateProfile,
    id: "agent_profile_unselected",
    handle: "runtime-unselected",
    displayName: "Runtime Unselected",
  };
  const runtimeMemories: WorkspaceAgentMemory[] = [
    {
      id: "memory_thread_visible",
      workspaceId: "workspace_runtime",
      threadId: thread.id,
      agentProfileId: profile.id,
      scope: "thread",
      title: "Learner likes hints",
      summary: "Give a small hint before the full answer.",
      createdAt: 20,
      updatedAt: 21,
    },
    {
      id: "memory_workspace_visible",
      workspaceId: "workspace_runtime",
      agentProfileId: profile.id,
      scope: "workspace",
      title: "Project theme",
      summary: "The workspace is focused on calculus intuition.",
      createdAt: 22,
      updatedAt: 23,
    },
    {
      id: "memory_other_thread",
      workspaceId: "workspace_runtime",
      threadId: "thread_other",
      agentProfileId: profile.id,
      scope: "thread",
      title: "Other chat private note",
      summary: "This should not enter the current prompt.",
      createdAt: 24,
      updatedAt: 25,
    },
  ];

  const threadId = buildWorkspaceAgentRunThreadId({
    workspaceId: "workspace_runtime",
    threadId: thread.id,
    agentProfileId: profile.id,
    runId: "run_runtime",
  });
  assert(threadId === "workspace:workspace_runtime:thread:thread_runtime:agent:agent_profile_socratic:run:run_runtime", "runtime thread id is stable and resumable");

  const policies = resolveWorkspaceInternalToolPolicies(profile);
  assert(policies.length === 2, "only known enabled internal tools are exposed");
  assert(policies.some((policy) => policy.toolName === "summarize_thread" && policy.approval === "never"), "read tool keeps never approval");
  assert(policies.some((policy) => policy.toolName === "create_workspace_task" && policy.approval === "on_risk"), "write tool keeps profile approval");
  assert(!policies.some((policy) => policy.toolName === "unknown_tool"), "unknown internal tool is not exposed");

  const prompt = buildWorkspaceAgentPrompt(profile, {
    workspaceName: "Runtime Workspace",
    thread,
    member,
    recentMessages: ["Learner: What is a derivative?"],
    openTasks: [openTask],
    agentMemories: runtimeMemories,
  });
  assert(prompt.includes("Ask guiding questions"), "runtime prompt includes profile system prompt");
  assert(prompt.includes("Helps learners reason carefully."), "runtime prompt includes profile purpose");
  assert(prompt.includes("Runtime Workspace"), "runtime prompt includes workspace context");
  assert(prompt.includes("Review learning plan"), "runtime prompt includes open task context");
  assert(prompt.includes("Learner likes hints"), "runtime prompt includes current thread memory");
  assert(prompt.includes("Project theme"), "runtime prompt includes workspace memory");
  assert(!prompt.includes("Other chat private note"), "runtime prompt excludes memories from other threads");

  const config = buildWorkspaceDeepAgentConfig({
    profile,
    workspaceName: "Runtime Workspace",
    thread,
    member,
    recentMessages: ["Learner: What is a derivative?"],
    openTasks: [openTask],
    agentMemories: runtimeMemories,
    model: "test-model",
    delegateProfiles: [delegateProfile, unselectedDelegateProfile, profile],
  });
  assert(config.name === "runtime-coach", "DeepAgent config uses profile handle as name");
  assert(config.model === "test-model", "DeepAgent config keeps selected model");
  assert(Array.isArray(config.tools) && config.tools.length === 2, "DeepAgent config uses allowed internal tools only");
  assert(config.tools.some((toolSpec) => toolSpec.name === "summarize_thread" && toolSpec.policy.approval === "never"), "activated runtime config keeps read tool approval");
  assert(config.tools.some((toolSpec) => toolSpec.name === "create_workspace_task" && toolSpec.policy.approval === "on_risk"), "activated runtime config keeps risky tool approval");
  assert(!config.tools.some((toolSpec) => toolSpec.name === "unknown_tool"), "activated runtime config excludes unknown tool capabilities");
  const resolvedSocraticSkill = resolveWorkspaceAgentSkillPath("/skills/socratic-questioning");
  assert(resolvedSocraticSkill.endsWith("src/lib/workspaces/skills/socratic-questioning"), "system skill id resolves to local skill directory");
  assert(resolveWorkspaceAgentSkillPath("/skills/missing-skill") === undefined, "unknown system skill is not passed to Deep Agents");
  assert(resolveWorkspaceAgentSkillPath("/custom/user-skill") === undefined, "unknown filesystem-like skill paths are not passed to Deep Agents");
  assert(resolveWorkspaceAgentSkillPath("/workspace-skills/runtime_workspace/custom-skill", { workspaceId: "other_workspace" }) === undefined, "workspace skill ids require matching workspace scope");
  const reusedPersonalProfile: WorkspaceAgentProfile = {
    ...profile,
    visibility: "private",
    capabilities: [
      { id: "cap_workspace_skill_home", profileId: profile.id, kind: "skill", source: "workspace", path: "/workspace-skills/workspace_runtime/runtime-peer-review", enabled: true },
      { id: "cap_user_skill_home", profileId: profile.id, kind: "skill", source: "user", path: "/user-skills/owner_runtime/my-runtime-hints", enabled: true },
      { id: "cap_cross_workspace_delegate", profileId: profile.id, kind: "subagent", agentProfileId: delegateProfile.id, enabled: true },
    ],
  };
  const reusedPersonalConfig = buildWorkspaceDeepAgentConfig({
    profile: reusedPersonalProfile,
    workspaceName: "Second Runtime Workspace",
    thread: { ...thread, workspaceId: "second_runtime_workspace" },
    member: { ...member, workspaceId: "second_runtime_workspace" },
    recentMessages: [],
    openTasks: [],
    agentMemories: [],
    delegateProfiles: [delegateProfile],
  });
  assert(
    !reusedPersonalConfig.skills.includes("/workspace-skills/workspace_runtime/runtime-peer-review") &&
      reusedPersonalConfig.skills.includes("/user-skills/owner_runtime/my-runtime-hints"),
    "reused personal agents keep owner user skills but do not carry a source workspace skill into another workspace run",
  );
  assert(reusedPersonalConfig.subagents.length === 0, "reused personal agents do not carry a source-workspace delegate into another workspace run");
  assert(
    Array.isArray(config.skills) &&
      config.skills.length === 3 &&
      config.skills.includes(resolvedSocraticSkill) &&
      config.skills.includes("/workspace-skills/workspace_runtime/runtime-peer-review") &&
      config.skills.includes("/user-skills/owner_runtime/my-runtime-hints"),
    "DeepAgent config keeps enabled system and scoped custom skills available for runtime preparation",
  );
  assert(profile.capabilities.some((capability) => capability.kind === "skill" && capability.path === "/skills/socratic-questioning"), "profile capability keeps portable skill id");
  assert("systemPrompt" in config, "DeepAgent config uses camelCase systemPrompt");
  assert("interruptOn" in config, "DeepAgent config uses camelCase interruptOn");
  assert(config.interruptOn.create_workspace_task.allowedDecisions.join(",") === "approve,reject", "risky write tools require explicit approve/reject DeepAgent review");
  assert(!config.interruptOn.create_workspace_task.allowedDecisions.includes("edit"), "workspace approvals do not expose DeepAgent edit decisions before Primoria can persist edited args safely");
  assert(config.interruptOn.create_workspace_task.description.includes("Create task"), "DeepAgent review config carries product-visible tool label");
  assert(config.subagents.length === 1, "DeepAgent config exposes only explicitly selected delegate agents");
  assert(config.subagents[0].name === "runtime-visualizer", "DeepAgent subagent uses delegate profile handle");
  assert(config.subagents[0].skills.some((skillPath) => skillPath.endsWith("visual-explainer")), "DeepAgent subagent receives explicit delegate skills");
  assert(config.subagents[0].tools.every((toolSpec) => toolSpec.policy.risk === "read" || toolSpec.policy.approval === "always"), "DeepAgent subagent tools are read-only or approval-forced");
  const directSubagentConfigs = buildWorkspaceAgentSubagentConfigs(profile, [delegateProfile, unselectedDelegateProfile, profile]);
  assert(directSubagentConfigs.length === 1 && directSubagentConfigs[0].name === "runtime-visualizer", "subagent builder rejects self and unselected profiles");

  const deepAgentParamsWithoutInterrupts = buildWorkspaceDeepAgentCreateParams({
    ...config,
    interruptOn: {},
  }, [], [], undefined, undefined);
  assert(!("checkpointer" in deepAgentParamsWithoutInterrupts), "DeepAgent params omit checkpointer when there are no interrupts");
  assert(!("store" in deepAgentParamsWithoutInterrupts), "DeepAgent params omit store until memory backend is configured");
  assert(resolveWorkspaceDeepAgentPersistenceMode({}) === "memory", "DeepAgent persistence defaults to explicit memory mode");
  assert(resolveWorkspaceDeepAgentPersistenceMode({ PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "disabled" }) === "disabled", "DeepAgent persistence supports disabled mode");
  assert(resolveWorkspaceDeepAgentPersistenceMode({ PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres" }) === "postgres", "DeepAgent persistence supports postgres mode");
  assert(resolveWorkspaceDeepAgentPersistenceMode({ PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "weird" }) === "memory", "unknown persistence mode falls back to memory");
  const fakeCheckpointer = { saver: "memory" };
  const fakeStore = { store: "memory" };
  const memoryPersistence = buildWorkspaceDeepAgentPersistenceDependencies({
    mode: "memory",
    MemorySaver: class {
      readonly kind = "memory-checkpointer";
    },
    InMemoryStore: class {
      readonly kind = "memory-store";
    },
    interruptOn: config.interruptOn,
  });
  assert(memoryPersistence.mode === "memory", "memory persistence resolver reports memory mode");
  assert((memoryPersistence.createCheckpointer?.() as any).kind === "memory-checkpointer", "memory persistence creates real checkpointer objects");
  assert((memoryPersistence.createStore?.() as any).kind === "memory-store", "memory persistence creates real store objects");
  const disabledWithoutInterrupts = buildWorkspaceDeepAgentPersistenceDependencies({
    mode: "disabled",
    interruptOn: {},
  });
  assert(disabledWithoutInterrupts.mode === "disabled", "disabled persistence can be selected when there are no interrupts");
  assert(!disabledWithoutInterrupts.createCheckpointer && !disabledWithoutInterrupts.createStore, "disabled persistence returns no checkpointer/store factories");
  let disabledWithInterruptsFailed = false;
  try {
    buildWorkspaceDeepAgentPersistenceDependencies({
      mode: "disabled",
      interruptOn: config.interruptOn,
    });
  } catch (error) {
    disabledWithInterruptsFailed = error instanceof Error && error.message.includes("requires a checkpointer");
  }
  assert(disabledWithInterruptsFailed, "approval-capable DeepAgent configs fail clearly when persistence is disabled");
  let postgresWithoutAdapterFailed = false;
  try {
    buildWorkspaceDeepAgentPersistenceDependencies({
      mode: "postgres",
      databaseUrl: "postgres://example/primoria",
      interruptOn: config.interruptOn,
    });
  } catch (error) {
    postgresWithoutAdapterFailed = error instanceof Error && error.message.includes("Postgres checkpointer adapter");
  }
  assert(postgresWithoutAdapterFailed, "postgres persistence without an available adapter fails clearly instead of silently using memory");
  let postgresSaverSetupCalled = false;
  const postgresPersistence = buildWorkspaceDeepAgentPersistenceDependencies({
    mode: "postgres",
    databaseUrl: "postgres://example/primoria",
    interruptOn: config.interruptOn,
    createPostgresCheckpointer: (databaseUrl) => ({
      kind: "postgres-checkpointer",
      databaseUrl,
      async setup() {
        postgresSaverSetupCalled = true;
      },
    }),
    createPostgresStore: (databaseUrl) => ({ kind: "postgres-store", databaseUrl }),
  });
  assert(postgresPersistence.mode === "postgres", "postgres persistence resolver reports postgres mode");
  const postgresCheckpointer = await postgresPersistence.createCheckpointer?.();
  assert((postgresCheckpointer as any).kind === "postgres-checkpointer", "postgres persistence creates adapter checkpointer objects through injected factory");
  assert((postgresCheckpointer as any).databaseUrl === "postgres://example/primoria", "postgres persistence passes DATABASE_URL to injected checkpointer factory");
  assert(postgresSaverSetupCalled, "postgres persistence runs checkpointer setup before returning the adapter");
  const postgresStore = await postgresPersistence.createStore?.();
  assert((postgresStore as any).kind === "postgres-store", "postgres persistence creates adapter store objects through injected factory");
  assert((postgresStore as any).databaseUrl === "postgres://example/primoria", "postgres persistence passes DATABASE_URL to injected store factory");
  const postgresPackageFactories = createWorkspacePostgresDeepAgentPersistenceFactories({
    PostgresSaver: {
      fromConnString(databaseUrl: string, options?: { schema?: string }) {
        return { kind: "package-postgres-checkpointer", databaseUrl, schema: options?.schema };
      },
    },
    PostgresStore: {
      fromConnString(databaseUrl: string, options?: { schema?: string; ensureTables?: boolean }) {
        return { kind: "package-postgres-store", databaseUrl, schema: options?.schema, ensureTables: options?.ensureTables };
      },
    },
    schema: "primoria_deepagent",
  });
  const packageCheckpointer = await postgresPackageFactories.createPostgresCheckpointer("postgres://example/primoria");
  assert((packageCheckpointer as any).kind === "package-postgres-checkpointer", "postgres package factory creates checkpointer through PostgresSaver.fromConnString");
  assert((packageCheckpointer as any).schema === "primoria_deepagent", "postgres package factory passes schema to checkpointer");
  const packageStore = await postgresPackageFactories.createPostgresStore?.("postgres://example/primoria");
  assert((packageStore as any).kind === "package-postgres-store", "postgres package factory creates store through PostgresStore.fromConnString");
  assert((packageStore as any).ensureTables === true, "postgres package factory asks store adapter to ensure tables");
  let postgresWithoutDatabaseFailed = false;
  try {
    buildWorkspaceDeepAgentPersistenceDependencies({
      mode: "postgres",
      interruptOn: {},
    });
  } catch (error) {
    postgresWithoutDatabaseFailed = error instanceof Error && error.message.includes("DATABASE_URL");
  }
  assert(postgresWithoutDatabaseFailed, "postgres persistence requires DATABASE_URL");
  const fakeConvertedSubagentTool = { name: "converted_summarize_thread" };
  const convertedSubagentParams = [{ ...config.subagents[0], tools: [fakeConvertedSubagentTool] }];
  const deepAgentParamsWithInterrupts = buildWorkspaceDeepAgentCreateParams(config, [], convertedSubagentParams, fakeCheckpointer, fakeStore);
  assert((deepAgentParamsWithInterrupts.interruptOn as any).create_workspace_task.allowedDecisions.join(",") === "approve,reject", "DeepAgent params preserve restricted approval decisions");
  assert(deepAgentParamsWithInterrupts.checkpointer === fakeCheckpointer, "DeepAgent params use a real checkpointer object for interrupts");
  assert(deepAgentParamsWithInterrupts.checkpointer !== true, "DeepAgent params never use boolean true as checkpointer");
  assert(deepAgentParamsWithInterrupts.store === fakeStore, "DeepAgent params pass store when available");
  assert(deepAgentParamsWithInterrupts.skills === config.skills, "DeepAgent params receive resolved skill directories");
  assert(Array.isArray(deepAgentParamsWithInterrupts.subagents) && deepAgentParamsWithInterrupts.subagents.length === 1, "DeepAgent params include configured delegate subagents");
  assert((deepAgentParamsWithInterrupts.subagents as any[])[0].skills.length === 1, "DeepAgent params give custom subagents explicit skills");
  assert((deepAgentParamsWithInterrupts.subagents as any[])[0].tools[0] === fakeConvertedSubagentTool, "DeepAgent params pass converted delegate tools instead of dropping them");
  const fakeSkillBackend = { kind: "filesystem-backend" };
  const deepAgentParamsWithBackend = buildWorkspaceDeepAgentCreateParams(config, [], convertedSubagentParams, fakeCheckpointer, fakeStore, fakeSkillBackend);
  assert(deepAgentParamsWithBackend.backend === fakeSkillBackend, "DeepAgent params attach a backend when skills need filesystem loading");

  assert(resolveWorkspaceAgentRuntimeRunner({ NODE_ENV: "development" }) === undefined, "DeepAgent runner is opt-in by environment flag");
  assert(
    typeof resolveWorkspaceAgentRuntimeRunner({ NODE_ENV: "development", PRIMORIA_WORKSPACE_DEEPAGENT: "1" }) === "function",
    "DeepAgent runner is enabled by PRIMORIA_WORKSPACE_DEEPAGENT=1 outside production",
  );
  const productionWithoutPostgres = validateWorkspaceDeepAgentRuntimeEnvironment({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    DATABASE_URL: "postgres://example/primoria",
    OPENAI_BASE_URL: "https://example.test/v1",
    OPENAI_API_KEY: "test-key",
  });
  assert(productionWithoutPostgres.errors.some((error) => error.includes("PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres")), "production DeepAgent gate requires postgres persistence");
  let productionRunnerWithoutPostgresFailed = false;
  try {
    resolveWorkspaceAgentRuntimeRunner({
      NODE_ENV: "production",
      PRIMORIA_WORKSPACE_DEEPAGENT: "1",
      DATABASE_URL: "postgres://example/primoria",
      OPENAI_BASE_URL: "https://example.test/v1",
      OPENAI_API_KEY: "test-key",
    });
  } catch (error) {
    productionRunnerWithoutPostgresFailed = error instanceof Error && error.message.includes("production readiness check failed");
  }
  assert(productionRunnerWithoutPostgresFailed, "production DeepAgent runner fails fast when readiness checks fail");
  const productionWithoutDatabase = validateWorkspaceDeepAgentRuntimeEnvironment({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
    OPENAI_BASE_URL: "https://example.test/v1",
    OPENAI_API_KEY: "test-key",
  });
  assert(productionWithoutDatabase.errors.some((error) => error.includes("DATABASE_URL")), "production DeepAgent gate requires DATABASE_URL");
  const productionWithFakeHarness = validateWorkspaceDeepAgentRuntimeEnvironment({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
    DATABASE_URL: "postgres://example/primoria",
    OPENAI_BASE_URL: "https://example.test/v1",
    OPENAI_API_KEY: "test-key",
    PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL: "1",
  });
  assert(productionWithFakeHarness.errors.some((error) => error.includes("test harness")), "production DeepAgent gate rejects test harness env");
  const productionWithoutModelCredentials = validateWorkspaceDeepAgentRuntimeEnvironment({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
    DATABASE_URL: "postgres://example/primoria",
    OPENAI_BASE_URL: "https://example.test/v1",
  });
  assert(productionWithoutModelCredentials.errors.some((error) => error.includes("OPENAI_API_KEY")), "production DeepAgent gate requires provider credentials");
  const productionReadyOpenAi = validateWorkspaceDeepAgentRuntimeEnvironment({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
    DATABASE_URL: "postgres://example/primoria",
    OPENAI_BASE_URL: "https://example.test/v1",
    OPENAI_API_KEY: "test-key",
  });
  assert(productionReadyOpenAi.errors.length === 0, "production DeepAgent gate accepts complete openai-compatible configuration");
  assert(typeof resolveWorkspaceAgentRuntimeRunner({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
    DATABASE_URL: "postgres://example/primoria",
    OPENAI_BASE_URL: "https://example.test/v1",
    OPENAI_API_KEY: "test-key",
  }) === "function", "production-ready DeepAgent env returns a runner");
  const productionReadyAnthropic = validateWorkspaceDeepAgentRuntimeEnvironment({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "postgres",
    DATABASE_URL: "postgres://example/primoria",
    AI_PROVIDER: "anthropic-compatible",
    ANTHROPIC_API_KEY: "test-key",
  });
  assert(productionReadyAnthropic.errors.length === 0, "production DeepAgent gate accepts complete anthropic-compatible configuration");
  const disabledHealth = buildWorkspaceDeepAgentRuntimeHealth({ NODE_ENV: "production" });
  assert(disabledHealth.ok === true, "DeepAgent health reports ok when production uses placeholder runtime");
  assert(disabledHealth.runtimeMode === "placeholder", "DeepAgent health exposes placeholder runtime mode without requiring model credentials");
  const misconfiguredHealth = buildWorkspaceDeepAgentRuntimeHealth({
    NODE_ENV: "production",
    PRIMORIA_WORKSPACE_DEEPAGENT: "1",
    PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE: "memory",
    OPENAI_API_KEY: "secret-key-should-not-leak",
  });
  assert(misconfiguredHealth.ok === false, "DeepAgent health reports not ok when enabled production runtime is misconfigured");
  assert(misconfiguredHealth.runtimeMode === "deepagent", "DeepAgent health exposes enabled runtime mode");
  assert(misconfiguredHealth.deepAgent.ready === false, "DeepAgent health marks enabled misconfigured DeepAgent as not ready");
  assert(misconfiguredHealth.deepAgent.errors.some((error) => error.includes("postgres")), "DeepAgent health returns actionable readiness errors");
  assert(!JSON.stringify(misconfiguredHealth).includes("secret-key-should-not-leak"), "DeepAgent health never returns provider secrets");
  assert(
    isWorkspaceDeepAgentOperatorAuthorized(new Headers(), { NODE_ENV: "development" }),
    "DeepAgent health operator authorization is open in non-production for local diagnostics",
  );
  assert(
    !isWorkspaceDeepAgentOperatorAuthorized(new Headers(), { NODE_ENV: "production", PRIMORIA_WORKSPACE_OPERATOR_TOKEN: "operator-secret" }),
    "DeepAgent health operator authorization rejects missing production token",
  );
  assert(
    isWorkspaceDeepAgentOperatorAuthorized(new Headers({ authorization: "Bearer operator-secret" }), { NODE_ENV: "production", PRIMORIA_WORKSPACE_OPERATOR_TOKEN: "operator-secret" }),
    "DeepAgent health operator authorization accepts bearer token in production",
  );
  assert(
    isWorkspaceDeepAgentOperatorAuthorized(new Headers({ "x-primoria-operator-token": "operator-secret" }), { NODE_ENV: "production", PRIMORIA_WORKSPACE_OPERATOR_TOKEN: "operator-secret" }),
    "DeepAgent health operator authorization accepts explicit operator token header in production",
  );

  const reply = composeWorkspacePlaceholderReply({
    profile,
    member,
    prompt: message.content,
    recentMessages: ["Learner: What is a derivative?"],
    openTasks: [openTask],
  });
  assert(reply.includes("Socratic Coach"), "placeholder runtime still preserves template identity");
  assert(reply.includes("Review learning plan"), "placeholder runtime still sees open task context");

  const persistedRunThreadId = buildWorkspaceAgentRunThreadId({
    workspaceId: "workspace_runtime",
    threadId: thread.id,
    agentProfileId: profile.id,
    runId: "warun_persisted",
  });
  assert(
    persistedRunThreadId === "workspace:workspace_runtime:thread:thread_runtime:agent:agent_profile_socratic:run:warun_persisted",
    "persisted runs can derive the same DeepAgent resume thread id",
  );
  const pendingApprovalForResume: WorkspaceAgentApproval = {
    id: "waapr_resume",
    workspaceId: "workspace_runtime",
    threadId: thread.id,
    runId: "warun_persisted",
    agentProfileId: profile.id,
    agentMemberId: member.id,
    toolName: "create_workspace_task",
    status: "pending",
    input: { title: "Practice chain rule" },
    policy: { visibleLabel: "Create task" },
    deepAgentThreadId: persistedRunThreadId,
    requestedAt: 20,
  };
  const approvedResume = buildWorkspaceDeepAgentApprovalResume(pendingApprovalForResume, "approved");
  assert(approvedResume.threadId === persistedRunThreadId, "approval resume reuses persisted DeepAgent thread id");
  assert(approvedResume.command.resume.decisions[0].type === "approve", "approved workspace decision resumes DeepAgent with approve");
  assert(approvedResume.command.resume.decisions.length === 1, "single persisted approval resumes exactly one HITL decision");
  const deniedResume = buildWorkspaceDeepAgentApprovalResume(pendingApprovalForResume, "denied", "Need a smaller task first.");
  assert(deniedResume.command.resume.decisions[0].type === "reject", "denied workspace decision resumes DeepAgent with reject");
  assert(deniedResume.command.resume.decisions[0].message === "Need a smaller task first.", "denied resume carries reviewer feedback for safe fallback");
  let missingThreadResumeFailed = false;
  try {
    buildWorkspaceDeepAgentApprovalResume({ ...pendingApprovalForResume, deepAgentThreadId: undefined }, "approved");
  } catch (error) {
    missingThreadResumeFailed = error instanceof Error && error.message.includes("deepAgentThreadId");
  }
  assert(missingThreadResumeFailed, "DeepAgent approval resume requires the persisted deepAgentThreadId");
  let resumeStreamInput: unknown;
  let resumeStreamThreadId = "";
  const resumed = await resumeWorkspaceDeepAgentApproval(
    {
      streamEvents: (streamInput, streamConfig) => {
        resumeStreamInput = streamInput;
        resumeStreamThreadId = streamConfig.configurable.thread_id;
        return (async function* () {
          yield { event: "on_chat_model_stream", data: { chunk: { content: "Approved " } } };
          yield { event: "on_chat_model_stream", data: { chunk: { content: "and resumed." } } };
          yield { event: "on_chat_model_end", data: { output: { content: "Approved and resumed." } } };
        })();
      },
    },
    pendingApprovalForResume,
    "approved",
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
    },
  );
  assert(resumeStreamThreadId === persistedRunThreadId, "resume runner streams on the persisted DeepAgent thread id");
  assert((resumeStreamInput as any).resume.decisions[0].type === "approve", "resume runner passes Command-like approve payload as stream input");
  assert(resumed.content === "Approved and resumed.", "resume runner uses shared stream adapter for final content");
  assert(resumed.events?.some((event) => event.type === "status" && event.label === "deepagent_resumed"), "resume runner records a resume status event");

  let realDeepAgentToolInvoked = false;
  const realDeepAgentModel = fakeModel()
    .respondWithTools([{ name: "create_workspace_task", args: { title: "Practice chain rule" }, id: "real_approval_tool_call" }])
    .respond(new AIMessage("Practice chain rule task is ready."));
  const realDeepAgentTool = tool(
    async () => {
      realDeepAgentToolInvoked = true;
      return JSON.stringify({ ok: true, taskId: "task_real_deepagent_approval" });
    },
    {
      name: "create_workspace_task",
      description: "Create a workspace task after approval.",
      schema: z.object({ title: z.string() }),
    },
  );
  const realDeepAgent = await createDeepAgent({
    model: realDeepAgentModel,
    tools: [realDeepAgentTool],
    systemPrompt: "Use the task tool when asked.",
    interruptOn: config.interruptOn,
    checkpointer: new MemorySaver(),
    backend: new FilesystemBackend({ rootDir: process.cwd(), virtualMode: true }),
  });
  const realDeepAgentThreadId = `${threadId}:real`;
  const realDeepAgentWaiting = await runWorkspaceDeepAgentStream(
    realDeepAgent,
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId: realDeepAgentThreadId,
      prompt: "Create a practice task.",
      profile,
      member,
    },
  );
  const realApprovalEvent = realDeepAgentWaiting.events?.find((event) => event.type === "approval_request" && event.label === "create_workspace_task");
  assert(realDeepAgentWaiting.status === "waiting_for_approval", "real DeepAgent HITL interrupt is mapped to a waiting run");
  assert(realApprovalEvent, "real DeepAgent HITL interrupt creates a Primoria approval request");
  assert((realApprovalEvent.payload as any).input.title === "Practice chain rule", "real DeepAgent HITL action args are preserved");
  assert(realDeepAgentToolInvoked === false, "real DeepAgent does not execute approval-gated tool before approval");
  const realDeepAgentResumed = await resumeWorkspaceDeepAgentApproval(
    realDeepAgent,
    { ...pendingApprovalForResume, deepAgentThreadId: realDeepAgentThreadId },
    "approved",
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId: realDeepAgentThreadId,
      prompt: "Create a practice task.",
      profile,
      member,
    },
  );
  assert(realDeepAgentToolInvoked, "real DeepAgent approval resume executes the interrupted tool call");
  assert(realDeepAgentResumed.content === "Practice chain rule task is ready.", "real DeepAgent approval resume returns the final model response");
  assert(realDeepAgentResumed.events?.some((event) => event.type === "tool_end" && event.label === "create_workspace_task"), "real DeepAgent approval resume records the approved tool output");

  const executed = await executeWorkspaceAgentRuntime(
    {
      runId: "warun_runtime",
      workspaceId: "workspace_runtime",
      threadId: thread.id,
      profile,
      workspaceName: "Runtime Workspace",
      thread,
      member,
      recentMessages: ["Learner: What is a derivative?"],
      openTasks: [openTask],
      prompt: message.content,
    },
    async (runtimeInput) => ({
      content: `runner saw ${runtimeInput.config.name}`,
      events: [
        {
          type: "status",
          label: "runner_called",
          payload: {
            threadId: runtimeInput.threadId,
            toolCount: runtimeInput.config.tools.length,
          },
        },
      ],
    }),
  );
  assert(executed.content === "runner saw runtime-coach", "runtime executor uses injected runner output");
  assert(
    executed.deepAgentThreadId === "workspace:workspace_runtime:thread:thread_runtime:agent:agent_profile_socratic:run:warun_runtime",
    "runtime executor passes stable DeepAgent thread id",
  );
  assert(executed.events?.some((event) => event.label === "runner_called"), "runtime executor returns runner events");
  assert(!executed.agentEvents?.some((event) => event.type === "memory.candidate"), "memory extraction is disabled by default");

  const executedWithMemoryCandidate = await executeWorkspaceAgentRuntime(
    {
      runId: "warun_runtime_memory",
      workspaceId: "workspace_runtime",
      threadId: thread.id,
      profile,
      workspaceName: "Runtime Workspace",
      thread,
      member,
      recentMessages: ["Learner: Please remember I like hints."],
      openTasks: [openTask],
      prompt: "Remember the learner likes hints.",
      memoryPipeline: {
        enabled: true,
        extractor: () => [
          {
            title: "Learner preference",
            summary: "The learner likes short hints before full answers.",
            scope: "thread",
            confidence: 0.9,
            source: { extractor: "fake-test" },
          },
        ],
      },
    },
    async () => ({ content: "noted", status: "completed", events: [] }),
  );
  const memoryCandidateEvent = executedWithMemoryCandidate.agentEvents?.find((event) => event.type === "memory.candidate");
  assert(memoryCandidateEvent?.type === "memory.candidate", "enabled fake extractor emits a memory candidate AgentEvent");
  assert(
    !executedWithMemoryCandidate.events?.some((event) => event.type === "tool_end" && event.label === "save_agent_memory"),
    "memory candidate extraction remains separate from manual save-memory approvals",
  );

  async function* streamEvents() {
    yield { event: "on_tool_start", name: "summarize_thread", data: { input: { query: "derivative" } } };
    yield { event: "on_chat_model_stream", data: { chunk: { content: "Use " } } };
    yield { event: "on_chat_model_stream", data: { chunk: { content: "the slope." } } };
    yield { event: "on_tool_end", name: "summarize_thread", data: { output: "summary complete" } };
    yield { event: "on_chat_model_end", data: { output: { content: "Use the slope." } } };
  }
  const streamed = await runWorkspaceDeepAgentStream(
    {
      streamEvents: () => streamEvents(),
    },
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: ["Learner: What is a derivative?"],
        openTasks: [openTask],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
    },
  );
  assert(streamed.content === "Use the slope.", "DeepAgent stream adapter returns final content");
  assert(streamed.events?.some((event) => event.type === "message_delta" && event.label === "assistant_delta"), "DeepAgent stream adapter records message deltas");
  assert(streamed.events?.some((event) => event.type === "tool_start" && event.label === "summarize_thread"), "DeepAgent stream adapter records tool start");
  assert(streamed.events?.some((event) => event.type === "tool_end" && event.label === "summarize_thread"), "DeepAgent stream adapter records tool end");

  async function* subagentStreamEvents() {
    yield { event: "on_tool_start", name: "task", data: { input: { subagent_name: "runtime-visualizer", description: "Sketch the concept" } } };
    yield { event: "on_tool_end", name: "task", data: { output: "Visualizer produced a compact sketch." } };
    yield { event: "on_chat_model_end", data: { output: { content: "I asked the visualizer to help." } } };
  }
  const delegated = await runWorkspaceDeepAgentStream(
    {
      streamEvents: () => subagentStreamEvents(),
    },
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
    },
  );
  assert(delegated.events?.some((event) => event.type === "subagent_start" && event.label === "runtime-visualizer"), "DeepAgent task tool start maps to subagent_start");
  assert(delegated.events?.some((event) => event.type === "subagent_end" && event.label === "runtime-visualizer"), "DeepAgent task tool end maps to subagent_end");
  assert(!delegated.events?.some((event) => event.type === "tool_start" && event.label === "task"), "DeepAgent task delegation is not shown as a generic tool_start");

  async function* todoStreamEvents() {
    yield { event: "on_tool_start", name: "write_todos", data: { input: { todos: [{ content: "Explain slope", status: "in_progress" }] } } };
    yield { event: "on_tool_end", name: "write_todos", data: { output: { todos: [{ content: "Explain slope", status: "completed" }] } } };
    yield { event: "on_chat_model_end", data: { output: { content: "Planned the next learning steps." } } };
  }
  const planned = await runWorkspaceDeepAgentStream(
    {
      streamEvents: () => todoStreamEvents(),
    },
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
    },
  );
  assert(planned.events?.some((event) => event.type === "todo" && event.label === "write_todos"), "DeepAgent write_todos maps to todo run events");
  assert(!planned.events?.some((event) => event.type === "tool_start" && event.label === "write_todos"), "DeepAgent write_todos is not shown as generic tool_start");
  assert(!planned.events?.some((event) => event.type === "tool_end" && event.label === "write_todos"), "DeepAgent write_todos is not shown as generic tool_end");

  let missingDependencyCheckpointerFailed = false;
  try {
    await createWorkspaceDeepAgentFromDependencies(
      {
        createDeepAgent: () => ({
          streamEvents: async function* () {},
        }),
        tool: (func, fields) => ({ ...fields, invoke: func }),
      },
      {
        config,
        context: {
          workspaceName: "Runtime Workspace",
          thread,
          member,
          recentMessages: [],
          openTasks: [],
        },
        threadId,
        prompt: message.content,
        profile,
        member,
      },
    );
  } catch (error) {
    missingDependencyCheckpointerFailed = error instanceof Error && error.message.includes("requires a checkpointer");
  }
  assert(missingDependencyCheckpointerFailed, "dependency factory refuses interruptOn without a real checkpointer");

  const createdFromDependencies = await createWorkspaceDeepAgentFromDependencies(
    {
      createDeepAgent: (params) => ({
        streamEvents: async function* () {
          yield { event: "on_chat_model_stream", data: { chunk: { content: `skills:${Array.isArray(params.skills) ? params.skills.length : 0}` } } };
        },
        params,
      }),
      tool: (func, fields) => ({ ...fields, invoke: func }),
      createCheckpointer: () => fakeCheckpointer,
      createStore: () => fakeStore,
    },
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: ["Learner: What is a derivative?"],
        openTasks: [openTask],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
      deepAgentBackend: fakeSkillBackend,
    },
  );
  assert((createdFromDependencies as any).params.checkpointer === fakeCheckpointer, "default factory dependency path attaches checkpointer object");
  assert((createdFromDependencies as any).params.store === fakeStore, "default factory dependency path attaches store object");
  assert((createdFromDependencies as any).params.backend === fakeSkillBackend, "default factory dependency path attaches skill filesystem backend");
  assert((createdFromDependencies as any).params.tools.length === 2, "default factory dependency path converts guarded tools");
  assert((createdFromDependencies as any).params.subagents[0].tools.length === config.subagents[0].tools.length, "default factory dependency path converts delegate guarded tools");
  assert((createdFromDependencies as any).params.subagents[0].tools.every((entry: any) => typeof entry.invoke === "function"), "converted delegate tools are invokable by DeepAgent");
  const delegateToolOutput = await (createdFromDependencies as any).params.subagents[0].tools[0].invoke({ limit: 1 });
  assert(delegateToolOutput.includes("Delegated context"), "converted delegate tool stays bound to delegated runtime context");

  const optInRunner = createWorkspaceDeepAgentRunner(async (runtimeInput) => {
    const summarizeTool = runtimeInput.config.tools.find((entry) => entry.name === "summarize_thread");
    assert(summarizeTool?.invoke, "opt-in DeepAgent runner receives invokable guarded tools");
    assert(runtimeInput.deepAgentBackend, "opt-in DeepAgent runner prepares a backend for selected skills");
    assert((runtimeInput.deepAgentBackend as any).type === "filesystem", "opt-in DeepAgent runner stages skills behind a filesystem backend descriptor");
    assert(existsSync(join((runtimeInput.deepAgentBackend as any).rootDir, "skills/main/socratic-questioning/SKILL.md")), "opt-in DeepAgent runner stages main SKILL.md where DeepAgent can scan it");
    assert(existsSync(join((runtimeInput.deepAgentBackend as any).rootDir, "skills/runtime-visualizer/visual-explainer/SKILL.md")), "opt-in DeepAgent runner stages subagent SKILL.md where DeepAgent can scan it");
    assert(runtimeInput.config.skills.length === 1 && runtimeInput.config.skills[0] === "/skills/main/", "opt-in DeepAgent runner passes staged skill source paths, not individual skill ids");
    assert(runtimeInput.config.subagents[0].skills.length === 1 && runtimeInput.config.subagents[0].skills[0] === "/skills/runtime-visualizer/", "opt-in DeepAgent runner gives custom subagents explicit staged skill sources");
    const toolOutput = await summarizeTool.invoke({ limit: 1 });
    assert(toolOutput.includes("Runtime Room"), "guarded tool can read runtime context inside DeepAgent runner");
    return {
      streamEvents: async function* () {
        yield { event: "on_chat_model_stream", data: { chunk: { content: "Runner " } } };
        yield { event: "on_chat_model_stream", data: { chunk: { content: "wired." } } };
      },
    };
  });
  const optInResult = await optInRunner({
    config,
    context: {
      workspaceName: "Runtime Workspace",
      thread,
      member,
      recentMessages: ["Learner: What is a derivative?"],
      openTasks: [openTask],
    },
    threadId,
    prompt: message.content,
    profile,
    member,
  });
  assert(optInResult.content === "Runner wired.", "opt-in DeepAgent runner streams through the shared adapter");

  const originalFakeModelFlag = process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL;
  const originalFakeToolCall = process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL;
  process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL = "1";
  process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL = "external_approval";
  const testHarnessRunner = createWorkspaceDeepAgentRunner(async (runtimeInput) => {
    const testTool = runtimeInput.config.tools.find((entry) => entry.name === "mcp_test_search_sources");
    assert(testTool?.policy.risk === "external", "test DeepAgent harness adds only an external-risk guarded test tool");
    assert(runtimeInput.config.interruptOn.mcp_test_search_sources?.allowedDecisions.join(",") === "approve,reject", "test DeepAgent harness tool requires HITL approval");
    return {
      streamEvents: async function* () {
        yield { event: "on_chat_model_end", data: { output: { content: "Harness checked." } } };
      },
    };
  });
  const testHarnessResult = await testHarnessRunner({
    config,
    context: {
      workspaceName: "Runtime Workspace",
      thread,
      member,
      recentMessages: [],
      openTasks: [],
    },
    threadId: `${threadId}:test-harness`,
    prompt: "Search sources with the test harness.",
    profile,
    member,
  });
  assert(testHarnessResult.content === "Harness checked.", "test DeepAgent harness stays compatible with the shared stream adapter");
  if (originalFakeModelFlag === undefined) delete process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL;
  else process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL = originalFakeModelFlag;
  if (originalFakeToolCall === undefined) delete process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL;
  else process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL = originalFakeToolCall;

  async function* approvalStreamEvents() {
    const riskyTool = config.tools.find((entry) => entry.name === "create_workspace_task");
    assert(riskyTool, "test profile exposes risky task tool");
    throw new WorkspaceToolApprovalRequiredError(riskyTool.policy, { title: "Make a practice worksheet" });
  }
  const approvalRequest = await runWorkspaceDeepAgentStream(
    {
      streamEvents: () => approvalStreamEvents(),
    },
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
    },
  );
  assert(approvalRequest.status === "waiting_for_approval", "tool approval interrupts become waiting runs");
  assert(!approvalRequest.error, "tool approval interrupt is not treated as a runtime failure");
  assert(approvalRequest.events?.some((event) => event.type === "approval_request" && event.label === "create_workspace_task"), "approval interrupt creates approval_request event");

  async function* langGraphHitlInterruptEvents() {
    yield {
      event: "on_chain_stream",
      data: {
        chunk: {
          __interrupt__: [
            {
              value: {
                actionRequests: [
                  {
                    name: "create_workspace_task",
                    args: { title: "Practice chain rule" },
                    description: "Create task requires workspace approval before changing workspace state.",
                  },
                ],
                reviewConfigs: [
                  { actionName: "create_workspace_task", allowedDecisions: ["approve", "reject"] },
                ],
              },
            },
          ],
        },
      },
    };
  }
  const langGraphApprovalRequest = await runWorkspaceDeepAgentStream(
    {
      streamEvents: () => langGraphHitlInterruptEvents(),
    },
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
    },
  );
  const hitlApprovalEvent = langGraphApprovalRequest.events?.find((event) => event.type === "approval_request" && event.label === "create_workspace_task");
  assert(langGraphApprovalRequest.status === "waiting_for_approval", "LangGraph HITL interrupts become waiting runs");
  assert(hitlApprovalEvent, "LangGraph HITL interrupt creates a Primoria approval_request event");
  assert((hitlApprovalEvent.payload as any).input.title === "Practice chain rule", "LangGraph HITL action args become persisted approval input");
  assert((hitlApprovalEvent.payload as any).policy.visibleLabel === "Create task", "LangGraph HITL approval uses Primoria product policy metadata");
  assert((hitlApprovalEvent.payload as any).reviewConfig.allowedDecisions.join(",") === "approve,reject", "LangGraph HITL review config is preserved for safe resume");

  async function* failingStreamEvents() {
    yield { event: "on_chat_model_stream", data: { chunk: { content: "partial" } } };
    throw new Error("model unavailable");
  }
  const failed = await runWorkspaceDeepAgentStream(
    {
      streamEvents: () => failingStreamEvents(),
    },
    {
      config,
      context: {
        workspaceName: "Runtime Workspace",
        thread,
        member,
        recentMessages: [],
        openTasks: [],
      },
      threadId,
      prompt: message.content,
      profile,
      member,
    },
  );
  assert(failed.content === "partial", "DeepAgent stream adapter preserves partial content on failure");
  assert(failed.error === "model unavailable", "DeepAgent stream adapter returns failure message");
  assert(failed.events?.some((event) => event.type === "status" && event.label === "deepagent_failed"), "DeepAgent stream adapter records failure event");

  process.stdout.write("[workspace.agent-runtime.unit] ALL RUNTIME CHECKS PASSED\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`[workspace.agent-runtime.unit] FAILED: ${(error as Error).message}\n`);
    process.exit(1);
  });
