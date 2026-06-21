#!/usr/bin/env tsx

import {
  AgentEventSchema,
  AgentMemoryCandidateSchema,
  AgentTaskCommentInputSchema,
  AgentTaskCreateInputSchema,
  AgentTaskDependencyInputSchema,
  AgentTaskEditInputSchema,
  AgentTaskListInputSchema,
  AgentTaskRunInputSchema,
  AgentTaskScheduleInputSchema,
  AgentTaskStatusInputSchema,
  GroupSupervisorActionSchema,
  type ExternalAgentAdapter,
} from "../../../packages/contracts/src/agent/index.ts";
import { createToolRegistry, runAgentMemoryPipeline, signalFromAgentEvent } from "../../../packages/domain/src/agent/index.ts";
import {
  workspaceAgentEventsToAgentSignals,
  workspaceRuntimeEventToAgentEvent,
  workspaceRuntimeResultToTerminalAgentEvent,
} from "../src/lib/agent-os/events.ts";
import { buildWorkspaceAgentEventView, buildWorkspaceAgentRunResultEventView } from "../src/lib/workspaces/agent-event-views.ts";
import {
  activateWorkspaceToolManifests,
  createWorkspaceToolRendererRegistry,
  listWorkspaceInternalToolManifests,
  workspaceMcpToolManifest,
} from "../src/lib/agent-os/tools.ts";
import { buildAgentContext, buildWorkspaceAgentContext } from "../src/lib/agent-os/context.ts";
import { createAgentAskUserEvent, createAgentAskUserResumePayload } from "../src/lib/agent-os/ask-user.ts";
import { runWorkspaceAgentMemoryPipeline } from "../src/lib/agent-os/memory.ts";
import {
  deepAgentSubagentRuntimeEventToSupervisorAction,
  externalAgentSessionEventToAgentEvent,
  validateGroupSupervisorAction,
} from "../src/lib/agent-os/orchestration.ts";
import { workspaceRuntimeInputToRunAgentInput } from "../src/lib/agent-os/workspace.ts";
import type { WorkspaceAgentRuntimeEvent } from "../src/lib/workspaces/agent-runtime.ts";
import type { WorkspaceAgentConnection, WorkspaceAgentProfile, WorkspaceAgentRun, WorkspaceAgentRunEvent, WorkspaceAgentMemory } from "../src/lib/workspaces/types.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

async function main() {
  const envelope = {
    runId: "run_agent_os",
    workspaceId: "workspace_agent_os",
    threadId: "thread_agent_os",
    createdAt: 100,
  };

  const workspaceEvents: WorkspaceAgentRuntimeEvent[] = [
    { type: "status", label: "deepagent_started", payload: { model: "test" } },
    { type: "message_delta", label: "assistant_delta", payload: { text: "hi", content: "hi" } },
    { type: "tool_start", label: "summarize_thread", payload: { input: { limit: 3 } } },
    { type: "tool_end", label: "summarize_thread", payload: { output: "summary" } },
    { type: "tool_end", label: "unstable_tool", payload: { status: "failed", error: "nope" } },
    { type: "tool_end", label: "optional_tool", payload: { status: "skipped", skipReason: "not needed" } },
    { type: "subagent_start", label: "visualizer", payload: { input: { task: "draw" } } },
    { type: "subagent_end", label: "visualizer", payload: { output: "done" } },
    { type: "approval_request", label: "create_workspace_task", payload: { input: { title: "Review" }, policy: { risk: "write" }, deepAgentThreadId: "resume-thread" } },
    { type: "ask_user_request", label: "question_1", payload: { questionId: "question_1", prompt: "Which path should I take?", options: [{ label: "A", value: "a" }], resumeToken: "ask-resume" } },
    { type: "artifact", label: "quiz", payload: { type: "quiz", title: "Practice" } },
  ];

  const agentEvents = workspaceEvents.map((event) => workspaceRuntimeEventToAgentEvent(event, envelope));
  for (const event of agentEvents) {
    const parsed = AgentEventSchema.safeParse(event);
    assert(parsed.success, `event validates against AgentEventSchema: ${event.type}`);
  }

  assert(agentEvents[0].type === "runtime.step", "status events normalize to runtime step");
  assert(agentEvents[1].type === "message.delta" && agentEvents[1].text === "hi", "message deltas normalize");
  assert(agentEvents[2].type === "tool.started" && agentEvents[2].toolName === "summarize_thread", "tool starts normalize");
  assert(agentEvents[3].type === "tool.completed" && agentEvents[3].output === "summary", "tool completions normalize");
  assert(agentEvents[4].type === "tool.failed" && agentEvents[4].toolName === "unstable_tool", "tool failures normalize");
  assert(agentEvents[5].type === "tool.skipped" && agentEvents[5].reason === "not needed", "tool skips normalize");
  assert(agentEvents[6].type === "subagent.started" && agentEvents[6].name === "visualizer", "subagent starts normalize");
  assert(agentEvents[7].type === "subagent.completed" && agentEvents[7].output === "done", "subagent completions normalize");
  assert(agentEvents[8].type === "approval.requested" && agentEvents[8].approval.resumeToken === "resume-thread", "approval requests normalize with resume token");
  assert(agentEvents[9].type === "ask_user.requested" && agentEvents[9].question.resumeToken === "ask-resume", "ask-user requests normalize separately from approvals");
  assert(agentEvents[10].type === "artifact.created", "artifact events normalize");

  const askUserEvent = createAgentAskUserEvent({
    runId: envelope.runId,
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    question: {
      questionId: "question_contract",
      prompt: "Pick a review path.",
      options: [
        { label: "Short", value: "short", description: "Brief answer." },
        { label: "Deep", value: "deep", description: "Detailed answer." },
      ],
      resumeToken: "resume-question-contract",
    },
  });
  assert(AgentEventSchema.safeParse(askUserEvent).success, "ask-user event validates against AgentEventSchema");
  const askResume = createAgentAskUserResumePayload({
    questionId: "question_contract",
    resumeToken: "resume-question-contract",
    answer: "Use the short path.",
    optionValue: "short",
  });
  assert(askResume.resumeToken === "resume-question-contract" && askResume.optionValue === "short", "ask-user resume payload keeps token and selected option");

  const completed = workspaceRuntimeResultToTerminalAgentEvent({ ...envelope, content: "done" });
  const failed = workspaceRuntimeResultToTerminalAgentEvent({ ...envelope, error: "boom" });
  const waiting = workspaceRuntimeResultToTerminalAgentEvent({ ...envelope, status: "waiting_for_approval" });
  const cancelled = workspaceRuntimeResultToTerminalAgentEvent({ ...envelope, status: "cancelled" });
  assert(completed.type === "runtime.completed", "successful terminal event normalizes");
  assert(failed.type === "runtime.failed" && failed.error.message === "boom", "failed terminal event normalizes");
  assert(waiting.type === "runtime.step" && waiting.label === "waiting_for_approval", "waiting approval terminal status normalizes");
  assert(cancelled.type === "runtime.completed" && cancelled.result && typeof cancelled.result === "object", "cancelled terminal status normalizes");

  const signal = signalFromAgentEvent(completed);
  assert(signal?.type === "runtime_completed", "domain can derive stable signal from terminal event");
  const signals = workspaceAgentEventsToAgentSignals([
    workspaceRuntimeEventToAgentEvent({ type: "status", label: "started", payload: { engine: "deepagent" } }, envelope),
    ...agentEvents,
    completed,
    failed,
    { type: "memory.saved", runId: envelope.runId, workspaceId: envelope.workspaceId, threadId: envelope.threadId, memory: { title: "Remember this" } },
  ]);
  assert(signals.some((entry) => entry.type === "runtime_started"), "signals include runtime start");
  assert(signals.some((entry) => entry.type === "runtime_completed"), "signals include runtime end");
  assert(signals.some((entry) => entry.type === "runtime_failed"), "signals include runtime failure");
  assert(signals.some((entry) => entry.type === "step_completed"), "signals include step");
  assert(signals.some((entry) => entry.type === "action_applied"), "signals include applied action");
  assert(signals.some((entry) => entry.type === "action_failed"), "signals include failed action");
  assert(signals.some((entry) => entry.type === "action_skipped"), "signals include skipped action");
  assert(signals.some((entry) => entry.type === "memory_saved"), "signals include saved memory");

  const persistedRun: WorkspaceAgentRun = {
    id: envelope.runId,
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    agentProfileId: "profile_agent_os",
    trigger: "mention",
    status: "completed",
    startedAt: 90,
    completedAt: 120,
  };
  const persistedEvents: WorkspaceAgentRunEvent[] = [
    { id: "event_started", runId: envelope.runId, workspaceId: envelope.workspaceId, threadId: envelope.threadId, type: "status", label: "started", createdAt: 91 },
    { id: "event_tool", runId: envelope.runId, workspaceId: envelope.workspaceId, threadId: envelope.threadId, type: "tool_end", label: "summarize_thread", payload: { output: "summary" }, createdAt: 100 },
    { id: "event_ask", runId: envelope.runId, workspaceId: envelope.workspaceId, threadId: envelope.threadId, type: "ask_user_request", label: "question_1", payload: { questionId: "question_1", prompt: "Continue?", resumeToken: "ask-resume" }, createdAt: 101 },
  ];
  const persistedView = buildWorkspaceAgentEventView(persistedRun, persistedEvents);
  assert(
    persistedEvents.some((entry) => entry.id === "event_started") && persistedEvents.some((entry) => entry.id === "event_tool"),
    "legacy persisted agentRunEvents remain available",
  );
  assert(persistedView.agentEvents.some((entry) => entry.type === "runtime.started"), "persisted events expose runtime started AgentEvent");
  assert(persistedView.agentEvents.some((entry) => entry.type === "ask_user.requested"), "persisted events expose ask-user AgentEvent");
  assert(!persistedView.agentEvents.some((entry) => entry.type === "ask_user.requested" && "approval" in entry), "ask-user events do not masquerade as approvals");
  assert(persistedView.agentEvents.some((entry) => entry.type === "runtime.completed"), "persisted run status exposes terminal AgentEvent");
  assert(persistedView.agentSignals.some((entry) => entry.type === "runtime_completed"), "persisted events expose AgentSignal view");

  const memory: WorkspaceAgentMemory = {
    id: "memory_agent_os",
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    agentProfileId: persistedRun.agentProfileId,
    scope: "thread",
    title: "Saved memory",
    summary: "Remember this.",
    sourceRunId: persistedRun.id,
    createdAt: 130,
    updatedAt: 130,
  };
  const runResultView = buildWorkspaceAgentRunResultEventView({ runs: [persistedRun], events: persistedEvents, memories: [memory] });
  assert(runResultView.agentEvents.some((entry) => entry.type === "memory.saved"), "run result view includes memory saved AgentEvent");
  assert(runResultView.agentSignals.some((entry) => entry.type === "memory_saved"), "run result view includes memory saved AgentSignal");

  const manifests = listWorkspaceInternalToolManifests();
  const registry = createToolRegistry(manifests);
  assert(registry.get("summarize_thread")?.risk === "read", "registry exposes read tool manifest");
  assert(registry.get("create_workspace_task")?.approval === "on_risk", "registry exposes approval policy");
  assert(registry.get("save_agent_memory")?.sideEffects.includes("memory"), "registry exposes memory side effect");
  assert(registry.get("create_workspace_task")?.inspector?.label === "Create task", "registry exposes inspector metadata");
  assert(registry.list().length >= 8, "workspace internal tools are available as manifests");

  const profile: WorkspaceAgentProfile = {
    id: "profile_agent_os_tools",
    workspaceId: "workspace_agent_os",
    displayName: "Tool Agent",
    handle: "tool-agent",
    description: "Uses tools.",
    visibility: "workspace",
    systemPrompt: "Use tools carefully.",
    memoryScope: "thread",
    capabilities: [
      { id: "cap_read", profileId: "profile_agent_os_tools", kind: "internal_tool", toolName: "summarize_thread", approval: "never", enabled: true },
      { id: "cap_write", profileId: "profile_agent_os_tools", kind: "internal_tool", toolName: "create_workspace_task", approval: "always", enabled: true },
      { id: "cap_disabled", profileId: "profile_agent_os_tools", kind: "internal_tool", toolName: "save_agent_memory", approval: "always", enabled: false },
      { id: "cap_mcp", profileId: "profile_agent_os_tools", kind: "mcp_tool", connectionId: "conn_agent_os", toolName: "search_sources", approval: "always", enabled: true },
    ],
    createdAt: 1,
    updatedAt: 2,
  };
  const connection: WorkspaceAgentConnection = {
    id: "conn_agent_os",
    workspaceId: "workspace_agent_os",
    scope: "workspace",
    displayName: "Sources",
    transport: "http",
    configRef: "https://mcp.example.test/sources",
    allowedToolNames: ["search_sources"],
    status: "available",
    createdAt: 1,
    updatedAt: 2,
  };
  const activated = activateWorkspaceToolManifests({ profile, connections: [connection] });
  assert(activated.some((tool) => tool.name === "create_workspace_task" && tool.approval === "always"), "activator retains configured approval");
  assert(!activated.some((tool) => tool.name === "save_agent_memory"), "activator excludes disabled capabilities");
  assert(activated.some((tool) => tool.source === "mcp" && tool.rawToolName === "search_sources"), "activator maps MCP capability to manifest");
  const mcpManifest = workspaceMcpToolManifest({ connection, toolName: "search_sources" });
  assert(mcpManifest.source === "mcp" && mcpManifest.risk === "external", "MCP manifest exposes source and risk");
  const rendererRegistry = createWorkspaceToolRendererRegistry();
  assert(rendererRegistry.findForTool("create_workspace_task")?.key === "workspace-task-card", "renderer registry resolves tool renderer");
  assert(rendererRegistry.findForArtifact("course")?.key === "workspace-course-card", "renderer registry resolves artifact renderer");

  const genericContext = await buildAgentContext({
    profile: {
      id: profile.id,
      workspaceId: profile.workspaceId,
      displayName: profile.displayName,
      handle: profile.handle,
      description: profile.description,
      visibility: profile.visibility,
      systemPrompt: profile.systemPrompt,
      memoryScope: profile.memoryScope,
      capabilities: [],
    },
    prompt: "Explain derivatives.",
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    processors: [
      (context) => ({
        ...context,
        metadata: { ...context.metadata, processed: true },
      }),
    ],
  });
  assert(genericContext.prompt === "Explain derivatives.", "buildAgentContext preserves prompt");
  assert(genericContext.metadata.processed === true, "buildAgentContext runs registered processors");

  const workspaceContext = await buildWorkspaceAgentContext({
    runId: envelope.runId,
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    profile,
    workspaceName: "Agent OS Workspace",
    thread: {
      id: envelope.threadId,
      workspaceId: envelope.workspaceId,
      type: "room",
      name: "Agent OS Room",
      createdAt: 1,
      updatedAt: 2,
    },
    member: {
      id: "member_agent_os",
      workspaceId: envelope.workspaceId,
      displayName: "Tool Agent",
      role: "Agent",
      agentProfileId: profile.id,
    },
    recentMessages: ["Learner: What is slope?"],
    visibleMessages: [{ id: "msg_visible", threadId: envelope.threadId, senderName: "Learner", content: "What is slope?", createdAt: 1 }],
    openTasks: [{ id: "task_context", workspaceId: envelope.workspaceId, threadId: envelope.threadId, title: "Review slope", scope: "Shared", status: "open", progress: "new", createdAt: 1, updatedAt: 2 }],
    agentMemories: [memory],
    agentConnections: [connection],
    delegateProfiles: [profile],
    prompt: "Explain derivatives.",
  });
  assert(workspaceContext.workspaceId === envelope.workspaceId && workspaceContext.threadId === envelope.threadId, "workspace context preserves ids");
  assert(workspaceContext.surface === "workspace", "workspace context uses workspace surface");
  assert(workspaceContext.prompt === "Explain derivatives.", "workspace context preserves prompt");
  assert(workspaceContext.messages.some((message) => message.content.includes("What is slope")), "workspace context includes recent messages");
  assert(workspaceContext.tasks.length === 1 && workspaceContext.memories.length === 1, "workspace context includes tasks and memories");
  assert(Array.isArray(workspaceContext.artifacts), "workspace context includes artifacts collection");
  assert(typeof workspaceContext.tokenEstimate === "number" && workspaceContext.tokenEstimate > 0, "workspace context records token accounting metadata");
  assert((workspaceContext.metadata.visibleMessages as unknown[]).length === 1, "workspace context metadata includes visible messages");

  const candidate = AgentMemoryCandidateSchema.parse({
    title: "Learner preference",
    summary: "The learner likes hints before full explanations.",
    scope: "thread",
    confidence: 0.8,
  });
  const disabledMemoryPipeline = await runAgentMemoryPipeline({
    runId: envelope.runId,
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    prompt: "Remember this.",
    response: "Done.",
  });
  assert(disabledMemoryPipeline.events.length === 0 && disabledMemoryPipeline.candidates.length === 0, "memory pipeline is disabled by default");

  const fakeMemoryPipeline = await runAgentMemoryPipeline(
    {
      runId: envelope.runId,
      workspaceId: envelope.workspaceId,
      threadId: envelope.threadId,
      prompt: "Remember hints.",
      response: "I will remember hints.",
    },
    {
      enabled: true,
      extractor: () => [candidate, { ...candidate, title: "Low confidence", confidence: 0.1 }],
      gateKeeper: (entry) => (entry.confidence ?? 0) >= 0.5,
    },
  );
  assert(fakeMemoryPipeline.candidates.length === 1, "memory gatekeeper filters low-confidence candidates");
  assert(fakeMemoryPipeline.events[0]?.type === "memory.candidate", "fake extractor emits memory candidate event");
  assert(AgentEventSchema.safeParse(fakeMemoryPipeline.events[0]).success, "memory candidate event validates against AgentEventSchema");

  const workspaceMemoryPipeline = await runWorkspaceAgentMemoryPipeline(
    {
      runId: envelope.runId,
      workspaceId: envelope.workspaceId,
      threadId: envelope.threadId,
      profile,
      workspaceName: "Agent OS Workspace",
      thread: {
        id: envelope.threadId,
        workspaceId: envelope.workspaceId,
        type: "room",
        name: "Agent OS Room",
        createdAt: 1,
        updatedAt: 2,
      },
      member: {
        id: "member_agent_os",
        workspaceId: envelope.workspaceId,
        displayName: "Tool Agent",
        role: "Agent",
        agentProfileId: profile.id,
      },
      recentMessages: ["Learner: Please remember hints."],
      visibleMessages: [],
      openTasks: [],
      agentMemories: [],
      agentConnections: [],
      delegateProfiles: [],
      prompt: "Remember hints.",
    },
    { content: "Done.", status: "completed" },
    { enabled: true, extractor: () => [candidate] },
  );
  assert(workspaceMemoryPipeline.events.some((event) => event.type === "memory.candidate"), "workspace adapter can enable a fake extractor");

  const taskContractExamples = {
    create: AgentTaskCreateInputSchema.parse({ workspaceId: "workspace_agent_os", threadId: "thread_agent_os", title: "Review slope" }),
    list: AgentTaskListInputSchema.parse({ workspaceId: "workspace_agent_os", threadId: "thread_agent_os", status: "open" }),
    run: AgentTaskRunInputSchema.parse({ workspaceId: "workspace_agent_os", taskId: "task_context" }),
    edit: AgentTaskEditInputSchema.parse({ workspaceId: "workspace_agent_os", taskId: "task_context", progress: "reviewing" }),
    comment: AgentTaskCommentInputSchema.parse({ workspaceId: "workspace_agent_os", taskId: "task_context", comment: "Looks ready." }),
    status: AgentTaskStatusInputSchema.parse({ workspaceId: "workspace_agent_os", taskId: "task_context", status: "done" }),
    dependency: AgentTaskDependencyInputSchema.parse({ workspaceId: "workspace_agent_os", taskId: "task_context", dependsOnTaskId: "task_before" }),
    schedule: AgentTaskScheduleInputSchema.parse({ workspaceId: "workspace_agent_os", taskId: "task_context", when: "2026-06-17T09:00:00Z" }),
  };
  assert(Object.keys(taskContractExamples).length === 8, "task tool contracts cover all required operations");

  const supervisorActions = [
    { type: "speak", from: "coach", message: "Try a smaller step." },
    { type: "broadcast", message: "Everyone review the plan.", targetAgentIds: ["coach", "reviewer"] },
    { type: "delegate", agentId: "reviewer", task: "Check the proof.", context: { topic: "derivatives" } },
    { type: "execute_task", taskId: "task_context", instruction: "Finish the task." },
    { type: "finish", result: "All agents are done." },
  ] as const;
  for (const action of supervisorActions) {
    assert(GroupSupervisorActionSchema.safeParse(action).success, `supervisor action validates: ${action.type}`);
    assert(validateGroupSupervisorAction(action).type === action.type, `Agent OS validates supervisor action: ${action.type}`);
  }

  const externalAdapter: ExternalAgentAdapter = {
    name: "codex-cli",
    async spawn() {
      return {
        id: "external_session",
        async *streamEvents() {
          yield { type: "started", engine: "external", model: "codex-cli" };
          yield { type: "subagent.started", name: "codex-reviewer", input: { task: "review" } };
          yield { type: "ask_user.requested", question: { prompt: "Proceed?", resumeToken: "resume-external" } };
          yield { type: "completed", result: { content: "done" } };
        },
        askUser: async (question) => ({ answer: question.prompt, resumeToken: question.resumeToken ?? "resume" }),
        cancel: async () => undefined,
      };
    },
  };
  const externalSession = await externalAdapter.spawn({ runId: envelope.runId, prompt: "Review this." });
  const externalEvents = [];
  for await (const event of externalSession.streamEvents()) {
    externalEvents.push(externalAgentSessionEventToAgentEvent(event, envelope));
  }
  assert(externalEvents.some((event) => event.type === "runtime.started" && event.engine === "external"), "external adapter start event maps into AgentEvent stream");
  assert(externalEvents.some((event) => event.type === "subagent.started" && event.name === "codex-reviewer"), "external subagent event maps into AgentEvent stream");
  assert(externalEvents.some((event) => event.type === "ask_user.requested"), "external ask-user event maps into AgentEvent stream");
  const delegateAction = deepAgentSubagentRuntimeEventToSupervisorAction({ name: "visualizer", task: "Sketch slope" });
  const completedDelegateAction = deepAgentSubagentRuntimeEventToSupervisorAction({ name: "visualizer", output: "Sketch complete.", completed: true });
  assert(delegateAction.type === "delegate" && completedDelegateAction.type === "speak", "DeepAgent subagent events can be represented as supervisor actions");
  const defaultWorkspaceRunInput = workspaceRuntimeInputToRunAgentInput({
    runId: envelope.runId,
    workspaceId: envelope.workspaceId,
    threadId: envelope.threadId,
    profile,
    workspaceName: "Agent OS Workspace",
    thread: {
      id: envelope.threadId,
      workspaceId: envelope.workspaceId,
      type: "room",
      name: "Agent OS Room",
      createdAt: 1,
      updatedAt: 2,
    },
    member: {
      id: "member_agent_os",
      workspaceId: envelope.workspaceId,
      displayName: "Tool Agent",
      role: "Agent",
      agentProfileId: profile.id,
    },
    recentMessages: [],
    openTasks: [],
    prompt: "Default runtime check.",
  });
  assert(defaultWorkspaceRunInput.engine === "deepagent", "default workspace runtime does not select external CLI adapters");
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
