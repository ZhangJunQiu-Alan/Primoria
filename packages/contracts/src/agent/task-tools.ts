import { z } from "zod";

const TaskBaseInputSchema = z.object({
  workspaceId: z.string(),
  threadId: z.string().optional(),
});

const TaskIdInputSchema = TaskBaseInputSchema.extend({
  taskId: z.string(),
});

export const AgentTaskCreateInputSchema = TaskBaseInputSchema.extend({
  threadId: z.string(),
  title: z.string(),
  scope: z.string().optional(),
  progress: z.string().optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().optional(),
});

export const AgentTaskListInputSchema = TaskBaseInputSchema.extend({
  status: z.string().optional(),
});

export const AgentTaskRunInputSchema = TaskIdInputSchema;

export const AgentTaskEditInputSchema = TaskIdInputSchema.extend({
  title: z.string().optional(),
  scope: z.string().optional(),
  progress: z.string().optional(),
  assigneeId: z.string().optional(),
  dueAt: z.string().optional(),
});

export const AgentTaskCommentInputSchema = TaskIdInputSchema.extend({
  comment: z.string(),
});

export const AgentTaskStatusInputSchema = TaskIdInputSchema.extend({
  status: z.string(),
  progress: z.string().optional(),
  resultSummary: z.string().optional(),
});

export const AgentTaskDependencyInputSchema = TaskIdInputSchema.extend({
  dependsOnTaskId: z.string(),
  relation: z.string().optional(),
});

export const AgentTaskScheduleInputSchema = TaskIdInputSchema.extend({
  when: z.string(),
});

export const AgentTaskUnsupportedResultSchema = z.object({
  supported: z.literal(false),
  reason: z.string(),
});

export const AgentTaskResultSchema = z.discriminatedUnion("supported", [
  z.object({ supported: z.literal(true), task: z.unknown(), summary: z.string().optional() }),
  AgentTaskUnsupportedResultSchema,
]);

export type AgentTaskCreateInput = z.infer<typeof AgentTaskCreateInputSchema>;
export type AgentTaskListInput = z.infer<typeof AgentTaskListInputSchema>;
export type AgentTaskRunInput = z.infer<typeof AgentTaskRunInputSchema>;
export type AgentTaskEditInput = z.infer<typeof AgentTaskEditInputSchema>;
export type AgentTaskCommentInput = z.infer<typeof AgentTaskCommentInputSchema>;
export type AgentTaskStatusInput = z.infer<typeof AgentTaskStatusInputSchema>;
export type AgentTaskDependencyInput = z.infer<typeof AgentTaskDependencyInputSchema>;
export type AgentTaskScheduleInput = z.infer<typeof AgentTaskScheduleInputSchema>;
export type AgentTaskUnsupportedResult = z.infer<typeof AgentTaskUnsupportedResultSchema>;
export type AgentTaskResult = z.infer<typeof AgentTaskResultSchema>;
