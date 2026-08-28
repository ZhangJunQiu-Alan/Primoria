import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

const command = process.argv.slice(2);
if (command.length === 0) {
  throw new Error("usage: tsx scripts/with-isolated-test-db.ts <command> [args...]");
}

const appDatabaseUrl = process.env.DATABASE_URL;
if (!appDatabaseUrl) throw new Error("DATABASE_URL is required to derive an isolated test database connection");

const appUrl = new URL(appDatabaseUrl);
const sourceName = appUrl.pathname.replace(/^\//, "") || "primoria";
const suffix = `${process.pid}_${Date.now().toString(36)}`;
const databaseName = `${sourceName.slice(0, 24)}_regression_test_${suffix}`;
const templateName = `${sourceName.slice(0, 30)}_regression_test_template`;
if (!/^[a-zA-Z0-9_]+$/.test(databaseName) || !/test/i.test(databaseName) || databaseName === sourceName) {
  throw new Error(`refusing to manage unsafe test database name "${databaseName}"`);
}
if (!/^[a-zA-Z0-9_]+$/.test(templateName) || !/test/i.test(templateName) || templateName === sourceName) {
  throw new Error(`refusing to manage unsafe template database name "${templateName}"`);
}

const adminUrl = new URL(appUrl);
adminUrl.pathname = "/postgres";
const testUrl = new URL(appUrl);
testUrl.pathname = `/${databaseName}`;
const templateUrl = new URL(appUrl);
templateUrl.pathname = `/${templateName}`;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const admin = postgres(adminUrl.toString(), { max: 1, prepare: false, onnotice: () => {} });

async function dropTestDatabase() {
  await admin`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = ${databaseName} and pid <> pg_backend_pid()
  `;
  await admin`drop database if exists ${admin(databaseName)}`;
}

async function listFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function templateFingerprint() {
  const inputs = [
    resolve(repoRoot, "apps/web/drizzle"),
    resolve(repoRoot, "apps/web/db/knowledge-graph/migrations"),
    resolve(repoRoot, "apps/agent/db/migrations"),
    resolve(repoRoot, "data/knowledge-graphs/source"),
    resolve(repoRoot, "data/knowledge-graphs/governance"),
    resolve(repoRoot, "apps/web/src/lib/db/schema.ts"),
    resolve(repoRoot, "apps/web/scripts/seed-kg.mjs"),
    resolve(repoRoot, "apps/web/scripts/seed-kg-cross.mjs"),
  ];
  const files: string[] = [];
  for (const input of inputs) {
    const inputStat = await stat(input);
    files.push(...(inputStat.isDirectory() ? await listFiles(input) : [input]));
  }
  const hash = createHash("sha256");
  for (const file of files.sort()) {
    hash.update(relative(repoRoot, file));
    hash.update(await readFile(file));
  }
  return hash.digest("hex");
}

async function runSetup(args: string[], databaseUrl: string) {
  const child = spawn("pnpm", args, {
    cwd: repoRoot,
    env: { ...process.env, DATABASE_URL: databaseUrl, TEST_DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
  const exitCode = await new Promise<number>((resolveExit, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolveExit(signal ? 1 : (code ?? 1)));
  });
  if (exitCode !== 0) throw new Error(`template setup failed: pnpm ${args.join(" ")}`);
}

async function cloneTemplateDatabase() {
  const fingerprint = await templateFingerprint();
  await admin`select pg_advisory_lock(hashtext(${`primoria-regression:${templateName}`}))`;
  try {
    await ensureTemplateDatabase(fingerprint);
    await admin`create database ${admin(databaseName)} template ${admin(templateName)}`;
    process.stdout.write(`[isolated-test-db] cloned ${databaseName} from ${templateName}\n`);
  } finally {
    await admin`select pg_advisory_unlock(hashtext(${`primoria-regression:${templateName}`}))`;
  }
}

async function ensureTemplateDatabase(fingerprint: string) {
  const [existing] = await admin`
    select datname
    from pg_database
    where datname = ${templateName}
  `;
  if (existing) {
    const template = postgres(templateUrl.toString(), { max: 1, prepare: false, onnotice: () => {} });
    try {
      const [metadata] = await template`
        select fingerprint from public.primoria_regression_template_metadata limit 1
      `.catch(() => []);
      if (metadata?.fingerprint === fingerprint) {
        process.stdout.write(`[isolated-test-db] reused template ${templateName}\n`);
        return;
      }
    } finally {
      await template.end({ timeout: 5 });
    }
  }

  await admin`
    select pg_terminate_backend(pid)
    from pg_stat_activity
    where datname = ${templateName} and pid <> pg_backend_pid()
  `;
  await admin`drop database if exists ${admin(templateName)}`;
  await admin`create database ${admin(templateName)}`;
  await runSetup(["db:bootstrap"], templateUrl.toString());
  await runSetup(["--filter", "@primoria/web", "db:seed:kg-all"], templateUrl.toString());
  const template = postgres(templateUrl.toString(), { max: 1, prepare: false, onnotice: () => {} });
  try {
    await template`
      create table public.primoria_regression_template_metadata (
        fingerprint text primary key,
        created_at timestamptz not null default now()
      )
    `;
    await template`insert into public.primoria_regression_template_metadata (fingerprint) values (${fingerprint})`;
  } finally {
    await template.end({ timeout: 5 });
  }
  process.stdout.write(`[isolated-test-db] built template ${templateName}\n`);
}

async function run() {
  await dropTestDatabase();
  await cloneTemplateDatabase();

  const child = spawn(command[0], command.slice(1), {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: appDatabaseUrl,
      TEST_DATABASE_URL: testUrl.toString(),
    },
    stdio: "inherit",
  });

  const exitCode = await new Promise<number>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) return resolve(1);
      resolve(code ?? 1);
    });
  });
  if (exitCode !== 0) process.exitCode = exitCode;
}

async function main() {
  try {
    await run();
  } finally {
    await dropTestDatabase();
    await admin.end({ timeout: 5 });
    process.stdout.write(`[isolated-test-db] removed ${databaseName}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
