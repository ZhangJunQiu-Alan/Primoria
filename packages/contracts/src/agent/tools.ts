import { z } from "zod";

export const ToolRiskSchema = z.enum(["read", "write", "external", "costly"]);
export const ToolApprovalSchema = z.enum(["never", "on_risk", "always"]);

export const ToolManifestSchema = z.object({
  name: z.string(),
  description: z.string(),
  source: z.enum(["internal", "mcp", "external"]).default("internal"),
  risk: ToolRiskSchema,
  approval: ToolApprovalSchema,
  scopes: z.array(z.string()).default([]),
  sideEffects: z.array(z.string()).default([]),
  available: z.boolean().default(true),
  execution: z
    .object({
      available: z.boolean().default(false),
      reason: z.string().optional(),
    })
    .optional(),
  inspector: z
    .object({
      label: z.string(),
      description: z.string().optional(),
      fields: z.array(z.string()).default([]),
    })
    .optional(),
  render: z
    .object({
      renderer: z.string().optional(),
      inspector: z.string().optional(),
      artifactType: z.string().optional(),
      streaming: z.boolean().optional(),
      streamingRenderer: z.string().optional(),
    })
    .optional(),
});

export type ToolRisk = z.infer<typeof ToolRiskSchema>;
export type ToolApproval = z.infer<typeof ToolApprovalSchema>;
export type ToolManifest = z.infer<typeof ToolManifestSchema>;

export type ToolExecutionContext = {
  runId: string;
  workspaceId?: string;
  threadId?: string;
  userId?: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
};

export type ExecutableToolManifest<TInput = unknown, TOutput = unknown> = ToolManifest & {
  parameters?: z.ZodType<TInput>;
  returns?: z.ZodType<TOutput>;
  execute?: (input: TInput, context: ToolExecutionContext) => Promise<TOutput>;
};

export type ToolRendererRegistration = {
  key: string;
  toolName?: string;
  artifactType?: string;
  streaming?: boolean;
  description?: string;
};
