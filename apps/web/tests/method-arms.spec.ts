import { describe, expect, it } from "vitest";

import { assignMethodArms } from "@/lib/ai/course-generation/method-arms";
import { WRITER_INSTRUCTION_MAX, type DecodedBlockPlan } from "@/lib/ai/course-generation/lesson-plan-ir";
import type { PedagogicalRole } from "@/lib/courses/types";

const WI = "Explain the mechanism and close with a check for understanding.";

function block(
  order: number,
  type: DecodedBlockPlan["type"],
  role: PedagogicalRole,
  conceptIds: string[] = ["c1"],
  writerInstruction = WI,
): DecodedBlockPlan {
  return { order, type, role, conceptIds, goal: `goal ${order}`, writerInstruction };
}

/** Two concepts, each with its own explanation/example pair, so a single swap can
 * never be the last coverage provider unless a test sets it up that way. */
function plan(): DecodedBlockPlan[] {
  return [
    block(1, "text", "hook"),
    block(2, "text", "explanation", ["c1"]),
    block(3, "analogy", "example", ["c1"]),
    block(4, "visual", "deepening", ["c1"]),
    block(5, "text", "explanation", ["c2"]),
    block(6, "text", "example", ["c2"]),
    block(7, "image", "deepening", ["c2"]),
    block(8, "text", "transfer", ["c1", "c2"]),
    block(9, "text", "summary", ["c1", "c2"]),
  ];
}

const on = (seed: string) => ({ enabled: true, seed });

describe("assignMethodArms", () => {
  it("returns the plan untouched and records nothing when disabled", () => {
    const blocks = plan();
    const result = assignMethodArms(blocks, { enabled: false, seed: "lesson-1" });
    expect(result.blocks).toBe(blocks);
    expect(result.assignments).toEqual([]);
  });

  it("is deterministic across repeated compiles of the same lesson", () => {
    // The processor recompiles from the stored raw IR on retry and checkpoint
    // recovery. A fresh draw there would split one learner across both arms.
    const first = assignMethodArms(plan(), on("lesson-42"));
    const second = assignMethodArms(plan(), on("lesson-42"));
    expect(second.blocks.map((b) => b.type)).toEqual(first.blocks.map((b) => b.type));
    expect(second.assignments).toEqual(first.assignments);
  });

  it("gives different lessons independent draws", () => {
    const seeds = ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"];
    const shapes = new Set(seeds.map((s) => assignMethodArms(plan(), on(s)).blocks.map((b) => b.type).join(",")));
    expect(shapes.size).toBeGreaterThan(1);
  });

  it("records the control arm, not just the swapped one", () => {
    // Without control rows the analysis cannot separate "assigned control" from
    // "never eligible", which is exactly what makes the comparison causal.
    const seeds = Array.from({ length: 40 }, (_, i) => `lesson-${i}`);
    const all = seeds.flatMap((s) => assignMethodArms(plan(), on(s)).assignments);
    expect(all.some((a) => a.planned === a.delivered)).toBe(true);
    expect(all.some((a) => a.planned !== a.delivered)).toBe(true);
  });

  it("draws each arm roughly evenly", () => {
    const seeds = Array.from({ length: 400 }, (_, i) => `lesson-${i}`);
    const all = seeds.flatMap((s) => assignMethodArms(plan(), on(s)).assignments);
    const swapped = all.filter((a) => a.planned !== a.delivered).length;
    const share = swapped / all.length;
    expect(share).toBeGreaterThan(0.4);
    expect(share).toBeLessThan(0.6);
  });

  it("never changes block count, order, roles, or concepts", () => {
    for (let i = 0; i < 60; i += 1) {
      const before = plan();
      const after = assignMethodArms(before, on(`lesson-${i}`)).blocks;
      expect(after).toHaveLength(before.length);
      expect(after.map((b) => b.order)).toEqual(before.map((b) => b.order));
      expect(after.map((b) => b.role)).toEqual(before.map((b) => b.role));
      expect(after.map((b) => b.conceptIds)).toEqual(before.map((b) => b.conceptIds));
    }
  });

  it("holds media density constant, because the compiler bounds it at 30-45%", () => {
    const isMedia = (b: DecodedBlockPlan) => b.type === "image" || b.type === "visual";
    for (let i = 0; i < 60; i += 1) {
      const before = plan();
      const after = assignMethodArms(before, on(`lesson-${i}`)).blocks;
      expect(after.filter(isMedia)).toHaveLength(before.filter(isMedia).length);
    }
  });

  it("leaves structural roles alone", () => {
    // hook, roadmap, transfer, and summary carry duties the compiler checks by
    // role; only genuinely interchangeable teaching slots may be randomized.
    for (let i = 0; i < 40; i += 1) {
      const assignments = assignMethodArms(plan(), on(`lesson-${i}`)).assignments;
      for (const a of assignments) {
        expect(["explanation", "example", "deepening", "misconception"]).toContain(a.role);
      }
    }
  });

  it("refuses to turn the last non-image example for a concept into an image", () => {
    // `validateConceptCoverage` ignores image blocks, so this swap would leave the
    // concept without an example and break the plan.
    const sole: DecodedBlockPlan[] = [
      block(1, "text", "explanation", ["c1"]),
      block(2, "visual", "example", ["c1"]),
    ];
    for (let i = 0; i < 80; i += 1) {
      const after = assignMethodArms(sole, on(`lesson-${i}`)).blocks;
      expect(after[1].type).toBe("visual");
    }
  });

  it("skips a swap that would overflow the writer instruction bound", () => {
    const long = "x".repeat(WRITER_INSTRUCTION_MAX - 4);
    const blocks = [block(1, "text", "explanation", ["c1"], long)];
    for (let i = 0; i < 40; i += 1) {
      const after = assignMethodArms(blocks, on(`lesson-${i}`)).blocks;
      expect(after[0].writerInstruction.length).toBeLessThanOrEqual(WRITER_INSTRUCTION_MAX);
    }
  });

  it("tells the writer which form to produce when it swaps one in", () => {
    const seeds = Array.from({ length: 60 }, (_, i) => `lesson-${i}`);
    for (const seed of seeds) {
      const { blocks, assignments } = assignMethodArms(plan(), on(seed));
      for (const a of assignments.filter((x) => x.planned !== x.delivered)) {
        const swapped = blocks.find((b) => b.order === a.blockOrder)!;
        expect(swapped.type).toBe(a.delivered);
        // A swapped block carries a brief written for the form the planner chose,
        // so the assigned form has to be stated explicitly.
        expect(swapped.writerInstruction.length).toBeGreaterThan(WI.length);
      }
    }
  });

  it("never randomizes a slot with no concept binding", () => {
    // Media blocks must stay concept-bound, and a formless slot is not a real
    // teaching choice.
    const blocks = [block(1, "text", "explanation", [])];
    for (let i = 0; i < 40; i += 1) {
      expect(assignMethodArms(blocks, on(`lesson-${i}`)).assignments).toEqual([]);
    }
  });
});
