import type { WorkspaceAgentProfile, WorkspaceMember, WorkspaceTask, WorkspaceThread } from "./types";

export type WorkspaceToolRisk = "read" | "write" | "external" | "costly";
export type WorkspaceToolApproval = "never" | "on_risk" | "always";

export type WorkspaceToolInterruptConfig = {
  allowedDecisions: ["approve", "reject"];
  description: string;
};

export type WorkspaceInternalToolPolicy = {
  toolName: string;
  risk: WorkspaceToolRisk;
  approval: WorkspaceToolApproval;
  scopes: string[];
  visibleLabel: string;
  description: string;
};

export type WorkspaceGuardedToolSpec = {
  name: string;
  description: string;
  policy: WorkspaceInternalToolPolicy;
  invoke?: (input?: unknown) => Promise<string>;
  cleanup?: () => Promise<void>;
};

export type WorkspaceInternalToolExecutionContext = {
  workspaceName: string;
  thread: WorkspaceThread;
  member: WorkspaceMember;
  recentMessages: string[];
  visibleMessages?: WorkspaceInternalToolVisibleMessage[];
  openTasks: WorkspaceTask[];
};

export type WorkspaceInternalToolVisibleMessage = {
  id: string;
  threadId: string;
  senderName: string;
  content: string;
  createdAt?: number;
};

export type WorkspaceInternalToolCall = {
  toolName: string;
  input?: unknown;
  approval?: "approved" | "denied";
};

export class WorkspaceToolApprovalRequiredError extends Error {
  readonly policy: WorkspaceInternalToolPolicy;
  readonly input: unknown;

  constructor(policy: WorkspaceInternalToolPolicy, input: unknown) {
    super(`${policy.toolName} requires approval before execution.`);
    this.name = "WorkspaceToolApprovalRequiredError";
    this.policy = policy;
    this.input = input;
  }
}

export const WORKSPACE_INTERNAL_TOOL_POLICIES = {
  search_workspace_messages: {
    toolName: "search_workspace_messages",
    risk: "read",
    approval: "never",
    scopes: ["workspace:read", "messages:read"],
    visibleLabel: "Search messages",
    description: "Search messages visible to the current workspace member.",
  },
  summarize_thread: {
    toolName: "summarize_thread",
    risk: "read",
    approval: "never",
    scopes: ["workspace:read", "messages:read"],
    visibleLabel: "Summarize thread",
    description: "Summarize recent messages in the current chat.",
  },
  create_workspace_task: {
    toolName: "create_workspace_task",
    risk: "write",
    approval: "on_risk",
    scopes: ["workspace:read", "tasks:write"],
    visibleLabel: "Create task",
    description: "Create a task in the current workspace.",
  },
  update_workspace_task: {
    toolName: "update_workspace_task",
    risk: "write",
    approval: "on_risk",
    scopes: ["workspace:read", "tasks:write"],
    visibleLabel: "Update task",
    description: "Update a task in the current workspace.",
  },
  share_learning_app: {
    toolName: "share_learning_app",
    risk: "write",
    approval: "on_risk",
    scopes: ["workspace:read", "apps:share"],
    visibleLabel: "Share app",
    description: "Share a learning app card into the current chat.",
  },
  generate_course: {
    toolName: "generate_course",
    risk: "costly",
    approval: "on_risk",
    scopes: ["courses:write"],
    visibleLabel: "Generate course",
    description: "Generate a structured course draft.",
  },
  render_interactive_widget: {
    toolName: "render_interactive_widget",
    risk: "costly",
    approval: "on_risk",
    scopes: ["apps:write"],
    visibleLabel: "Render widget",
    description: "Render an interactive learning widget.",
  },
  create_quiz: {
    toolName: "create_quiz",
    risk: "write",
    approval: "never",
    scopes: ["workspace:read", "quiz:write"],
    visibleLabel: "Create quiz",
    description: "Create a short practice quiz.",
  },
  save_learning_artifact: {
    toolName: "save_learning_artifact",
    risk: "write",
    approval: "on_risk",
    scopes: ["artifacts:write"],
    visibleLabel: "Save artifact",
    description: "Save a learning artifact for later review.",
  },
  save_agent_memory: {
    toolName: "save_agent_memory",
    risk: "write",
    approval: "always",
    scopes: ["memory:write"],
    visibleLabel: "Save memory",
    description: "Save reviewable agent memory for this chat, workspace, or user.",
  },
} satisfies Record<string, Omit<WorkspaceInternalToolPolicy, "approval"> & { approval: WorkspaceToolApproval }>;

export type WorkspaceInternalToolName = keyof typeof WORKSPACE_INTERNAL_TOOL_POLICIES;

type WorkspaceInternalToolExecutor = (context: WorkspaceInternalToolExecutionContext, input: unknown) => string | Promise<string>;

export const WORKSPACE_INTERNAL_TOOL_EXECUTORS = {
  search_workspace_messages: (context, input) => searchWorkspaceMessages(context, input),
  summarize_thread: (context, input) => summarizeWorkspaceThread(context, input),
  create_workspace_task: (context, input) => buildWorkspaceTaskToolPayload(context, input, "create_workspace_task"),
  update_workspace_task: (context, input) => buildWorkspaceTaskToolPayload(context, input, "update_workspace_task"),
  share_learning_app: (context, input) => buildWorkspaceAppArtifactPayload(context, input, "share_learning_app"),
  generate_course: (context, input) => generateWorkspaceCourseDraft(context, input),
  render_interactive_widget: (context, input) => buildWorkspaceAppArtifactPayload(context, input, "render_interactive_widget"),
  create_quiz: (context, input) => createWorkspaceQuiz(context, input),
  save_learning_artifact: (context, input) => buildWorkspaceSavedArtifactPayload(context, input),
  save_agent_memory: (context, input) => buildWorkspaceAgentMemoryPayload(context, input),
} satisfies Record<WorkspaceInternalToolName, WorkspaceInternalToolExecutor>;

export function isWorkspaceInternalToolName(toolName: string): toolName is WorkspaceInternalToolName {
  return Object.prototype.hasOwnProperty.call(WORKSPACE_INTERNAL_TOOL_POLICIES, toolName);
}

export function resolveWorkspaceInternalToolPolicies(profile: WorkspaceAgentProfile): WorkspaceInternalToolPolicy[] {
  const policies: WorkspaceInternalToolPolicy[] = [];
  const seen = new Set<string>();
  for (const capability of profile.capabilities) {
    if (capability.kind !== "internal_tool" || !capability.enabled || seen.has(capability.toolName)) continue;
    if (!isWorkspaceInternalToolName(capability.toolName)) continue;
    const policy = WORKSPACE_INTERNAL_TOOL_POLICIES[capability.toolName];
    if (!policy) continue;
    policies.push({
      ...policy,
      approval: capability.approval,
    });
    seen.add(capability.toolName);
  }
  return policies;
}

export function buildWorkspaceGuardedToolSpecs(
  profile: WorkspaceAgentProfile,
  context?: WorkspaceInternalToolExecutionContext,
): WorkspaceGuardedToolSpec[] {
  return resolveWorkspaceInternalToolPolicies(profile).map((policy) => ({
    name: policy.toolName,
    description: policy.description,
    policy,
    invoke: context
      ? (input?: unknown) =>
          executeWorkspaceInternalTool(profile, context, {
            toolName: policy.toolName,
            input,
          })
      : undefined,
  }));
}

export function buildWorkspaceToolInterrupts(policies: WorkspaceInternalToolPolicy[]) {
  return Object.fromEntries(
    policies
      .filter(requiresWorkspaceToolApproval)
      .map((policy) => [policy.toolName, buildWorkspaceToolInterruptConfig(policy)]),
  ) as Record<string, WorkspaceToolInterruptConfig>;
}

export function buildWorkspaceToolInterruptConfig(policy: WorkspaceInternalToolPolicy): WorkspaceToolInterruptConfig {
  const action =
    policy.risk === "costly"
      ? "spending model/tool budget"
      : policy.risk === "external"
        ? "sending workspace data to an external connection"
        : "changing workspace state";
  return {
    allowedDecisions: ["approve", "reject"],
    description: `${policy.visibleLabel} requires workspace approval before ${action}.`,
  };
}

export function requiresWorkspaceToolApproval(policy: WorkspaceInternalToolPolicy) {
  return policy.approval === "always" || (policy.approval === "on_risk" && policy.risk !== "read");
}

export async function executeWorkspaceInternalTool(
  profile: WorkspaceAgentProfile,
  context: WorkspaceInternalToolExecutionContext,
  call: WorkspaceInternalToolCall,
): Promise<string> {
  const policy = resolveWorkspaceInternalToolPolicies(profile).find((entry) => entry.toolName === call.toolName);
  if (!policy) throw new Error(`${call.toolName} is not enabled for ${profile.displayName}.`);
  if (call.approval === "denied") throw new Error(`${call.toolName} was denied by the user.`);
  if (requiresWorkspaceToolApproval(policy) && call.approval !== "approved") {
    throw new WorkspaceToolApprovalRequiredError(policy, call.input);
  }

  if (!isWorkspaceInternalToolName(policy.toolName)) throw new Error(`${policy.toolName} is not enabled for ${profile.displayName}.`);
  return WORKSPACE_INTERNAL_TOOL_EXECUTORS[policy.toolName](context, call.input);
}

function buildWorkspaceTaskToolPayload(
  context: WorkspaceInternalToolExecutionContext,
  input: unknown,
  toolName: "create_workspace_task" | "update_workspace_task",
) {
  const record = toRecord(input);
  const requestedTaskId = readString(record.taskId);
  const existingTask = requestedTaskId ? context.openTasks.find((task) => task.id === requestedTaskId) : undefined;
  const title = readString(record.title) || existingTask?.title || "Workspace follow-up";
  const scope = readString(record.scope) || existingTask?.scope || "Shared";
  const progress = readString(record.progress) || existingTask?.progress || (toolName === "create_workspace_task" ? "new" : "updated");
  const status = readString(record.status) || existingTask?.status || (toolName === "create_workspace_task" ? "open" : "done");
  const resultSummary = readString(record.resultSummary) || readString(record.summary);
  return JSON.stringify(
    {
      tool: toolName,
      summary:
        toolName === "create_workspace_task"
          ? `Draft task "${title}" for approval.`
          : `Draft task update for "${title}" with status ${status}.`,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      taskIds: existingTask?.id ? [existingTask.id] : [],
      task: {
        ...(toolName === "update_workspace_task" ? { id: requestedTaskId || existingTask?.id } : {}),
        title,
        scope,
        status,
        progress,
        assigneeId: readString(record.assigneeId) || (toolName === "create_workspace_task" ? context.member.id : existingTask?.assigneeId),
        dueAt: readString(record.dueAt) || existingTask?.dueAt,
        resultSummary: resultSummary || existingTask?.resultSummary,
      },
      currentTask: existingTask
        ? {
            id: existingTask.id,
            title: existingTask.title,
            status: existingTask.status,
            progress: existingTask.progress,
          }
        : undefined,
      nextStep:
        toolName === "create_workspace_task"
          ? "After approval, persist this task in the workspace and share a visible task card."
          : "After approval, persist this task update in the workspace and share a visible update card.",
    },
    null,
    2,
  );
}

function buildWorkspaceAgentMemoryPayload(context: WorkspaceInternalToolExecutionContext, input: unknown) {
  const record = toRecord(input);
  const requestedScope = readString(record.scope);
  const scope = requestedScope === "workspace" || requestedScope === "thread" || requestedScope === "user" ? requestedScope : "thread";
  const title = readString(record.title) || "Learning preference";
  const summary = readString(record.summary) || readString(record.description) || `Remembered by ${context.member.displayName} in ${context.thread.name}.`;
  return JSON.stringify(
    {
      tool: "save_agent_memory",
      summary: `Draft memory "${title}" with ${scope} scope.`,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      sourceMessageIds: recentSourceMessageIds(context, 3),
      memoryIds: [],
      memory: {
        scope,
        title,
        summary,
      },
      nextStep: scope === "user" ? "Save only after explicit approval because this affects future personal learning context." : "Save as reviewable workspace memory.",
    },
    null,
    2,
  );
}

function searchWorkspaceMessages(context: WorkspaceInternalToolExecutionContext, input: unknown) {
  const record = toRecord(input);
  const query = readString(record.query).toLowerCase();
  const limit = readLimit(record.limit, 5, 10);
  const messages = readContextVisibleMessages(context);
  const matches = messages.filter((message) => {
    if (!query) return true;
    return `${message.senderName}: ${message.content}`.toLowerCase().includes(query);
  });
  if (!matches.length) {
    return JSON.stringify(
      {
        tool: "search_workspace_messages",
        summary: query ? `No visible messages matched "${query}".` : "No visible messages are available to search.",
        workspaceName: context.workspaceName,
        thread: {
          id: context.thread.id,
          name: context.thread.name,
          type: context.thread.type,
        },
        query: query || null,
        sourceMessageIds: [],
        matches: [],
      },
      null,
      2,
    );
  }

  return JSON.stringify(
    {
      tool: "search_workspace_messages",
      summary: matches.length === 1 ? "Found 1 visible matching message." : `Found ${matches.length} visible matching messages.`,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      query: query || null,
      sourceMessageIds: matches.slice(-limit).map((message) => message.id),
      matches: matches.slice(-limit).map((message, index) => ({
        index,
        id: message.id,
        senderName: message.senderName,
        snippet: message.content,
      })),
    },
    null,
    2,
  );
}

function summarizeWorkspaceThread(context: WorkspaceInternalToolExecutionContext, input: unknown) {
  const record = toRecord(input);
  const limit = readLimit(record.limit, 8, 12);
  const recent = readContextVisibleMessages(context).slice(-limit);
  const openTasks = context.openTasks.filter((task) => task.status !== "done").slice(0, 5);
  const summary = [
    `Chat summary for ${context.thread.name} in ${context.workspaceName}.`,
    `${recent.length} recent visible message${recent.length === 1 ? "" : "s"}.`,
    openTasks.length
      ? `Open tasks: ${openTasks.map((task) => `${task.title} (${task.progress || task.status})`).join("; ")}.`
      : "No open tasks in this chat.",
  ].join(" ");
  return JSON.stringify(
    {
      tool: "summarize_thread",
      summary,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      sourceMessageIds: recent.map((message) => message.id),
      openTaskIds: openTasks.map((task) => task.id),
      recentMessages: recent.map((message) => ({
        id: message.id,
        senderName: message.senderName,
        snippet: message.content,
      })),
      openTasks: openTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        progress: task.progress,
      })),
      missingContext: recent.length ? [] : ["No recent visible messages are available for this thread."],
    },
    null,
    2,
  );
}

function readContextVisibleMessages(context: WorkspaceInternalToolExecutionContext): WorkspaceInternalToolVisibleMessage[] {
  if (context.visibleMessages?.length) {
    return context.visibleMessages.filter((message) => message.threadId === context.thread.id);
  }
  return context.recentMessages.map((message, index) => {
    const match = /^([^:]+):\s*(.*)$/.exec(message);
    return {
      id: `recent_${index + 1}`,
      threadId: context.thread.id,
      senderName: match?.[1]?.trim() || "Unknown",
      content: match?.[2]?.trim() || message,
    };
  });
}

function createWorkspaceQuiz(context: WorkspaceInternalToolExecutionContext, input: unknown) {
  const record = toRecord(input);
  const topic = readString(record.topic) || inferQuizTopic(context);
  const difficulty = readString(record.difficulty) || "adaptive";
  const learningGoal = readString(record.learningGoal) || `Check understanding of ${topic}.`;
  const questionCount = readLimit(record.questionCount, 3, 6);
  const recentContext = readContextVisibleMessages(context).slice(-3);
  const questions = Array.from({ length: questionCount }, (_, index) => {
    const step = index + 1;
    const focus = selectQuizFocus(topic, learningGoal, step);
    return {
      id: `q${step}`,
      type: step % 3 === 0 ? "reflection" : step % 2 === 0 ? "short_answer" : "multiple_choice",
      prompt: buildQuizPrompt(topic, focus, difficulty, step),
      choices:
        step % 2 === 1
          ? [
              `A correct explanation connects ${topic} to the learning goal.`,
              "A memorized definition without reasoning.",
              "An unrelated example from another topic.",
            ]
          : undefined,
      expectedAnswer: buildExpectedQuizAnswer(topic, focus),
      rubric: [
        "Uses the learner's own words where possible.",
        `Connects the answer to: ${learningGoal}.`,
        "Shows one reasoning step instead of only giving a final phrase.",
      ],
    };
  });

  return JSON.stringify(
    {
      tool: "create_quiz",
      summary: `Created a ${questions.length}-question ${difficulty} quiz about ${topic}.`,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      topic,
      difficulty,
      learningGoal,
      sourceMessageIds: recentContext.map((message) => message.id),
      sourceContext: recentContext.map((message) => ({
        id: message.id,
        senderName: message.senderName,
        snippet: message.content,
      })),
      questionIds: questions.map((question) => question.id),
      questions,
      nextStep: "Ask the learner to answer one question at a time, then give targeted feedback.",
    },
    null,
    2,
  );
}

function generateWorkspaceCourseDraft(context: WorkspaceInternalToolExecutionContext, input: unknown) {
  const record = toRecord(input);
  const topic = readString(record.topic) || inferQuizTopic(context);
  const audience = readString(record.audience) || "workspace learners";
  const duration = readString(record.duration) || "self-paced";
  const learningGoal = readString(record.learningGoal) || `Build a useful working understanding of ${topic}.`;
  const moduleCount = readLimit(record.moduleCount, 3, 8);
  const sourceContext = readContextVisibleMessages(context).slice(-5);
  const openTasks = context.openTasks.filter((task) => task.status !== "done").slice(0, 5);
  const openTaskTitles = openTasks.map((task) => task.title);
  const modules = Array.from({ length: moduleCount }, (_, index) => {
    const step = index + 1;
    const focus = selectCourseModuleFocus(topic, learningGoal, step);
    return {
      id: `module_${step}`,
      title: `${step}. ${focus}`,
      objective: `Learners can explain ${focus.toLowerCase()} and connect it to ${topic}.`,
      activities: [
        `Start with a short discussion: what does ${topic} mean in the current workspace context?`,
        `Work through one example that targets ${focus.toLowerCase()}.`,
        `Create a small artifact, note, quiz answer, or widget that demonstrates the idea.`,
      ],
      practice: `Answer one check question and revise the explanation of ${focus.toLowerCase()} after feedback.`,
      deliverable: step === moduleCount ? `A final synthesis artifact for ${topic}.` : `A short checkpoint note for ${focus.toLowerCase()}.`,
    };
  });

  return JSON.stringify(
    {
      tool: "generate_course",
      summary: `Drafted a ${modules.length}-module course about ${topic}.`,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      topic,
      audience,
      duration,
      learningGoal,
      sourceMessageIds: sourceContext.map((message) => message.id),
      sourceContext: sourceContext.map((message) => ({
        id: message.id,
        senderName: message.senderName,
        snippet: message.content,
      })),
      relatedOpenTaskIds: openTasks.map((task) => task.id),
      relatedOpenTasks: openTaskTitles,
      moduleIds: modules.map((module) => module.id),
      modules,
      assessments: [
        `Baseline: ask the learner to explain ${topic} before starting.`,
        `Midpoint: use a short quiz to check ${modules[Math.max(0, Math.floor(modules.length / 2) - 1)]?.title ?? topic}.`,
        `Final: review the synthesis artifact against the learning goal: ${learningGoal}.`,
      ],
      nextStep: "Ask the user to review the outline, then convert accepted modules into workspace tasks or artifacts.",
    },
    null,
    2,
  );
}

function buildWorkspaceAppArtifactPayload(
  context: WorkspaceInternalToolExecutionContext,
  input: unknown,
  toolName: "share_learning_app" | "render_interactive_widget",
) {
  const record = toRecord(input);
  const title = readString(record.title) || (toolName === "render_interactive_widget" ? "Interactive widget" : "Shared learning app");
  const description = readString(record.description) || readString(record.summary) || `Created by ${context.member.displayName} in ${context.thread.name}.`;
  const artifact = {
    type: "app",
    appId: readString(record.appId) || undefined,
    version: readOptionalNumber(record.version),
    title,
    description,
    primaryAction: readString(record.primaryAction) || (toolName === "render_interactive_widget" ? "Open widget" : "Open app"),
    secondaryAction: readString(record.secondaryAction) || undefined,
    template: toolName === "render_interactive_widget" ? buildWidgetTemplate(record, title, description) : readTemplate(record.template),
  };
  return JSON.stringify(
    {
      tool: toolName,
      summary: `${toolName === "render_interactive_widget" ? "Prepared widget" : "Prepared app"} artifact "${title}".`,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      sourceMessageIds: recentSourceMessageIds(context, 3),
      appIds: artifact.appId ? [artifact.appId] : [],
      artifactIds: [],
      artifact,
      nextStep: toolName === "render_interactive_widget" ? "Share the widget card in the thread for review." : "Share the app card in the thread.",
    },
    null,
    2,
  );
}

function buildWorkspaceSavedArtifactPayload(context: WorkspaceInternalToolExecutionContext, input: unknown) {
  const record = toRecord(input);
  const title = readString(record.title) || "Saved learning artifact";
  const description = readString(record.description) || readString(record.summary) || `Saved by ${context.member.displayName} in ${context.thread.name}.`;
  return JSON.stringify(
    {
      tool: "save_learning_artifact",
      summary: `Prepared learning artifact "${title}" for review.`,
      workspaceName: context.workspaceName,
      thread: {
        id: context.thread.id,
        name: context.thread.name,
        type: context.thread.type,
      },
      sourceMessageIds: recentSourceMessageIds(context, 3),
      artifactIds: [],
      artifact: {
        type: "task",
        title,
        description,
        groups: readStringList(record.groups, ["Artifact"]),
      },
      nextStep: "Share the artifact card in the thread or attach it to a follow-up task.",
    },
    null,
    2,
  );
}

function recentSourceMessageIds(context: WorkspaceInternalToolExecutionContext, limit: number) {
  return readContextVisibleMessages(context)
    .slice(-limit)
    .map((message) => message.id);
}

function buildWidgetTemplate(record: Record<string, unknown>, title: string, description: string) {
  const explicitTemplate = readTemplate(record.template);
  if (explicitTemplate) return explicitTemplate;
  const html = readString(record.html) || readString(record.source);
  if (html) return { type: "html", source: html };
  return { type: "generator", prompt: readString(record.prompt) || `Create an interactive learning widget titled "${title}". ${description}` };
}

function readTemplate(value: unknown) {
  const template = toRecord(value);
  const type = readString(template.type);
  if (type === "html") {
    const source = readString(template.source);
    return source ? { type: "html", source } : undefined;
  }
  if (type === "generator") {
    const prompt = readString(template.prompt);
    return prompt ? { type: "generator", prompt } : undefined;
  }
  return undefined;
}

function selectCourseModuleFocus(topic: string, learningGoal: string, step: number) {
  if (step === 1) return `Mental model for ${topic}`;
  if (step === 2) return `Common misconceptions in ${topic}`;
  if (step === 3) return `Guided practice for ${topic}`;
  if (step === 4) return `Application project for ${topic}`;
  return `${topic} extension ${step}: ${summarizeText(learningGoal, 48)}`;
}

function inferQuizTopic(context: WorkspaceInternalToolExecutionContext) {
  const recent = context.recentMessages.at(-1)?.replace(/^[^:]+:\s*/, "").trim();
  if (recent) return summarizeText(recent, 80);
  const task = context.openTasks.find((entry) => entry.status !== "done");
  return task?.title || context.thread.name || "this topic";
}

function selectQuizFocus(topic: string, learningGoal: string, step: number) {
  if (step === 1) return `core idea of ${topic}`;
  if (step === 2) return `common misconception around ${topic}`;
  if (step === 3) return `transfer of ${topic} to a new example`;
  return `${topic} checkpoint ${step}: ${summarizeText(learningGoal, 56)}`;
}

function buildQuizPrompt(topic: string, focus: string, difficulty: string, step: number) {
  if (step % 3 === 0) {
    return `Reflection (${difficulty}): explain ${focus} in your own words and name one thing you are still unsure about.`;
  }
  if (step % 2 === 0) {
    return `Short answer (${difficulty}): give a concrete example that demonstrates ${focus}.`;
  }
  return `Multiple choice (${difficulty}): which option best explains ${focus} for ${topic}?`;
}

function buildExpectedQuizAnswer(topic: string, focus: string) {
  return `A strong answer explains ${focus}, ties it back to ${topic}, and includes one concrete reasoning step.`;
}

function summarizeText(value: string, limit: number) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 3))}...`;
}

function readOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readStringList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const strings = value.flatMap((entry) => {
    const text = readString(entry);
    return text ? [text] : [];
  });
  return strings.length ? strings : fallback;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readLimit(value: unknown, fallback: number, max: number) {
  const raw = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : fallback;
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(1, Math.min(max, Math.floor(raw)));
}
