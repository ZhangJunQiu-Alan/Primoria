import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function run(mode: string, overrides: Record<string, string> = {}, config: boolean | "local" = true) {
  const directory = mkdtempSync(resolve(tmpdir(), "primoria-db-env-"));
  directories.push(directory);
  mkdirSync(resolve(directory, "scripts"));
  copyFileSync(resolve(process.cwd(), "../../scripts/with-database-env.mjs"), resolve(directory, "scripts/run.mjs"));
  if (config === "local") mkdirSync(resolve(directory, "apps/web"), { recursive: true });
  if (config) writeFileSync(resolve(directory, config === "local" ? "apps/web/.env.local" : ".env.supabase"), [
    "DATABASE_URL=postgresql://runtime:runtime-secret@example.invalid/postgres",
    "DATABASE_MIGRATION_URL=postgresql://migrator:migration-secret@example.invalid/postgres",
    "DATABASE_SSL=verify-full",
    "DATABASE_POOL_MAX=3",
  ].join("\n"));
  const env = { ...process.env };
  for (const key of ["DATABASE_URL", "DATABASE_MIGRATION_URL", "DATABASE_SSL", "DATABASE_POOL_MAX", "PRIMORIA_DISABLE_LOCAL_ENV"]) delete env[key];
  const result = spawnSync(process.execPath, [resolve(directory, "scripts/run.mjs"), mode, process.execPath, "-e",
    "console.log(JSON.stringify({url:process.env.DATABASE_URL,migration:process.env.DATABASE_MIGRATION_URL,ssl:process.env.DATABASE_SSL,pool:process.env.DATABASE_POOL_MAX}))",
  ], { env: { ...env, ...overrides }, encoding: "utf8" });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("database command environment", () => {
  it("passes only the runtime credential to application processes", () => {
    const env = run("runtime");
    expect(env.url).toContain("runtime:runtime-secret");
    expect(env.migration).toBeUndefined();
    expect(env.ssl).toBe("verify-full");
    expect(env.pool).toBe("3");
  });

  it("uses the migration credential only for schema commands", () => {
    expect(run("migration").url).toContain("migrator:migration-secret");
  });

  it("selects an explicit migration URL and strips it from runtime children", () => {
    const settings = { DATABASE_URL: "postgresql://runtime/db", DATABASE_MIGRATION_URL: "postgresql://migrator/db" };
    expect(run("migration", settings)).toEqual({ url: settings.DATABASE_MIGRATION_URL });
    expect(run("runtime", settings)).toEqual({ url: settings.DATABASE_URL });
  });

  it("preserves explicit isolated test connections and SSL settings", () => {
    expect(run("migration", { DATABASE_URL: "postgresql://localhost/isolated_test", DATABASE_SSL: "disable" }))
      .toEqual({ url: "postgresql://localhost/isolated_test", ssl: "disable" });
  });

  it("supports local checkouts without a Supabase connection file", () => {
    expect(run("runtime", {}, false)).toEqual({});
  });

  it("uses the local development database for both processes and migrations without cloud config", () => {
    expect(run("runtime", {}, "local").url).toContain("runtime:runtime-secret");
    expect(run("migration", {}, "local").url).toContain("runtime:runtime-secret");
  });

  it("does not load Supabase credentials when local environment loading is disabled", () => {
    expect(run("runtime", { PRIMORIA_DISABLE_LOCAL_ENV: "1" })).toEqual({});
  });
});
