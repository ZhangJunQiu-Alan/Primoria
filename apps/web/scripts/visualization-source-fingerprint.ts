import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function visualizationSourceFingerprint(root: string) {
  const paths = execFileSync("git", ["ls-files", "-co", "--exclude-standard", "-z", "--", "apps/web/src", "apps/agent/src", "packages/contracts", "data/visualization-components", "apps/web/drizzle", "apps/web/scripts", "scripts", "e2e", "package.json", "apps/web/package.json", "pnpm-lock.yaml"], { cwd: root, encoding: "utf8" }).split("\0").filter(Boolean);
  const hash = createHash("sha256");
  for (const path of [...new Set(paths)].sort()) {
    hash.update(`${path}\0`);
    try { hash.update(await readFile(resolve(root, path))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; hash.update("deleted"); }
  }
  return hash.digest("hex");
}
