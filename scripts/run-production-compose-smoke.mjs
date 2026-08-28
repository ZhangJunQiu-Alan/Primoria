#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const root = resolve(import.meta.dirname, "..");
const project = `primoria_regression_${process.pid}`;
const httpPort = process.env.PRIMORIA_SMOKE_HTTP_PORT || "18080";
const composeArgs = [
  "compose",
  "--project-name", project,
  "-f", "docker-compose.prod.yml",
  "-f", "docker-compose.regression.yml",
];
const env = {
  ...process.env,
  POSTGRES_MIGRATOR_PASSWORD: "ci_migrator_password",
  POSTGRES_RUNTIME_PASSWORD: "ci_runtime_password",
  PRIMORIA_AGENT_INTERNAL_SECRET: "ci_agent_internal_secret_32_chars",
  APP_BASE_URL: `http://127.0.0.1:${httpPort}`,
  NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${httpPort}`,
  PRIMORIA_DOMAIN: ":80",
  AI_PROVIDER: "openai-compatible",
  OPENAI_BASE_URL: "http://127.0.0.1:9/v1",
  OPENAI_API_KEY: "ci_fake_key",
  OPENAI_MODEL: "ci_fake_model",
  KG_EMBEDDING_PROVIDER: "openai-compatible",
  KG_EMBEDDING_MODEL_VERSION: "ci:compose-smoke:1536",
};

function run(args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn("docker", args, {
      cwd: root,
      env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let output = "";
    if (options.capture) {
      child.stdout.on("data", (chunk) => { output += chunk; });
      child.stderr.on("data", (chunk) => { output += chunk; });
    }
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      const exitCode = signal ? 1 : (code ?? 1);
      if (exitCode !== 0 && !options.allowFailure) reject(new Error(`docker ${args.join(" ")} failed${output ? `\n${output}` : ""}`));
      else resolveRun({ exitCode, output });
    });
  });
}

async function waitForCaddy() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${httpPort}/api/health/ready`, { signal: AbortSignal.timeout(3_000) });
      if (response.ok) return response;
    } catch {
      // retry while Compose health checks converge
    }
    await delay(1_000);
  }
  throw new Error("Caddy readiness endpoint did not become healthy");
}

let failure;
try {
  await run(["info", "--format", "{{.ServerVersion}}"], { capture: true });
  await run([...composeArgs, "config", "--quiet"]);
  await run([...composeArgs, "up", "--build", "--wait", "--wait-timeout", "300"]);
  const response = await waitForCaddy();
  const health = await response.json();
  if (health.status !== "ok" || health.database !== "ok" || health.kg?.embeddings !== "ok" || health.agent?.status !== "ok") {
    throw new Error(`unexpected readiness body: ${JSON.stringify(health)}`);
  }
  const welcome = await fetch(`http://127.0.0.1:${httpPort}/welcome`, { redirect: "manual" });
  if (welcome.status !== 200) throw new Error(`Caddy /welcome returned ${welcome.status}`);
  if (welcome.headers.has("server")) throw new Error("Caddy should remove the Server response header");
  process.stdout.write("[production-compose.smoke] ALL CHECKS PASSED\n");
} catch (error) {
  failure = error;
  await mkdir(resolve(root, "test-results"), { recursive: true });
  const logs = await run([...composeArgs, "logs", "--no-color"], { capture: true, allowFailure: true });
  await writeFile(resolve(root, "test-results/production-compose.log"), logs.output);
} finally {
  await run([...composeArgs, "down", "--volumes", "--remove-orphans"], { allowFailure: true }).catch(() => {});
}

if (failure) throw failure;
