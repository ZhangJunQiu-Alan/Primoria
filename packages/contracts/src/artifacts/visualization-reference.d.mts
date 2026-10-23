import type { z } from "zod";
export type ReferenceInventory = {
  schemaVersion: 1;
  snapshot: { startedAt: string; completedAt?: string; entryUrls: string[]; frozen: boolean };
  cases: { referenceId: string; url: string; subject: string; stage: string; title: string; status: "verified" | "unverified" | "blocked"; capabilities: { capabilityId: string; description: string }[]; evidence: string[] }[];
};
export type ReferenceCoverage = { schemaVersion: 1; mappings: { referenceId: string; capabilityId: string; componentId: string; configVersion: number; status: "verified" | "unverified" | "blocked"; testIds: string[]; evidence: string[]; notes?: string }[] };
export type ReferenceCoverageReport = { frozen: boolean; totalCases: number; verifiedCases: number; totalCapabilities: number; verifiedCapabilities: number; gaps: { referenceId: string; capabilityId: string; status: string }[]; errors: string[]; complete: boolean };
export declare const ReferenceInventorySchema: z.ZodType<ReferenceInventory>;
export declare const ReferenceCoverageSchema: z.ZodType<ReferenceCoverage>;
export declare function reportReferenceCoverage(inventory: unknown, coverage: unknown): ReferenceCoverageReport;
