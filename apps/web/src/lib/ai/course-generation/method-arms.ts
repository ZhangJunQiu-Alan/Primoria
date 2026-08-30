import type { PedagogicalRole } from "@/lib/courses/types";

import { WRITER_INSTRUCTION_MAX, type DecodedBlockPlan, type GeneratableBlockType } from "./lesson-plan-ir";

// Randomized teaching-method assignment. The planner picks a delivery form from
// the concept it is teaching, so observational data confounds form with concept
// difficulty: hard concepts attract analogies, then analogies look harmful. This
// module breaks that link by randomizing the form within a slot the planner has
// already judged eligible, which is the only way the later method-vs-outcome
// join can support a causal reading.
//
// Assignment SWAPS a form in place, never adds or drops a block. The compiler
// bounds block count (expectedBlockRange), media density (30-45%), and per-concept
// explanation/example coverage; dropping blocks would violate all three. Swapping
// within a media class holds every one of those invariants by construction.

/** A randomized delivery-form choice. Each factor is one slot the planner left
 * genuinely open, with two forms that are interchangeable at the structural level. */
export type MethodFactor = "explanation_form" | "media_form";

/** Prose vs. analogy for a non-media teaching slot; both are non-media and both
 * satisfy concept coverage, so this swap cannot disturb the plan's structure. */
const EXPLANATION_FORMS = ["text", "analogy"] as const;

/** Static anchor vs. manipulable visual for a media slot. Both count as media, so
 * density holds; `image` additionally never satisfies coverage, guarded below. */
const MEDIA_FORMS = ["image", "visual"] as const;

/** Roles where an analogy is a defensible alternative to prose. Hook, roadmap,
 * summary, and transfer carry structural duties, so their form stays fixed. */
const EXPLANATION_ROLES = new Set<PedagogicalRole>(["explanation", "example", "deepening", "misconception"]);

/** `validateImageRules` allows image blocks only in these roles. */
const MEDIA_ROLES = new Set<PedagogicalRole>(["example", "deepening"]);

/** Appended to the writer brief so the generated content actually takes the
 * assigned form. The planner wrote its brief for the form it chose; without this
 * a swapped block would be produced against a mismatched instruction. */
const FORM_DIRECTIVE: Record<(typeof EXPLANATION_FORMS)[number] | (typeof MEDIA_FORMS)[number], string> = {
  text: " Deliver this as direct prose explanation; do not build an extended comparison.",
  analogy: " Deliver this as one concrete analogy, then map each part of it back to the concept.",
  image: " Deliver this as one static labelled figure that anchors the idea; no interaction.",
  visual: " Deliver this as an interactive visual the learner manipulates to test a prediction.",
};

export type MethodArmAssignment = {
  factor: MethodFactor;
  blockOrder: number;
  role: PedagogicalRole;
  conceptIds: string[];
  /** The form the planner chose — the control arm. */
  planned: GeneratableBlockType;
  /** The form this learner receives. Equal to `planned` on the control arm; the
   * control assignment is still recorded, otherwise the analysis cannot separate
   * "assigned control" from "never eligible". */
  delivered: GeneratableBlockType;
};

export type MethodArmOptions = {
  /** Off unless the caller opts in. Disabled returns the plan untouched with no
   * assignments, so the planner's own choices flow through unchanged. */
  enabled: boolean;
  /** Stable per-lesson seed. Lesson generation recompiles from a stored raw IR on
   * retry and checkpoint recovery, so a nondeterministic draw would flip a
   * learner's arm mid-generation and corrupt the experiment. */
  seed: string;
};

/** FNV-1a. Deterministic and dependency-free; the draw only needs to be balanced
 * and stable across processes, not cryptographic. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function drawsAlternative(seed: string, factor: MethodFactor, blockOrder: number): boolean {
  return hash32(`${seed}|${factor}|${blockOrder}`) % 2 === 1;
}

/** True when the block is the only thing standing between a concept and a
 * coverage failure. `validateConceptCoverage` ignores image blocks, so turning
 * the last non-image explanation/example for a concept into an image would break
 * the plan. Deepening carries no coverage duty. */
function isSoleCoverageProvider(block: DecodedBlockPlan, blocks: DecodedBlockPlan[]): boolean {
  if (block.role !== "explanation" && block.role !== "example") return false;
  return block.conceptIds.some(
    (conceptId) =>
      !blocks.some(
        (other) =>
          other.order !== block.order &&
          other.type !== "image" &&
          other.role === block.role &&
          other.conceptIds.includes(conceptId),
      ),
  );
}

function factorFor(block: DecodedBlockPlan): MethodFactor | null {
  if ((EXPLANATION_FORMS as readonly string[]).includes(block.type) && EXPLANATION_ROLES.has(block.role)) {
    return "explanation_form";
  }
  if ((MEDIA_FORMS as readonly string[]).includes(block.type) && MEDIA_ROLES.has(block.role)) {
    return "media_form";
  }
  return null;
}

function alternativeForm(factor: MethodFactor, current: GeneratableBlockType): GeneratableBlockType {
  const forms = factor === "explanation_form" ? EXPLANATION_FORMS : MEDIA_FORMS;
  return forms[0] === current ? forms[1] : forms[0];
}

/**
 * Assign a delivery form to every eligible slot and return the rewritten plan.
 *
 * Eligible slots are recorded even when the draw keeps the planner's choice, so
 * the control arm is observable. Ineligible slots are left out entirely — they
 * were never randomized and must not enter the analysis as controls.
 *
 * The caller is expected to re-run the plan validators on the returned blocks and
 * fall back to the originals if anything fails; the guards here are the first
 * line of defence, not the only one.
 */
export function assignMethodArms(
  blocks: DecodedBlockPlan[],
  options: MethodArmOptions,
): { blocks: DecodedBlockPlan[]; assignments: MethodArmAssignment[] } {
  if (!options.enabled) return { blocks, assignments: [] };

  const assignments: MethodArmAssignment[] = [];
  const next = blocks.map((block) => {
    const factor = factorFor(block);
    if (!factor) return block;
    // Media blocks must stay concept-bound (validateMediaRules); a formless slot
    // is not a real teaching choice, so leave it to the planner.
    if (block.conceptIds.length === 0) return block;

    const alternative = alternativeForm(factor, block.type);
    const takeAlternative = drawsAlternative(options.seed, factor, block.order);
    const delivered = takeAlternative ? alternative : block.type;

    if (delivered === block.type) {
      assignments.push({
        factor,
        blockOrder: block.order,
        role: block.role,
        conceptIds: block.conceptIds,
        planned: block.type,
        delivered,
      });
      return block;
    }

    // An image never satisfies concept coverage — refuse the swap when this block
    // is the last non-image explanation/example for one of its concepts.
    if (delivered === "image" && isSoleCoverageProvider(block, blocks)) return block;

    const directive = FORM_DIRECTIVE[delivered as keyof typeof FORM_DIRECTIVE];
    const instruction = `${block.writerInstruction.trim()}${directive}`;
    // The IR bounds the brief; a swap that would overflow it is not worth taking.
    if (instruction.length > WRITER_INSTRUCTION_MAX) return block;

    assignments.push({
      factor,
      blockOrder: block.order,
      role: block.role,
      conceptIds: block.conceptIds,
      planned: block.type,
      delivered,
    });
    return { ...block, type: delivered, writerInstruction: instruction };
  });

  return { blocks: next, assignments };
}
