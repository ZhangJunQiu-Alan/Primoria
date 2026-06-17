import { readFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

export const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = resolve(SCRIPT_DIR, "..");
export const REPO_ROOT = resolve(WEB_ROOT, "../..");
export const DEFAULT_GRAPH_ID = "mit_calculus";
export const DEFAULT_MODEL_VERSION = "openai:text-embedding-3-small:1536";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
export const TEMPLE_DIR = resolve(REPO_ROOT, "temple");
// temple/*.json that are not subject graphs (cross edges, label sidecar, etc.)
const NON_GRAPH_FILES = new Set(["cross_subject_edges.json", "kg_zh_labels.json"]);

function loadEnvFile(file) {
  if (!existsSync(file)) return;

  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

export function loadLocalEnv() {
  loadEnvFile(resolve(WEB_ROOT, ".env.local"));
  loadEnvFile(resolve(WEB_ROOT, ".env"));
  loadEnvFile(resolve(REPO_ROOT, "apps/agent/.env"));
  loadEnvFile(resolve(REPO_ROOT, ".env.local"));
  loadEnvFile(resolve(REPO_ROOT, ".env"));
}

export function createPgClient() {
  loadLocalEnv();
  if (!process.env.DATABASE_URL) throw new Error("Missing DATABASE_URL");
  return new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "false" ? undefined : { rejectUnauthorized: false },
  });
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

// graph_id maps directly to temple/<graph_id>.json
export function graphPath(graphId = DEFAULT_GRAPH_ID) {
  const path = resolve(TEMPLE_DIR, `${graphId}.json`);
  if (!existsSync(path)) throw new Error(`No source JSON for graph_id=${graphId} (${path})`);
  return path;
}

// All subject-graph ids = temple/*.json minus the non-graph sidecars.
export function listGraphIds() {
  return readdirSync(TEMPLE_DIR)
    .filter((f) => f.endsWith(".json") && !NON_GRAPH_FILES.has(f))
    .map((f) => basename(f, ".json"))
    .sort();
}

export function crossEdgesPath() {
  return resolve(TEMPLE_DIR, "cross_subject_edges.json");
}

export function aliasPath(graphId = DEFAULT_GRAPH_ID) {
  return resolve(WEB_ROOT, `src/lib/knowledge-graph/data/node-aliases.${graphId}.json`);
}

export function requireEnv(name) {
  loadLocalEnv();
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

export async function withTransaction(client, fn) {
  await client.query("begin");
  try {
    const value = await fn();
    await client.query("commit");
    return value;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
}
