import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { INTERACTIVE_COMPONENT_IDS, INTERACTIVE_COMPONENT_CATALOG } from "@primoria/contracts/artifacts/interactive-catalog";
import { searchInteractiveComponents } from "@primoria/contracts/artifacts/interactive-search";
import { OpenInteractiveComponentArgsSchema } from "@primoria/contracts/artifacts/schemas";
import { SYSTEM_PROMPT } from "../src/prompts.mjs";

const graphSource = await readFile(new URL("../src/graph.mjs", import.meta.url), "utf8");
assert.match(graphSource, /openInteractiveComponentTool/);
assert.match(graphSource, /searchInteractiveComponentsTool/);
assert.match(SYSTEM_PROMPT, /first call search_interactive_components/);
assert.match(SYSTEM_PROMPT, /target_instance_id copied exactly/);

for (const componentId of INTERACTIVE_COMPONENT_IDS) {
  if (INTERACTIVE_COMPONENT_IDS.length <= 40) assert.ok(SYSTEM_PROMPT.includes(componentId), `production prompt is missing ${componentId}`);
  const entry = INTERACTIVE_COMPONENT_CATALOG.find((item) => item.componentId === componentId);
  assert.ok(searchInteractiveComponents({ query: Object.values(entry.names).join(" "), limit: 10 }).some((item) => item.componentId === componentId), `component is not discoverable: ${componentId}`);
  assert.equal(OpenInteractiveComponentArgsSchema.safeParse({ component_id: componentId, request: "show it" }).success, true);
}
assert.equal(
  OpenInteractiveComponentArgsSchema.safeParse({
    component_id: INTERACTIVE_COMPONENT_IDS[0],
    request: "adjust it",
    target_instance_id: "tool-instance-1",
  }).success,
  true,
);

process.stdout.write("[interactive-routing-contract.unit] ALL CHECKS PASSED\n");
