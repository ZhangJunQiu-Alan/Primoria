import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next.js generated type hygiene", () => {
  it("keeps next-env generated and untracked without weakening typecheck", () => {
    const root = join(process.cwd(), "../..");
    const gitignore = readFileSync(join(root, ".gitignore"), "utf8");
    const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };

    expect(gitignore.split(/\r?\n/)).toContain("apps/web/next-env.d.ts");
    expect(packageJson.scripts?.typecheck).toMatch(/^next typegen && tsc --noEmit$/);
  });
});
