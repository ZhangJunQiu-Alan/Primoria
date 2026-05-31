#!/usr/bin/env tsx

import {
  WORKSPACE_INTERNAL_TOOL_EXECUTORS,
  WORKSPACE_INTERNAL_TOOL_POLICIES,
  WorkspaceToolApprovalRequiredError,
  buildWorkspaceGuardedToolSpecs,
  executeWorkspaceInternalTool,
  requiresWorkspaceToolApproval,
} from "../src/lib/workspaces/agent-tools.ts";
import type { WorkspaceAgentProfile, WorkspaceMember, WorkspaceTask, WorkspaceThread } from "../src/lib/workspaces/types.ts";

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
      { id: "cap_share_app", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "share_learning_app", approval: "on_risk", enabled: true },
      { id: "cap_save_artifact", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "save_learning_artifact", approval: "always", enabled: true },
      { id: "cap_widget", profileId: "agent_profile_tools", kind: "internal_tool", toolName: "render_interactive_widget", approval: "always", enabled: true },
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
  const search = specs.find((spec) => spec.name === "search_workspace_messages");
  const summarize = specs.find((spec) => spec.name === "summarize_thread");
  const createTask = specs.find((spec) => spec.name === "create_workspace_task");
  const updateTask = specs.find((spec) => spec.name === "update_workspace_task");
  const shareApp = specs.find((spec) => spec.name === "share_learning_app");
  const saveArtifact = specs.find((spec) => spec.name === "save_learning_artifact");
  const renderWidget = specs.find((spec) => spec.name === "render_interactive_widget");
  const createQuiz = specs.find((spec) => spec.name === "create_quiz");
  const generateCourse = specs.find((spec) => spec.name === "generate_course");
  const saveMemory = specs.find((spec) => spec.name === "save_agent_memory");
  assert(search?.invoke, "search tool exposes a guarded invoker");
  assert(summarize?.invoke, "summarize tool exposes a guarded invoker");
  assert(createTask, "risky task tool is exposed by capability");
  assert(updateTask?.invoke, "update task tool exposes a guarded invoker");
  assert(shareApp?.invoke, "share app tool exposes a guarded invoker");
  assert(saveArtifact?.invoke, "save artifact tool exposes a guarded invoker");
  assert(renderWidget?.invoke, "render widget tool exposes a guarded invoker");
  assert(createQuiz?.invoke, "create quiz tool exposes a guarded invoker");
  assert(generateCourse?.invoke, "generate course tool exposes a guarded invoker");
  assert(saveMemory?.invoke, "save agent memory tool exposes a guarded invoker");
  assert(!requiresWorkspaceToolApproval(search.policy), "read-only search does not require approval");
  assert(requiresWorkspaceToolApproval(createTask.policy), "write task tool requires approval");
  assert(requiresWorkspaceToolApproval(updateTask.policy), "update task tool requires approval");
  assert(requiresWorkspaceToolApproval(shareApp.policy), "share app tool requires approval");
  assert(requiresWorkspaceToolApproval(saveArtifact.policy), "save artifact tool requires approval");
  assert(requiresWorkspaceToolApproval(renderWidget.policy), "render widget tool requires approval");
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

  const shareDenied = await shareApp.invoke({ title: "Derivative Visualizer", description: "Interactive derivative intuition app", appId: "app_derivative" }).catch((error) => error);
  assert(shareDenied instanceof WorkspaceToolApprovalRequiredError, "guarded share app raises approval interrupt before writing");
  assert(shareDenied.policy.toolName === "share_learning_app", "share app approval error carries tool policy");

  const sharedAppResult = await executeWorkspaceInternalTool(profile, context, {
    toolName: "share_learning_app",
    input: { title: "Derivative Visualizer", description: "Interactive derivative intuition app", appId: "app_derivative" },
    approval: "approved",
  });
  const sharedAppPayload = JSON.parse(sharedAppResult);
  assert(sharedAppPayload.tool === "share_learning_app", "approved share app returns a structured app payload");
  assert(sharedAppPayload.summary.includes("Derivative Visualizer"), "approved share app returns a user-visible summary");
  assert(sharedAppPayload.appIds.includes("app_derivative"), "approved share app exposes linked app ids");
  assert(Array.isArray(sharedAppPayload.artifactIds) && sharedAppPayload.artifactIds.length === 0, "approved share app declares artifact ids as empty before persistence");
  assert(sharedAppPayload.artifact.type === "app", "approved share app payload describes an app artifact");
  assert(sharedAppPayload.artifact.appId === "app_derivative", "approved share app preserves app id");

  const widgetDenied = await renderWidget.invoke({ title: "Derivative Widget", html: "<section>widget</section>" }).catch((error) => error);
  assert(widgetDenied instanceof WorkspaceToolApprovalRequiredError, "guarded render widget raises approval interrupt before rendering");
  assert(widgetDenied.policy.toolName === "render_interactive_widget", "render widget approval error carries tool policy");
  const widgetResult = await executeWorkspaceInternalTool(profile, context, {
    toolName: "render_interactive_widget",
    input: { title: "Derivative Widget", description: "Slope visual", html: "<section>widget</section>" },
    approval: "approved",
  });
  const widgetPayload = JSON.parse(widgetResult);
  assert(widgetPayload.tool === "render_interactive_widget", "approved render widget returns a structured widget payload");
  assert(widgetPayload.summary.includes("Derivative Widget"), "approved render widget returns a user-visible summary");
  assert(Array.isArray(widgetPayload.artifactIds) && widgetPayload.artifactIds.length === 0, "approved render widget declares artifact ids as empty before persistence");
  assert(widgetPayload.artifact.type === "app", "approved render widget payload describes an app artifact");
  assert(widgetPayload.artifact.template.type === "html", "approved render widget keeps html template");

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
