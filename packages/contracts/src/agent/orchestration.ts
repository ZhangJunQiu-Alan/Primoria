import { z } from "zod";
import { AgentAskUserRequestSchema } from "./events";

export const GroupSupervisorActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("speak"),
    from: z.string().optional(),
    message: z.string(),
  }),
  z.object({
    type: z.literal("broadcast"),
    message: z.string(),
    targetAgentIds: z.array(z.string()).optional(),
  }),
  z.object({
    type: z.literal("delegate"),
    agentId: z.string(),
    task: z.string(),
    context: z.record(z.unknown()).optional(),
  }),
  z.object({
    type: z.literal("execute_task"),
    taskId: z.string(),
    instruction: z.string().optional(),
  }),
  z.object({
    type: z.literal("finish"),
    result: z.string().optional(),
  }),
]);

export const ExternalAgentSessionEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("started"),
    engine: z.string().optional(),
    model: z.string().optional(),
    payload: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("message.delta"),
    text: z.string(),
    content: z.string().optional(),
  }),
  z.object({
    type: z.literal("subagent.started"),
    name: z.string(),
    input: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("subagent.completed"),
    name: z.string(),
    output: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("ask_user.requested"),
    question: AgentAskUserRequestSchema,
  }),
  z.object({
    type: z.literal("completed"),
    result: z.unknown().optional(),
  }),
  z.object({
    type: z.literal("failed"),
    error: z.object({
      message: z.string(),
      code: z.string().optional(),
      retryable: z.boolean().optional(),
    }),
  }),
  z.object({
    type: z.literal("cancelled"),
    reason: z.string().optional(),
  }),
]);

export type GroupSupervisorAction = z.infer<typeof GroupSupervisorActionSchema>;
export type ExternalAgentSessionEvent = z.infer<typeof ExternalAgentSessionEventSchema>;

export type ExternalAgentSession = {
  id: string;
  streamEvents: () => AsyncIterable<ExternalAgentSessionEvent>;
  askUser: (question: z.infer<typeof AgentAskUserRequestSchema>) => Promise<{ answer: string; resumeToken: string }>;
  cancel: (reason?: string) => Promise<void>;
};

export type ExternalAgentAdapter = {
  name: string;
  spawn: (input: {
    runId: string;
    workspaceId?: string;
    threadId?: string;
    prompt: string;
    metadata?: Record<string, unknown>;
  }) => Promise<ExternalAgentSession>;
};
