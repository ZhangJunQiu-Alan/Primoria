import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("auth API database operations", () => {
  it("does not wrap side-effecting auth work in Promise.race timeouts", () => {
    const files = [
      "src/app/api/auth/sign-in/route.ts",
      "src/app/api/auth/sign-up/route.ts",
      "src/app/api/auth/password-reset/request/route.ts",
      "src/app/api/auth/password-reset/confirm/route.ts",
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).not.toContain("withAuthTimeout");
      expect(source).not.toContain("Promise.race");
    }
  });
});
