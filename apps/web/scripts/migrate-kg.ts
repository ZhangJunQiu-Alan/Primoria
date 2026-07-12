import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const { runKnowledgeGraphMigrations } = await import("./knowledge-graph-migrations");
  await runKnowledgeGraphMigrations();
  console.log("Knowledge graph schema migrations complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
