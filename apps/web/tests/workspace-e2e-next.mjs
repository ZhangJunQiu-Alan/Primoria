import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export function createNextDevSnapshot(repoRoot, distDir) {
  const webRoot = path.join(repoRoot, "apps", "web");
  const files = [path.join(webRoot, "next-env.d.ts"), path.join(webRoot, "tsconfig.json")];
  const snapshots = files.map((file) => ({
    file,
    existed: existsSync(file),
    content: existsSync(file) ? readFileSync(file, "utf8") : "",
  }));

  return {
    distDir,
    env: { NEXT_DIST_DIR: distDir },
    restore() {
      for (const snapshot of snapshots) {
        if (snapshot.existed) {
          writeFileSync(snapshot.file, snapshot.content, "utf8");
        } else {
          rmSync(snapshot.file, { force: true });
        }
      }
      rmSync(path.join(webRoot, distDir), {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
    },
  };
}

export function startNextDevServer(input) {
  const snapshot = createNextDevSnapshot(input.repoRoot, input.distDir);
  input.log("starting Next.js dev server on port", input.port);
  const server = spawn("pnpm", ["--filter", "@primoria/web", "dev"], {
    cwd: input.repoRoot,
    env: {
      ...process.env,
      PRIMORIA_WORKSPACE_DEEPAGENT: "0",
      ...input.env,
      ...snapshot.env,
      PORT: input.port,
    },
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => process.stdout.write(`[next] ${chunk.toString()}`));
  server.stderr.on("data", (chunk) => process.stderr.write(`[next:err] ${chunk.toString()}`));
  return { server, snapshot };
}

export async function stopNextDevServer(input) {
  input.log("shutting down dev server");
  signalNextDevProcess(input.server, "SIGTERM");
  const exited = await Promise.race([
    once(input.server, "exit").then(() => true),
    delay(3000).then(() => false),
  ]);
  if (!exited) {
    signalNextDevProcess(input.server, "SIGKILL");
    await Promise.race([
      once(input.server, "exit").then(() => true),
      delay(1000).then(() => false),
    ]);
  }
  await delay(200);
  input.snapshot.restore();
}

function signalNextDevProcess(server, signal) {
  if (!server.pid) return;
  try {
    process.kill(-server.pid, signal);
  } catch {
    server.kill(signal);
  }
}
