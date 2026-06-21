#!/usr/bin/env tsx

import {
  WORKSPACE_INTERNAL_TOOL_EXECUTORS,
  WORKSPACE_INTERNAL_TOOL_POLICIES,
  WorkspaceToolApprovalRequiredError,
  buildWorkspaceGuardedToolSpecs,
  executeWorkspaceInternalTool,
  requiresWorkspaceToolApproval,
} from "../src/lib/workspaces/agent-tools.ts";
import {
  activateWorkspaceToolManifests,
  createWorkspaceInternalToolRegistry,
  createWorkspaceToolRendererRegistry,
  listWorkspaceInternalToolManifests,
} from "../src/lib/agent-os/tools.ts";
import { executeWorkspaceAgentTaskOperation as executeAgentTaskOperation } from "../src/lib/agent-os/task-tools.ts";
import type { WorkspaceAgentConnection, WorkspaceAgentProfile, WorkspaceMember, WorkspaceTask, WorkspaceThread } from "../src/lib/workspaces/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  assert(
    JSON.stringify(Object.keys(WORKSPACE_INTERNAL_TOOL_POLICIES).sort()) === JSON.stringify(Object.keys(WORKSPACE_INTERNAL_TOOL_EXECUTORS).sort()),
    "every internal tool policy has a typed executor",
  );

  const profile: WorkspaceAgentProfile = {
    id: "agent_profile_tools",
    workspaceId: "workspace_tools",
    ownerId: "owner_tools",
    displayName: "Tool Coach",
    handle: "tool-coach",
    description: "Uses guarded workspace tools.",
    visibility: "workspace",
    systemPrompt: "Use tools carefully.",
    memoryScope: "thread",
    capabilities: [
      { id: "cap_search", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "search_workspace_messages", approval: "never", enabled: true },
      { id: "cap_summary", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      { id: "cap_task", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "create_workspace_task", approval: "on_risk", enabled: true },
      { id: "cap_update_task", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "update_workspace_task", approval: "on_risk", enabled: true },
      { id: "cap_save_artifact", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
      { id: "cap_quiz", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "create_quiz", approval: "never", enabled: true },
      { id: "cap_course", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "generate_course", approval: "always", enabled: true },
      { id: "cap_memory", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "save_agent_memory", approval: "always", enabled: true },
      { id: "cap_disabled", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "unknown_disabled_tool", approval: "always", enabled: false },
    ],
    createdAt: 1,
    updatedAt: 2,
  };
  const member: WorkspaceMember = {
    id: "member_agent",
    workspaceId: "workspace_tools",
    displayName: "Tool Coach",
    role: "Agent",
    agentProfileId: profile.id,
  };
  const thread: WorkspaceThread = {
    id: "thread_tools",
    workspaceId: "workspace_tools",
    type: "room",
    name: "Tool Room",
    createdAt: 1,
    updatedAt: 2,
  };
  const openTask: WorkspaceTask = {
    id: "task_tools",
    workspaceId: "workspace_tools",
    threadId: thread.id,
    title: "Compare derivative and slope",
    scope: "Shared",
    status: "open",
    progress: "new",
    createdAt: 3,
    updatedAt: 4,
  };
  const context = {
    workspaceName: "Tools Workspace",
    thread,
    member,
    recentMessages: [
      "Learner: I understand slope from graphs.",
      "Peer: The derivative is an instantaneous rate of change.",
      "Learner: Can we connect derivative rules to intuition?",
    ],
    visibleMessages: [
      {
        id: "wmsg_slope",
        threadId: thread.id,
        senderName: "Learner",
        content: "I understand slope from graphs.",
        createdAt: 10,
      },
      {
        id: "wmsg_derivative",
        threadId: thread.id,
        senderName: "Peer",
        content: "The derivative is an instantaneous rate of change.",
        createdAt: 11,
      },
      {
        id: "wmsg_hidden_direct",
        threadId: "thread_hidden_direct",
        senderName: "Peer",
        content: "Secret derivative shortcut from another private chat.",
        createdAt: 12,
      },
      {
        id: "wmsg_intuition",
        threadId: thread.id,
        senderName: "Learner",
        content: "Can we connect derivative rules to intuition?",
        createdAt: 13,
      },
    ],
    openTasks: [openTask],
  };

  const specs = buildWorkspaceGuardedToolSpecs(profile, context);
  const manifests = listWorkspaceInternalToolManifests();
  const manifestRegistry = createWorkspaceInternalToolRegistry();
  const rendererRegistry = createWorkspaceToolRendererRegistry();
  const taskManifest = manifestRegistry.get("create_workspace_task");
  assert(manifests.length === Object.keys(WORKSPACE_INTERNAL_TOOL_POLICIES).length, "Agent OS manifest list covers every internal workspace tool policy");
  assert(taskManifest?.source === "internal", "internal tool manifest records internal source");
  assert(taskManifest?.risk === "write" && taskManifest.approval === "on_risk", "internal tool manifest preserves risk and approval");
  assert(taskManifest?.scopes.includes("tasks:write"), "internal tool manifest exposes scopes");
  assert(taskManifest?.sideEffects.includes("task"), "internal tool manifest exposes side effects");
  assert(taskManifest?.execution?.available === true, "internal tool manifest records execution availability");
  assert(taskManifest?.inspector?.label === "Create task", "internal tool manifest exposes inspector metadata");
  assert(taskManifest?.render?.renderer === "workspace-task-card", "internal tool manifest exposes renderer metadata");
  assert(rendererRegistry.findForTool("create_workspace_task")?.key === "workspace-task-card", "renderer registry can look up a tool renderer");
  assert(rendererRegistry.findForArtifact("course")?.key === "workspace-course-card", "renderer registry can look up an artifact renderer");

  const mcpConnection: WorkspaceAgentConnection = {
    id: "conn_tools",
    workspaceId: "workspace_tools",
    ownerId: "owner_tools",
    scope: "workspace",
    displayName: "Tool MCP",
    transport: "http",
    configRef: "https://mcp.example.test/tools",
    allowedToolNames: ["search_sources"],
    status: "available",
    createdAt: 1,
    updatedAt: 2,
  };
  const activated = activateWorkspaceToolManifests({
    profile: {
      ...profile,
      capabilities: [
        ...profile.capabilities,
        { id: "cap_mcp", profileId: profile.id, kind: "mcp_tool", connectionId: mcpConnection.id, toolName: "search_sources", approval: "always", enabled: true },
        { id: "cap_mcp_disabled", profileId: profile.id, kind: "mcp_tool", connectionId: mcpConnection.id, toolName: "missing_sources", approval: "always", enabled: true },
      ],
    },
    connections: [mcpConnection],
  });
  assert(activated.some((tool) => tool.name === "create_workspace_task" && tool.approval === "on_risk"), "tool activator keeps risky internal tool approval policy");
  assert(activated.some((tool) => tool.name.startsWith("mcp_conn_tools_search_sources") && tool.source === "mcp"), "tool activator maps allowed MCP tools into manifests");
  assert(!activated.some((tool) => tool.name === "unknown_disabled_tool" || tool.rawToolName === "missing_sources"), "tool activator excludes disabled, unknown, and unallowlisted tools");
  const constrained = activateWorkspaceToolManifests({
    profile,
    constraints: { allowedToolNames: ["summarize_thread"], includeMcp: false },
  });
  assert(constrained.length === 1 && constrained[0].name === "summarize_thread", "tool activator honors per-run allowed tool constraints");

  const search = specs.find((spec) => spec.name === "search_workspace_messages");
  const summarize = specs.find((spec) => spec.name === "summarize_thread");
  const createTask = specs.find((spec) => spec.name === "create_workspace_task");
  const updateTask = specs.find((spec) => spec.name === "update_workspace_task");
  const saveArtifact = specs.find((spec) => spec.name === "save_learning_artifact");
  const createQuiz = specs.find((spec) => spec.name === "create_quiz");
  const generateCourse = specs.find((spec) => spec.name === "generate_course");
  const saveMemory = specs.find((spec) => spec.name === "save_agent_memory");
  assert(search?.invoke, "search tool exposes a guarded invoker");
  assert(summarize?.invoke, "summarize tool exposes a guarded invoker");
  assert(createTask, "risky task tool is exposed by capability");
  assert(updateTask?.invoke, "update task tool exposes a guarded invoker");
  assert(saveArtifact?.invoke, "save artifact tool exposes a guarded invoker");
  assert(createQuiz?.invoke, "create quiz tool exposes a guarded invoker");
  assert(generateCourse?.invoke, "generate course tool exposes a guarded invoker");
  assert(saveMemory?.invoke, "save agent memory tool exposes a guarded invoker");
  assert(!requiresWorkspaceToolApproval(search.policy), "read-only search does not require approval");
  assert(requiresWorkspaceToolApproval(createTask.policy), "write task tool requires approval");
  assert(requiresWorkspaceToolApproval(updateTask.policy), "update task tool requires approval");
  assert(requiresWorkspaceToolApproval(saveArtifact.policy), "save artifact tool requires approval");
  assert(!requiresWorkspaceToolApproval(createQuiz.policy), "create quiz is a low-risk learning artifact and does not require approval");
  assert(requiresWorkspaceToolApproval(generateCourse.policy), "generate course is costly and requires approval");
  assert(requiresWorkspaceToolApproval(saveMemory.policy), "save agent memory requires explicit approval");

  const searchResult = await search.invoke({ query: "derivative", limit: 2 });
  const searchPayload = JSON.parse(searchResult);
  assert(searchPayload.summary.includes("visible matching"), "search returns a user-visible summary");
  assert(searchPayload.sourceMessageIds.includes("wmsg_derivative"), "search returns source message ids as linked records");
  assert(searchResult.includes("derivative is an instantaneous rate"), "search returns matching visible message");
  assert(searchResult.includes("wmsg_derivative"), "search returns source message ids for audit/provenance");
  assert(searchResult.includes("snippet"), "search returns snippets rather than unlabeled transcript strings");
  assert(!searchResult.includes("wmsg_hidden_direct"), "search excludes messages outside the current visible thread");
  assert(!searchResult.includes("Secret derivative shortcut"), "search does not leak private direct-chat content outside the current thread");
  assert(!searchResult.includes("slope from graphs"), "search filters non-matching messages when a query is provided");
  const emptySearchResult = await search.invoke({ query: "integral", limit: 2 });
  const emptySearchPayload = JSON.parse(emptySearchResult);
  assert(emptySearchPayload.tool === "search_workspace_messages", "empty search still returns a structured tool payload");
  assert(emptySearchPayload.summary.includes("No visible messages matched"), "empty search returns a user-visible summary");
  assert(emptySearchPayload.sourceMessageIds.length === 0 && emptySearchPayload.matches.length === 0, "empty search returns empty linked ids and matches");

  const summaryResult = await summarize.invoke({ limit: 2 });
  const summaryPayload = JSON.parse(summaryResult);
  assert(summaryPayload.tool === "summarize_thread", "summary returns a structured tool payload");
  assert(summaryPayload.summary.includes("Tool Room"), "summary payload includes user-visible summary text");
  assert(summaryPayload.sourceMessageIds.includes("wmsg_intuition"), "summary returns source message ids for audit/provenance");
  assert(summaryPayload.openTaskIds.includes(openTask.id), "summary returns linked open task ids");
  assert(Array.isArray(summaryPayload.missingContext), "summary reports missing context as structured metadata");
  assert(summaryResult.includes("Tool Room"), "summary names the current chat");
  assert(summaryResult.includes("Compare derivative and slope"), "summary includes open task context");
  assert(summaryResult.includes("Can we connect derivative rules"), "summary includes recent visible messages");
  assert(summaryResult.includes("wmsg_intuition"), "summary keeps source ids for visible recent messages");
  assert(!summaryResult.includes("wmsg_hidden_direct"), "summary excludes messages outside the current visible thread");

  const quizResult = await createQuiz.invoke({
    topic: "Derivative intuition",
    difficulty: "intro",
    questionCount: 2,
    learningGoal: "connect slope to instantaneous rate of change",
  });
  const quizPayload = JSON.parse(quizResult);
  assert(quizPayload.tool === "create_quiz", "create quiz returns a structured tool payload");
  assert(quizPayload.summary.includes("2-question"), "create quiz returns a user-visible summary");
  assert(quizPayload.topic === "Derivative intuition", "create quiz preserves requested topic");
  assert(quizPayload.learningGoal.includes("instantaneous rate"), "create quiz preserves learning goal");
  assert(quizPayload.sourceMessageIds.includes("wmsg_intuition"), "create quiz returns source message ids for provenance");
  assert(!quizPayload.sourceMessageIds.includes("wmsg_hidden_direct"), "create quiz source ids stay scoped to the current thread");
  assert(quizPayload.questionIds.join(",") === "q1,q2", "create quiz exposes top-level question ids");
  assert(quizPayload.questions.length === 2, "create quiz respects requested question count");
  assert(quizPayload.questions[0].prompt.includes("Derivative intuition"), "create quiz generates topic-grounded prompts");
  assert(quizPayload.questions[0].rubric.length > 0, "create quiz includes grading rubric");

  const courseDenied = await generateCourse.invoke({ topic: "Derivative intuition", duration: "1 week" }).catch((error) => error);
  assert(courseDenied instanceof WorkspaceToolApprovalRequiredError, "guarded generate course raises approval interrupt before drafting");
  assert(courseDenied.policy.toolName === "generate_course", "generate course approval error carries tool policy");

  const courseResult = await executeWorkspaceInternalTool(profile, context, {
    toolName: "generate_course",
    input: {
      topic: "Derivative intuition",
      audience: "high-school learners",
      duration: "1 week",
      moduleCount: 2,
      learningGoal: "connect graphs, slope, and derivative rules",
    },
    approval: "approved",
  });
  const coursePayload = JSON.parse(courseResult);
  assert(coursePayload.tool === "generate_course", "generate course returns a structured tool payload");
  assert(coursePayload.summary.includes("2-module"), "generate course returns a user-visible summary");
  assert(coursePayload.topic === "Derivative intuition", "generate course preserves requested topic");
  assert(coursePayload.audience === "high-school learners", "generate course preserves requested audience");
  assert(coursePayload.sourceMessageIds.includes("wmsg_intuition"), "generate course returns source message ids for provenance");
  assert(coursePayload.relatedOpenTaskIds.includes(openTask.id), "generate course returns linked open task ids");
  assert(coursePayload.moduleIds.join(",") === "module_1,module_2", "generate course exposes top-level module ids");
  assert(coursePayload.modules.length === 2, "generate course respects requested module count");
  assert(coursePayload.modules[0].activities.some((activity: string) => activity.includes("discussion")), "generate course includes collaborative learning activities");
  assert(coursePayload.assessments.length > 0, "generate course includes assessment checkpoints");
  assert(coursePayload.nextStep.includes("review"), "generate course proposes a review next step");

  const updateDenied = await updateTask.invoke({ taskId: openTask.id, status: "done" }).catch((error) => error);
  assert(updateDenied instanceof WorkspaceToolApprovalRequiredError, "guarded update task raises approval interrupt before writing");
  assert(updateDenied.policy.toolName === "update_workspace_task", "update approval error carries tool policy");

  const artifactDenied = await saveArtifact.invoke({ title: "Derivative hints", description: "Reusable hint ladder" }).catch((error) => error);
  assert(artifactDenied instanceof WorkspaceToolApprovalRequiredError, "guarded save artifact raises approval interrupt before writing");
  assert(artifactDenied.policy.toolName === "save_learning_artifact", "save artifact approval error carries tool policy");
  const artifactResult = await executeWorkspaceInternalTool(profile, context, {
    toolName: "save_learning_artifact",
    input: { title: "Derivative hints", description: "Reusable hint ladder", groups: ["Hints"] },
    approval: "approved",
  });
  const artifactPayload = JSON.parse(artifactResult);
  assert(artifactPayload.tool === "save_learning_artifact", "approved save artifact returns a structured artifact payload");
  assert(artifactPayload.summary.includes("Derivative hints"), "approved save artifact returns a user-visible summary");
  assert(Array.isArray(artifactPayload.artifactIds) && artifactPayload.artifactIds.length === 0, "approved save artifact declares artifact ids as empty before persistence");
  assert(artifactPayload.sourceMessageIds.includes("wmsg_intuition"), "approved save artifact returns source message ids for provenance");
  assert(artifactPayload.artifact.type === "task", "approved save artifact payload describes a reusable card");
  assert(artifactPayload.artifact.groups.includes("Hints"), "approved save artifact preserves groups");

  const memoryDenied = await saveMemory.invoke({ title: "Hint preference", summary: "Learner prefers hints first.", scope: "user" }).catch((error) => error);
  assert(memoryDenied instanceof WorkspaceToolApprovalRequiredError, "guarded save memory raises approval interrupt before writing memory");
  assert(memoryDenied.policy.toolName === "save_agent_memory", "save memory approval error carries tool policy");
  const memoryResult = await executeWorkspaceInternalTool(profile, context, {
    toolName: "save_agent_memory",
    input: { title: "Hint preference", summary: "Learner prefers hints first.", scope: "user" },
    approval: "approved",
  });
  const memoryPayload = JSON.parse(memoryResult);
  assert(memoryPayload.tool === "save_agent_memory", "approved save memory returns a structured memory payload");
  assert(memoryPayload.summary.includes("Hint preference"), "approved save memory returns a user-visible summary");
  assert(Array.isArray(memoryPayload.memoryIds) && memoryPayload.memoryIds.length === 0, "approved save memory declares memory ids as empty before persistence");
  assert(memoryPayload.sourceMessageIds.includes("wmsg_intuition"), "approved save memory returns source message ids for provenance");
  assert(memoryPayload.memory.title === "Hint preference", "approved save memory preserves title");
  assert(memoryPayload.memory.scope === "user", "approved save memory preserves user scope for explicit approval flow");

  const denied = await executeWorkspaceInternalTool(profile, context, {
    toolName: "create_workspace_task",
    input: { title: "Make a worksheet" },
  }).catch((error) => error);
  assert(denied instanceof WorkspaceToolApprovalRequiredError, "risky write tool requires approval before execution");
  assert(denied.policy.toolName === "create_workspace_task", "approval error carries tool policy");

  const createTaskResult = await executeWorkspaceInternalTool(profile, context, {
    toolName: "create_workspace_task",
    input: {
      title: "Make a derivative worksheet",
      scope: "Pair practice",
      progress: "ready for review",
      assigneeId: "member_agent",
      dueAt: "2026-06-01",
    },
    approval: "approved",
  });
  const createTaskPayload = JSON.parse(createTaskResult);
  assert(createTaskPayload.tool === "create_workspace_task", "approved create task returns a structured task payload");
  assert(createTaskPayload.summary.includes("Make a derivative worksheet"), "approved create task returns a user-visible summary");
  assert(Array.isArray(createTaskPayload.taskIds) && createTaskPayload.taskIds.length === 0, "approved create task declares task ids as empty before persistence");
  assert(createTaskPayload.task.title === "Make a derivative worksheet", "approved create task preserves title");
  assert(createTaskPayload.task.scope === "Pair practice", "approved create task preserves scope");
  assert(createTaskPayload.task.assigneeId === "member_agent", "approved create task preserves assignee id");
  assert(createTaskPayload.nextStep.includes("approval"), "approved create task tells runtime that persistence happens through the approval flow");

  const updateTaskResult = await executeWorkspaceInternalTool(profile, context, {
    toolName: "update_workspace_task",
    input: {
      taskId: openTask.id,
      status: "done",
      progress: "reviewed",
      resultSummary: "Learner connected slope and derivatives.",
    },
    approval: "approved",
  });
  const updateTaskPayload = JSON.parse(updateTaskResult);
  assert(updateTaskPayload.tool === "update_workspace_task", "approved update task returns a structured task payload");
  assert(updateTaskPayload.summary.includes("status done"), "approved update task returns a user-visible summary");
  assert(updateTaskPayload.taskIds.includes(openTask.id), "approved update task exposes linked task ids");
  assert(updateTaskPayload.task.id === openTask.id, "approved update task preserves target task id");
  assert(updateTaskPayload.task.status === "done", "approved update task preserves status");
  assert(updateTaskPayload.task.resultSummary.includes("slope"), "approved update task preserves result summary");

  const taskAdapter = {
    createTask: async (input: any): Promise<WorkspaceTask> => ({
      id: "task_created_contract",
      workspaceId: input.workspaceId,
      threadId: input.threadId,
      title: input.title,
      scope: input.scope ?? "Shared",
      status: "open",
      progress: input.progress ?? "new",
      assigneeId: input.assigneeId,
      dueAt: input.dueAt,
      createdAt: 20,
      updatedAt: 20,
    }),
    updateTask: async (input: any): Promise<WorkspaceTask> => ({
      ...openTask,
      status: input.status ?? openTask.status,
      progress: input.progress ?? openTask.progress,
      assigneeId: input.assigneeId ?? openTask.assigneeId,
      resultSummary: input.resultSummary,
      updatedAt: 21,
    }),
    listTasks: async () => [openTask],
    runTask: async () => ({ ...openTask, status: "running", progress: "agent running", updatedAt: 22 }),
  };
  const createdTaskContract = await executeAgentTaskOperation(
    "create",
    { workspaceId: "workspace_tools", threadId: thread.id, title: "Contract task", assigneeId: member.id },
    taskAdapter,
  );
  assert(createdTaskContract.supported && "task" in createdTaskContract && createdTaskContract.task.title === "Contract task", "task create contract maps to workspace task creation");
  const listedTaskContract = await executeAgentTaskOperation("list", { workspaceId: "workspace_tools", threadId: thread.id, status: "open" }, taskAdapter);
  assert(listedTaskContract.supported && "tasks" in listedTaskContract && listedTaskContract.tasks.length === 1, "task list contract maps to workspace task listing");
  const runTaskContract = await executeAgentTaskOperation("run", { workspaceId: "workspace_tools", taskId: openTask.id }, taskAdapter);
  assert(runTaskContract.supported && "task" in runTaskContract && runTaskContract.task.status === "running", "task run contract maps to assignment execution");
  const statusTaskContract = await executeAgentTaskOperation(
    "status",
    { workspaceId: "workspace_tools", taskId: openTask.id, status: "done", resultSummary: "Finished." },
    taskAdapter,
  );
  assert(statusTaskContract.supported && "task" in statusTaskContract && statusTaskContract.task.status === "done", "task status contract maps to workspace task update");
  const unsupportedEditContract = await executeAgentTaskOperation(
    "edit",
    { workspaceId: "workspace_tools", taskId: openTask.id, title: "Renamed task" },
    taskAdapter,
  );
  assert(!unsupportedEditContract.supported && unsupportedEditContract.reason.includes("title"), "unsupported task edits return typed unsupported result");
  for (const operation of ["comment", "dependency", "schedule"] as const) {
    const input =
      operation === "comment"
        ? { workspaceId: "workspace_tools", taskId: openTask.id, comment: "Needs review." }
        : operation === "dependency"
          ? { workspaceId: "workspace_tools", taskId: openTask.id, dependsOnTaskId: "task_before" }
          : { workspaceId: "workspace_tools", taskId: openTask.id, when: "2026-06-17T09:00:00Z" };
    const result = await executeAgentTaskOperation(operation, input, taskAdapter);
    assert(!result.supported && result.reason.length > 0, `${operation} returns a typed unsupported result`);
  }

  const unknown = await executeWorkspaceInternalTool(profile, context, {
    toolName: "unknown_disabled_tool",
    input: { topic: "limits" },
    approval: "approved",
  }).catch((error) => error);
  assert(unknown instanceof Error && unknown.message.includes("not enabled"), "disabled tools cannot be invoked even with approval");

  process.stdout.write("[workspace.agent-tools.unit] ALL TOOL CHECKS PASSED\n");
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    process.stderr.write(`[workspace.agent-tools.unit] FAILED: ${(error as Error).message}\n`);
    process.exit(1);
  });
