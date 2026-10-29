import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(process.cwd(), "../..");
const readRepoFile = (path: string) => readFileSync(resolve(repoRoot, path), "utf8");

describe("database bootstrap and production Docker contract", () => {
  it("has one deployment bootstrap and no executable Supabase baseline", () => {
    const rootPackage = JSON.parse(readRepoFile("package.json")) as { scripts: Record<string, string> };
    const webPackage = JSON.parse(readRepoFile("apps/web/package.json")) as { scripts: Record<string, string> };

    expect(rootPackage.scripts["db:bootstrap"]).toContain("with-database-env.mjs migration");
    expect(rootPackage.scripts["db:bootstrap:schemas"]).toContain("@primoria/web db:bootstrap");
    expect(webPackage.scripts["db:bootstrap"]).toBe("tsx scripts/bootstrap-database.ts");
    expect(webPackage.scripts["db:migrate:auth"]).toBeUndefined();
    expect(webPackage.scripts["db:migrate:courses"]).toBeUndefined();
    expect(existsSync(resolve(repoRoot, "supabase/migrations"))).toBe(false);
  });

  it("includes KG migrations in the image and runs bootstrap before services", () => {
    const dockerIgnore = readRepoFile(".dockerignore");
    const compose = readRepoFile("docker-compose.prod.yml");
    const bootstrap = readRepoFile("apps/web/scripts/bootstrap-database.ts");
    const dockerfile = readRepoFile("docker/app.Dockerfile");

    expect(dockerIgnore).not.toMatch(/^supabase$/m);
    expect(dockerIgnore).not.toContain("apps/web/db");
    expect(dockerfile.match(/FROM node:22-bookworm-slim/g)).toHaveLength(2);
    expect(compose).toContain('command: ["pnpm", "--filter", "@primoria/web", "db:bootstrap"]');
    expect(compose).toContain("docker-entrypoint-initdb.d/10-runtime-role.sh");
    expect(bootstrap.indexOf("runKnowledgeGraphMigrations()"))
      .toBeLessThan(bootstrap.indexOf("runMigrations()"));
  });

  it("keeps external embedding calls outside bootstrap and initializes every graph", () => {
    const webPackage = JSON.parse(readRepoFile("apps/web/package.json")) as { scripts: Record<string, string> };
    const bootstrap = readRepoFile("apps/web/scripts/bootstrap-database.ts");

    expect(bootstrap).not.toContain("seed-kg");
    expect(webPackage.scripts["db:initialize:kg"]).toContain("db:seed:kg-all");
    expect(webPackage.scripts["db:initialize:kg"]).toContain("db:seed:kg-embeddings all");
  });

  it("uses independent production providers and a valid backup repo root", () => {
    const productionEnv = readRepoFile(".env.production.example");
    const backup = readRepoFile("scripts/pg-backup.sh");

    expect(productionEnv).toContain("OPENAI_MODEL=deepseek-v4-pro");
    expect(productionEnv).toContain("AI_MODEL_TUTOR=deepseek-flash");
    expect(productionEnv).toContain("AI_MODEL_FAST=deepseek-flash");
    expect(productionEnv).toContain("KG_EMBEDDING_PROVIDER=minimax");
    expect(productionEnv).not.toMatch(/^KG_EMBEDDING_PROVIDER=openai-compatible$/m);
    expect(backup).toContain('REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"');
    expect(backup).toContain("--format=custom");
    expect(backup).toContain("sha256sum");
    expect(backup).toContain("--sse");
    expect(backup).toContain("amazon/aws-cli:2.27.49");
  });

  it("gates production services on real health checks", () => {
    const compose = readRepoFile("docker-compose.prod.yml");
    expect(compose).toContain("/api/health/ready");
    expect(compose).toContain("http://127.0.0.1:2019/config/");
    expect(compose.match(/condition: service_healthy/g)?.length).toBeGreaterThanOrEqual(3);
    const webService = compose.slice(compose.indexOf("  web:"), compose.indexOf("  agent-migrate:"));
    const agentService = compose.slice(compose.indexOf("  agent:\n"), compose.indexOf("  worker-lesson-generation:"));
    expect(webService).not.toContain("ports:");
    expect(webService).toContain("/app/apps/web/.next/cache:size=128m,uid=1000,gid=1000,mode=0700");
    expect(agentService).not.toContain("ports:");
    for (const name of ["docker-compose.prod.yml", "docker-compose.supabase.yml"]) {
      const topology = readRepoFile(name);
      const web = topology.slice(topology.indexOf("  web:"), topology.indexOf("  agent-migrate:"));
      expect(web).toContain("/app/apps/web/.next/cache:size=128m,uid=1000,gid=1000,mode=0700");
      const caddy = topology.slice(topology.indexOf("  caddy:"));
      expect(caddy).toContain("http://127.0.0.1:2019/config/");
      expect(caddy).not.toContain('"2019:2019"');
      const agent = topology.slice(topology.indexOf("  agent:\n"), topology.indexOf("  worker-lesson-generation:"));
      expect(agent).toContain("AI_MODEL_TUTOR: ${AI_MODEL_TUTOR:-}");
      const extractor = topology.slice(topology.indexOf("  worker-extractor:"), topology.indexOf("  caddy:"));
      expect(extractor).toContain("AI_MODEL_FAST: ${AI_MODEL_FAST:-}");
      expect(extractor).toContain("AI_MODEL_CONTENT: ${AI_MODEL_CONTENT:-}");
    }
  });

  it("preserves trusted proxy identity and reset-email configuration in both deployments", () => {
    for (const name of ["docker-compose.prod.yml", "docker-compose.supabase.yml"]) {
      const compose = readRepoFile(name);
      const web = compose.slice(compose.indexOf("  web:"), compose.indexOf("  agent-migrate:"));
      expect(web).toContain("AUTH_RATE_LIMIT_CLIENT_IP_HEADER: ${AUTH_RATE_LIMIT_CLIENT_IP_HEADER:-x-forwarded-for}");
      for (const variable of [
        "TENCENT_SES_REGION", "TENCENT_SES_ENDPOINT", "TENCENT_SES_FROM_EMAIL",
        "TENCENT_SES_PASSWORD_RESET_TEMPLATE_ID", "TENCENT_SES_PASSWORD_RESET_SUBJECT",
      ]) {
        expect(web).toContain(`${variable}: \${${variable}:-`);
      }
    }
    expect(readRepoFile(".dockerignore")).toMatch(/^\.private$/m);
  });
});
