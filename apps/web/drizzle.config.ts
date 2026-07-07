import { defineConfig } from "drizzle-kit";
import { getDatabaseSsl } from "./src/lib/db/ssl";

const ssl = getDatabaseSsl();

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/primoria",
    ...(ssl !== undefined ? { ssl } : {}),
  },
});
