import { z } from "zod";

export const AgentCapabilitySchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("skill"),
    id: z.string().optional(),
    source: z.enum(["system", "workspace", "user"]),
    path: z.string(),
    enabled: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal("internal_tool"),
    id: z.string().optional(),
    toolName: z.string(),
    approval: z.enum(["never", "on_risk", "always"]),
    enabled: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal("mcp_tool"),
    id: z.string().optional(),
    connectionId: z.string(),
    toolName: z.string(),
    approval: z.enum(["on_risk", "always"]),
    enabled: z.boolean().default(true),
  }),
  z.object({
    kind: z.literal("subagent"),
    id: z.string().optional(),
    agentProfileId: z.string(),
    enabled: z.boolean().default(true),
  }),
]);

export const AgentProfileSchema = z.object({
  id: z.string(),
  workspaceId: z.string().optional(),
  ownerId: z.string().optional(),
  displayName: z.string(),
  handle: z.string(),
  description: z.string(),
  visibility: z.enum(["private", "workspace", "public_template"]).optional(),
  templateKey: z.string().optional(),
  systemPrompt: z.string(),
  defaultModel: z.string().optional(),
  memoryScope: z.enum(["none", "user", "workspace", "thread"]),
  capabilities: z.array(AgentCapabilitySchema),
});

export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;
export type AgentProfile = z.infer<typeof AgentProfileSchema>;
