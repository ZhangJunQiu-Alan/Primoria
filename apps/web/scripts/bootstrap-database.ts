import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const { runKnowledgeGraphMigrations } = await import("./knowledge-graph-migrations");
  const { runMigrations } = await import("../src/lib/db/migrate");
  const { closeDb } = await import("../src/lib/db/client");

  try {
    // KG first lets fresh Drizzle migration 0026 install the cross-schema FK.
    // The KG migration also reconciles that FK for existing Drizzle-first DBs.
    await runKnowledgeGraphMigrations();
    await runMigrations();
  } finally {
    await closeDb();
  }

  console.log("Database bootstrap complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
