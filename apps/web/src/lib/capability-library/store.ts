import fs from "node:fs";
import path from "node:path";
import type { LearningApp, LearningAppSummary } from "./types";
import { summarizeApp } from "./types";

type GlobalStore = {
  apps: Map<string, LearningApp>;
  hydrated: boolean;
  fileMtimeMs: number;
};

const globalKey = "__primoria_capability_library_store__";
const globalAny = globalThis as unknown as Record<string, GlobalStore | undefined>;
const storeFile = path.join(findWorkspaceRoot(), ".primoria-capability-library.json");

function getStore(): GlobalStore {
  let store = globalAny[globalKey];
  if (!store) {
    store = { apps: new Map(), hydrated: false, fileMtimeMs: 0 };
    globalAny[globalKey] = store;
  }
  if (!store.hydrated) {
    hydrateStore(store);
  } else {
    refreshStoreIfChanged(store);
  }
  return store;
}

export function saveApp(app: LearningApp): LearningApp {
  getStore().apps.set(app.id, app);
  persistStore();
  return app;
}

export function getApp(id: string): LearningApp | undefined {
  return getStore().apps.get(id);
}

export function listApps(): LearningAppSummary[] {
  const apps = Array.from(getStore().apps.values());
  apps.sort((a, b) => b.metadata.lastUsedAt - a.metadata.lastUsedAt);
  return apps.map(summarizeApp);
}

export function findAppByHtmlSignature(signature: string): LearningApp | undefined {
  for (const app of getStore().apps.values()) {
    if (app.template.type === "html" && hashHtmlSource(app.template.source) === signature) {
      return app;
    }
  }
  return undefined;
}

export function hashHtmlSource(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function hydrateStore(store: GlobalStore) {
  store.hydrated = true;
  try {
    if (!fs.existsSync(storeFile)) {
      store.fileMtimeMs = 0;
      return;
    }
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8")) as { apps?: LearningApp[] };
    if (!Array.isArray(parsed.apps)) return;
    store.apps = new Map(parsed.apps.map((app) => [app.id, app]));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[capability-library/store] Failed to hydrate", error);
  }
}

function refreshStoreIfChanged(store: GlobalStore) {
  try {
    if (!fs.existsSync(storeFile)) {
      if (store.fileMtimeMs !== 0) {
        store.apps = new Map();
        store.fileMtimeMs = 0;
      }
      return;
    }
    const mtimeMs = fs.statSync(storeFile).mtimeMs;
    if (mtimeMs === store.fileMtimeMs) return;
    const parsed = JSON.parse(fs.readFileSync(storeFile, "utf8")) as { apps?: LearningApp[] };
    if (!Array.isArray(parsed.apps)) return;
    store.apps = new Map(parsed.apps.map((app) => [app.id, app]));
    store.fileMtimeMs = mtimeMs;
  } catch (error) {
    console.warn("[capability-library/store] Failed to refresh", error);
  }
}

function persistStore() {
  try {
    const store = getStore();
    const apps = Array.from(store.apps.values());
    fs.writeFileSync(storeFile, JSON.stringify({ apps }, null, 2));
    store.fileMtimeMs = fs.statSync(storeFile).mtimeMs;
  } catch (error) {
    console.warn("[capability-library/store] Failed to persist", error);
  }
}

function findWorkspaceRoot() {
  let dir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return process.cwd();
    dir = parent;
  }
}
