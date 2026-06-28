import { z } from "zod";
import type { PedagogicalRole } from "@/lib/courses/types";
import { IrParseError } from "./generation-errors";

// Compact tuple IR the Lesson Planner emits (doc §8.1). Short type codes and
// positional tuples keep planner output token-cheap; the deterministic compiler
// expands this into block jobs. Only syntax decoding lives here — no teaching
// coverage judgement (that is the compiler's job).

export const IR_VERSION = 1;

/** Block types allowed for new generation (doc §4.1). `I=image` is a static
 * cognitive-anchor block (distinct from `V=visual`, the interactive engine). */
export const TYPE_CODE_TO_BLOCK = {
  T: "text",
  A: "analogy",
  X: "transfer",
  V: "visual",
  I: "image",
  C: "code",
  Q: "quiz",
} as const;

export type TypeCode = keyof typeof TYPE_CODE_TO_BLOCK;
export type GeneratableBlockType = (typeof TYPE_CODE_TO_BLOCK)[TypeCode];

export const PEDAGOGICAL_ROLES = [
  "hook",
  "roadmap",
  "explanation",
  "example",
  "deepening",
  "misconception",
  "transfer",
  "assessment",
  "summary",
] as const satisfies readonly PedagogicalRole[];

const ROLE_SET = new Set<string>(PEDAGOGICAL_ROLES);

// [order, typeCode, role, conceptIds, goal]
const BlockTupleSchema = z.tuple([
  z.number().int(),
  z.string(),
  z.string(),
  z.array(z.string()),
  z.string(),
]);

export const LessonPlanIrSchema = z.object({
  v: z.number().int(),
  // [title, estimatedMinutes]
  lesson: z.tuple([z.string(), z.number()]),
  blocks: z.array(BlockTupleSchema).min(1),
});

export type DecodedBlockPlan = {
  order: number;
  type: GeneratableBlockType;
  role: PedagogicalRole;
  conceptIds: string[];
  goal: string;
};

export type DecodedLessonPlan = {
  irVersion: number;
  title: string;
  estimatedMinutes: number;
  blocks: DecodedBlockPlan[];
};

function decodeBlockTuple(tuple: z.infer<typeof BlockTupleSchema>, index: number): DecodedBlockPlan {
  const [order, rawCode, rawRole, conceptIds, goal] = tuple;
  const code = rawCode as TypeCode;
  if (!(code in TYPE_CODE_TO_BLOCK)) {
    throw new IrParseError(`block ${index}: unknown type code "${rawCode}"`);
  }
  if (!ROLE_SET.has(rawRole)) {
    throw new IrParseError(`block ${index}: unknown pedagogical role "${rawRole}"`);
  }
  return {
    order,
    type: TYPE_CODE_TO_BLOCK[code],
    role: rawRole as PedagogicalRole,
    conceptIds,
    goal,
  };
}

/** Parse + structurally decode the planner's raw IR. Throws IrParseError on bad
 * shape, unsupported version, unknown type code, or unknown role. Does NOT judge
 * teaching coverage, quantity, ordering, or concept legality. */
export function decodeLessonPlanIr(raw: unknown): DecodedLessonPlan {
  const parsed = LessonPlanIrSchema.safeParse(raw);
  if (!parsed.success) {
    throw new IrParseError(`malformed lesson plan IR: ${parsed.error.message}`, parsed.error.flatten());
  }
  const ir = parsed.data;
  if (ir.v !== IR_VERSION) {
    throw new IrParseError(`unsupported IR version ${ir.v} (expected ${IR_VERSION})`);
  }
  return {
    irVersion: ir.v,
    title: ir.lesson[0],
    estimatedMinutes: ir.lesson[1],
    blocks: ir.blocks.map((tuple, index) => decodeBlockTuple(tuple, index)),
  };
}

/** Deterministic block-count window for a topic (doc §4.2). Topics are now
 * intentionally small: 2 concepts target 8-10 blocks and 3 concepts target 10-13.
 * Each media block (KG-mandated visual OR an image) raises the ceiling by one so
 * the mandatory visuals and any anchor images fit without forcing filler — the
 * per-concept visual floor is enforced separately by the compiler. */
export function expectedBlockRange(conceptCount?: number, mediaCount = 0): { min: number; max: number } {
  const base = conceptCount === 2 ? { min: 8, max: 10 } : conceptCount === 3 ? { min: 10, max: 13 } : { min: 8, max: 20 };
  return { min: base.min, max: base.max + Math.max(0, mediaCount) };
}
