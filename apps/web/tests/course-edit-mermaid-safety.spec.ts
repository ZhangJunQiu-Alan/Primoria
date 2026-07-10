import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { InvalidMermaidDefinitionError } from "../src/lib/courses/mermaid-validation";

const mockState = vi.hoisted(() => ({
  requireAuthUser: vi.fn(),
  addCourseBlock: vi.fn(),
  editCourseBlock: vi.fn(),
  moveCourseBlock: vi.fn(),
  removeCourseBlock: vi.fn(),
  transformCourseBlock: vi.fn(),
}));

vi.mock("@/lib/auth/guard", () => ({
  requireAuthUser: mockState.requireAuthUser,
}));

vi.mock("@/lib/agent-os/ai", () => ({
  addCourseBlock: mockState.addCourseBlock,
  editCourseBlock: mockState.editCourseBlock,
  moveCourseBlock: mockState.moveCourseBlock,
  removeCourseBlock: mockState.removeCourseBlock,
  transformCourseBlock: mockState.transformCourseBlock,
}));

describe("course edit Mermaid safety", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.requireAuthUser.mockResolvedValue({ denied: null, user: { id: "usr_1" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a safe 422 response when a rewrite produces invalid Mermaid", async () => {
    mockState.editCourseBlock.mockRejectedValue(
      new InvalidMermaidDefinitionError("Parse error containing internal parser details"),
    );
    const { POST } = await import("../src/app/api/courses/[id]/edit/route");

    const response = await POST(
      new Request("http://localhost/api/courses/crs_1/edit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "rewrite", blockId: "blk_1", comment: "Clarify this diagram" }),
      }),
      { params: Promise.resolve({ id: "crs_1" }) },
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "The Mermaid diagram has invalid syntax. Please revise and retry.",
      code: "invalid_mermaid",
    });
  });
});
