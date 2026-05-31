import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadLocalEnv() {
  const envFile = join(process.cwd(), ".env.local");
  if (!existsSync(envFile)) return;

  const lines = readFileSync(envFile, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;

    const rawValue = trimmed.slice(separator + 1).trim();
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
