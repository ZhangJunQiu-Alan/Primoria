import {
  AgentTaskCommentInputSchema,
  AgentTaskCreateInputSchema,
  AgentTaskDependencyInputSchema,
  AgentTaskEditInputSchema,
  AgentTaskListInputSchema,
  AgentTaskRunInputSchema,
  AgentTaskScheduleInputSchema,
  AgentTaskStatusInputSchema,
  type AgentTaskResult,
  type AgentTaskUnsupportedResult,
} from "../../../../../packages/contracts/src/agent/index";
import type { CreateWorkspaceTaskInput, UpdateWorkspaceTaskInput, WorkspaceTask } from "../workspaces/types";

export type AgentTaskOperation =
  | "create"
  | "list"
  | "run"
  | "edit"
  | "comment"
  | "status"
  | "dependency"
  | "schedule";

export type WorkspaceAgentTaskToolAdapter = {
  createTask?: (input: CreateWorkspaceTaskInput) => Promise<WorkspaceTask> | WorkspaceTask;
  updateTask?: (input: UpdateWorkspaceTaskInput) => Promise<WorkspaceTask> | WorkspaceTask;
  listTasks?: (input: { workspaceId: string; threadId?: string; status?: string }) => Promise<WorkspaceTask[]> | WorkspaceTask[];
  runTask?: (input: { workspaceId: string; taskId: string }) => Promise<WorkspaceTask> | WorkspaceTask;
};

export function unsupportedAgentTaskOperation(operation: AgentTaskOperation, reason?: string): AgentTaskUnsupportedResult {
  return {
    supported: false,
    reason: reason ?? `Task operation "${operation}" is not implemented by this workspace adapter yet.`,
  };
}

export async function executeWorkspaceAgentTaskOperation(
  operation: AgentTaskOperation,
  input: unknown,
  adapter: WorkspaceAgentTaskToolAdapter,
): Promise<AgentTaskResult | { supported: true; tasks: WorkspaceTask[]; summary?: string }> {
  if (operation === "create") {
    if (!adapter.createTask) return unsupportedAgentTaskOperation(operation);
    const parsed = AgentTaskCreateInputSchema.parse(input);
    const task = await adapter.createTask({
      workspaceId: parsed.workspaceId,
      threadId: parsed.threadId,
      title: parsed.title,
      scope: parsed.scope,
      progress: parsed.progress,
      assigneeId: parsed.assigneeId,
      dueAt: parsed.dueAt,
    });
    return { supported: true, task, summary: `Created task "${task.title}".` };
  }

  if (operation === "list") {
    if (!adapter.listTasks) return unsupportedAgentTaskOperation(operation);
    const parsed = AgentTaskListInputSchema.parse(input);
    const tasks = await adapter.listTasks(parsed);
    return { supported: true, tasks, summary: `Listed ${tasks.length} task${tasks.length === 1 ? "" : "s"}.` };
  }

  if (operation === "run") {
    if (!adapter.runTask) return unsupportedAgentTaskOperation(operation);
    const parsed = AgentTaskRunInputSchema.parse(input);
    const task = await adapter.runTask({ workspaceId: parsed.workspaceId, taskId: parsed.taskId });
    return { supported: true, task, summary: `Ran task "${task.title}".` };
  }

  if (operation === "edit") {
    if (!adapter.updateTask) return unsupportedAgentTaskOperation(operation);
    const parsed = AgentTaskEditInputSchema.parse(input);
    if (parsed.title !== undefined || parsed.scope !== undefined || parsed.dueAt !== undefined) {
      return unsupportedAgentTaskOperation(operation, "Current workspace task editing supports progress and assignee changes; title, scope, and due date edits need service support first.");
    }
    const task = await adapter.updateTask({
      workspaceId: parsed.workspaceId,
      taskId: parsed.taskId,
      status: "open",
      progress: parsed.progress,
      assigneeId: parsed.assigneeId,
    });
    return { supported: true, task, summary: `Edited task "${task.title}".` };
  }

  if (operation === "status") {
    if (!adapter.updateTask) return unsupportedAgentTaskOperation(operation);
    const parsed = AgentTaskStatusInputSchema.parse(input);
    const task = await adapter.updateTask({
      workspaceId: parsed.workspaceId,
      taskId: parsed.taskId,
      status: parsed.status,
      progress: parsed.progress,
      resultSummary: parsed.resultSummary,
    });
    return { supported: true, task, summary: `Updated task "${task.title}" to ${task.status}.` };
  }

  if (operation === "comment") {
    AgentTaskCommentInputSchema.parse(input);
    return unsupportedAgentTaskOperation(operation, "Task comments need a persisted comment model before agents can write them.");
  }

  if (operation === "dependency") {
    AgentTaskDependencyInputSchema.parse(input);
    return unsupportedAgentTaskOperation(operation, "Task dependencies need persisted dependency edges before agents can write them.");
  }

  AgentTaskScheduleInputSchema.parse(input);
  return unsupportedAgentTaskOperation(operation, "Task schedules need a persisted scheduling backend before agents can write them.");
}
