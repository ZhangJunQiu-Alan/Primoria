import {
  buildWorkspaceGuardedToolSpecs,
  buildWorkspaceToolInterrupts,
  isWorkspaceInternalToolName,
  resolveWorkspaceInternalToolPolicies,
  WORKSPACE_INTERNAL_TOOL_POLICIES,
  WorkspaceToolApprovalRequiredError,
  type WorkspaceGuardedToolSpec,
  type WorkspaceInternalToolVisibleMessage,
  type WorkspaceInternalToolPolicy,
  type WorkspaceToolInterruptConfig,
} from "./agent-tools";
import { buildWorkspaceMcpGuardedToolSpecs } from "./agent-mcp";
import { resolveWorkspaceAgentSkillPath } from "./agent-skill-paths";
import { Command } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";
import { createTutorModel } from "../ai/deepagent/model";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  createWorkspaceAgentSkillBackend,
  cleanupMaterializedWorkspaceAgentSkills,
  deleteStoredWorkspaceAgentSkill,
  listStoredWorkspaceAgentSkillVersions,
  listStoredWorkspaceAgentSkills,
  prepareWorkspaceAgentSkillDirectories,
  runWorkspaceAgentSkillStorageMaintenanceOnce,
  restoreStoredWorkspaceAgentSkillVersion,
  storeWorkspaceAgentSkill,
  updateStoredWorkspaceAgentSkill,
  type WorkspaceAgentSkillStorageOptions,
} from "./agent-skill-storage";
import type { WorkspaceAgentApproval, WorkspaceAgentCapability, WorkspaceAgentConnection, WorkspaceAgentMemory, WorkspaceAgentProfile, WorkspaceAgentRunStatus, WorkspaceMember, WorkspaceMessage, WorkspaceTask, WorkspaceThread } from "./types";

export { WorkspaceToolApprovalRequiredError, resolveWorkspaceInternalToolPolicies } from "./agent-tools";
export { resolveWorkspaceAgentSkillPath } from "./agent-skill-paths";
export { cleanupMaterializedWorkspaceAgentSkills, createWorkspaceAgentSkillBackend, createDbWorkspaceAgentSkillBackend, createLocalWorkspaceAgentSkillBackend, deleteStoredWorkspaceAgentSkill, listStoredWorkspaceAgentSkillVersions, listStoredWorkspaceAgentSkills, materializeWorkspaceAgentSkillMarkdown, prepareWorkspaceAgentSkillDirectories, restoreStoredWorkspaceAgentSkillVersion, runWorkspaceAgentSkillStorageMaintenanceOnce, storeWorkspaceAgentSkill, updateStoredWorkspaceAgentSkill } from "./agent-skill-storage";

export type WorkspaceAgentRunThreadIdInput = {
  workspaceId: string;
  threadId: string;
  agentProfileId: string;
  runId: string;
};

export type WorkspaceAgentRuntimeContext = {
  workspaceName: string;
  thread: WorkspaceThread;
  member: WorkspaceMember;
  recentMessages: string[];
  visibleMessages?: WorkspaceInternalToolVisibleMessage[];
  openTasks: WorkspaceTask[];
  agentMemories?: WorkspaceAgentMemory[];
  agentConnections?: WorkspaceAgentConnection[];
};

export type WorkspaceDeepAgentConfig = {
  name: string;
  model: string;
  tools: WorkspaceGuardedToolSpec[];
  systemPrompt: string;
  skills: string[];
  subagents: WorkspaceDeepAgentSubagentConfig[];
  interruptOn: Record<string, WorkspaceToolInterruptConfig>;
};

export type WorkspacePreparedRuntimeInput = WorkspaceAgentRuntimeRunnerInput & {
  cleanup?: () => Promise<void>;
};

export type WorkspaceDeepAgentConfigInput = WorkspaceAgentRuntimeContext & {
  profile: WorkspaceAgentProfile;
  model?: string;
  delegateProfiles?: WorkspaceAgentProfile[];
};

export type WorkspaceDeepAgentSubagentConfig = {
  name: string;
  description: string;
  systemPrompt: string;
  tools: WorkspaceGuardedToolSpec[];
  skills: string[];
};

type WorkspaceDeepAgentSubagentCreateParams = Omit<WorkspaceDeepAgentSubagentConfig, "tools"> & {
  tools: unknown[];
};

export type WorkspacePlaceholderReplyInput = {
  profile?: WorkspaceAgentProfile;
  member: WorkspaceMember;
  prompt: string;
  recentMessages: string[];
  openTasks: WorkspaceTask[];
};

export type WorkspaceAgentRuntimeEvent = {
  type: "status" | "todo" | "tool_start" | "tool_end" | "subagent_start" | "subagent_end" | "approval_request" | "artifact" | "message_delta";
  label: string;
  payload?: unknown;
};

export type WorkspaceAgentRuntimeRunInput = WorkspaceDeepAgentConfigInput & {
  runId: string;
  workspaceId: string;
  threadId: string;
  prompt: string;
};

export type WorkspaceAgentRuntimeRunnerInput = {
  config: WorkspaceDeepAgentConfig;
  context: WorkspaceAgentRuntimeContext;
  threadId: string;
  prompt: string;
  profile: WorkspaceAgentProfile;
  member: WorkspaceMember;
  resumeCommand?: WorkspaceDeepAgentApprovalResume["command"];
  deepAgentBackend?: unknown;
};

export type WorkspaceAgentRuntimeRunnerResult = {
  content: string;
  status?: WorkspaceAgentRunStatus;
  events?: WorkspaceAgentRuntimeEvent[];
  error?: string;
};

export type WorkspaceAgentRuntimeRunner = (input: WorkspaceAgentRuntimeRunnerInput) => Promise<WorkspaceAgentRuntimeRunnerResult>;

export type WorkspaceAgentRuntimePreparer = (input: WorkspaceAgentRuntimeRunnerInput) => Promise<WorkspaceAgentRuntimeRunnerInput>;

export type WorkspaceDeepAgentStreamEvent = {
  event: string;
  name?: string;
  data?: {
    input?: unknown;
    output?: unknown;
    chunk?: unknown;
  };
};

export type WorkspaceDeepAgentLike = {
  streamEvents: (
    input: unknown,
    config: { configurable: { thread_id: string }; version: "v2" },
  ) => AsyncIterable<WorkspaceDeepAgentStreamEvent>;
};


export async function resumeWorkspaceDeepAgentApproval(
  agent: WorkspaceDeepAgentLike,
  approval: WorkspaceAgentApproval,
  decision: WorkspaceDeepAgentApprovalDecision,
  input: WorkspaceAgentRuntimeRunnerInput,
  reason?: string,
): Promise<WorkspaceAgentRuntimeRunnerResult> {
  const resume = buildWorkspaceDeepAgentApprovalResume(approval, decision, reason);
  const result = await runWorkspaceDeepAgentStream(agent, {
    ...input,
    threadId: resume.threadId,
    resumeCommand: resume.command,
  });
  return {
    ...result,
    events: [
      {
        type: "status",
        label: "deepagent_resumed",
        payload: {
          deepAgentThreadId: resume.threadId,
          approvalId: approval.id,
          decision,
        },
      },
      ...(result.events ?? []),
    ],
  };
}

export type WorkspaceDeepAgentFactory = (input: WorkspaceAgentRuntimeRunnerInput) => Promise<WorkspaceDeepAgentLike> | WorkspaceDeepAgentLike;

export type WorkspaceDeepAgentDependencies = {
  createDeepAgent: (params: Record<string, unknown>) => Promise<WorkspaceDeepAgentLike> | WorkspaceDeepAgentLike;
  tool: (func: (args: unknown) => Promise<string>, fields: { name: string; description: string; schema: Record<string, unknown> }) => unknown;
  createCheckpointer?: () => unknown | Promise<unknown>;
  createStore?: () => unknown | Promise<unknown>;
  createFilesystemBackend?: (options: { rootDir: string; virtualMode: boolean }) => unknown;
};

export type WorkspaceDeepAgentPersistenceMode = "memory" | "postgres" | "disabled";

export type WorkspaceDeepAgentPersistenceInput = {
  mode?: WorkspaceDeepAgentPersistenceMode;
  databaseUrl?: string;
  interruptOn: Record<string, WorkspaceToolInterruptConfig>;
  MemorySaver?: new () => unknown;
  InMemoryStore?: new () => unknown;
  PostgresSaver?: new (options: { connectionString: string }) => unknown;
  PostgresStore?: new (options: { connectionString: string }) => unknown;
  createPostgresCheckpointer?: (databaseUrl: string) => unknown | Promise<unknown>;
  createPostgresStore?: (databaseUrl: string) => unknown | Promise<unknown>;
};

export type WorkspaceDeepAgentPersistenceDependencies = {
  mode: WorkspaceDeepAgentPersistenceMode;
  createCheckpointer?: () => unknown | Promise<unknown>;
  createStore?: () => unknown | Promise<unknown>;
};

export type WorkspaceDeepAgentRuntimeEnvironmentValidation = {
  enabled: boolean;
  production: boolean;
  persistenceMode: WorkspaceDeepAgentPersistenceMode;
  errors: string[];
};

export type WorkspaceDeepAgentRuntimeHealth = {
  ok: boolean;
  runtimeMode: "placeholder" | "deepagent";
  deepAgent: WorkspaceDeepAgentRuntimeEnvironmentValidation & {
    ready: boolean;
  };
  checks: Array<{
    name: string;
    ok: boolean;
    message: string;
  }>;
};

type WorkspacePostgresSaverModule = {
  fromConnString: (databaseUrl: string, options?: { schema?: string }) => unknown | Promise<unknown>;
};

type WorkspacePostgresStoreModule = {
  fromConnString: (databaseUrl: string, options?: { schema?: string; ensureTables?: boolean }) => unknown | Promise<unknown>;
};

export type WorkspacePostgresDeepAgentPersistenceFactoryInput = {
  PostgresSaver: WorkspacePostgresSaverModule;
  PostgresStore?: WorkspacePostgresStoreModule;
  schema?: string;
};


export type WorkspaceDeepAgentApprovalDecision = "approved" | "denied";

export type WorkspaceDeepAgentApprovalResume = {
  threadId: string;
  command: {
    resume: {
      decisions: Array<{ type: "approve" } | { type: "reject"; message?: string }>;
    };
  };
};

export function buildWorkspaceDeepAgentApprovalResume(
  approval: WorkspaceAgentApproval,
  decision: WorkspaceDeepAgentApprovalDecision,
  reason?: string,
): WorkspaceDeepAgentApprovalResume {
  if (!approval.deepAgentThreadId) {
    throw new Error("Workspace DeepAgent approval resume requires a persisted deepAgentThreadId.");
  }
  const trimmedReason = reason?.trim() || approval.decisionReason?.trim() || undefined;
  return {
    threadId: approval.deepAgentThreadId,
    command: {
      resume: {
        decisions: [
          decision === "approved"
            ? { type: "approve" }
            : { type: "reject", ...(trimmedReason ? { message: trimmedReason } : {}) },
        ],
      },
    },
  };
}

export function buildWorkspaceAgentRunThreadId(input: WorkspaceAgentRunThreadIdInput) {
  return `workspace:${input.workspaceId}:thread:${input.threadId}:agent:${input.agentProfileId}:run:${input.runId}`;
}

export function resolveWorkspaceDeepAgentPersistenceMode(env: Record<string, string | undefined> = process.env): WorkspaceDeepAgentPersistenceMode {
  const mode = env.PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE;
  if (mode === "postgres" || mode === "disabled" || mode === "memory") return mode;
  return "memory";
}

export function validateWorkspaceDeepAgentRuntimeEnvironment(
  env: Record<string, string | undefined> = process.env,
): WorkspaceDeepAgentRuntimeEnvironmentValidation {
  const enabled = env.PRIMORIA_WORKSPACE_DEEPAGENT === "1";
  const production = env.NODE_ENV === "production";
  const persistenceMode = resolveWorkspaceDeepAgentPersistenceMode(env);
  const errors: string[] = [];
  if (!enabled) return { enabled, production, persistenceMode, errors };
  if (production) {
    if (env.PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE !== "postgres") {
      errors.push("PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE=postgres is required when PRIMORIA_WORKSPACE_DEEPAGENT=1 in production.");
    }
    if (!env.DATABASE_URL?.trim()) {
      errors.push("DATABASE_URL is required when PRIMORIA_WORKSPACE_DEEPAGENT=1 in production.");
    }
    if (
      env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL === "1" ||
      env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL ||
      env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_NAME
    ) {
      errors.push("DeepAgent test harness env vars must not be enabled in production.");
    }
    const provider = env.AI_PROVIDER?.trim() || "openai-compatible";
    if (provider === "anthropic-compatible") {
      if (!env.ANTHROPIC_API_KEY?.trim()) {
        errors.push("ANTHROPIC_API_KEY is required for AI_PROVIDER=anthropic-compatible in production.");
      }
    } else if (provider === "openai-compatible") {
      if (!env.OPENAI_API_KEY?.trim()) {
        errors.push("OPENAI_API_KEY is required for AI_PROVIDER=openai-compatible in production.");
      }
      if (!env.OPENAI_BASE_URL?.trim()) {
        errors.push("OPENAI_BASE_URL is required for AI_PROVIDER=openai-compatible in production.");
      }
    } else {
      errors.push("AI_PROVIDER must be openai-compatible or anthropic-compatible when PRIMORIA_WORKSPACE_DEEPAGENT=1 in production.");
    }
  }
  return { enabled, production, persistenceMode, errors };
}

export function assertWorkspaceDeepAgentRuntimeEnvironment(env: Record<string, string | undefined> = process.env) {
  const validation = validateWorkspaceDeepAgentRuntimeEnvironment(env);
  if (validation.enabled && validation.errors.length) {
    throw new Error(`Workspace DeepAgent production readiness check failed: ${validation.errors.join(" ")}`);
  }
  return validation;
}

export function buildWorkspaceDeepAgentRuntimeHealth(env: Record<string, string | undefined> = process.env): WorkspaceDeepAgentRuntimeHealth {
  const validation = validateWorkspaceDeepAgentRuntimeEnvironment(env);
  const ready = validation.enabled && validation.errors.length === 0;
  const checks = [
    {
      name: "runtime_mode",
      ok: true,
      message: validation.enabled ? "DeepAgent runtime is enabled." : "Placeholder workspace agent runtime is active.",
    },
    {
      name: "production_persistence",
      ok: !validation.enabled || !validation.production || env.PRIMORIA_WORKSPACE_DEEPAGENT_PERSISTENCE === "postgres",
      message: validation.production ? "Production DeepAgent runtime must use postgres persistence." : "Non-production runtime may use memory persistence.",
    },
    {
      name: "database",
      ok: !validation.enabled || !validation.production || Boolean(env.DATABASE_URL?.trim()),
      message: validation.production ? "Production DeepAgent runtime requires DATABASE_URL." : "Database readiness is not required for local DeepAgent diagnostics.",
    },
    {
      name: "provider_credentials",
      ok: !validation.enabled || !validation.production || !validation.errors.some((error) => error.includes("_API_KEY") || error.includes("OPENAI_BASE_URL")),
      message: validation.production ? "Production DeepAgent runtime requires configured model provider credentials." : "Provider credentials are checked by the model client at call time.",
    },
    {
      name: "test_harness",
      ok: !validation.enabled || !validation.production || !validation.errors.some((error) => error.includes("test harness")),
      message: validation.production ? "Production DeepAgent runtime must not use test harness variables." : "Test harness variables are allowed only outside production.",
    },
  ];
  return {
    ok: !validation.enabled || ready,
    runtimeMode: validation.enabled ? "deepagent" : "placeholder",
    deepAgent: {
      ...validation,
      ready,
    },
    checks,
  };
}

export function isWorkspaceDeepAgentOperatorAuthorized(
  headers: Pick<Headers, "get">,
  env: Record<string, string | undefined> = process.env,
) {
  if (env.NODE_ENV !== "production") return true;
  const expected = env.PRIMORIA_WORKSPACE_OPERATOR_TOKEN?.trim();
  if (!expected) return false;
  const explicitToken = headers.get("x-primoria-operator-token")?.trim();
  const authorization = headers.get("authorization")?.trim();
  const bearerToken = authorization?.replace(/^Bearer\s+/i, "").trim();
  return explicitToken === expected || bearerToken === expected;
}

export function createWorkspacePostgresDeepAgentPersistenceFactories(input: WorkspacePostgresDeepAgentPersistenceFactoryInput) {
  const schema = input.schema?.trim() || "public";
  return {
    createPostgresCheckpointer: (databaseUrl: string) => input.PostgresSaver.fromConnString(databaseUrl, { schema }),
    createPostgresStore: input.PostgresStore
      ? (databaseUrl: string) => input.PostgresStore!.fromConnString(databaseUrl, { schema, ensureTables: true })
      : undefined,
  };
}

export function buildWorkspaceDeepAgentPersistenceDependencies(
  input: WorkspaceDeepAgentPersistenceInput,
): WorkspaceDeepAgentPersistenceDependencies {
  const mode = input.mode ?? "memory";
  const requiresCheckpointer = Object.keys(input.interruptOn).length > 0;
  if (mode === "disabled") {
    if (requiresCheckpointer) {
      throw new Error("Workspace DeepAgent interruptOn requires a checkpointer; persistence cannot be disabled while approvals are configured.");
    }
    return { mode };
  }
  if (mode === "postgres") {
    if (!input.databaseUrl) {
      throw new Error("Workspace DeepAgent postgres persistence requires DATABASE_URL.");
    }
    const createPostgresCheckpointer =
      input.createPostgresCheckpointer ??
      (input.PostgresSaver ? (databaseUrl: string) => new input.PostgresSaver!({ connectionString: databaseUrl }) : undefined);
    if (!createPostgresCheckpointer) {
      throw new Error("Workspace DeepAgent postgres persistence requires a Postgres checkpointer adapter before it can be enabled.");
    }
    const createPostgresStore =
      input.createPostgresStore ??
      (input.PostgresStore ? (databaseUrl: string) => new input.PostgresStore!({ connectionString: databaseUrl }) : undefined);
    return {
      mode,
      createCheckpointer: async () => {
        const checkpointer = await createPostgresCheckpointer(input.databaseUrl!);
        await setupWorkspaceDeepAgentPersistenceObject(checkpointer);
        return checkpointer;
      },
      createStore: createPostgresStore
        ? async () => {
            const store = await createPostgresStore(input.databaseUrl!);
            await setupWorkspaceDeepAgentPersistenceObject(store);
            return store;
          }
        : undefined,
    };
  }
  if (requiresCheckpointer && !input.MemorySaver) {
    throw new Error("Workspace DeepAgent memory persistence requires MemorySaver when interruptOn is configured.");
  }
  return {
    mode: "memory",
    createCheckpointer: input.MemorySaver ? () => new input.MemorySaver!() : undefined,
    createStore: input.InMemoryStore ? () => new input.InMemoryStore!() : undefined,
  };
}

async function setupWorkspaceDeepAgentPersistenceObject(value: unknown) {
  if (!value || typeof value !== "object") return;
  const setup = (value as { setup?: unknown }).setup;
  if (typeof setup === "function") {
    await setup.call(value);
  }
}

export function buildWorkspaceDeepAgentConfig(input: WorkspaceDeepAgentConfigInput): WorkspaceDeepAgentConfig {
  const tools = buildWorkspaceGuardedToolSpecs(input.profile, input);
  const skillOptions = { workspaceId: input.thread.workspaceId, ownerId: input.profile.ownerId };
  return {
    name: input.profile.handle,
    model: input.model ?? input.profile.defaultModel ?? resolveWorkspaceAgentModelLabel(),
    tools,
    systemPrompt: buildWorkspaceAgentPrompt(input.profile, input),
    skills: selectWorkspaceAgentSkillPaths(input.profile, skillOptions),
    subagents: buildWorkspaceAgentSubagentConfigs(input.profile, input.delegateProfiles ?? [], skillOptions),
    interruptOn: buildWorkspaceToolInterrupts(tools.map((toolSpec) => toolSpec.policy)),
  };
}

function resolveWorkspaceAgentModelLabel() {
  const provider = process.env.AI_PROVIDER?.trim() || "openai-compatible";
  return provider === "anthropic-compatible"
    ? process.env.ANTHROPIC_MODEL?.trim() || "claude-3-5-sonnet-latest"
    : process.env.OPENAI_MODEL?.trim() || "gpt-5.4";
}

export function buildWorkspaceAgentPrompt(profile: WorkspaceAgentProfile, context: WorkspaceAgentRuntimeContext) {
  const taskLine = context.openTasks.length
    ? `Open tasks in this chat: ${context.openTasks.map((task) => `${task.title} (${task.status})`).join("; ")}.`
    : "There are no open tasks in this chat.";
  const recentLine = context.recentMessages.length
    ? `Recent chat context:\n${context.recentMessages.join("\n")}`
    : "No recent chat context is available.";
  const toolLine = resolveWorkspaceInternalToolPolicies(profile).length
    ? `Allowed internal tools: ${resolveWorkspaceInternalToolPolicies(profile).map((policy) => `${policy.toolName} (${policy.approval})`).join(", ")}.`
    : "No internal tools are enabled for this agent.";
  const connectionLine = formatWorkspaceAgentConnectionsForPrompt(profile, context);
  const memoryLine = formatWorkspaceAgentMemoriesForPrompt(profile, context);

  return [
    profile.systemPrompt,
    "",
    `You are ${profile.displayName}, a learning teammate in the "${context.workspaceName}" workspace.`,
    `Purpose: ${profile.description}.`,
    `Current chat: ${context.thread.name} (${context.thread.type}).`,
    `Memory scope: ${profile.memoryScope}.`,
    toolLine,
    connectionLine,
    taskLine,
    memoryLine,
    recentLine,
    "",
    "Keep replies concise, useful for learning, and avoid flooding group chat. Ask before using risky tools.",
  ].join("\n");
}

function formatWorkspaceAgentConnectionsForPrompt(profile: WorkspaceAgentProfile, context: WorkspaceAgentRuntimeContext) {
  const connectionById = new Map((context.agentConnections ?? []).filter((connection) => connection.status !== "disabled").map((connection) => [connection.id, connection]));
  const enabledTools = profile.capabilities.flatMap((capability) => {
    if (capability.kind !== "mcp_tool" || !capability.enabled) return [];
    const connection = connectionById.get(capability.connectionId);
    if (!connection || !connection.allowedToolNames.includes(capability.toolName)) return [];
    return [`${connection.displayName}:${capability.toolName} (${capability.approval})`];
  });
  return enabledTools.length ? `Allowed external connection tools: ${enabledTools.join(", ")}.` : "No external connection tools are enabled for this agent.";
}

function formatWorkspaceAgentMemoriesForPrompt(profile: WorkspaceAgentProfile, context: WorkspaceAgentRuntimeContext) {
  const memories = (context.agentMemories ?? [])
    .filter((memory) => memory.agentProfileId === profile.id)
    .filter((memory) => !memory.archivedAt)
    .filter((memory) => memory.scope !== "thread" || memory.threadId === context.thread.id)
    .slice(0, 5);
  if (!memories.length) return "No reviewable agent memories are available for this run.";
  return `Reviewable agent memories:\n${memories.map((memory) => `- [${memory.scope}] ${memory.title}: ${memory.summary}`).join("\n")}`;
}

export function selectWorkspaceAgentSkillPaths(profile: WorkspaceAgentProfile, options: WorkspaceAgentSkillStorageOptions = {}) {
  return profile.capabilities.flatMap((capability) => {
    if (capability.kind !== "skill" || !capability.enabled) return [];
    const resolved = resolveWorkspaceAgentSkillPath(capability.path, options);
    if (resolved) return [resolved];
    return isScopedPortableSkillPathForProfile(capability.path, profile, options) ? [capability.path] : [];
  });
}

function isScopedPortableSkillPathForProfile(skillPath: string, profile: WorkspaceAgentProfile, options: WorkspaceAgentSkillStorageOptions = {}) {
  const workspaceId = options.workspaceId ?? profile.workspaceId;
  const ownerId = options.ownerId ?? profile.ownerId;
  if (workspaceId && skillPath.startsWith(`/workspace-skills/${workspaceId}/`)) return true;
  if (ownerId && skillPath.startsWith(`/user-skills/${ownerId}/`)) return true;
  return false;
}

export function selectWorkspaceAgentDelegateProfileIds(profile: WorkspaceAgentProfile) {
  return dedupeStrings(
    profile.capabilities.flatMap((capability) => (capability.kind === "subagent" && capability.enabled ? [capability.agentProfileId] : [])),
  );
}

export function buildWorkspaceAgentSubagentConfigs(
  profile: WorkspaceAgentProfile,
  candidateProfiles: WorkspaceAgentProfile[],
  options: WorkspaceAgentSkillStorageOptions = {},
): WorkspaceDeepAgentSubagentConfig[] {
  const allowedProfileIds = new Set(selectWorkspaceAgentDelegateProfileIds(profile));
  const workspaceId = options.workspaceId ?? profile.workspaceId;
  return candidateProfiles
    .filter((candidate) => candidate.id !== profile.id)
    .filter((candidate) => candidate.workspaceId === workspaceId)
    .filter((candidate) => allowedProfileIds.has(candidate.id))
    .map((candidate) => ({
      name: candidate.handle,
      description: candidate.description,
      systemPrompt: buildWorkspaceSubagentPrompt(candidate),
      tools: buildWorkspaceSubagentToolSpecs(candidate),
      skills: selectWorkspaceAgentSkillPaths(candidate, options),
    }));
}

function buildWorkspaceSubagentPrompt(profile: WorkspaceAgentProfile) {
  return [
    profile.systemPrompt,
    "",
    `You are ${profile.displayName}, a delegated learning teammate.`,
    `Purpose: ${profile.description}.`,
    `Memory scope: ${profile.memoryScope}.`,
    "Work only on the delegated task, keep output compact, and return useful findings to the parent agent.",
  ].join("\n");
}

function buildWorkspaceSubagentToolSpecs(profile: WorkspaceAgentProfile) {
  return buildWorkspaceGuardedToolSpecs(
    {
      ...profile,
      capabilities: profile.capabilities.map(downgradeSubagentWriteCapability),
    },
    {
      workspaceName: "Delegated workspace context",
      thread: {
        id: "delegated-thread-context",
        workspaceId: profile.workspaceId,
        type: "room",
        name: "Delegated context",
        createdAt: 0,
        updatedAt: 0,
      },
      member: {
        id: "delegated-agent-context",
        workspaceId: profile.workspaceId,
        displayName: profile.displayName,
        role: "Agent",
        agentProfileId: profile.id,
      },
      recentMessages: [],
      openTasks: [],
    },
  ).filter((toolSpec) => toolSpec.policy.risk === "read" || toolSpec.policy.approval === "always");
}

function downgradeSubagentWriteCapability(capability: WorkspaceAgentCapability): WorkspaceAgentCapability {
  if (
    capability.kind === "internal_tool" &&
    capability.approval !== "always" &&
    isWorkspaceInternalToolName(capability.toolName) &&
    WORKSPACE_INTERNAL_TOOL_POLICIES[capability.toolName].risk !== "read"
  ) {
    return { ...capability, approval: "always" };
  }
  if (capability.kind === "mcp_tool" && capability.approval !== "always") {
    return { ...capability, approval: "always" };
  }
  return capability;
}

export async function executeWorkspaceAgentRuntime(
  input: WorkspaceAgentRuntimeRunInput,
  runner: WorkspaceAgentRuntimeRunner = runWorkspacePlaceholderAgent,
): Promise<WorkspaceAgentRuntimeRunnerResult & { deepAgentThreadId: string; config: WorkspaceDeepAgentConfig }> {
  const config = buildWorkspaceDeepAgentConfig(input);
  const deepAgentThreadId = buildWorkspaceAgentRunThreadId({
    workspaceId: input.workspaceId,
    threadId: input.threadId,
    agentProfileId: input.profile.id,
    runId: input.runId,
  });
  const result = await runner({
    config,
    context: input,
    threadId: deepAgentThreadId,
    prompt: input.prompt,
    profile: input.profile,
    member: input.member,
  });
  return {
    content: result.content,
    status: result.status,
    events: result.events ?? [],
    error: result.error,
    deepAgentThreadId,
    config,
  };
}

export function resolveWorkspaceAgentRuntimeRunner(env: Record<string, string | undefined> = process.env): WorkspaceAgentRuntimeRunner | undefined {
  const validation = assertWorkspaceDeepAgentRuntimeEnvironment(env);
  return validation.enabled ? createWorkspaceDeepAgentRunner() : undefined;
}

export function createWorkspaceDeepAgentRunner(factory: WorkspaceDeepAgentFactory = createWorkspaceDeepAgentFromRuntimeInput): WorkspaceAgentRuntimeRunner {
  return async (input) => {
    const preparedInput = await prepareWorkspaceDeepAgentRuntimeInput(input);
    try {
      const agent = await factory(preparedInput);
      return await runWorkspaceDeepAgentStream(agent, preparedInput);
    } finally {
      await preparedInput.cleanup?.();
    }
  };
}

async function prepareWorkspaceDeepAgentRuntimeInput(input: WorkspaceAgentRuntimeRunnerInput): Promise<WorkspacePreparedRuntimeInput> {
  const backend = createWorkspaceAgentSkillBackend();
  const skillOptions = {
    workspaceId: input.profile.workspaceId,
    ownerId: input.profile.ownerId,
    backend,
  };
  const mainSkillDirectories = await prepareWorkspaceAgentSkillDirectories(input.config.skills, skillOptions);
  const mcpTools = await buildWorkspaceMcpGuardedToolSpecs({
    profile: input.profile,
    connections: input.context.agentConnections ?? [],
  });
  const subagentSkillDirectories = await Promise.all(
    input.config.subagents.map(async (subagent) => ({
      name: subagent.name,
      directories: await prepareWorkspaceAgentSkillDirectories(subagent.skills, skillOptions),
    })),
  );
  const stagedSkills = stageWorkspaceDeepAgentSkills({
    main: mainSkillDirectories,
    subagents: subagentSkillDirectories,
  });
  const subagentSkillSources = new Map(stagedSkills.subagents.map((entry) => [entry.name, entry.sources]));
  const subagents = input.config.subagents.map((subagent) => ({
    ...subagent,
    skills: subagentSkillSources.get(subagent.name) ?? [],
  }));
  const testTools = buildWorkspaceTestDeepAgentToolSpecs(input);
  const tools = [...input.config.tools, ...mcpTools, ...testTools];
  return {
    ...input,
    deepAgentBackend: input.deepAgentBackend ?? stagedSkills.backend,
    config: {
      ...input.config,
      skills: stagedSkills.main,
      tools,
      subagents,
      interruptOn: buildWorkspaceToolInterrupts(tools.map((toolSpec) => toolSpec.policy)),
    },
    cleanup: async () => {
      for (const toolSpec of mcpTools) await toolSpec.cleanup?.();
      stagedSkills.cleanup();
    },
  };
}

async function createWorkspaceDeepAgentFromRuntimeInput(input: WorkspaceAgentRuntimeRunnerInput): Promise<WorkspaceDeepAgentLike> {
  const [deepagentsModule, toolsModule, langgraphModule] = await Promise.all([
    import("deepagents") as Promise<unknown>,
    import("@langchain/core/tools") as Promise<unknown>,
    import("@langchain/langgraph") as Promise<unknown>,
  ]);
  const { createDeepAgent } = deepagentsModule as {
    createDeepAgent: (params: Record<string, unknown>) => Promise<WorkspaceDeepAgentLike> | WorkspaceDeepAgentLike;
    FilesystemBackend?: new (options: { rootDir: string; virtualMode: boolean }) => unknown;
  };
  const { FilesystemBackend } = deepagentsModule as {
    FilesystemBackend?: new (options: { rootDir: string; virtualMode: boolean }) => unknown;
  };
  const { tool } = toolsModule as {
    tool: (func: (args: unknown) => Promise<string>, fields: { name: string; description: string; schema: Record<string, unknown> }) => unknown;
  };
  const { MemorySaver, InMemoryStore } = langgraphModule as {
    MemorySaver?: new () => unknown;
    InMemoryStore?: new () => unknown;
  };
  const postgresFactories =
    resolveWorkspaceDeepAgentPersistenceMode() === "postgres"
      ? await loadWorkspacePostgresDeepAgentPersistenceFactories()
      : {};
  const persistence = buildWorkspaceDeepAgentPersistenceDependencies({
    mode: resolveWorkspaceDeepAgentPersistenceMode(),
    databaseUrl: process.env.DATABASE_URL,
    interruptOn: input.config.interruptOn,
    MemorySaver,
    InMemoryStore,
    ...postgresFactories,
  });
  const testModel = await resolveWorkspaceTestDeepAgentModel(input);
  const providerModel = testModel ?? createWorkspaceDeepAgentProviderModel();

  return createWorkspaceDeepAgentFromDependencies(
    {
      createDeepAgent: (params) => createDeepAgent({ ...params, model: providerModel }),
      tool,
      createCheckpointer: persistence.createCheckpointer,
      createStore: persistence.createStore,
      createFilesystemBackend: FilesystemBackend ? (options) => new FilesystemBackend(options) : undefined,
    },
    input,
  );
}

function createWorkspaceDeepAgentProviderModel() {
  const model = createTutorModel({}, { streaming: true });
  return process.env.AI_PROVIDER === "anthropic-compatible" ? wrapAnthropicWorkspaceModel(model) : model;
}

function wrapAnthropicWorkspaceModel<T extends object>(model: T): T {
  return new Proxy(model, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (property === "bindTools" && typeof value === "function") {
        return (...args: unknown[]) => wrapAnthropicWorkspaceModel(value.apply(target, args));
      }
      if ((property === "invoke" || property === "stream" || property === "batch") && typeof value === "function") {
        return (input: unknown, ...args: unknown[]) => {
          const normalizedInput =
            property === "batch" && Array.isArray(input)
              ? input.map(normalizeAnthropicWorkspaceInput)
              : normalizeAnthropicWorkspaceInput(input);
          return value.call(target, normalizedInput, ...args);
        };
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

function normalizeAnthropicWorkspaceInput(input: unknown): unknown {
  if (Array.isArray(input)) return normalizeAnthropicWorkspaceMessages(input);
  if (input && typeof input === "object" && Array.isArray((input as { messages?: unknown }).messages)) {
    return {
      ...input,
      messages: normalizeAnthropicWorkspaceMessages((input as { messages: unknown[] }).messages),
    };
  }
  return input;
}

function normalizeAnthropicWorkspaceMessages(messages: unknown[]) {
  let firstSystemKept = false;
  return messages.map((message, index) => {
    if (!isWorkspaceSystemMessage(message)) return message;
    if (index === 0 && !firstSystemKept) {
      firstSystemKept = true;
      return message;
    }
    return new HumanMessage(`System instruction for this workspace run:\n${workspaceMessageContentToText(message)}`);
  });
}

function isWorkspaceSystemMessage(message: unknown) {
  return Boolean(
    message &&
      typeof message === "object" &&
      typeof (message as { _getType?: unknown })._getType === "function" &&
      (message as { _getType: () => string })._getType() === "system",
  );
}

function workspaceMessageContentToText(message: unknown) {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
}

function isWorkspaceTestDeepAgentHarnessEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FAKE_MODEL === "1";
}

function workspaceTestDeepAgentToolName() {
  return process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_NAME?.trim() || "mcp_test_search_sources";
}

function buildWorkspaceTestDeepAgentToolSpecs(input: WorkspaceAgentRuntimeRunnerInput): WorkspaceGuardedToolSpec[] {
  if (!isWorkspaceTestDeepAgentHarnessEnabled()) return [];
  const toolName = workspaceTestDeepAgentToolName();
  return [
    {
      name: toolName,
      description: "Test-only external source lookup for DeepAgent runtime smoke tests.",
      policy: {
        toolName,
        risk: "external",
        approval: "always",
        scopes: ["connections:test"],
        visibleLabel: "Test source search",
        description: "Test-only external source lookup.",
      },
      invoke: async (rawInput?: unknown) => {
        const inputRecord = readObject(rawInput);
        const query = readOptionalString(inputRecord.query) || input.prompt || "workspace query";
        return JSON.stringify({
          ok: true,
          summary: `Test source result for "${query}".`,
          connection: { id: "test-deepagent-connection", displayName: "Test source search" },
          toolName,
          input: { query },
        });
      },
    },
  ];
}

async function resolveWorkspaceTestDeepAgentModel(input: WorkspaceAgentRuntimeRunnerInput) {
  if (!isWorkspaceTestDeepAgentHarnessEnabled()) return undefined;
  const [{ fakeModel }, { AIMessage }] = await Promise.all([
    import("@langchain/core/testing") as Promise<{ fakeModel: () => any }>,
    import("@langchain/core/messages") as Promise<{ AIMessage: new (content: string) => unknown }>,
  ]);
  const finalResponse =
    process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_FINAL_RESPONSE?.trim() ||
    `Test DeepAgent response from ${input.profile.displayName}.`;
  const model = fakeModel();
  if (input.resumeCommand) return model.respond(new AIMessage(finalResponse));
  if (process.env.PRIMORIA_WORKSPACE_DEEPAGENT_TEST_TOOL_CALL === "external_approval") {
    return model
      .respondWithTools([
        {
          name: workspaceTestDeepAgentToolName(),
          args: { query: input.prompt || "workspace query" },
          id: "test_deepagent_external_call",
        },
      ])
      .respond(new AIMessage(finalResponse));
  }
  return model.respond(new AIMessage(finalResponse));
}

async function loadWorkspacePostgresDeepAgentPersistenceFactories() {
  const [checkpointModule, storeModule] = await Promise.all([
    import("@langchain/langgraph-checkpoint-postgres") as Promise<unknown>,
    import("@langchain/langgraph-checkpoint-postgres/store") as Promise<unknown>,
  ]);
  const { PostgresSaver } = checkpointModule as { PostgresSaver?: WorkspacePostgresSaverModule };
  const { PostgresStore } = storeModule as { PostgresStore?: WorkspacePostgresStoreModule };
  if (!PostgresSaver) {
    throw new Error("Workspace DeepAgent postgres persistence requires @langchain/langgraph-checkpoint-postgres PostgresSaver.");
  }
  return createWorkspacePostgresDeepAgentPersistenceFactories({
    PostgresSaver,
    PostgresStore,
    schema: process.env.PRIMORIA_WORKSPACE_DEEPAGENT_POSTGRES_SCHEMA,
  });
}

export async function createWorkspaceDeepAgentFromDependencies(
  dependencies: WorkspaceDeepAgentDependencies,
  input: WorkspaceAgentRuntimeRunnerInput,
): Promise<WorkspaceDeepAgentLike> {
  const tools = convertWorkspaceGuardedTools(dependencies, input.config.tools);
  const interruptNames = Object.keys(input.config.interruptOn);
  const checkpointer = interruptNames.length ? await dependencies.createCheckpointer?.() : undefined;
  if (interruptNames.length && !checkpointer) {
    throw new Error("Workspace DeepAgent interruptOn requires a checkpointer; dependency factory did not provide one.");
  }
  const store = await dependencies.createStore?.();
  const backend = resolveWorkspaceDeepAgentBackend(dependencies, input.deepAgentBackend);
  const subagentCreateParams: WorkspaceDeepAgentSubagentCreateParams[] = input.config.subagents.map((subagent) => ({
    ...subagent,
    tools: convertWorkspaceGuardedTools(dependencies, subagent.tools),
  }));
  const agent = await dependencies.createDeepAgent(buildWorkspaceDeepAgentCreateParams(input.config, tools, subagentCreateParams, checkpointer, store, backend));
  return agent;
}

function resolveWorkspaceDeepAgentBackend(dependencies: WorkspaceDeepAgentDependencies, backend: unknown) {
  const descriptor = readObject(backend);
  if (descriptor.type === "filesystem") {
    const rootDir = readOptionalString(descriptor.rootDir);
    if (!rootDir) return undefined;
    if (!dependencies.createFilesystemBackend) {
      throw new Error("Workspace DeepAgent skills require a filesystem backend adapter.");
    }
    return dependencies.createFilesystemBackend({
      rootDir,
      virtualMode: descriptor.virtualMode !== false,
    });
  }
  return backend;
}

function convertWorkspaceGuardedTools(dependencies: WorkspaceDeepAgentDependencies, toolSpecs: WorkspaceGuardedToolSpec[]) {
  return toolSpecs.map((spec) =>
    dependencies.tool(
      async (args: unknown) => {
        if (!spec.invoke) throw new Error(`${spec.name} is not bound to workspace context.`);
        return spec.invoke(args);
      },
      {
        name: spec.name,
        description: spec.description,
        schema: buildWorkspaceToolSchema(spec.name),
      },
    ),
  );
}

export function buildWorkspaceDeepAgentCreateParams(
  config: WorkspaceDeepAgentConfig,
  tools: unknown[],
  subagentToolsOrCheckpointer?: WorkspaceDeepAgentSubagentCreateParams[] | unknown,
  checkpointerOrStore?: unknown,
  maybeStore?: unknown,
  maybeBackend?: unknown,
) {
  const hasConvertedSubagentParams = Array.isArray(subagentToolsOrCheckpointer);
  const convertedSubagentParams = hasConvertedSubagentParams ? subagentToolsOrCheckpointer : undefined;
  const convertedSubagentTools = convertedSubagentParams?.map((subagent) => subagent.tools);
  const checkpointer = hasConvertedSubagentParams ? checkpointerOrStore : subagentToolsOrCheckpointer;
  const store = hasConvertedSubagentParams ? maybeStore : checkpointerOrStore;
  const backend = hasConvertedSubagentParams ? maybeBackend : maybeStore;
  return {
    name: config.name,
    model: config.model,
    tools,
    systemPrompt: config.systemPrompt,
    subagents: config.subagents.map((subagent, index) => ({
      name: subagent.name,
      description: subagent.description,
      systemPrompt: subagent.systemPrompt,
      tools: convertedSubagentTools?.[index] ?? subagent.tools,
      skills: subagent.skills,
    })),
    skills: config.skills,
    interruptOn: config.interruptOn,
    ...(checkpointer ? { checkpointer } : {}),
    ...(store ? { store } : {}),
    ...(backend ? { backend } : {}),
  };
}

function stageWorkspaceDeepAgentSkills(input: { main: string[]; subagents: Array<{ name: string; directories: string[] }> }) {
  const hasSkills = input.main.length || input.subagents.some((subagent) => subagent.directories.length);
  if (!hasSkills) {
    return {
      main: [] as string[],
      subagents: input.subagents.map((subagent) => ({ name: subagent.name, sources: [] as string[] })),
      backend: undefined,
      cleanup: () => undefined,
    };
  }
  const rootDir = mkdtempSync(join(tmpdir(), "primoria-deepagent-skills-"));
  const stagedSubagents: Array<{ name: string; sources: string[] }> = [];
  const mainSource = stageWorkspaceSkillDirectoryGroup(rootDir, "/skills/main/", input.main);
  for (const subagent of input.subagents) {
    const source = `/skills/${safeSkillSourceName(subagent.name)}/`;
    stagedSubagents.push({
      name: subagent.name,
      sources: stageWorkspaceSkillDirectoryGroup(rootDir, source, subagent.directories),
    });
  }
  return {
    main: mainSource,
    subagents: stagedSubagents,
    backend: { type: "filesystem", rootDir, virtualMode: true },
    cleanup: () => rmSync(rootDir, { recursive: true, force: true }),
  };
}

function stageWorkspaceSkillDirectoryGroup(rootDir: string, source: string, directories: string[]) {
  if (!directories.length) return [];
  const usedNames = new Set<string>();
  for (const directory of directories) {
    const skillName = uniqueStagedSkillName(safeSkillSourceName(basename(directory)), usedNames);
    cpSync(directory, join(rootDir, source, skillName), { recursive: true });
  }
  return [source];
}

function uniqueStagedSkillName(name: string, usedNames: Set<string>) {
  let next = name || "skill";
  let suffix = 2;
  while (usedNames.has(next)) {
    next = `${name}-${suffix}`;
    suffix += 1;
  }
  usedNames.add(next);
  return next;
}

function safeSkillSourceName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "skill";
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values));
}

function buildWorkspaceToolSchema(toolName: string): Record<string, unknown> {
  if (toolName === "search_workspace_messages") {
    return {
      type: "object",
      properties: {
        query: { type: "string", description: "Text to search for in messages visible to this run." },
        limit: { type: "number", description: "Maximum matching messages to return, up to 10." },
      },
      additionalProperties: false,
    };
  }
  if (toolName === "summarize_thread") {
    return {
      type: "object",
      properties: {
        limit: { type: "number", description: "Maximum recent messages to include, up to 12." },
      },
      additionalProperties: false,
    };
  }
  return {
    type: "object",
    properties: {},
    additionalProperties: true,
  };
}

async function runWorkspacePlaceholderAgent(input: WorkspaceAgentRuntimeRunnerInput): Promise<WorkspaceAgentRuntimeRunnerResult> {
  return {
    content: composeWorkspacePlaceholderReply({
      profile: input.profile,
      member: input.member,
      prompt: input.prompt,
      recentMessages: input.context.recentMessages,
      openTasks: input.context.openTasks,
    }),
    events: [
      {
        type: "status",
        label: "runtime_configured",
        payload: {
          model: input.config.model,
          skillCount: input.config.skills.length,
          toolCount: input.config.tools.length,
          deepAgentThreadId: input.threadId,
        },
      },
    ],
  };
}

export async function runWorkspaceDeepAgentStream(
  agent: WorkspaceDeepAgentLike,
  input: WorkspaceAgentRuntimeRunnerInput,
): Promise<WorkspaceAgentRuntimeRunnerResult> {
  const events: WorkspaceAgentRuntimeEvent[] = [
    {
      type: "status",
      label: "deepagent_started",
      payload: {
        deepAgentThreadId: input.threadId,
        model: input.config.model,
        toolCount: input.config.tools.length,
        skillCount: input.config.skills.length,
      },
    },
  ];
  let content = "";
  let activeSubagentName = "subagent";
  let waitingForApproval = false;
  try {
    const streamInput = input.resumeCommand
      ? new Command(input.resumeCommand)
      : {
          messages: [
            { role: "system", content: input.config.systemPrompt },
            { role: "user", content: input.prompt },
          ],
        };
    for await (const event of agent.streamEvents(
      streamInput,
      { configurable: { thread_id: input.threadId }, version: "v2" },
    )) {
      if (event.event === "on_chat_model_stream") {
        const chunk = event.data?.chunk as { content?: unknown } | undefined;
        const text = workspaceModelContentToText(chunk?.content);
        if (!text) continue;
        content += text;
        events.push({
          type: "message_delta",
          label: "assistant_delta",
          payload: { text, content },
        });
      } else if (event.event === "on_chat_model_end") {
        const output = event.data?.output as { content?: unknown } | undefined;
        const text = workspaceModelContentToText(output?.content);
        if (text) content = text;
      } else if (event.event === "on_tool_start") {
        if (event.name === "write_todos") {
          events.push({
            type: "todo",
            label: "write_todos",
            payload: { phase: "start", input: event.data?.input },
          });
        } else if (event.name === "task") {
          activeSubagentName = readSubagentName(event.data?.input);
          events.push({
            type: "subagent_start",
            label: activeSubagentName,
            payload: { input: event.data?.input },
          });
        } else {
          events.push({
            type: "tool_start",
            label: event.name ?? "tool",
            payload: { input: event.data?.input },
          });
        }
      } else if (event.event === "on_tool_end") {
        if (event.name === "write_todos") {
          events.push({
            type: "todo",
            label: "write_todos",
            payload: { phase: "end", output: event.data?.output },
          });
        } else if (event.name === "task") {
          events.push({
            type: "subagent_end",
            label: readSubagentName(event.data?.input, activeSubagentName),
            payload: { input: event.data?.input, output: event.data?.output },
          });
        } else {
          events.push({
            type: "tool_end",
            label: event.name ?? "tool",
            payload: { output: event.data?.output },
          });
        }
      } else {
        const hitlApprovalEvents = buildWorkspaceApprovalEventsFromLangGraphInterrupt(event, input);
        if (hitlApprovalEvents.length) {
          events.push(...hitlApprovalEvents);
          waitingForApproval = true;
        }
      }
    }
  } catch (error) {
    if (error instanceof WorkspaceToolApprovalRequiredError) {
      events.push({
        type: "approval_request",
        label: error.policy.toolName,
        payload: {
          input: error.input,
          policy: error.policy,
          deepAgentThreadId: input.threadId,
        },
      });
      return { content, status: "waiting_for_approval", events };
    }
    const message = error instanceof Error ? error.message : "DeepAgent stream failed.";
    events.push({
      type: "status",
      label: "deepagent_failed",
      payload: {
        deepAgentThreadId: input.threadId,
        error: message,
      },
    });
    return { content, events, error: message };
  }
  if (waitingForApproval) {
    return { content, status: "waiting_for_approval", events };
  }
  events.push({
    type: "status",
    label: "deepagent_completed",
    payload: { deepAgentThreadId: input.threadId },
  });
  return { content, events };
}

function workspaceModelContentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (typeof part === "string") return part;
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string") return text;
      const nested = (part as { content?: unknown }).content;
      return typeof nested === "string" ? nested : "";
    })
    .join("");
}


function buildWorkspaceApprovalEventsFromLangGraphInterrupt(
  event: WorkspaceDeepAgentStreamEvent,
  input: WorkspaceAgentRuntimeRunnerInput,
): WorkspaceAgentRuntimeEvent[] {
  const interrupts = readLangGraphInterruptValues(event);
  if (!interrupts.length) return [];
  return interrupts.flatMap((interruptValue) => {
    const interrupt = readObject(interruptValue);
    const actionRequests = Array.isArray(interrupt.actionRequests) ? interrupt.actionRequests : [];
    const reviewConfigs = Array.isArray(interrupt.reviewConfigs) ? interrupt.reviewConfigs : [];
    return actionRequests.flatMap((actionRequest, index): WorkspaceAgentRuntimeEvent[] => {
      const action = readObject(actionRequest);
      const toolName = readOptionalString(action.name);
      if (!toolName) return [];
      const policy = resolvePrimoriaPolicyForRuntimeTool(input, toolName);
      if (!policy) return [];
      const reviewConfig = readObject(reviewConfigs[index]);
      return [{
        type: "approval_request",
        label: toolName,
        payload: {
          input: "args" in action ? action.args : undefined,
          policy,
          reviewConfig,
          actionDescription: readOptionalString(action.description),
          deepAgentThreadId: input.threadId,
        },
      }];
    });
  });
}

function readLangGraphInterruptValues(event: WorkspaceDeepAgentStreamEvent) {
  const candidates = [event.data?.chunk, event.data?.output, event.data?.input];
  return candidates.flatMap((candidate) => {
    const record = readObject(candidate);
    const interrupts = record.__interrupt__;
    if (!Array.isArray(interrupts)) return [];
    return interrupts.map((interrupt) => readObject(interrupt).value).filter((value) => value !== undefined);
  });
}

function resolvePrimoriaPolicyForRuntimeTool(input: WorkspaceAgentRuntimeRunnerInput, toolName: string): WorkspaceInternalToolPolicy | undefined {
  const configuredTool = input.config.tools.find((tool) => tool.name === toolName);
  if (configuredTool) return configuredTool.policy;
  if (!isWorkspaceInternalToolName(toolName)) return undefined;
  const basePolicy = WORKSPACE_INTERNAL_TOOL_POLICIES[toolName];
  return { ...basePolicy, approval: "always" };
}


function readObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readSubagentName(value: unknown, fallback = "subagent") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const name = record.subagent_name ?? record.subagentName ?? record.name;
  return typeof name === "string" && name.trim() ? name.trim() : fallback;
}

export function composeWorkspacePlaceholderReply(input: WorkspacePlaceholderReplyInput) {
  const trimmedPrompt = stripAgentMention(input.prompt, input.member, input.profile).replace(/\s+/g, " ").trim() || "help with this workspace";
  const taskLine = input.openTasks.length
    ? ` I see ${input.openTasks.length} open task${input.openTasks.length === 1 ? "" : "s"} here: ${input.openTasks.map((task) => task.title).join(", ")}.`
    : "";
  const contextLine = input.recentMessages.length ? " I used the recent thread context before replying." : "";
  const identityLine = input.profile
    ? `As ${input.profile.displayName}${input.profile.templateKey ? ` (${templateLabel(input.profile.templateKey)})` : ""}, ${input.profile.description} `
    : "";
  if (/\?/.test(trimmedPrompt)) {
    return `${identityLine}I read this as a question for ${input.member.displayName}. Short answer: ${summarizePrompt(trimmedPrompt)}.${contextLine}${taskLine}`;
  }
  return `${identityLine}I can take this on: ${summarizePrompt(trimmedPrompt)}.${contextLine}${taskLine} Create or assign a task to me when you want a concrete deliverable.`;
}

export function composeWorkspacePlaceholderTaskResult(agent: WorkspaceMember, task: WorkspaceTask) {
  const scope = task.scope || "Workspace";
  return `${agent.displayName} prepared a first pass for ${scope}: ${summarizePrompt(task.title)}. Next step: review it in this thread and reopen the task if it needs another iteration.`;
}

function stripAgentMention(value: string, agent: WorkspaceMember, profile?: WorkspaceAgentProfile) {
  let next = value.replace(new RegExp(`@${escapeRegExp(agent.displayName)}`, "gi"), "");
  if (profile?.handle) next = next.replace(new RegExp(`@${escapeRegExp(profile.handle)}`, "gi"), "");
  return next.trim();
}

function templateLabel(templateKey: string) {
  const labels: Record<string, string> = {
    "socratic-coach": "Socratic Coach",
    visualizer: "Visualizer",
    examiner: "Examiner",
    "project-mentor": "Project Mentor",
  };
  return labels[templateKey] ?? templateKey;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function summarizePrompt(value: string) {
  const sentence = value.replace(/\s+/g, " ").trim();
  if (sentence.length <= 160) return sentence;
  return `${sentence.slice(0, 157)}...`;
}
