import { existsSync } from "node:fs";
import { join } from "node:path";
import { resolveStoredWorkspaceAgentSkillPath, type WorkspaceAgentSkillStorageOptions } from "./agent-skill-storage";

export function resolveWorkspaceAgentSkillPath(skillPath: string, options: WorkspaceAgentSkillStorageOptions = {}) {
  if (skillPath.startsWith("/workspace-skills/") || skillPath.startsWith("/user-skills/")) {
    return resolveStoredWorkspaceAgentSkillPath(skillPath, options);
  }
  if (!skillPath.startsWith("/skills/")) return undefined;
  const skillName = skillPath.slice("/skills/".length);
  if (!/^[a-z0-9-]+$/.test(skillName)) return undefined;
  const candidates = [
    join(process.cwd(), "src/lib/workspaces/skills", skillName),
    join(process.cwd(), "apps/web/src/lib/workspaces/skills", skillName),
  ];
  return candidates.find((directory) => existsSync(join(directory, "SKILL.md")));
}
