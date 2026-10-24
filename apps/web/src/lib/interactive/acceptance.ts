import { z } from "zod";
import { InteractiveComponentPayloadSchema } from "@primoria/contracts/artifacts/schemas";

export const AcceptanceAttemptSchema = z.object({
  codeRevision: z.string().optional(), workingTreeHash: z.string().optional(), catalogHash: z.string().optional(),
  startedAt: z.string().datetime({ offset: true }), finishedAt: z.string().datetime({ offset: true }),
  status: z.enum(["passed", "failed", "blocked"]), explanation: z.string(),
  payload: InteractiveComponentPayloadSchema.optional(),
  patch: z.record(z.string(), z.unknown()).optional(),
  courseId: z.string().optional(),
  configurationRequest: z.string().optional(),
  courseOutput: z.record(z.string(), z.unknown()).optional(),
  positioningOutput: z.record(z.string(), z.unknown()).optional(),
  model: z.string().optional(), runIds: z.array(z.string()).default([]),
  toolCalls: z.array(z.object({ name: z.string(), id: z.string(), args: z.record(z.string(), z.unknown()) })).default([]),
  modelCalls: z.array(z.object({ model: z.string(), status: z.number().int(), usage: z.record(z.string(), z.unknown()).nullable(), responseId: z.string().nullable() })).default([]),
  latencyMs: z.number().nonnegative(), error: z.string().optional(),
  screenshot: z.string().regex(/^[a-zA-Z0-9_-]+\.(?:png|jpg|webp)$/).optional(), assertions: z.array(z.string()).default([]),
}).strict();

export const AcceptanceCaseSchema = z.object({
  caseId: z.string(), prompt: z.string().min(1), kind: z.enum(["chat", "adjust", "course"]),
  language: z.enum(["zh", "en", "mixed"]), length: z.enum(["short", "medium", "long"]),
  expectedComponentIds: z.array(z.string()).min(1), subject: z.string(),
  parentCaseId: z.string().optional(), parameterAssertions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  attempts: z.array(AcceptanceAttemptSchema),
}).strict();

export const AcceptanceManifestSchema = z.object({
  schemaVersion: z.literal(1), runId: z.string(), seed: z.number().int(), frozenAt: z.string().datetime({ offset: true }),
  scope: z.enum(["platform-baseline", "full-reference"]), catalogHash: z.string(),
  codeRevision: z.string(), workingTreeHash: z.string(),
  cases: z.array(AcceptanceCaseSchema),
  checks: z.array(z.object({ name: z.string(), status: z.enum(["passed", "failed", "blocked", "not_run"]), detail: z.string() })),
}).strict();

export type AcceptanceManifest = z.infer<typeof AcceptanceManifestSchema>;
export type AcceptanceCase = z.infer<typeof AcceptanceCaseSchema>;
export type AcceptanceAttempt = z.infer<typeof AcceptanceAttemptSchema>;

export function validateAcceptanceDistribution(manifest: AcceptanceManifest): string[] {
  const errors: string[] = [];
  const cases = manifest.cases;
  const count = (field: "kind" | "length" | "language", value: string) => cases.filter((entry) => entry[field] === value).length;
  if (cases.length !== 20) errors.push("Exactly 20 frozen user prompts are required");
  if (new Set(cases.map((entry) => entry.caseId)).size !== cases.length) errors.push("Duplicate case IDs");
  for (const [field, values] of Object.entries({ kind: { chat: 12, adjust: 4, course: 4 }, length: { short: 6, medium: 8, long: 6 }, language: { zh: 14, en: 4, mixed: 2 } })) {
    for (const [value, expected] of Object.entries(values)) if (count(field as "kind" | "length" | "language", value) !== expected) errors.push(`${field}/${value} must have ${expected} cases`);
  }
  for (const entry of cases) {
    if (entry.kind === "adjust" && !cases.slice(0, cases.indexOf(entry)).some((parent) => parent.caseId === entry.parentCaseId && parent.kind === "chat")) errors.push(`${entry.caseId}: adjustment requires a preceding chat parent`);
  }
  return errors;
}
