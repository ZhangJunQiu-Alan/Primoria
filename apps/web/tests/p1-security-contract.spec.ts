import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../", import.meta.url);

function source(path: string) {
  return readFileSync(new URL(path, root), "utf8");
}

describe("P1 web security contract", () => {
  it("does not classify course API failures by matching exception text", () => {
    const routes = [
      "src/app/api/courses/[id]/chat/route.ts",
      "src/app/api/courses/[id]/edit/route.ts",
      "src/app/api/courses/[id]/learning-progress/[jobId]/route.ts",
      "src/app/api/courses/[id]/lessons/[lessonId]/generate/route.ts",
      "src/app/api/courses/[id]/lessons/[lessonId]/prewarm-next/route.ts",
    ];

    for (const route of routes) {
      const text = source(route);
      expect(text).not.toMatch(/error instanceof Error \? error\.message/);
      expect(text).not.toMatch(/\/not found\/i/);
    }
  });

  it("keeps password derivation off the synchronous event-loop path", () => {
    const text = source("src/lib/auth/password.ts");
    expect(text).toContain("promisify(pbkdf2)");
    expect(text).not.toContain("pbkdf2Sync");
  });

  it("defines the browser security response-header baseline", () => {
    const text = source("next.config.ts");
    for (const header of [
      "Content-Security-Policy",
      "Referrer-Policy",
      "Permissions-Policy",
      "X-Content-Type-Options",
      "X-Frame-Options",
    ]) {
      expect(text).toContain(header);
    }
  });
});
