import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../../", import.meta.url));
const require = createRequire(path.join(root, "apps/web/package.json"));
const Ajv = require("ajv/dist/2020").default;
const ajv = new Ajv({ allErrors: true, strict: false, multipleOfPrecision: 12 });
require("ajv-formats")(ajv);
const read = (name) => JSON.parse(readFileSync(path.join(root, name), "utf8"));
const catalog = read("data/visualization-components/catalog.v1.json");
const candidates = ["009", "010", "011"].flatMap((batch) => read(`data/visualization-components/batches/agent-b-${batch}.catalog.json`).components);
const declarations = ["009", "010", "011"].flatMap((batch) => read(`data/visualization-components/batches/agent-b-${batch}.json`).components);
const merged = new Map(catalog.components.map((entry) => [entry.componentId, entry]));
for (const candidate of candidates) merged.set(candidate.componentId, candidate);
const validateCatalog = ajv.compile(read("data/visualization-components/catalog.schema.json"));
assert.ok(validateCatalog({ ...catalog, components: [...merged.values()] }), JSON.stringify(validateCatalog.errors));
let configurations = 0;
for (const entry of declarations) {
  const candidate = candidates.find((item) => item.componentId === entry.componentId);
  assert.ok(candidate, `Missing catalog fragment for ${entry.componentId}`);
  const module = await import(pathToFileURL(path.join(root, entry.modulePath)).href);
  const schema = module[entry.configSchemaExport], component = module[entry.componentExport];
  assert.equal(component.componentId, entry.componentId);
  assert.deepEqual(schema.parse({}), candidate.configSchema.default);
  const validateConfig = ajv.compile(candidate.configSchema);
  for (const sample of entry.samples) {
    assert.deepEqual(schema.parse(sample), sample);
    assert.ok(validateConfig(sample), `${entry.componentId}: ${JSON.stringify(validateConfig.errors)}`);
    configurations++;
  }
}
const result = { checkedAt: new Date().toISOString(), scope: "Candidate schema and sample preflight only; does not register production components", activeCatalog: catalog.components.length, candidateEntries: candidates.length, mergedCandidateCatalog: merged.size, configurations, passed: true };
writeFileSync(path.join(root, "artifacts/visualization-agent-b/quality-review/evidence/pending-batch-check.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(result);
