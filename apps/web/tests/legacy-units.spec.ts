import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "vitest";

// Bridge runner for the pre-vitest test scripts. Each tests/*.unit.ts file is a
// self-executing script (top-level assertions, process.exit on failure), so it
// runs in its own tsx child process and passes when it exits 0. New tests
// should be written as native vitest *.spec.ts files instead of being added
// here. DB-backed (*.db.ts) and E2E (*.e2e.mjs) scripts are not covered.

const testsDir = dirname(fileURLToPath(import.meta.url));
const webDir = resolve(testsDir, "..");
const require = createRequire(import.meta.url);
const tsxCli = require.resolve("tsx/cli", { paths: [webDir] });

const legacyUnitFiles = readdirSync(testsDir)
  .filter((name) => name.endsWith(".unit.ts"))
  .sort();

describe("legacy unit scripts", () => {
  for (const name of legacyUnitFiles) {
    test.concurrent(name, () => {
      return new Promise<void>((resolvePromise, rejectPromise) => {
        execFile(
          process.execPath,
          [tsxCli, join(testsDir, name)],
          { cwd: webDir, timeout: 110_000, maxBuffer: 16 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) {
              rejectPromise(new Error(`${name} failed\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`));
            } else {
              resolvePromise();
            }
          },
        );
      });
    });
  }
});
