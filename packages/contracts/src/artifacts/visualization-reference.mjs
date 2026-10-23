import { z } from "zod";
import { INTERACTIVE_COMPONENT_CATALOG } from "./interactive-catalog.mjs";

const text = z.string().trim().min(1).max(2000);
const status = z.enum(["verified", "unverified", "blocked"]);
export const ReferenceInventorySchema = z.object({
  schemaVersion: z.literal(1),
  snapshot: z.object({ startedAt: z.string().datetime({ offset: true }), completedAt: z.string().datetime({ offset: true }).optional(), entryUrls: z.array(z.string().url()).min(1), frozen: z.boolean() }).passthrough(),
  cases: z.array(z.object({
    referenceId: text, url: z.string().url(), subject: text, stage: text, title: text, status,
    capabilities: z.array(z.object({ capabilityId: text, description: text }).passthrough()).min(1),
    evidence: z.array(text),
  }).passthrough()),
}).passthrough();
export const ReferenceCoverageSchema = z.object({
  schemaVersion: z.literal(1),
  mappings: z.array(z.object({
    referenceId: text, capabilityId: text, componentId: text, configVersion: z.number().int().positive(),
    status, testIds: z.array(text), evidence: z.array(text), notes: text.optional(),
  }).passthrough()),
}).passthrough();

export function reportReferenceCoverage(rawInventory, rawCoverage) {
  const inventory = ReferenceInventorySchema.parse(rawInventory);
  const coverage = ReferenceCoverageSchema.parse(rawCoverage);
  const errors = [];
  if (inventory.snapshot.completedAt && Date.parse(inventory.snapshot.completedAt) < Date.parse(inventory.snapshot.startedAt)) errors.push("snapshot completion precedes discovery start");
  const cases = new Map();
  const capabilities = new Map();
  for (const entry of inventory.cases) {
    if (cases.has(entry.referenceId)) errors.push(`duplicate reference: ${entry.referenceId}`);
    cases.set(entry.referenceId, entry);
    for (const capability of entry.capabilities) {
      const key = `${entry.referenceId}\0${capability.capabilityId}`;
      if (capabilities.has(key)) errors.push(`duplicate capability: ${entry.referenceId}/${capability.capabilityId}`);
      capabilities.set(key, { entry, capability });
    }
  }
  const verified = new Set();
  const rows = new Set();
  for (const mapping of coverage.mappings) {
    const key = `${mapping.referenceId}\0${mapping.capabilityId}`;
    const rowKey = `${key}\0${mapping.componentId}`;
    if (rows.has(rowKey)) errors.push(`duplicate mapping: ${mapping.referenceId}/${mapping.capabilityId}/${mapping.componentId}`);
    rows.add(rowKey);
    if (!capabilities.has(key)) errors.push(`unknown reference capability: ${mapping.referenceId}/${mapping.capabilityId}`);
    const component = INTERACTIVE_COMPONENT_CATALOG.find((entry) => entry.componentId === mapping.componentId);
    if (!component || component.version !== mapping.configVersion) errors.push(`unimplemented component/version: ${mapping.componentId}@${mapping.configVersion}`);
    if (mapping.status === "verified") {
      if (!mapping.testIds.length || !mapping.evidence.length || !capabilities.get(key)?.entry.evidence.length) errors.push(`missing verification evidence: ${mapping.referenceId}/${mapping.capabilityId}`);
      else if (component?.version === mapping.configVersion && capabilities.get(key)?.entry.status === "verified") verified.add(key);
    }
  }
  const gaps = [...capabilities].filter(([key]) => !verified.has(key)).map(([, { entry, capability }]) => ({ referenceId: entry.referenceId, capabilityId: capability.capabilityId, status: entry.status }));
  const verifiedCases = inventory.cases.filter((entry) => entry.status === "verified" && entry.capabilities.every((capability) => verified.has(`${entry.referenceId}\0${capability.capabilityId}`))).length;
  const frozen = inventory.snapshot.frozen && inventory.snapshot.discoveryComplete !== false && Boolean(inventory.snapshot.completedAt);
  return { frozen, totalCases: cases.size, verifiedCases, totalCapabilities: capabilities.size, verifiedCapabilities: verified.size, gaps, errors,
    complete: frozen && cases.size > 0 && gaps.length === 0 && errors.length === 0 && verifiedCases === cases.size };
}
