import { loadLocalEnv } from "./load-local-env";

loadLocalEnv();

async function main() {
  const { runMigrations } = await import("../src/lib/db/migrate");
  await runMigrations();
}

main()
  .then(() => {
    console.log("Database migrations complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
