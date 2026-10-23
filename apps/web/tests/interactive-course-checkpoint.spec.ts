import { describe, expect, it } from "vitest";
import { CURRENT_CHECKPOINT_VERSIONS, isCheckpointCompatible } from "../src/lib/ai/course-generation/versions";

describe("visualization checkpoint compatibility", () => {
  it("invalidates pre-catalog plans and batches when a worker resumes", () => {
    expect(isCheckpointCompatible({ irVersion: 2, promptVersion: "2026-07-17-markdown-math-delimiters", compilerVersion: "3" })).toBe(false);
    expect(isCheckpointCompatible(CURRENT_CHECKPOINT_VERSIONS)).toBe(true);
  });
  it("does not reuse a plan retrieved against a different catalog", () => {
    expect(isCheckpointCompatible({ ...CURRENT_CHECKPOINT_VERSIONS, promptVersion: CURRENT_CHECKPOINT_VERSIONS.promptVersion.replace(/:[a-f0-9]+$/, `:${"0".repeat(64)}`) })).toBe(false);
  });
});
