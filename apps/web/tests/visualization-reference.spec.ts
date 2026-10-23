import { describe, expect, it } from "vitest";
import { reportReferenceCoverage } from "@primoria/contracts/artifacts/visualization-reference";
const inventory = { schemaVersion: 1, snapshot: { startedAt: "2026-10-22T00:00:00Z", completedAt: "2026-10-22T01:00:00Z", entryUrls: ["https://example.com/subjects"], frozen: true }, cases: [{ referenceId: "optics", url: "https://example.com/lens", subject: "physics", stage: "senior", title: "Lens", status: "verified", capabilities: [{ capabilityId: "rays", description: "ray diagram" }, { capabilityId: "virtual", description: "virtual image" }], evidence: ["observed.png"] }] };
const mapping = { referenceId: "optics", capabilityId: "rays", componentId: "physics.lens-imaging", configVersion: 1, status: "verified", testIds: ["lens.spec"], evidence: ["test.png"] };
describe("reference coverage audit", () => {
  it("keeps missing modes in the denominator", () => {
    const report = reportReferenceCoverage(inventory, { schemaVersion: 1, mappings: [mapping] });
    expect(report).toMatchObject({ totalCases: 1, verifiedCases: 0, totalCapabilities: 2, verifiedCapabilities: 1, complete: false });
    expect(report.gaps[0].capabilityId).toBe("virtual");
  });
  it("requires frozen inventory, actual implementations, and verification evidence", () => {
    const coverage = { schemaVersion: 1, mappings: [mapping, { ...mapping, capabilityId: "virtual" }] };
    expect(reportReferenceCoverage(inventory, coverage).complete).toBe(true);
    expect(reportReferenceCoverage({ ...inventory, snapshot: { ...inventory.snapshot, frozen: false } }, coverage).complete).toBe(false);
    expect(reportReferenceCoverage(inventory, { ...coverage, mappings: [{ ...mapping, configVersion: 999 }] }).complete).toBe(false);
    expect(reportReferenceCoverage(inventory, { ...coverage, mappings: [{ ...mapping, evidence: [] }] }).errors.length).toBeGreaterThan(0);
  });
  it("rejects duplicate, orphaned mappings and cannot pass an empty catalog", () => {
    const report = reportReferenceCoverage(inventory, { schemaVersion: 1, mappings: [mapping, mapping, { ...mapping, referenceId: "missing" }] });
    expect(report.errors).toEqual(expect.arrayContaining([expect.stringContaining("duplicate mapping"), expect.stringContaining("unknown reference capability")]));
    expect(reportReferenceCoverage({ ...inventory, cases: [] }, { schemaVersion: 1, mappings: [] }).complete).toBe(false);
  });
});
