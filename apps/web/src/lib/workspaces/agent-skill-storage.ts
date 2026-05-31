import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, hasDatabaseUrl } from "../db/client";
import { workspaceAgentSkillVersions, workspaceAgentSkills } from "../db/schema";

export type WorkspaceAgentSkillSource = "workspace" | "user";

export type WorkspaceAgentSkillStorageOptions = {
  rootDir?: string;
  workspaceId?: string;
  ownerId?: string;
};

export type StoreWorkspaceAgentSkillInput = WorkspaceAgentSkillStorageOptions & {
  source: WorkspaceAgentSkillSource;
  name: string;
  description: string;
  instructions: string;
};

export type UpdateWorkspaceAgentSkillInput = WorkspaceAgentSkillStorageOptions & {
  path: string;
  name?: string;
  description?: string;
  instructions?: string;
};

export type RestoreWorkspaceAgentSkillVersionInput = WorkspaceAgentSkillStorageOptions & {
  path: string;
  version: number;
};

export type StoredWorkspaceAgentSkill = {
  source: WorkspaceAgentSkillSource;
  name: string;
  slug: string;
  path: string;
  directory: string;
  description?: string;
  instructions?: string;
  version: number;
};

export type StoredWorkspaceAgentSkillVersion = StoredWorkspaceAgentSkill & {
  skillFile: string;
};

export type DbStoredWorkspaceAgentSkill = Omit<StoredWorkspaceAgentSkill, "directory">;

export type DbStoredWorkspaceAgentSkillVersion = DbStoredWorkspaceAgentSkill & {
  markdown: string;
};

export type ResolvedDbWorkspaceAgentSkill = {
  path: string;
  markdown: string;
};

export type WorkspaceAgentSkillBackendSkill = StoredWorkspaceAgentSkill | DbStoredWorkspaceAgentSkill;
export type WorkspaceAgentSkillBackendVersion = StoredWorkspaceAgentSkillVersion | DbStoredWorkspaceAgentSkillVersion;

export type WorkspaceAgentSkillBackend = {
  kind: "db" | "local";
  store(input: StoreWorkspaceAgentSkillInput): Promise<WorkspaceAgentSkillBackendSkill>;
  update(input: UpdateWorkspaceAgentSkillInput): Promise<WorkspaceAgentSkillBackendSkill | undefined>;
  restore(input: RestoreWorkspaceAgentSkillVersionInput): Promise<WorkspaceAgentSkillBackendSkill | undefined>;
  delete(input: WorkspaceAgentSkillStorageOptions & { path: string }): Promise<boolean>;
  list(options: WorkspaceAgentSkillStorageOptions): Promise<WorkspaceAgentSkillBackendSkill[]>;
  versions(options: WorkspaceAgentSkillStorageOptions & { path: string }): Promise<WorkspaceAgentSkillBackendVersion[]>;
  resolve?(skillPath: string, options: WorkspaceAgentSkillStorageOptions): Promise<ResolvedDbWorkspaceAgentSkill | undefined>;
};

const DEFAULT_SKILL_STORAGE_ROOT = ".primoria-workspace-skills";
const MATERIALIZED_SKILL_STORAGE_DIR = ".materialized";
const maintenanceGlobalKey = "__primoria_workspace_agent_skill_storage_maintenance__";
const maintenanceState = globalThis as unknown as Record<string, Set<string> | undefined>;

export function createWorkspaceAgentSkillBackend(options: WorkspaceAgentSkillStorageOptions = {}): WorkspaceAgentSkillBackend {
  if (!options.rootDir && hasDatabaseUrl()) return createDbWorkspaceAgentSkillBackend();
  return createLocalWorkspaceAgentSkillBackend(options);
}

export function createLocalWorkspaceAgentSkillBackend(defaultOptions: WorkspaceAgentSkillStorageOptions = {}): WorkspaceAgentSkillBackend {
  return {
    kind: "local",
    store: async (input) => storeWorkspaceAgentSkill({ ...defaultOptions, ...input }),
    update: async (input) => updateStoredWorkspaceAgentSkill({ ...defaultOptions, ...input }),
    restore: async (input) => restoreStoredWorkspaceAgentSkillVersion({ ...defaultOptions, ...input }),
    delete: async (input) => deleteStoredWorkspaceAgentSkill({ ...defaultOptions, ...input }),
    list: async (options) => listStoredWorkspaceAgentSkills({ ...defaultOptions, ...options }),
    versions: async (options) => listStoredWorkspaceAgentSkillVersions({ ...defaultOptions, ...options }),
  };
}

export function createDbWorkspaceAgentSkillBackend() {
  return {
    kind: "db" as const,
    store: storeDbWorkspaceAgentSkill,
    update: updateDbWorkspaceAgentSkill,
    restore: restoreDbWorkspaceAgentSkillVersion,
    delete: deleteDbWorkspaceAgentSkill,
    list: listDbWorkspaceAgentSkills,
    versions: listDbWorkspaceAgentSkillVersions,
    resolve: resolveDbWorkspaceAgentSkill,
  };
}

async function storeDbWorkspaceAgentSkill(input: StoreWorkspaceAgentSkillInput): Promise<DbStoredWorkspaceAgentSkill> {
  const scope = requireSkillScope(input.source, input);
  const rootSlug = slugifyWorkspaceAgentSkill(input.name);
  const slug = await uniqueDbStoredSkillSlug(input.source, scope, rootSlug, input);
  const version = 1;
  const markdown = buildStoredSkillMarkdown({
    slug,
    name: input.name,
    description: input.description,
    instructions: input.instructions,
    version,
  });
  const now = new Date();
  const id = createStoredSkillId("wskill");
  await getDb().transaction(async (tx) => {
    await tx.insert(workspaceAgentSkills).values({
      id,
      workspaceId: input.source === "workspace" ? scope : null,
      ownerId: requireSkillOwner(input),
      source: input.source,
      slug,
      name: input.name.trim(),
      description: input.description.trim(),
      instructions: input.instructions.trim(),
      markdown,
      currentVersion: version,
      createdAt: now,
      updatedAt: now,
    });
    await tx.insert(workspaceAgentSkillVersions).values({
      id: createStoredSkillId("wskillv"),
      skillId: id,
      workspaceId: input.source === "workspace" ? scope : null,
      ownerId: requireSkillOwner(input),
      version,
      name: input.name.trim(),
      description: input.description.trim(),
      instructions: input.instructions.trim(),
      markdown,
      createdAt: now,
    });
  });
  return dbSkillDto({
    source: input.source,
    scope,
    slug,
    name: input.name.trim(),
    description: input.description.trim(),
    instructions: input.instructions.trim(),
    version,
  });
}

async function updateDbWorkspaceAgentSkill(input: UpdateWorkspaceAgentSkillInput): Promise<DbStoredWorkspaceAgentSkill | undefined> {
  const parsed = parseStoredSkillPath(input.path);
  if (!parsed || !canAccessStoredSkill(parsed, input)) return undefined;
  const rows = await getDb()
    .select()
    .from(workspaceAgentSkills)
    .where(and(...dbSkillMutationWhere(parsed, input), isNull(workspaceAgentSkills.deletedAt)))
    .limit(1);
  const current = rows[0];
  if (!current) return undefined;
  const version = current.currentVersion + 1;
  const name = input.name?.trim() || current.name;
  const description = input.description?.trim() || current.description;
  const instructions = input.instructions?.trim() || current.instructions;
  const markdown = buildStoredSkillMarkdown({ slug: parsed.slug, name, description, instructions, version });
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx
      .update(workspaceAgentSkills)
      .set({ name, description, instructions, markdown, currentVersion: version, updatedAt: now })
      .where(eq(workspaceAgentSkills.id, current.id));
    await tx.insert(workspaceAgentSkillVersions).values({
      id: createStoredSkillId("wskillv"),
      skillId: current.id,
      workspaceId: current.workspaceId,
      ownerId: current.ownerId,
      version,
      name,
      description,
      instructions,
      markdown,
      createdAt: now,
    });
  });
  return dbSkillDto({ source: parsed.source, scope: parsed.scope, slug: parsed.slug, name, description, instructions, version });
}

async function restoreDbWorkspaceAgentSkillVersion(input: RestoreWorkspaceAgentSkillVersionInput): Promise<DbStoredWorkspaceAgentSkill | undefined> {
  const parsed = parseStoredSkillPath(input.path);
  if (!parsed || !canAccessStoredSkill(parsed, input)) return undefined;
  const rows = await getDb()
    .select()
    .from(workspaceAgentSkills)
    .where(and(...dbSkillMutationWhere(parsed, input), isNull(workspaceAgentSkills.deletedAt)))
    .limit(1);
  const current = rows[0];
  if (!current) return undefined;
  const versions = await getDb()
    .select()
    .from(workspaceAgentSkillVersions)
    .where(and(eq(workspaceAgentSkillVersions.skillId, current.id), eq(workspaceAgentSkillVersions.version, input.version)))
    .limit(1);
  const target = versions[0];
  if (!target) return undefined;
  return updateDbWorkspaceAgentSkill({
    workspaceId: input.workspaceId,
    ownerId: input.ownerId,
    path: input.path,
    name: target.name,
    description: target.description,
    instructions: target.instructions,
  });
}

async function deleteDbWorkspaceAgentSkill(input: WorkspaceAgentSkillStorageOptions & { path: string }) {
  const parsed = parseStoredSkillPath(input.path);
  if (!parsed || !canAccessStoredSkill(parsed, input)) return false;
  const rows = await getDb()
    .update(workspaceAgentSkills)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(...dbSkillMutationWhere(parsed, input), isNull(workspaceAgentSkills.deletedAt)))
    .returning({ id: workspaceAgentSkills.id });
  return rows.length > 0;
}

async function listDbWorkspaceAgentSkills(options: WorkspaceAgentSkillStorageOptions = {}): Promise<DbStoredWorkspaceAgentSkill[]> {
  const [workspaceRows, userRows] = await Promise.all([
    options.workspaceId
      ? getDb()
          .select()
          .from(workspaceAgentSkills)
          .where(and(eq(workspaceAgentSkills.source, "workspace"), eq(workspaceAgentSkills.workspaceId, sanitizeSkillScope(options.workspaceId)), isNull(workspaceAgentSkills.deletedAt)))
          .orderBy(asc(workspaceAgentSkills.createdAt))
      : [],
    options.ownerId
      ? getDb()
          .select()
          .from(workspaceAgentSkills)
          .where(and(eq(workspaceAgentSkills.source, "user"), eq(workspaceAgentSkills.ownerId, sanitizeSkillScope(options.ownerId)), isNull(workspaceAgentSkills.deletedAt)))
          .orderBy(asc(workspaceAgentSkills.createdAt))
      : [],
  ]);
  return [
    ...workspaceRows.map((row) => dbSkillDto({
      source: "workspace",
      scope: row.workspaceId ?? options.workspaceId!,
      slug: row.slug,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      version: row.currentVersion,
    })),
    ...userRows.map((row) => dbSkillDto({
      source: "user",
      scope: row.ownerId,
      slug: row.slug,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      version: row.currentVersion,
    })),
  ];
}

async function listDbWorkspaceAgentSkillVersions(options: WorkspaceAgentSkillStorageOptions & { path: string }): Promise<DbStoredWorkspaceAgentSkillVersion[]> {
  const parsed = parseStoredSkillPath(options.path);
  if (!parsed || !canAccessStoredSkill(parsed, options)) return [];
  const rows = await getDb()
    .select({
      version: workspaceAgentSkillVersions.version,
      name: workspaceAgentSkillVersions.name,
      description: workspaceAgentSkillVersions.description,
      instructions: workspaceAgentSkillVersions.instructions,
      markdown: workspaceAgentSkillVersions.markdown,
    })
    .from(workspaceAgentSkills)
    .innerJoin(workspaceAgentSkillVersions, eq(workspaceAgentSkillVersions.skillId, workspaceAgentSkills.id))
    .where(and(...dbSkillAccessWhere(parsed), isNull(workspaceAgentSkills.deletedAt)))
    .orderBy(asc(workspaceAgentSkillVersions.version));
  return rows.map((row) => ({
    ...dbSkillDto({
      source: parsed.source,
      scope: parsed.scope,
      slug: parsed.slug,
      name: row.name,
      description: row.description,
      instructions: row.instructions,
      version: row.version,
    }),
    markdown: row.markdown,
  }));
}

async function resolveDbWorkspaceAgentSkill(skillPath: string, options: WorkspaceAgentSkillStorageOptions = {}): Promise<ResolvedDbWorkspaceAgentSkill | undefined> {
  const parsed = parseStoredSkillPath(skillPath);
  if (!parsed || !canAccessStoredSkill(parsed, options)) return undefined;
  const rows = await getDb()
    .select({ markdown: workspaceAgentSkills.markdown })
    .from(workspaceAgentSkills)
    .where(and(...dbSkillAccessWhere(parsed), isNull(workspaceAgentSkills.deletedAt)))
    .limit(1);
  return rows[0] ? { path: skillPath, markdown: rows[0].markdown } : undefined;
}

export function storeWorkspaceAgentSkill(input: StoreWorkspaceAgentSkillInput): StoredWorkspaceAgentSkill {
  const baseSlug = slugifyWorkspaceAgentSkill(input.name);
  const scope = requireSkillScope(input.source, input);
  const rootDir = input.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const slug = uniqueStoredSkillSlug(rootDir, input.source, scope, baseSlug);
  const directory = storedSkillDirectory(rootDir, input.source, scope, slug);
  mkdirSync(directory, { recursive: true });
  const markdown = buildStoredSkillMarkdown({
    slug,
    name: input.name,
    description: input.description,
    instructions: input.instructions,
  });
  writeFileSync(join(directory, "SKILL.md"), markdown, "utf8");
  writeStoredSkillVersion(directory, 1, markdown);
  return {
    source: input.source,
    name: input.name.trim(),
    slug,
    path: storedSkillPortablePath(input.source, scope, slug),
    directory,
    description: input.description.trim(),
    instructions: input.instructions.trim(),
    version: 1,
  };
}

export function updateStoredWorkspaceAgentSkill(input: UpdateWorkspaceAgentSkillInput): StoredWorkspaceAgentSkill | undefined {
  const parsed = parseStoredSkillPath(input.path);
  if (!parsed || !canAccessStoredSkill(parsed, input)) return undefined;
  const rootDir = input.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const directory = storedSkillDirectory(rootDir, parsed.source, parsed.scope, parsed.slug);
  const skillFile = join(directory, "SKILL.md");
  if (!existsSync(skillFile)) return undefined;
  const currentMarkdown = readFileSync(skillFile, "utf8");
  const current = readStoredSkillFile(skillFile);
  const version = current.version + 1;
  writeStoredSkillVersion(directory, current.version, currentMarkdown);
  const nextMarkdown = buildStoredSkillMarkdown({
    slug: parsed.slug,
    name: input.name ?? current.name,
    description: input.description ?? current.description ?? current.name,
    instructions: input.instructions ?? current.instructions ?? "Follow the skill description and keep the output concise.",
    version,
  });
  writeFileSync(skillFile, nextMarkdown, "utf8");
  writeStoredSkillVersion(directory, version, nextMarkdown);
  return {
    source: parsed.source,
    name: input.name?.trim() || current.name,
    slug: parsed.slug,
    path: input.path,
    directory,
    description: input.description?.trim() || current.description,
    instructions: input.instructions?.trim() || current.instructions,
    version,
  };
}

export function restoreStoredWorkspaceAgentSkillVersion(input: RestoreWorkspaceAgentSkillVersionInput): StoredWorkspaceAgentSkill | undefined {
  const parsed = parseStoredSkillPath(input.path);
  if (!parsed || !canAccessStoredSkill(parsed, input)) return undefined;
  if (!Number.isInteger(input.version) || input.version < 1) return undefined;
  const rootDir = input.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const directory = storedSkillDirectory(rootDir, parsed.source, parsed.scope, parsed.slug);
  const skillFile = join(directory, "SKILL.md");
  if (!existsSync(skillFile)) return undefined;
  const target = listStoredWorkspaceAgentSkillVersions(input).find((version) => version.version === input.version);
  if (!target) return undefined;
  const currentMarkdown = readFileSync(skillFile, "utf8");
  const current = readStoredSkillFile(skillFile);
  const nextVersion = current.version + 1;
  writeStoredSkillVersion(directory, current.version, currentMarkdown);
  const nextMarkdown = buildStoredSkillMarkdown({
    slug: parsed.slug,
    name: target.name,
    description: target.description ?? target.name,
    instructions: target.instructions ?? "Follow the skill description and keep the output concise.",
    version: nextVersion,
  });
  writeFileSync(skillFile, nextMarkdown, "utf8");
  writeStoredSkillVersion(directory, nextVersion, nextMarkdown);
  return {
    source: parsed.source,
    name: target.name,
    slug: parsed.slug,
    path: input.path,
    directory,
    description: target.description,
    instructions: target.instructions,
    version: nextVersion,
  };
}

export function deleteStoredWorkspaceAgentSkill(input: WorkspaceAgentSkillStorageOptions & { path: string }) {
  const parsed = parseStoredSkillPath(input.path);
  if (!parsed || !canAccessStoredSkill(parsed, input)) return false;
  const rootDir = input.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const directory = storedSkillDirectory(rootDir, parsed.source, parsed.scope, parsed.slug);
  if (!existsSync(directory)) return false;
  rmSync(directory, { recursive: true, force: true });
  return true;
}

export function resolveStoredWorkspaceAgentSkillPath(skillPath: string, options: WorkspaceAgentSkillStorageOptions = {}) {
  const parsed = parseStoredSkillPath(skillPath);
  if (!parsed) return undefined;
  if (parsed.source === "workspace" && parsed.scope !== options.workspaceId) return undefined;
  if (parsed.source === "user" && parsed.scope !== options.ownerId) return undefined;
  const rootDir = options.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const directory = storedSkillDirectory(rootDir, parsed.source, parsed.scope, parsed.slug);
  return existsSync(join(directory, "SKILL.md")) ? directory : undefined;
}

export async function prepareWorkspaceAgentSkillDirectories(
  skillPaths: string[],
  options: WorkspaceAgentSkillStorageOptions & { backend?: Pick<WorkspaceAgentSkillBackend, "kind" | "resolve"> } = {},
) {
  const directories: string[] = [];
  for (const skillPath of skillPaths) {
    if (existsSync(join(skillPath, "SKILL.md"))) {
      directories.push(skillPath);
      continue;
    }
    const localDirectory = resolveStoredWorkspaceAgentSkillPath(skillPath, options);
    if (localDirectory) {
      directories.push(localDirectory);
      continue;
    }
    if (!options.backend?.resolve) continue;
    const resolved = await options.backend.resolve(skillPath, options);
    if (!resolved) continue;
    directories.push(materializeWorkspaceAgentSkillMarkdown({
      rootDir: options.rootDir,
      skillPath: resolved.path,
      markdown: resolved.markdown,
    }));
  }
  return directories;
}

export function materializeWorkspaceAgentSkillMarkdown(input: { rootDir?: string; skillPath: string; markdown: string }) {
  const parsed = parseStoredSkillPath(input.skillPath);
  if (!parsed) throw new Error("Only portable workspace/user skill ids can be materialized.");
  const rootDir = input.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const directory = join(rootDir, MATERIALIZED_SKILL_STORAGE_DIR, parsed.source, sanitizeSkillScope(parsed.scope), parsed.slug);
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, "SKILL.md"), input.markdown, "utf8");
  return directory;
}

export function cleanupMaterializedWorkspaceAgentSkills(input: { rootDir?: string; olderThanMs?: number; now?: number } = {}) {
  const rootDir = input.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const materializedRoot = join(rootDir, MATERIALIZED_SKILL_STORAGE_DIR);
  const olderThanMs = input.olderThanMs ?? 7 * 24 * 60 * 60 * 1000;
  const now = input.now ?? Date.now();
  const removed: string[] = [];
  if (!existsSync(materializedRoot)) return { removed };
  for (const source of readdirSync(materializedRoot, { withFileTypes: true })) {
    if (!source.isDirectory()) continue;
    const sourceDir = join(materializedRoot, source.name);
    for (const scope of readdirSync(sourceDir, { withFileTypes: true })) {
      if (!scope.isDirectory()) continue;
      const scopeDir = join(sourceDir, scope.name);
      for (const slug of readdirSync(scopeDir, { withFileTypes: true })) {
        if (!slug.isDirectory()) continue;
        const directory = join(scopeDir, slug.name);
        const skillFile = join(directory, "SKILL.md");
        const stat = statSync(existsSync(skillFile) ? skillFile : directory);
        if (now - stat.mtimeMs <= olderThanMs) continue;
        rmSync(directory, { recursive: true, force: true });
        removed.push(directory);
      }
    }
  }
  return { removed };
}

export function runWorkspaceAgentSkillStorageMaintenanceOnce(input: { rootDir?: string; olderThanMs?: number; key?: string } = {}) {
  const key = input.key ?? input.rootDir ?? "default";
  const seen = maintenanceState[maintenanceGlobalKey] ?? new Set<string>();
  maintenanceState[maintenanceGlobalKey] = seen;
  if (seen.has(key)) return { ran: false, removed: [] as string[] };
  seen.add(key);
  return {
    ran: true,
    ...cleanupMaterializedWorkspaceAgentSkills(input),
  };
}

export function listStoredWorkspaceAgentSkills(options: WorkspaceAgentSkillStorageOptions = {}): StoredWorkspaceAgentSkill[] {
  const rootDir = options.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  return [
    ...(options.workspaceId ? listStoredSkillsForScope(rootDir, "workspace", options.workspaceId) : []),
    ...(options.ownerId ? listStoredSkillsForScope(rootDir, "user", options.ownerId) : []),
  ];
}

export function listStoredWorkspaceAgentSkillVersions(options: WorkspaceAgentSkillStorageOptions & { path: string }): StoredWorkspaceAgentSkillVersion[] {
  const parsed = parseStoredSkillPath(options.path);
  if (!parsed || !canAccessStoredSkill(parsed, options)) return [];
  const rootDir = options.rootDir ?? join(process.cwd(), DEFAULT_SKILL_STORAGE_ROOT);
  const directory = storedSkillDirectory(rootDir, parsed.source, parsed.scope, parsed.slug);
  const currentSkillFile = join(directory, "SKILL.md");
  if (!existsSync(currentSkillFile)) return [];
  const byVersion = new Map<number, StoredWorkspaceAgentSkillVersion>();
  const versionsDir = storedSkillVersionsDirectory(directory);
  if (existsSync(versionsDir)) {
    for (const entry of readdirSync(versionsDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.match(/^v\d+\.SKILL\.md$/)) continue;
      const skillFile = join(versionsDir, entry.name);
      const skill = readStoredSkillFile(skillFile);
      byVersion.set(skill.version, {
        source: parsed.source,
        name: skill.name,
        slug: parsed.slug,
        path: options.path,
        directory,
        skillFile,
        description: skill.description,
        instructions: skill.instructions,
        version: skill.version,
      });
    }
  }
  const current = readStoredSkillFile(currentSkillFile);
  byVersion.set(current.version, {
    source: parsed.source,
    name: current.name,
    slug: parsed.slug,
    path: options.path,
    directory,
    skillFile: currentSkillFile,
    description: current.description,
    instructions: current.instructions,
    version: current.version,
  });
  return Array.from(byVersion.values()).sort((a, b) => a.version - b.version);
}

function listStoredSkillsForScope(rootDir: string, source: WorkspaceAgentSkillSource, scope: string): StoredWorkspaceAgentSkill[] {
  const scopeDir = join(rootDir, source === "workspace" ? "workspace" : "user", sanitizeSkillScope(scope));
  if (!existsSync(scopeDir)) return [];
  return readdirSync(scopeDir, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const slug = entry.name;
    const directory = join(scopeDir, slug);
    const skillFile = join(directory, "SKILL.md");
    if (!existsSync(skillFile)) return [];
    const skill = readStoredSkillFile(skillFile);
    return [{
      source,
      name: skill.name,
      slug,
      path: storedSkillPortablePath(source, scope, slug),
      directory,
      description: skill.description,
      instructions: skill.instructions,
      version: skill.version,
    }];
  });
}

function parseStoredSkillPath(skillPath: string) {
  const workspaceMatch = skillPath.match(/^\/workspace-skills\/([^/]+)\/([a-z0-9-]+)$/);
  if (workspaceMatch) return { source: "workspace" as const, scope: workspaceMatch[1], slug: workspaceMatch[2] };
  const userMatch = skillPath.match(/^\/user-skills\/([^/]+)\/([a-z0-9-]+)$/);
  if (userMatch) return { source: "user" as const, scope: userMatch[1], slug: userMatch[2] };
  return undefined;
}

function requireSkillScope(source: WorkspaceAgentSkillSource, input: WorkspaceAgentSkillStorageOptions) {
  const scope = source === "workspace" ? input.workspaceId : input.ownerId;
  if (!scope) throw new Error(`${source} skill scope is required.`);
  return sanitizeSkillScope(scope);
}

function storedSkillDirectory(rootDir: string, source: WorkspaceAgentSkillSource, scope: string, slug: string) {
  return join(rootDir, source === "workspace" ? "workspace" : "user", sanitizeSkillScope(scope), slug);
}

function storedSkillPortablePath(source: WorkspaceAgentSkillSource, scope: string, slug: string) {
  return source === "workspace" ? `/workspace-skills/${sanitizeSkillScope(scope)}/${slug}` : `/user-skills/${sanitizeSkillScope(scope)}/${slug}`;
}

function uniqueStoredSkillSlug(rootDir: string, source: WorkspaceAgentSkillSource, scope: string, baseSlug: string) {
  let slug = baseSlug;
  let suffix = 2;
  while (existsSync(storedSkillDirectory(rootDir, source, scope, slug))) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

function storedSkillVersionsDirectory(directory: string) {
  return join(directory, ".versions");
}

function writeStoredSkillVersion(directory: string, version: number, markdown: string) {
  const versionsDir = storedSkillVersionsDirectory(directory);
  mkdirSync(versionsDir, { recursive: true });
  writeFileSync(join(versionsDir, `v${version}.SKILL.md`), markdown, "utf8");
}

function buildStoredSkillMarkdown(input: { slug: string; name: string; description: string; instructions: string; version?: number }) {
  const description = input.description.trim() || `Use the ${input.name.trim()} workspace skill.`;
  const instructions = input.instructions.trim() || "Follow the skill description and keep the output concise.";
  return [
    "---",
    `name: ${input.slug}`,
    `description: ${escapeFrontmatterValue(description)}`,
    `version: ${input.version ?? 1}`,
    "---",
    "",
    `# ${input.name.trim() || input.slug}`,
    "",
    "## When to use",
    description,
    "",
    "## Instructions",
    instructions,
    "",
    "## Output",
    "Return concise, actionable help that fits the current workspace conversation.",
    "",
  ].join("\n");
}

function canAccessStoredSkill(parsed: { source: WorkspaceAgentSkillSource; scope: string }, options: WorkspaceAgentSkillStorageOptions) {
  if (parsed.source === "workspace") return parsed.scope === options.workspaceId;
  return parsed.scope === options.ownerId;
}

function readStoredSkillFile(skillFile: string) {
  const markdown = readFileSync(skillFile, "utf8");
  const name = readHeading(markdown) ?? readFrontmatterValue(markdown, "name") ?? "workspace-skill";
  return {
    name,
    description: readFrontmatterValue(markdown, "description"),
    instructions: readSection(markdown, "Instructions"),
    version: readFrontmatterNumber(markdown, "version") ?? 1,
  };
}

function readHeading(markdown: string) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function readSection(markdown: string, heading: string) {
  const pattern = "^## " + heading + "\\n([\\s\\S]*?)(?:\\n## |$)";
  const match = markdown.match(new RegExp(pattern, "m"));
  return match?.[1]?.trim();
}

function slugifyWorkspaceAgentSkill(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "workspace-skill"
  );
}

function sanitizeSkillScope(value: string) {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  if (!sanitized) throw new Error("Skill scope is required.");
  return sanitized;
}

function escapeFrontmatterValue(value: string) {
  return JSON.stringify(value).slice(1, -1);
}

function readFrontmatterValue(markdown: string, key: string) {
  const match = markdown.match(new RegExp(`^${key}:\\s*["']?([^"'\\n]+)["']?`, "m"));
  return match?.[1]?.trim();
}

function readFrontmatterNumber(markdown: string, key: string) {
  const raw = readFrontmatterValue(markdown, key);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requireSkillOwner(input: WorkspaceAgentSkillStorageOptions) {
  if (!input.ownerId) throw new Error("Skill owner is required.");
  return sanitizeSkillScope(input.ownerId);
}

async function uniqueDbStoredSkillSlug(source: WorkspaceAgentSkillSource, scope: string, baseSlug: string, options: WorkspaceAgentSkillStorageOptions) {
  let slug = baseSlug;
  let suffix = 2;
  while (await dbStoredSkillSlugExists(source, scope, slug, options)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
  return slug;
}

async function dbStoredSkillSlugExists(source: WorkspaceAgentSkillSource, scope: string, slug: string, options: WorkspaceAgentSkillStorageOptions) {
  const parsed = { source, scope, slug };
  const rows = await getDb()
    .select({ id: workspaceAgentSkills.id })
    .from(workspaceAgentSkills)
    .where(and(...dbSkillAccessWhere(parsed), isNull(workspaceAgentSkills.deletedAt)))
    .limit(1);
  return rows.length > 0;
}

function dbSkillAccessWhere(
  parsed: { source: WorkspaceAgentSkillSource; scope: string; slug: string },
) {
  const clauses = [
    eq(workspaceAgentSkills.source, parsed.source),
    eq(workspaceAgentSkills.slug, parsed.slug),
  ];
  if (parsed.source === "workspace") {
    clauses.push(eq(workspaceAgentSkills.workspaceId, parsed.scope));
  } else {
    clauses.push(eq(workspaceAgentSkills.ownerId, parsed.scope));
  }
  return clauses;
}

function dbSkillMutationWhere(
  parsed: { source: WorkspaceAgentSkillSource; scope: string; slug: string },
  options: WorkspaceAgentSkillStorageOptions,
) {
  if (!options.ownerId) throw new Error("Skill owner is required.");
  return [
    ...dbSkillAccessWhere(parsed),
    eq(workspaceAgentSkills.ownerId, sanitizeSkillScope(options.ownerId)),
  ];
}

function dbSkillDto(input: {
  source: WorkspaceAgentSkillSource;
  scope: string;
  slug: string;
  name: string;
  description: string;
  instructions: string;
  version: number;
}): DbStoredWorkspaceAgentSkill {
  return {
    source: input.source,
    name: input.name,
    slug: input.slug,
    path: storedSkillPortablePath(input.source, input.scope, input.slug),
    description: input.description,
    instructions: input.instructions,
    version: input.version,
  };
}

function createStoredSkillId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
