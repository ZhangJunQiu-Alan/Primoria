import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

export const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = resolve(SCRIPT_DIR, "..");
export const REPO_ROOT = resolve(WEB_ROOT, "../..");
export const DEFAULT_GRAPH_ID = "calculus_single_variable_v1";
export const DEFAULT_MODEL_VERSION = "openai:text-embedding-3-small:1536";
export const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";

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

export function graphPath(graphId = DEFAULT_GRAPH_ID) {
  if (graphId !== DEFAULT_GRAPH_ID) {
    throw new Error(`No source JSON is configured for graph_id=${graphId}`);
  }
  return resolve(REPO_ROOT, "temple/calculus_knowledge_graph.json");
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
