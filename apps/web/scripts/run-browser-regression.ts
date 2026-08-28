import { spawn } from "node:child_process";
import { resolve } from "node:path";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";
if (!databaseUrl || !/test/i.test(databaseName)) {
  throw new Error("TEST_DATABASE_URL must name an isolated test database");
}

const root = resolve(process.cwd(), "../..");
const env = {
  ...process.env,
  DATABASE_URL: databaseUrl,
  CI_LEARNING_SMOKE: "1",
  CI_ONBOARDING_SMOKE: "1",
  CI_TUTOR_RUNTIME_SMOKE: "1",
  CI_SHARE_SMOKE: "1",
  PRIMORIA_DISABLE_OUTLINE_ENRICHMENT: "1",
};

async function run(args: string[], extraEnv: Partial<NodeJS.ProcessEnv> = {}) {
  const child = spawn("pnpm", args, { cwd: root, env: { ...env, ...extraEnv }, stdio: "inherit" });
  const exitCode = await new Promise<number>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
  });
  if (exitCode !== 0) throw new Error(`pnpm ${args.join(" ")} failed with exit code ${exitCode}`);
}

async function main() {
  try {
    await run(["--filter", "@primoria/web", "exec", "tsx", "scripts/seed-ci-learning-smoke.ts"]);
    await run(["--filter", "@primoria/web", "exec", "tsx", "scripts/seed-ci-onboarding.ts"]);
    await run(["--filter", "@primoria/web", "exec", "tsx", "scripts/seed-ci-tutor-runtime.ts"]);
    await run(["--filter", "@primoria/web", "exec", "tsx", "scripts/seed-ci-course-share.ts"]);
    await run(["test:learning-path:e2e"]);
    await run(["test:onboarding:e2e"]);
    await run(["test:tutor-runtime:e2e"]);
    await run(["test:course-share:e2e"]);
    await run(["test:widget:e2e"]);
  } finally {
    await run(["--filter", "@primoria/web", "exec", "next", "typegen"]);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
