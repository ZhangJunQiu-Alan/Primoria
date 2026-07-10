import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("lesson generation completion state", () => {
  it("clears errors left by a successful retry", () => {
    const source = readFileSync(
      resolve(import.meta.dirname, "../src/lib/courses/lesson-generation-jobs.ts"),
      "utf8",
    );
    const completedUpdate = source.slice(
      source.indexOf('status: "completed"'),
      source.indexOf("return { ok: true }", source.indexOf('status: "completed"')),
    );

    expect(completedUpdate).toContain("lastError: null");
    expect(completedUpdate).toContain("errorCategory: null");
  });
});
