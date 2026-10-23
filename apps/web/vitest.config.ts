import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    maxWorkers: process.env.CI ? 4 : 1,
    maxConcurrency: process.env.CI ? 3 : 1,
    environment: "node",
    include: ["tests/**/*.spec.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Legacy self-executing scripts run as child processes (see
    // tests/legacy-units.spec.ts); each needs room for a tsx boot.
    testTimeout: 120_000,
  },
});
