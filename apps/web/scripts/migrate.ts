import { runMigrations } from "../src/lib/db/migrate";

runMigrations()
  .then(() => {
    console.log("Database migrations complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
