#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../src/lib/db/client.ts";
import { runMigrations } from "../src/lib/db/migrate.ts";
import { users, workspaceAgentSkills, workspaces } from "../src/lib/db/schema.ts";
import { listWorkspaceAgentTemplates } from "../src/lib/workspaces/store.ts";
import {
  createDbWorkspaceAgentSkillBackend,
  createWorkspaceAgentSkillBackend,
  cleanupMaterializedWorkspaceAgentSkills,
  deleteStoredWorkspaceAgentSkill,
  materializeWorkspaceAgentSkillMarkdown,
  prepareWorkspaceAgentSkillDirectories,
  runWorkspaceAgentSkillStorageMaintenanceOnce,
  listStoredWorkspaceAgentSkillVersions,
  listStoredWorkspaceAgentSkills,
  resolveWorkspaceAgentSkillPath,
  restoreStoredWorkspaceAgentSkillVersion,
  storeWorkspaceAgentSkill,
  updateStoredWorkspaceAgentSkill,
} from "../src/lib/workspaces/agent-runtime.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

const REQUIRED_SYSTEM_SKILLS = [
  "/skills/socratic-questioning",
  "/skills/visual-explainer",
  "/skills/quiz-generation",
  "/skills/misconception-diagnosis",
  "/skills/project-breakdown",
  "/skills/source-grounded-research",
  "/skills/artifact-review",
];

function skillFileForPath(skillPath: string) {
  assert(skillPath.startsWith("/skills/"), `${skillPath} is a workspace system skill path`);
  return join(process.cwd(), "src/lib/workspaces/skills", skillPath.replace("/skills/", ""), "SKILL.md");
}

function readFrontmatterValue(markdown: string, key: string) {
  const match = markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, "m"));
  return match?.[1]?.trim();
}

async function main() {
  const templateSkillPaths = listWorkspaceAgentTemplates().flatMap((template) =>
    template.capabilities.flatMap((capability) => (capability.kind === "skill" && capability.source === "system" ? [capability.path] : [])),
  );
  const uiSource = readFileSync(join(process.cwd(), "src/components/workspace/workspace-client.tsx"), "utf8");
  const skillApiSource = readFileSync(join(process.cwd(), "src/app/api/workspaces/[id]/agent-skills/route.ts"), "utf8");
  const connectionApiSource = readFileSync(join(process.cwd(), "src/app/api/workspaces/[id]/agent-connections/route.ts"), "utf8");
  const schemaSource = readFileSync(join(process.cwd(), "src/lib/db/schema.ts"), "utf8");
  const storeSource = readFileSync(join(process.cwd(), "src/lib/workspaces/store.ts"), "utf8");
  const packageJson = readFileSync(join(process.cwd(), "package.json"), "utf8");
  const maintenanceScript = readFileSync(join(process.cwd(), "scripts/workspace-agent-skills-maintenance.ts"), "utf8");
  const docs = readFileSync(join(process.cwd(), "../../docs/workspace-agent-system.md"), "utf8");

  assert(docs.includes("AI4Edu learning workspace"), "workspace agent system docs anchor agents to AI4Edu learning workspace goals");
  assert(docs.includes("personal agent library follows the owner across workspaces"), "workspace agent system docs cover cross-workspace personal agent library behavior");
  assert(
    docs.includes("Private personal profiles stay hidden from other workspace members unless that profile is added as a member"),
    "workspace agent system docs cover private personal agent visibility semantics",
  );
  assert(docs.includes("Connections registry first slice"), "workspace agent system docs track the implemented connections registry slice");
  assert(schemaSource.includes("workspaceAgentConnections"), "workspace schema includes the agent connections registry table");
  assert(connectionApiSource.includes("allowedToolNames"), "agent connections API exposes an explicit per-connection tool allowlist");
  assert(storeSource.includes("assertAgentCapabilityConnections"), "agent profile persistence validates mcp_tool capabilities against registered connections");

  for (const skillPath of REQUIRED_SYSTEM_SKILLS) {
    const skillFile = skillFileForPath(skillPath);
    assert(existsSync(skillFile), `${skillPath} has a concrete SKILL.md`);
    const resolved = resolveWorkspaceAgentSkillPath(skillPath);
    assert(Boolean(resolved), `${skillPath} resolves to a concrete DeepAgent skill directory`);
    assert(resolved && existsSync(join(resolved, "SKILL.md")), `${skillPath} resolved directory contains SKILL.md`);
    const markdown = readFileSync(skillFile, "utf8");
    const expectedName = skillPath.replace("/skills/", "");
    assert(markdown.startsWith("---\n"), `${skillPath} starts with SKILL.md frontmatter`);
    assert(readFrontmatterValue(markdown, "name") === expectedName, `${skillPath} frontmatter name matches path`);
    assert(Boolean(readFrontmatterValue(markdown, "description")), `${skillPath} has a description for progressive disclosure`);
    assert(markdown.includes("## When to use"), `${skillPath} declares when to use it`);
    assert(markdown.includes("## Instructions"), `${skillPath} declares concrete instructions`);
    assert(markdown.includes("## Output"), `${skillPath} declares output expectations`);
    assert(docs.includes(skillPath.replace("/skills/", "")), `${skillPath} is represented in workspace-agent-system.md`);
  }

  for (const skillPath of templateSkillPaths) {
    assert(REQUIRED_SYSTEM_SKILLS.includes(skillPath), `template system skill ${skillPath} is part of the supported skill pack`);
    assert(existsSync(skillFileForPath(skillPath)), `template system skill ${skillPath} exists on disk`);
  }

  const templates = listWorkspaceAgentTemplates();
  const templateByKey = new Map(templates.map((template) => [template.key, template]));
  const templateSkillSet = (key: string) => new Set(
    templateByKey.get(key)?.capabilities.flatMap((capability) => (capability.kind === "skill" ? [capability.path] : [])) ?? [],
  );
  const templateToolSet = (key: string) => new Set(
    templateByKey.get(key)?.capabilities.flatMap((capability) => (capability.kind === "internal_tool" ? [capability.toolName] : [])) ?? [],
  );
  for (const key of ["socratic-coach", "visualizer", "examiner", "project-mentor", "research-buddy", "course-designer", "critic-reviewer"]) {
    assert(templateByKey.has(key), `agent templates include ${key}`);
  }
  assert(templateSkillSet("socratic-coach").has("/skills/misconception-diagnosis"), "socratic coach includes misconception diagnosis skill");
  assert(templateToolSet("socratic-coach").has("create_quiz"), "socratic coach can create practice quizzes");
  assert(templateToolSet("visualizer").has("save_learning_artifact"), "visualizer can save visual artifacts after approval");
  assert(templateSkillSet("examiner").has("/skills/misconception-diagnosis"), "examiner includes misconception diagnosis skill");
  assert(templateToolSet("examiner").has("save_learning_artifact"), "examiner can save practice artifacts after approval");
  assert(templateToolSet("project-mentor").has("update_workspace_task"), "project mentor can update tasks after approval");
  assert(templateToolSet("project-mentor").has("save_learning_artifact"), "project mentor can save plan artifacts after approval");
  assert(templateSkillSet("research-buddy").has("/skills/source-grounded-research"), "research buddy includes source-grounded research skill");
  assert(templateToolSet("research-buddy").has("summarize_thread"), "research buddy can summarize visible context");
  assert(templateSkillSet("course-designer").has("/skills/quiz-generation"), "course designer includes quiz-generation skill");
  assert(templateToolSet("course-designer").has("generate_course"), "course designer can generate course drafts after approval");
  assert(templateSkillSet("critic-reviewer").has("/skills/artifact-review"), "critic reviewer includes artifact review skill");
  assert(templateToolSet("critic-reviewer").has("save_learning_artifact"), "critic reviewer can save review artifacts after approval");

  for (const skillPath of [
    "/skills/socratic-questioning",
    "/skills/visual-explainer",
    "/skills/project-breakdown",
    "/skills/quiz-generation",
    "/skills/source-grounded-research",
    "/skills/misconception-diagnosis",
    "/skills/artifact-review",
  ]) {
    assert(uiSource.includes(skillPath), `agent builder exposes ${skillPath}`);
  }
  assert(skillApiSource.includes("createWorkspaceAgentSkillBackend"), "agent skill API uses the backend selector instead of hard-coding local storage");
  assert(skillApiSource.includes("backend.versions"), "agent skill API exposes stored skill versions for future review UI");
  assert(skillApiSource.includes("backend.restore"), "agent skill API can restore a previous skill version");
  assert(skillApiSource.includes("await backend.store"), "agent skill API can write through async durable backends");
  assert(skillApiSource.includes("runWorkspaceAgentSkillStorageMaintenanceOnce"), "agent skill API runs skill storage maintenance from the server lifecycle");
  assert(skillApiSource.includes("versions"), "agent skill API returns a version history payload");
  assert(skillApiSource.includes("restoreVersion"), "agent skill API accepts an explicit restore version");
  assert(skillApiSource.includes("serializeStoredWorkspaceAgentSkill"), "agent skill API serializes skills before returning them to clients");
  assert(skillApiSource.includes("serializeStoredWorkspaceAgentSkillVersion"), "agent skill API serializes skill versions before returning them to clients");
  assert(packageJson.includes("workspace:agent-skills:maintenance"), "package exposes an explicit workspace agent skill maintenance command");
  assert(maintenanceScript.includes("cleanupMaterializedWorkspaceAgentSkills"), "maintenance script calls explicit materialized skill cleanup");
  assert(maintenanceScript.includes("WORKSPACE_AGENT_SKILL_MAINTENANCE_RETENTION_DAYS"), "maintenance script supports configurable retention days");
  assert(maintenanceScript.includes("WORKSPACE_AGENT_SKILL_STORAGE_ROOT"), "maintenance script supports configurable skill storage root");
  assert(docs.includes("workspace:agent-skills:maintenance"), "workspace agent system doc mentions the explicit skill maintenance command");

  const storedRoot = join(process.cwd(), ".primoria-workspace-skills-test");
  rmSync(storedRoot, { recursive: true, force: true });
  assert(createWorkspaceAgentSkillBackend({ rootDir: storedRoot }).kind === "local", "skill backend selector uses local storage when an explicit rootDir is provided");
  const workspaceSkill = storeWorkspaceAgentSkill({
    rootDir: storedRoot,
    workspaceId: "workspace_skill_test",
    source: "workspace",
    name: "Peer Review Loop",
    description: "Review a learner artifact with one strength, one risk, and one next action.",
    instructions: "Inspect the learner artifact, keep feedback kind and concrete, and avoid rewriting everything for them.",
  });
  const userSkill = storeWorkspaceAgentSkill({
    rootDir: storedRoot,
    workspaceId: "workspace_skill_test",
    ownerId: "owner_skill_test",
    source: "user",
    name: "My Hint Style",
    description: "Use the owner preference for small hints before revealing a direct answer.",
    instructions: "Give a short nudge first, then wait for the learner attempt unless they explicitly ask for the answer.",
  });
  const duplicateWorkspaceSkill = storeWorkspaceAgentSkill({
    rootDir: storedRoot,
    workspaceId: "workspace_skill_test",
    source: "workspace",
    name: "Peer Review Loop",
    description: "A second skill with the same display name should not overwrite the first one.",
    instructions: "Keep this duplicate skill separate from the original peer review loop.",
  });
  assert(workspaceSkill.path === "/workspace-skills/workspace_skill_test/peer-review-loop", "workspace skill gets portable scoped path");
  assert(duplicateWorkspaceSkill.path === "/workspace-skills/workspace_skill_test/peer-review-loop-2", "duplicate workspace skill gets a unique portable path");
  assert(userSkill.path === "/user-skills/owner_skill_test/my-hint-style", "user skill gets portable scoped path");
  const resolvedWorkspaceSkill = resolveWorkspaceAgentSkillPath(workspaceSkill.path, { rootDir: storedRoot, workspaceId: "workspace_skill_test" });
  const resolvedUserSkill = resolveWorkspaceAgentSkillPath(userSkill.path, { rootDir: storedRoot, ownerId: "owner_skill_test" });
  assert(resolvedWorkspaceSkill && existsSync(join(resolvedWorkspaceSkill, "SKILL.md")), "workspace skill resolves only through scoped storage");
  assert(resolvedUserSkill && existsSync(join(resolvedUserSkill, "SKILL.md")), "user skill resolves only through scoped storage");
  assert(resolveWorkspaceAgentSkillPath(workspaceSkill.path, { rootDir: storedRoot, workspaceId: "other_workspace" }) === undefined, "workspace skill cannot resolve outside its workspace scope");
  assert(resolveWorkspaceAgentSkillPath(userSkill.path, { rootDir: storedRoot, ownerId: "other_owner" }) === undefined, "user skill cannot resolve outside its owner scope");
  const storedSkillMarkdown = readFileSync(join(resolvedWorkspaceSkill, "SKILL.md"), "utf8");
  assert(storedSkillMarkdown.includes("name: peer-review-loop"), "stored workspace skill writes SKILL.md frontmatter");
  assert(storedSkillMarkdown.includes("## Instructions"), "stored workspace skill writes instructions section");
  assert(storedSkillMarkdown.includes("Inspect the learner artifact"), "duplicate workspace skill creation does not overwrite original skill content");
  const storedSkills = listStoredWorkspaceAgentSkills({ rootDir: storedRoot, workspaceId: "workspace_skill_test", ownerId: "owner_skill_test" });
  const listedWorkspaceSkill = storedSkills.find((skill) => skill.path === workspaceSkill.path && skill.source === "workspace");
  assert(listedWorkspaceSkill?.version === 1, "stored workspace skill appears in registry listing with initial version");
  assert(listedWorkspaceSkill.instructions === "Inspect the learner artifact, keep feedback kind and concrete, and avoid rewriting everything for them.", "stored workspace skill listing returns saved instructions for editing");
  assert(storedSkills.some((skill) => skill.path === userSkill.path && skill.source === "user"), "stored user skill appears in registry listing");
  const updatedSkill = updateStoredWorkspaceAgentSkill({
    rootDir: storedRoot,
    path: workspaceSkill.path,
    workspaceId: "workspace_skill_test",
    name: "Peer Review Loop",
    description: "Updated review loop description.",
    instructions: "Updated instructions that keep one strength, one risk, and one next action.",
  });
  assert(updatedSkill.version === 2, "updating a stored skill increments version");
  assert(updatedSkill.path === workspaceSkill.path, "updating a stored skill keeps portable id stable");
  assert(updatedSkill.instructions === "Updated instructions that keep one strength, one risk, and one next action.", "updating a stored skill returns latest instructions");
  const updatedMarkdown = readFileSync(join(updatedSkill.directory, "SKILL.md"), "utf8");
  assert(updatedMarkdown.includes("version: 2"), "updated skill writes version to SKILL.md frontmatter");
  assert(updatedMarkdown.includes("Updated review loop description."), "updated skill rewrites description");
  const skillVersions = listStoredWorkspaceAgentSkillVersions({ rootDir: storedRoot, path: workspaceSkill.path, workspaceId: "workspace_skill_test" });
  assert(skillVersions.length === 2, "stored skill history keeps current and previous versions");
  assert(skillVersions[0].version === 1 && skillVersions[0].instructions === "Inspect the learner artifact, keep feedback kind and concrete, and avoid rewriting everything for them.", "stored skill history preserves the original version");
  assert(skillVersions[1].version === 2 && skillVersions[1].instructions === "Updated instructions that keep one strength, one risk, and one next action.", "stored skill history includes the latest version");
  const restoredSkill = restoreStoredWorkspaceAgentSkillVersion({ rootDir: storedRoot, path: workspaceSkill.path, workspaceId: "workspace_skill_test", version: 1 });
  assert(restoredSkill?.version === 3, "restoring a stored skill creates a new latest version");
  assert(restoredSkill.instructions === "Inspect the learner artifact, keep feedback kind and concrete, and avoid rewriting everything for them.", "restoring a stored skill recovers old instructions");
  const restoredMarkdown = readFileSync(join(restoredSkill.directory, "SKILL.md"), "utf8");
  assert(restoredMarkdown.includes("version: 3"), "restored skill writes a new latest version");
  assert(restoredMarkdown.includes("Inspect the learner artifact"), "restored skill writes recovered content to SKILL.md");
  const publicSkill = serializeStoredWorkspaceAgentSkillForTest(restoredSkill);
  assert(!("directory" in publicSkill), "public skill payload does not expose server directory");
  assert(publicSkill.path === restoredSkill.path && publicSkill.version === restoredSkill.version, "public skill payload keeps portable id and version");
  const publicVersion = serializeStoredWorkspaceAgentSkillVersionForTest(skillVersions[0]);
  assert(!("directory" in publicVersion) && !("skillFile" in publicVersion), "public skill version payload does not expose server file paths");
  const deniedUpdate = updateStoredWorkspaceAgentSkill({
    rootDir: storedRoot,
    path: workspaceSkill.path,
    workspaceId: "other_workspace",
    description: "Should not update",
    instructions: "Wrong scope",
  });
  assert(!deniedUpdate, "stored skill update requires matching scope");
  assert(deleteStoredWorkspaceAgentSkill({ rootDir: storedRoot, path: userSkill.path, ownerId: "owner_skill_test" }), "stored user skill can be deleted by owner scope");
  assert(!resolveWorkspaceAgentSkillPath(userSkill.path, { rootDir: storedRoot, ownerId: "owner_skill_test" }), "deleted user skill no longer resolves");
  assert(!deleteStoredWorkspaceAgentSkill({ rootDir: storedRoot, path: workspaceSkill.path, workspaceId: "other_workspace" }), "stored skill delete requires matching scope");
  const fakeDurableSkillPath = "/workspace-skills/workspace_skill_test/fake-durable";
  const fakePreparedDirs = await prepareWorkspaceAgentSkillDirectories([fakeDurableSkillPath, "/custom/raw-path"], {
    rootDir: storedRoot,
    workspaceId: "workspace_skill_test",
    ownerId: "owner_skill_test",
    backend: {
      kind: "db",
      resolve: async (path, options) =>
        path === fakeDurableSkillPath && options.workspaceId === "workspace_skill_test"
          ? {
              path,
              markdown: [
                "---",
                "name: fake-durable",
                "description: Fake durable skill for materialization tests.",
                "---",
                "",
                "# Fake Durable",
                "",
                "## Instructions",
                "Materialize only after scope checks.",
                "",
              ].join("\n"),
            }
          : undefined,
    },
  });
  assert(fakePreparedDirs.length === 1, "runtime skill preparation can use a durable resolver without DATABASE_URL");
  assert(existsSync(join(fakePreparedDirs[0], "SKILL.md")), "runtime skill preparation materializes durable markdown into SKILL.md");
  const freshMaterializedDir = materializeWorkspaceAgentSkillMarkdown({
    rootDir: storedRoot,
    skillPath: "/workspace-skills/workspace_skill_test/fresh-materialized",
    markdown: "---\nname: fresh-materialized\ndescription: Fresh materialized skill.\n---\n",
  });
  const staleMaterializedDir = join(storedRoot, ".materialized", "workspace", "workspace_skill_test", "stale-materialized");
  mkdirSync(staleMaterializedDir, { recursive: true });
  writeFileSync(join(staleMaterializedDir, "SKILL.md"), "---\nname: stale-materialized\n---\n", "utf8");
  const staleTime = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
  utimesSync(staleMaterializedDir, staleTime, staleTime);
  utimesSync(join(staleMaterializedDir, "SKILL.md"), staleTime, staleTime);
  const cleanup = cleanupMaterializedWorkspaceAgentSkills({ rootDir: storedRoot, olderThanMs: 7 * 24 * 60 * 60 * 1000 });
  assert(cleanup.removed.some((path) => path.endsWith("stale-materialized")), "materialized skill cleanup removes directories older than retention");
  assert(existsSync(freshMaterializedDir), "materialized skill cleanup keeps fresh directories");
  assert(!existsSync(staleMaterializedDir), "materialized skill cleanup deletes stale materialized directory");
  const maintenanceFirst = runWorkspaceAgentSkillStorageMaintenanceOnce({ rootDir: storedRoot });
  const maintenanceSecond = runWorkspaceAgentSkillStorageMaintenanceOnce({ rootDir: storedRoot });
  assert(maintenanceFirst.ran, "skill storage maintenance runs once for a process/key");
  assert(!maintenanceSecond.ran, "skill storage maintenance does not rescan on every request");
  rmSync(storedRoot, { recursive: true, force: true });

  if (hasDatabaseUrl()) {
    await runMigrations();
    const dbRunId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const ownerId = `skill_owner_${dbRunId}`;
    const collaboratorId = `skill_collaborator_${dbRunId}`;
    const workspaceId = `skill_workspace_${dbRunId}`;
    await getDb().delete(workspaceAgentSkills).where(inArray(workspaceAgentSkills.ownerId, [ownerId, collaboratorId]));
    await getDb().delete(workspaces).where(eq(workspaces.id, workspaceId));
    await getDb().delete(users).where(inArray(users.id, [ownerId, collaboratorId]));
    try {
      await getDb().insert(users).values([
        { id: ownerId, displayName: "Skill Owner" },
        { id: collaboratorId, displayName: "Skill Collaborator" },
      ]);
      await getDb().insert(workspaces).values({
        id: workspaceId,
        ownerId,
        name: "Skill DB Workspace",
        inviteCode: `skill-${dbRunId}`.slice(0, 32),
      });
      const dbBackend = createDbWorkspaceAgentSkillBackend();
      assert(createWorkspaceAgentSkillBackend().kind === "db", "skill backend selector prefers DB storage when DATABASE_URL is configured");
      const dbSkill = await dbBackend.store({
        workspaceId,
        ownerId,
        source: "workspace",
        name: "Durable Peer Review",
        description: "Review artifacts from durable storage.",
        instructions: "Use durable skill content and keep feedback concise.",
      });
      assert(dbSkill.path === `/workspace-skills/${workspaceId}/durable-peer-review`, "DB skill backend returns portable scoped path");
      assert(dbSkill.version === 1, "DB skill backend starts at version 1");
      assert(!("directory" in dbSkill), "DB skill backend does not expose local directories");
      const dbListed = await dbBackend.list({ workspaceId, ownerId });
      assert(dbListed.some((skill) => skill.path === dbSkill.path && skill.instructions === "Use durable skill content and keep feedback concise."), "DB skill backend lists persisted skill content");
      const dbUpdated = await dbBackend.update({
        workspaceId,
        ownerId,
        path: dbSkill.path,
        description: "Updated durable description.",
        instructions: "Updated durable instructions.",
      });
      assert(dbUpdated?.version === 2, "DB skill backend increments version on update");
      assert(dbUpdated?.path === dbSkill.path, "DB skill backend keeps portable id stable on update");
      const dbVersions = await dbBackend.versions({ workspaceId, ownerId, path: dbSkill.path });
      assert(dbVersions.length === 2, "DB skill backend returns durable version history");
      assert(dbVersions[0].version === 1 && dbVersions[0].instructions === "Use durable skill content and keep feedback concise.", "DB skill backend preserves original version content");
      const dbRestored = await dbBackend.restore({ workspaceId, ownerId, path: dbSkill.path, version: 1 });
      assert(dbRestored?.version === 3, "DB skill backend restores old content as a new latest version");
      assert(dbRestored?.instructions === "Use durable skill content and keep feedback concise.", "DB skill backend restores old instructions");
      const resolvedDbSkill = await dbBackend.resolve(dbSkill.path, { workspaceId, ownerId });
      assert(resolvedDbSkill?.markdown.includes("Use durable skill content"), "DB skill backend resolves portable path to materializable SKILL.md content");
      const collaboratorResolvedDbSkill = await dbBackend.resolve(dbSkill.path, { workspaceId, ownerId: collaboratorId });
      assert(
        collaboratorResolvedDbSkill?.markdown.includes("Use durable skill content"),
        "DB workspace skills resolve for another workspace collaborator after workspace scope checks",
      );
      const collaboratorVersions = await dbBackend.versions({ workspaceId, ownerId: collaboratorId, path: dbSkill.path });
      assert(collaboratorVersions.length === 3, "DB workspace skill version history is readable by workspace collaborators");
      const collaboratorRejectedUpdate = await dbBackend.update({
        workspaceId,
        ownerId: collaboratorId,
        path: dbSkill.path,
        instructions: "A collaborator should not overwrite another user's workspace skill.",
      });
      assert(!collaboratorRejectedUpdate, "DB workspace skill mutation still requires the skill owner");
      const collaboratorRejectedDelete = await dbBackend.delete({ workspaceId, ownerId: collaboratorId, path: dbSkill.path });
      assert(!collaboratorRejectedDelete, "DB workspace skill delete still requires the skill owner");
      const collaboratorDuplicateSkill = await dbBackend.store({
        workspaceId,
        ownerId: collaboratorId,
        source: "workspace",
        name: "Durable Peer Review",
        description: "Collaborator skill with the same display name.",
        instructions: "Keep this collaborator skill separate from the owner's skill.",
      });
      assert(
        collaboratorDuplicateSkill.path === `/workspace-skills/${workspaceId}/durable-peer-review-2`,
        "DB workspace skill slugs are unique across the shared workspace, not just per creator",
      );
      assert(await dbBackend.resolve(dbSkill.path, { workspaceId: "other_workspace", ownerId }) === undefined, "DB skill backend resolve enforces workspace scope");
      const materializedDbSkill = materializeWorkspaceAgentSkillMarkdown({
        rootDir: storedRoot,
        skillPath: dbSkill.path,
        markdown: resolvedDbSkill?.markdown ?? "",
      });
      assert(materializedDbSkill.includes("materialized"), "DB skill materializer writes into a controlled materialized directory");
      assert(existsSync(join(materializedDbSkill, "SKILL.md")), "DB skill materializer creates a concrete SKILL.md for DeepAgent");
      assert(readFileSync(join(materializedDbSkill, "SKILL.md"), "utf8").includes("Use durable skill content"), "DB skill materializer writes durable markdown content");
      assert(!materializedDbSkill.includes(dbSkill.path), "DB skill materializer does not embed raw portable path as a filesystem path");
      const preparedSkillDirs = await prepareWorkspaceAgentSkillDirectories([dbSkill.path, "/custom/raw-path"], {
        rootDir: storedRoot,
        workspaceId,
        ownerId,
        backend: dbBackend,
      });
      assert(preparedSkillDirs.length === 1 && preparedSkillDirs[0] === materializedDbSkill, "runtime skill preparation materializes only allowed DB portable ids and drops raw paths");
      const deniedPreparedSkillDirs = await prepareWorkspaceAgentSkillDirectories([dbSkill.path], {
        rootDir: storedRoot,
        workspaceId: "other_workspace",
        ownerId,
        backend: dbBackend,
      });
      assert(deniedPreparedSkillDirs.length === 0, "runtime skill preparation refuses DB skills outside workspace scope");
      assert(await dbBackend.delete({ workspaceId, ownerId, path: dbSkill.path }), "DB skill backend deletes by matching scope");
      assert(await dbBackend.resolve(dbSkill.path, { workspaceId, ownerId }) === undefined, "deleted DB skill no longer resolves");
    } finally {
      await getDb().delete(workspaceAgentSkills).where(inArray(workspaceAgentSkills.ownerId, [ownerId, collaboratorId]));
      await getDb().delete(workspaces).where(eq(workspaces.id, workspaceId));
      await getDb().delete(users).where(inArray(users.id, [ownerId, collaboratorId]));
    }
  }

  process.stdout.write("[workspace.agent-skills.unit] ALL SKILL CHECKS PASSED\n");
}

void main().catch((error) => {
  process.stderr.write(`[workspace.agent-skills.unit] FAILED: ${(error as Error).message}\n`);
  process.exit(1);
});


function serializeStoredWorkspaceAgentSkillForTest(skill: { source: string; name: string; slug: string; path: string; description?: string; instructions?: string; version: number }) {
  const { source, name, slug, path, description, instructions, version } = skill;
  return { source, name, slug, path, description, instructions, version };
}

function serializeStoredWorkspaceAgentSkillVersionForTest(skill: { source: string; name: string; slug: string; path: string; description?: string; instructions?: string; version: number }) {
  return serializeStoredWorkspaceAgentSkillForTest(skill);
}
