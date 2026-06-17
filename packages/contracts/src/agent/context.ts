import { z } from "zod";

export const AgentContextMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant", "system", "tool"]),
  name: z.string().optional(),
  content: z.string(),
  createdAt: z.number().optional(),
});

export const AgentContextSchema = z.object({
  workspaceId: z.string().optional(),
  threadId: z.string().optional(),
  surface: z.enum(["tutor", "course", "workspace", "task"]).default("workspace"),
  prompt: z.string().optional(),
  systemPrompt: z.string(),
  messages: z.array(AgentContextMessageSchema).default([]),
  memories: z.array(z.unknown()).default([]),
  tasks: z.array(z.unknown()).default([]),
  artifacts: z.array(z.unknown()).default([]),
  tokenBudget: z.number().optional(),
  tokenEstimate: z.number().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type AgentContextMessage = z.infer<typeof AgentContextMessageSchema>;
export type AgentContext = z.infer<typeof AgentContextSchema>;
