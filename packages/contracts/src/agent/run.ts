import { z } from "zod";
import { AgentContextSchema } from "./context";
import { AgentProfileSchema } from "./profile";

export const AgentEngineNameSchema = z.enum(["deepagent", "placeholder", "external"]);

export const RunAgentInputSchema = z.object({
  runId: z.string(),
  workspaceId: z.string().optional(),
  threadId: z.string().optional(),
  userId: z.string().optional(),
  surface: z.enum(["tutor", "course", "workspace", "task"]).default("workspace"),
  engine: AgentEngineNameSchema.default("deepagent"),
  profile: AgentProfileSchema,
  prompt: z.string(),
  context: AgentContextSchema.optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const AgentRunResultSchema = z.object({
  content: z.string().default(""),
  status: z.enum(["completed", "failed", "cancelled", "waiting_for_approval"]).optional(),
  error: z.string().optional(),
});

export type AgentEngineName = z.infer<typeof AgentEngineNameSchema>;
export type RunAgentInput = z.infer<typeof RunAgentInputSchema>;
export type AgentRunResult = z.infer<typeof AgentRunResultSchema>;
