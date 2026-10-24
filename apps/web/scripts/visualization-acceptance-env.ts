import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import postgres from "postgres";

// Isolation helpers for the real-model visualization acceptance runner. The
// runner creates a synthetic learner; it must never do that in the shared
// product database by accident, and a killed run must not leave residue.

export const ACCEPTANCE_OWNER_PREFIX = "usr_viz_acceptance_";

export function databaseName(url: string | undefined) {
  if (!url) return "";
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

export function isIsolatedTestDatabase(url: string | undefined) {
  return /test/i.test(databaseName(url));
}

/** Removes a synthetic owner, including Agent runtime rows that have no FK to users. */
export async function removeAcceptanceOwners(sql: postgres.Sql, ownerIds: string[]) {
  if (!ownerIds.length) return;
  await sql.begin(async (tx) => {
    const threads = await tx<{ thread_id: string }[]>`select distinct thread_id from agent_runtime.runs where owner_id in ${tx(ownerIds)}`;
    const threadIds = threads.map((row) => row.thread_id);
    for (const table of threadIds.length ? ["checkpoint_writes", "checkpoint_blobs", "checkpoints"] : []) {
      const [{ exists }] = await tx<{ exists: boolean }[]>`select to_regclass(${`agent_runtime.${table}`}) is not null as exists`;
      if (exists) await tx`delete from ${tx("agent_runtime")}.${tx(table)} where thread_id in ${tx(threadIds)}`;
    }
    await tx`delete from agent_runtime.runs where owner_id in ${tx(ownerIds)}`;
    await tx`delete from users where id in ${tx(ownerIds)}`;
  });
}

/** Cleans synthetic owners left by runs that were killed before their finally block. */
export async function sweepStaleAcceptanceOwners(sql: postgres.Sql, olderThanMinutes = 360) {
  const stale = await sql<{ id: string }[]>`
    select id from users
    where id like ${`${ACCEPTANCE_OWNER_PREFIX}%`} and created_at < now() - make_interval(mins => ${olderThanMinutes})
  `;
  await removeAcceptanceOwners(sql, stale.map((row) => row.id));
  return stale.length;
}

/**
 * The isolated template has KG content but no embeddings (they need a paid
 * provider call). Course cases position through embeddings, so copy them from
 * the developer's local application database instead of re-embedding.
 */
export async function copyKgEmbeddings(sourceUrl: string, targetUrl: string) {
  const source = postgres(sourceUrl, { max: 1, prepare: false, onnotice: () => {} });
  const target = postgres(targetUrl, { max: 1, prepare: false, onnotice: () => {} });
  try {
    const graphs = new Set((await target<{ id: string }[]>`select id from knowledge_graphs`).map((row) => row.id));
    const rows = (await source<{ graph_id: string; node_id: string; kind: string; embed_text: string; embedding: string; model_version: string }[]>`
      select graph_id, node_id, kind, embed_text, embedding::text as embedding, model_version from kg_node_embeddings
    `).filter((row) => graphs.has(row.graph_id));
    for (let index = 0; index < rows.length; index += 200) {
      const batch = rows.slice(index, index + 200);
      await target`
        insert into kg_node_embeddings (graph_id, node_id, kind, embed_text, embedding, model_version)
        select graph_id, node_id, kind, embed_text, embedding::vector, model_version
        from jsonb_to_recordset(${target.json(batch)}::jsonb)
          as rows(graph_id text, node_id text, kind text, embed_text text, embedding text, model_version text)
        on conflict do nothing
      `;
    }
    return rows.length;
  } finally {
    await Promise.allSettled([source.end({ timeout: 5 }), target.end({ timeout: 5 })]);
  }
}

function killGroup(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null) return;
  try {
    if (process.platform === "win32") child.kill("SIGTERM");
    else process.kill(-child.pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

async function waitFor(url: string, child: ChildProcess, name: string, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`${name} exited with code ${child.exitCode}`);
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {
      // not listening yet
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`${name} did not become ready at ${url}`);
}

/**
 * Starts the real Agent and Web against the isolated database with the
 * developer's configured model credentials (apps/agent/.env, apps/web/.env.local).
 * Explicit environment wins over those files in both runtimes.
 */
export async function startIsolatedApp(input: { databaseUrl: string; webPort: number; agentPort: number }) {
  const root = resolve(process.cwd(), "../..");
  const secret = randomUUID();
  const detached = process.platform !== "win32";
  const agent = spawn("pnpm", ["--filter", "@primoria/agent", "start"], {
    cwd: root, detached, stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, DATABASE_URL: input.databaseUrl, PORT: String(input.agentPort), HOST: "127.0.0.1", PRIMORIA_AGENT_INTERNAL_SECRET: secret },
  });
  const web = spawn("pnpm", ["--filter", "@primoria/web", process.env.REGRESSION_WEB_MODE === "production" ? "start" : "dev"], {
    cwd: root, detached, stdio: ["ignore", "inherit", "inherit"],
    env: {
      ...process.env, DATABASE_URL: input.databaseUrl, PORT: String(input.webPort),
      PRIMORIA_AGENT_URL: `http://127.0.0.1:${input.agentPort}`, PRIMORIA_AGENT_INTERNAL_SECRET: secret,
      PRIMORIA_EXPOSE_MODEL_CALLS: "1",
    },
  });
  const stop = () => { killGroup(web); killGroup(agent); };
  try {
    await waitFor(`http://127.0.0.1:${input.agentPort}/health/ready`, agent, "Agent", 90_000);
    await waitFor(`http://localhost:${input.webPort}/auth/sign-in`, web, "Web", 180_000);
  } catch (error) {
    stop();
    throw error;
  }
  return { baseUrl: `http://localhost:${input.webPort}`, stop };
}
