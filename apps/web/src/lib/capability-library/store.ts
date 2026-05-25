import fs from "node:fs";
import path from "node:path";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "../auth/session";
import { getDb, hasDatabaseUrl } from "../db/client";
import { learningApps as learningAppsTable } from "../db/schema";
import type { LearningApp, LearningAppSummary } from "./types";
import { summarizeApp } from "./types";

export async function saveApp(app: LearningApp, ownerId?: string | null): Promise<LearningApp> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) {
    saveAppToLocalFile(app);
    return app;
  }
  await saveAppToDb(app, resolvedOwnerId);
  return app;
}

export async function getApp(id: string, ownerId?: string | null): Promise<LearningApp | undefined> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) return getAppFromLocalFile(id);
  return getAppFromDb(id, resolvedOwnerId);
}

export async function listApps(ownerId?: string | null, options: { includeArchived?: boolean } = {}): Promise<LearningAppSummary[]> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) return listAppsFromLocalFile(options).map(summarizeApp);
  const apps = await listAppsFromDb(resolvedOwnerId, options);
  return apps.map(summarizeApp);
}

export async function archiveApp(id: string, ownerId?: string | null): Promise<LearningApp | undefined> {
  const app = await getApp(id, ownerId);
  if (!app) return undefined;
  const now = Date.now();
  const archived: LearningApp = {
    ...app,
    archivedAt: now,
    version: (app.version ?? 1) + 1,
    metadata: { ...app.metadata, lastUsedAt: now },
  };
  return saveApp(archived, ownerId);
}

export async function unarchiveApp(id: string, ownerId?: string | null): Promise<LearningApp | undefined> {
  const app = await getApp(id, ownerId);
  if (!app) return undefined;
  const now = Date.now();
  const unarchived: LearningApp = {
    ...app,
    archivedAt: null,
    version: (app.version ?? 1) + 1,
    metadata: { ...app.metadata, lastUsedAt: now },
  };
  return saveApp(unarchived, ownerId);
}

export async function findAppByHtmlSignature(signature: string, ownerId?: string | null): Promise<LearningApp | undefined> {
  const resolvedOwnerId = await resolveOwnerId(ownerId);
  if (!resolvedOwnerId) {
    return readLocalLibrary().apps.find((app) => app.template.type === "html" && hashHtmlSource(app.template.source) === signature);
  }
  const rows = await getDb()
    .select()
    .from(learningAppsTable)
    .where(and(eq(learningAppsTable.ownerId, resolvedOwnerId), eq(learningAppsTable.htmlSignature, signature)))
    .limit(1);
  return rows[0] ? rowToApp(rows[0]) : undefined;
}

export function hashHtmlSource(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

async function resolveOwnerId(ownerId?: string | null) {
  if (ownerId) return ownerId;
  if (!hasDatabaseUrl()) return null;
  const user = await getCurrentUser();
  return user?.id ?? null;
}

type LocalLibraryFile = {
  apps: LearningApp[];
};

const LOCAL_LIBRARY_FILE = ".primoria-capability-library.json";

function listAppsFromLocalFile(options: { includeArchived?: boolean } = {}): LearningApp[] {
  const apps = readLocalLibrary().apps;
  return apps
    .filter((app) => options.includeArchived || !app.archivedAt)
    .sort((a, b) => b.metadata.lastUsedAt - a.metadata.lastUsedAt);
}

function getAppFromLocalFile(id: string): LearningApp | undefined {
  return readLocalLibrary().apps.find((app) => app.id === id);
}

function saveAppToLocalFile(app: LearningApp) {
  const library = readLocalLibrary();
  const nextApps = [app, ...library.apps.filter((entry) => entry.id !== app.id)];
  writeLocalLibrary({ apps: nextApps });
}

function readLocalLibrary(): LocalLibraryFile {
  const filePath = getLocalLibraryPath();
  if (!fs.existsSync(filePath)) return { apps: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<LocalLibraryFile>;
    return { apps: Array.isArray(parsed.apps) ? parsed.apps : [] };
  } catch {
    return { apps: [] };
  }
}

function writeLocalLibrary(library: LocalLibraryFile) {
  const filePath = getLocalLibraryPath();
  const tempPath = `${filePath}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tempPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function getLocalLibraryPath() {
  let current = process.cwd();
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(current, LOCAL_LIBRARY_FILE);
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(path.join(current, "pnpm-workspace.yaml"))) return candidate;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return path.join(process.cwd(), LOCAL_LIBRARY_FILE);
}

async function saveAppToDb(app: LearningApp, ownerId: string) {
  const row = appToRow(app, ownerId);
  await getDb()
    .insert(learningAppsTable)
    .values(row)
    .onConflictDoUpdate({
      target: learningAppsTable.id,
      set: {
        ownerId: row.ownerId,
        name: row.name,
        displayName: row.displayName,
        description: row.description,
        tags: row.tags,
        template: row.template,
        origin: row.origin,
        composition: row.composition,
        capabilities: row.capabilities,
        metadata: row.metadata,
        htmlSignature: row.htmlSignature,
        archivedAt: row.archivedAt,
        version: row.version,
        updatedAt: row.updatedAt,
      },
    });
}

async function getAppFromDb(id: string, ownerId: string): Promise<LearningApp | undefined> {
  const rows = await getDb().select().from(learningAppsTable).where(eq(learningAppsTable.id, id)).limit(1);
  const row = rows[0];
  if (!row || row.ownerId !== ownerId) return undefined;
  return rowToApp(row);
}

async function listAppsFromDb(ownerId: string, options: { includeArchived?: boolean } = {}): Promise<LearningApp[]> {
  const whereClause = options.includeArchived
    ? eq(learningAppsTable.ownerId, ownerId)
    : and(eq(learningAppsTable.ownerId, ownerId), isNull(learningAppsTable.archivedAt));
  const rows = await getDb().select().from(learningAppsTable).where(whereClause).orderBy(desc(learningAppsTable.updatedAt));
  return rows.map(rowToApp);
}

function appToRow(app: LearningApp, ownerId: string) {
  const createdAt = new Date(app.metadata.createdAt);
  const updatedAt = new Date(app.metadata.lastUsedAt);
  return {
    id: app.id,
    ownerId,
    name: app.name,
    displayName: app.displayName,
    description: app.description ?? null,
    tags: app.tags,
    template: app.template,
    origin: app.origin,
    composition: app.composition ?? null,
    capabilities: app.capabilities ?? null,
    metadata: app.metadata,
    htmlSignature: app.template.type === "html" ? hashHtmlSource(app.template.source) : null,
    archivedAt: app.archivedAt ? new Date(app.archivedAt) : null,
    version: app.version ?? 1,
    createdAt,
    updatedAt,
  };
}

function rowToApp(row: typeof learningAppsTable.$inferSelect): LearningApp {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description ?? undefined,
    tags: row.tags as LearningApp["tags"],
    template: row.template as LearningApp["template"],
    origin: row.origin as LearningApp["origin"],
    composition: (row.composition ?? undefined) as LearningApp["composition"],
    capabilities: (row.capabilities ?? undefined) as LearningApp["capabilities"],
    metadata: row.metadata as LearningApp["metadata"],
    archivedAt: row.archivedAt?.getTime() ?? null,
    version: row.version ?? 1,
  };
}
