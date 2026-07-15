import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

import { getRegistryEntry } from "../src/lib/interactive/components/registry";
import { selectInteractiveComponent } from "../src/lib/interactive/select-component";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const CaseSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1),
  intent: z.enum(["create", "adjust", "off_catalog", "chat"]),
  componentId: z.string().nullable(),
  current: z.object({ componentId: z.string(), config: z.record(z.string(), z.unknown()) }).optional(),
});
const FixtureSchema = z.object({ version: z.literal(1), cases: z.array(CaseSchema).min(1) });

async function main() {
  const fixturePath = join(process.cwd(), "tests/fixtures/interactive-routing.v1.json");
  const fixture = FixtureSchema.parse(JSON.parse(readFileSync(fixturePath, "utf8")));
  for (const item of fixture.cases) {
    if (item.componentId && !getRegistryEntry(item.componentId)) {
      throw new Error(`${item.id}: expected unknown component ${item.componentId}`);
    }
  }

  if (process.argv.includes("--validate-only")) {
    process.stdout.write(`Validated ${fixture.cases.length} interactive routing cases.\n`);
    return;
  }

  let passed = 0;
  const failures: string[] = [];
  for (const item of fixture.cases) {
    try {
      const result = await selectInteractiveComponent(item.prompt, item.current ?? null);
      const ok = result.decision.intent === item.intent && result.decision.componentId === item.componentId;
      if (ok) {
        passed += 1;
        process.stdout.write(`PASS ${item.id} ${result.ms}ms\n`);
      } else {
        failures.push(
          `${item.id}: expected ${item.intent}/${item.componentId ?? "null"}, got ${result.decision.intent}/${result.decision.componentId ?? "null"}`,
        );
        process.stdout.write(`FAIL ${failures.at(-1)}\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${item.id}: ${message}`);
      process.stdout.write(`ERROR ${item.id}: ${message}\n`);
    }
  }

  process.stdout.write(`\n${passed}/${fixture.cases.length} passed (${Math.round((passed / fixture.cases.length) * 100)}%).\n`);
  if (failures.length) {
    process.stdout.write(`${failures.join("\n")}\n`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
