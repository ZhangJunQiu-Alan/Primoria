import { existsSync, readFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { ReferenceInventorySchema, ReferenceCoverageSchema, reportReferenceCoverage } from "../packages/contracts/src/artifacts/visualization-reference.mjs";
import { referenceInventoryPath } from "./visualization-reference-path.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const inventoryPath = referenceInventoryPath();
const coveragePath = resolve(root, "data/visualization-components/reference-coverage.v1.json");
if (!existsSync(inventoryPath) || !existsSync(coveragePath)) {
  console.error(`[visualization-coverage] BLOCKED: reference inventory (${inventoryPath}) or coverage not available; the inventory is private and kept out of the repository, so full coverage cannot be verified here`);
  process.exit(1);
}
const inventory = ReferenceInventorySchema.parse(JSON.parse(readFileSync(inventoryPath, "utf8")));
const coverage = ReferenceCoverageSchema.parse(JSON.parse(readFileSync(coveragePath, "utf8")));
const report = reportReferenceCoverage(inventory, coverage);
for (const entry of [...inventory.cases, ...coverage.mappings].filter((entry) => entry.status === "verified")) {
  for (const evidence of entry.evidence) {
    const local = relative(root, resolve(root, evidence));
    if (local.startsWith("..") || isAbsolute(local) || !existsSync(resolve(root, evidence))) report.errors.push(`missing/local evidence required: ${evidence}`);
  }
}
report.complete = report.complete && report.errors.length === 0;
console.log(JSON.stringify(report, null, 2));
if (!report.complete) process.exitCode = 1;
