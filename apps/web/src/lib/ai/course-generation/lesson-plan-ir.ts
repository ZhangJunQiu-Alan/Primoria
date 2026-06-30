import { z } from "zod";
import type { PedagogicalRole } from "@/lib/courses/types";
import { IrParseError } from "./generation-errors";

// Compact tuple IR the Lesson Planner emits (doc §8.1). Short type codes and
// positional tuples keep planner output token-cheap; the deterministic compiler
// expands this into block jobs. Only syntax decoding lives here — no teaching
// coverage judgement (that is the compiler's job).

export const IR_VERSION = 2;

// Planner -> Writer execution-brief bounds. The instruction is a generation-time
// contract (never persisted to the final CourseBlock); it must be present and
// specific, so an empty or stub instruction fails the plan.
export const WRITER_INSTRUCTION_MIN = 12;
export const WRITER_INSTRUCTION_MAX = 320;

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

// Canonical block shape is a named-field object (what the planner now emits).
// The positional tuple [order, typeCode, role, conceptIds, goal, writerInstruction]
// is also accepted so either-shaped model output decodes. `order`/`minutes`/`v`
// are coerced so a model that quotes its numbers ("1") still parses instead of
// failing with "Expected number, received string". `writerInstruction` is the
// Planner -> Writer execution brief: required, non-empty, length-bounded.
const WriterInstructionSchema = z.string().trim().min(WRITER_INSTRUCTION_MIN).max(WRITER_INSTRUCTION_MAX);

const BlockTupleSchema = z.tuple([
  z.coerce.number().int(),
  z.string(),
  z.string(),
  z.array(z.string()),
  z.string(),
  WriterInstructionSchema,
]);

const BlockObjectSchema = z.object({
  order: z.coerce.number().int(),
  type: z.string(),
  role: z.string(),
  conceptIds: z.array(z.string()),
  goal: z.string(),
  writerInstruction: WriterInstructionSchema,
});

const BlockSchema = z
  .union([BlockTupleSchema, BlockObjectSchema])
  .transform((b): z.infer<typeof BlockTupleSchema> =>
    Array.isArray(b) ? b : [b.order, b.type, b.role, b.conceptIds, b.goal, b.writerInstruction],
  );

// [title, estimatedMinutes] tuple or {title, minutes} object.
const LessonMetaSchema = z
  .union([z.tuple([z.string(), z.coerce.number()]), z.object({ title: z.string(), minutes: z.coerce.number() })])
  .transform((l): [string, number] => (Array.isArray(l) ? l : [l.title, l.minutes]));

export const LessonPlanIrSchema = z.object({
  v: z.coerce.number().int(),
  lesson: LessonMetaSchema,
  blocks: z.array(BlockSchema).min(1),
});

export type DecodedBlockPlan = {
  order: number;
  type: GeneratableBlockType;
  role: PedagogicalRole;
  conceptIds: string[];
  goal: string;
  /** Planner -> Writer execution brief (generation-time only, not persisted). */
  writerInstruction: string;
};

export type DecodedLessonPlan = {
  irVersion: number;
  title: string;
  estimatedMinutes: number;
  blocks: DecodedBlockPlan[];
};

function decodeBlockTuple(tuple: z.infer<typeof BlockTupleSchema>, index: number): DecodedBlockPlan {
  const [order, rawCode, rawRole, conceptIds, goal, writerInstruction] = tuple;
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
    writerInstruction,
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

/** Deterministic block-count window for a topic (doc §4.2). Topics usually carry
 * 2-3 concepts and should feel like compact Brilliant-style loops, with media
 * density validated separately instead of expanding the range per media block. */
export function expectedBlockRange(conceptCount?: number, _mediaCount = 0): { min: number; max: number } {
  if (conceptCount === 2) return { min: 13, max: 15 };
  if (conceptCount === 3) return { min: 16, max: 20 };
  return { min: 8, max: 20 };
}
