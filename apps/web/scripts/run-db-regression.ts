import { spawn } from "node:child_process";
import { resolve } from "node:path";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testDatabaseName = testDatabaseUrl ? new URL(testDatabaseUrl).pathname.replace(/^\//, "") : "";
if (!testDatabaseUrl || !/test/i.test(testDatabaseName) || testDatabaseUrl === process.env.DATABASE_URL) {
  throw new Error("TEST_DATABASE_URL must be an isolated database distinct from DATABASE_URL");
}

const root = resolve(process.cwd(), "../..");

async function run(args: string[], env: NodeJS.ProcessEnv = process.env) {
  const child = spawn("pnpm", args, { cwd: root, env, stdio: "inherit" });
  const exitCode = await new Promise<number>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
  });
  if (exitCode !== 0) throw new Error(`pnpm ${args.join(" ")} failed with exit code ${exitCode}`);
}

async function main() {
  await run(["test:db"]);
  await run(["--filter", "@primoria/agent", "test:runtime:db"]);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
