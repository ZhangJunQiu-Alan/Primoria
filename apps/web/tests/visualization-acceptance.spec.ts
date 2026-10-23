import { describe, expect, it } from "vitest";
import fixture from "./fixtures/visualization-acceptance.baseline.v2.json";
import { AcceptanceAttemptSchema, AcceptanceManifestSchema, validateAcceptanceDistribution } from "../src/lib/interactive/acceptance";

describe("frozen visualization acceptance evidence", () => {
  it("contains the fixed 20-case language, length and production-path distribution", () => {
    const manifest = AcceptanceManifestSchema.parse(fixture);
    expect(validateAcceptanceDistribution(manifest)).toEqual([]);
    expect(manifest.cases.every((entry) => entry.attempts.length === 0)).toBe(true);
  });
  it("rejects deleted cases, duplicate IDs and adjustments without preceding context", () => {
    const manifest = AcceptanceManifestSchema.parse(fixture);
    expect(validateAcceptanceDistribution({ ...manifest, cases: manifest.cases.slice(1) })).not.toEqual([]);
    manifest.cases[1].caseId = manifest.cases[0].caseId;
    expect(validateAcceptanceDistribution(manifest)).toContain("Duplicate case IDs");
    manifest.cases[12].parentCaseId = "missing";
    expect(validateAcceptanceDistribution(manifest)).toContain(`${manifest.cases[12].caseId}: adjustment requires a preceding chat parent`);
  });
  it("does not allow screenshot evidence to escape its export directory", () => {
    const attempt = { startedAt: "2026-10-22T00:00:00Z", finishedAt: "2026-10-22T00:00:01Z", status: "failed", explanation: "", latencyMs: 1000 };
    expect(AcceptanceAttemptSchema.parse({ ...attempt, screenshot: "viz-01-attempt-1.png" }).screenshot).toBe("viz-01-attempt-1.png");
    expect(() => AcceptanceAttemptSchema.parse({ ...attempt, screenshot: "../../secrets.png" })).toThrow();
  });
});
