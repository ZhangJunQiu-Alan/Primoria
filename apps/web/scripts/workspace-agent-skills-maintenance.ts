import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanupMaterializedWorkspaceAgentSkills } from "../src/lib/workspaces/agent-skill-storage";

loadLocalEnv();

const rootDir = process.env.WORKSPACE_AGENT_SKILL_STORAGE_ROOT;
const retentionDays = readPositiveNumber(process.env.WORKSPACE_AGENT_SKILL_MAINTENANCE_RETENTION_DAYS) ?? 7;
const olderThanMs = retentionDays * 24 * 60 * 60 * 1000;

const result = cleanupMaterializedWorkspaceAgentSkills({ rootDir, olderThanMs });

console.log(
  JSON.stringify(
    {
      ok: true,
      rootDir: rootDir ?? ".primoria-workspace-skills",
      retentionDays,
      removedCount: result.removed.length,
      removed: result.removed,
    },
    null,
    2,
  ),
);

function readPositiveNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function loadLocalEnv() {
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
