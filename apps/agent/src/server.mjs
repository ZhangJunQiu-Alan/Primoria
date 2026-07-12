import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { RunAgentInputSchema } from "@ag-ui/core";
import { createPrimoriaGraph } from "./graph.mjs";
import { createRunStore } from "./runtime/run-store.mjs";
import { createRunWorker } from "./runtime/runner.mjs";

const PORT = Number(process.env.PORT ?? 2024);
const HOST = process.env.HOST ?? "0.0.0.0";
const DATABASE_URL = process.env.DATABASE_URL;
const TERMINAL = new Set(["completed", "failed", "cancelled"]);
/** @param {number} ms */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** @param {import("node:http").ServerResponse} res @param {number} status @param {unknown} body */
function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

/** @param {import("node:http").IncomingMessage} req */
async function readJson(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 5_000_000) throw new Error("Request body is too large");
  }
  return JSON.parse(body || "{}");
}

/** @param {string} pathname */
function runIdFromCancelPath(pathname) {
  const match = pathname.match(/^\/runs\/([^/]+)\/cancel$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** @param {string} pathname */
function runIdFromStatusPath(pathname) {
  const match = pathname.match(/^\/runs\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:http").ServerResponse} res
 * @param {any} store
 * @param {any} input
 */
async function streamRun(req, res, store, input) {
  await store.ensureRun(input);
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.flushHeaders?.();

  let afterId = Number(req.headers["x-primoria-after-event-id"] ?? 0);
  let lastHeartbeat = Date.now();
  let terminalSeen = false;
  while (!res.destroyed && !res.writableEnded) {
    const events = await store.listEvents(input.runId, afterId);
    for (const row of events) {
      afterId = Number(row.id);
      res.write(`id: ${afterId}\ndata: ${JSON.stringify(row.event)}\n\n`);
    }
    const run = await store.getRun(input.runId);
    if (!run) break;
    if (TERMINAL.has(run.status)) {
      if (terminalSeen && events.length === 0) break;
      terminalSeen = true;
    } else {
      terminalSeen = false;
    }
    if (Date.now() - lastHeartbeat > 10_000) {
      res.write(": heartbeat\n\n");
      lastHeartbeat = Date.now();
    }
    await delay(100);
  }
  if (!res.destroyed) res.end();
}

export async function startAgentServer() {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is required for the Agent runtime");
  const store = createRunStore(DATABASE_URL);
  await store.ping();
  const checkpointer = PostgresSaver.fromConnString(DATABASE_URL, { schema: "agent_runtime" });
  await checkpointer.setup();
  const graph = createPrimoriaGraph({ checkpointer });
  const worker = createRunWorker({
    store,
    graph,
    concurrency: Math.max(1, Number(process.env.AGENT_RUN_CONCURRENCY ?? 2)),
    leaseMs: Math.max(10_000, Number(process.env.AGENT_RUN_LEASE_MS ?? 30_000)),
  });
  await worker.start();

  let ready = true;
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
      if (req.method === "GET" && url.pathname === "/health/live") return json(res, 200, { status: "ok" });
      if (req.method === "GET" && url.pathname === "/health/ready") {
        if (!ready) return json(res, 503, { status: "stopping" });
        await store.ping();
        return json(res, 200, { status: "ok", activeRuns: worker.activeCount() });
      }

      const cancelRunId = runIdFromCancelPath(url.pathname);
      if (req.method === "POST" && cancelRunId) {
        const cancelled = await store.cancel(cancelRunId);
        return json(res, cancelled ? 202 : 404, { ok: cancelled, runId: cancelRunId });
      }

      const statusRunId = runIdFromStatusPath(url.pathname);
      if (req.method === "GET" && statusRunId) {
        const run = await store.getRun(statusRunId);
        return run ? json(res, 200, { id: run.id, status: run.status, attempts: run.attempts, errorCategory: run.error_category }) : json(res, 404, { error: "not_found" });
      }

      if (req.method === "POST" && url.pathname === "/agent") {
        const parsed = RunAgentInputSchema.safeParse(await readJson(req));
        if (!parsed.success) return json(res, 400, { error: "invalid_agent_input" });
        await streamRun(req, res, store, parsed.data);
        return;
      }
      json(res, 404, { error: "not_found" });
    } catch (error) {
      console.error("[agent-runtime] request failed", error);
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (!res.headersSent) json(res, code === "run_id_conflict" ? 409 : 500, { error: "agent_runtime_error" });
      else if (!res.destroyed) res.end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, () => resolve(undefined));
  });
  process.stdout.write(`[agent-runtime] listening on http://${HOST}:${PORT}\n`);

  /** @param {string} reason */
  async function close(reason = "close") {
    if (!ready) return;
    ready = false;
    process.stdout.write(`[agent-runtime] ${reason}; draining\n`);
    const serverClosed = new Promise((resolve) => server.close(() => resolve(undefined)));
    await worker.stop(Math.max(1_000, Number(process.env.AGENT_SHUTDOWN_GRACE_MS ?? 30_000)));
    process.stdout.write("[agent-runtime] workers drained\n");
    server.closeIdleConnections?.();
    if (await Promise.race([serverClosed.then(() => "closed"), delay(5_000).then(() => "timeout")]) === "timeout") {
      server.closeAllConnections?.();
      await serverClosed;
    }
    process.stdout.write("[agent-runtime] HTTP server closed\n");
    await Promise.allSettled([store.close(), checkpointer.end()]);
    process.stdout.write("[agent-runtime] persistence closed\n");
  }
  process.on("SIGTERM", () => void close("SIGTERM").then(() => process.exit(0)));
  process.on("SIGINT", () => void close("SIGINT").then(() => process.exit(0)));
  return { server, store, worker, checkpointer, close };
}

if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) {
  startAgentServer().catch((error) => {
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  });
}
