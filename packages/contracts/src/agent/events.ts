import { z } from "zod";

export const AgentEventTypeSchema = z.enum([
  "runtime.started",
  "runtime.step",
  "runtime.completed",
  "runtime.failed",
  "message.delta",
  "tool.started",
  "tool.completed",
  "tool.failed",
  "tool.skipped",
  "subagent.started",
  "subagent.completed",
  "approval.requested",
  "ask_user.requested",
  "memory.candidate",
  "memory.saved",
  "artifact.created",
  "task.updated",
  "signal.emitted",
]);

const BaseAgentEventSchema = z.object({
  id: z.string().optional(),
  runId: z.string(),
  workspaceId: z.string().optional(),
  threadId: z.string().optional(),
  createdAt: z.number().optional(),
});

export const AgentSignalSchema = z.object({
  type: z.enum([
    "runtime_started",
    "runtime_completed",
    "runtime_failed",
    "step_completed",
    "action_applied",
    "action_failed",
    "action_skipped",
    "memory_saved",
  ]),
  label: z.string(),
  payload: z.unknown().optional(),
});

export const AgentApprovalRequestSchema = z.object({
  approvalId: z.string().optional(),
  toolName: z.string(),
  input: z.unknown().optional(),
  policy: z.unknown().optional(),
  resumeToken: z.string().optional(),
});

export const AgentAskUserRequestSchema = z.object({
  questionId: z.string().optional(),
  prompt: z.string(),
  options: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  resumeToken: z.string().optional(),
});

export const AgentEventSchema = z.discriminatedUnion("type", [
  BaseAgentEventSchema.extend({
    type: z.literal("runtime.started"),
    engine: z.string().optional(),
    model: z.string().optional(),
    payload: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("runtime.step"),
    label: z.string(),
    payload: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("runtime.completed"),
    result: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("runtime.failed"),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      retryable: z.boolean().optional(),
    }),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("message.delta"),
    text: z.string(),
    content: z.string().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("tool.started"),
    toolName: z.string(),
    input: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("tool.completed"),
    toolName: z.string(),
    output: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("tool.failed"),
    toolName: z.string(),
    error: z
      .object({
        message: z.string(),
        code: z.string().optional(),
        retryable: z.boolean().optional(),
      })
      .optional(),
    payload: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("tool.skipped"),
    toolName: z.string(),
    reason: z.string().optional(),
    payload: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("subagent.started"),
    name: z.string(),
    input: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("subagent.completed"),
    name: z.string(),
    output: z.unknown().optional(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("approval.requested"),
    approval: AgentApprovalRequestSchema,
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("ask_user.requested"),
    question: AgentAskUserRequestSchema,
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("memory.candidate"),
    memory: z.unknown(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("memory.saved"),
    memory: z.unknown(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("artifact.created"),
    artifact: z.unknown(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("task.updated"),
    task: z.unknown(),
  }),
  BaseAgentEventSchema.extend({
    type: z.literal("signal.emitted"),
    signal: AgentSignalSchema,
  }),
]);

export type AgentEventType = z.infer<typeof AgentEventTypeSchema>;
export type AgentSignal = z.infer<typeof AgentSignalSchema>;
export type AgentApprovalRequest = z.infer<typeof AgentApprovalRequestSchema>;
export type AgentAskUserRequest = z.infer<typeof AgentAskUserRequestSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
