import { z } from "zod";

export const AgentMemoryCandidateSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  summary: z.string(),
  scope: z.enum(["user", "workspace", "thread"]).default("thread"),
  confidence: z.number().min(0).max(1).optional(),
  source: z
    .object({
      runId: z.string().optional(),
      messageIds: z.array(z.string()).optional(),
      extractor: z.string().optional(),
    })
    .optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const AgentMemoryExtractionInputSchema = z.object({
  runId: z.string(),
  workspaceId: z.string().optional(),
  threadId: z.string().optional(),
  prompt: z.string(),
  response: z.string().default(""),
  context: z.unknown().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type AgentMemoryCandidate = z.infer<typeof AgentMemoryCandidateSchema>;
export type AgentMemoryExtractionInput = z.infer<typeof AgentMemoryExtractionInputSchema>;
