import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [mode, command, ...args] = process.argv.slice(2);
if (!["runtime", "migration"].includes(mode) || !command) {
  throw new Error("usage: node scripts/with-database-env.mjs <runtime|migration> <command> [args...]");
}

const env = { ...process.env };
if (mode === "migration" && env.DATABASE_MIGRATION_URL) {
  env.DATABASE_URL = env.DATABASE_MIGRATION_URL;
}
delete env.DATABASE_MIGRATION_URL;
const cloudConfig = resolve(root, ".env.supabase");
const useCloud = existsSync(cloudConfig);
const config = useCloud ? cloudConfig : resolve(root, "apps/web/.env.local");
// Explicit connections (including isolated regression databases) take priority.
if (!env.DATABASE_URL && env.PRIMORIA_DISABLE_LOCAL_ENV !== "1" && existsSync(config)) {
  const settings = {};
  for (const line of readFileSync(config, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match) settings[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  const url = settings[mode === "migration" && useCloud ? "DATABASE_MIGRATION_URL" : "DATABASE_URL"];
  if (!url) throw new Error(`Missing ${mode} database connection in local configuration`);
  env.DATABASE_URL = url;
  for (const key of ["DATABASE_SSL", "DATABASE_POOL_MAX"]) {
    if (settings[key]) env[key] = settings[key];
  }
  if (settings.NODE_EXTRA_CA_CERTS) {
    env.NODE_EXTRA_CA_CERTS = resolve(root, settings.NODE_EXTRA_CA_CERTS);
  }
}

const child = spawn(command, args, { cwd: root, env, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.once("error", () => {
  console.error("Unable to start database command.");
  process.exitCode = 1;
});
child.once("exit", (code, signal) => {
  process.exitCode = signal ? 1 : (code ?? 1);
});
