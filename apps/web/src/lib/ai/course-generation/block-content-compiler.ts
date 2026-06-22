import { z } from "zod";
import { PhysicsSceneZodSchema } from "@/lib/ai/visual-schemas";
import type { CourseBlock } from "@/lib/courses/types";
import { BlockCompileError } from "./generation-errors";
import type { GeneratableBlockType } from "./lesson-plan-ir";
import type { BlockGenerationJob } from "./lesson-plan-compiler";

// Deterministic block content compiler. Strictly parses one writer's core
// content for a single block, merges in the planner's metadata (conceptIds,
// pedagogicalRole, order-derived id), and emits a final CourseBlock. Semantic
// gaps throw BlockCompileError — never a generic fallback (doc §9.5).

const nonEmpty = z.string().trim().min(1);

const TextContentSchema = z.object({ title: nonEmpty, markdown: nonEmpty });

const AnalogyContentSchema = z.object({
  title: nonEmpty,
  source: nonEmpty,
  target: nonEmpty,
  mapping: nonEmpty,
});

const TransferContentSchema = z.object({
  title: nonEmpty,
  fromDomain: nonEmpty,
  toDomain: nonEmpty,
  explanation: nonEmpty,
  example: nonEmpty,
});

const CodeContentSchema = z.object({
  title: nonEmpty,
  language: nonEmpty,
  code: nonEmpty,
  explanation: nonEmpty,
});

// Decision 4: the visual writer emits a complete engine payload directly.
const VisualContentSchema = z
  .object({
    title: nonEmpty,
    description: nonEmpty,
    engine: z.enum(["html", "echarts", "mermaid", "physics"]).optional(),
    html: z.string().optional(),
    echartsOption: z.record(z.unknown()).optional(),
    echartsHeight: z.number().optional(),
    mermaidDefinition: z.string().optional(),
    physicsScene: PhysicsSceneZodSchema.optional(),
  })
  .refine(
    (v) =>
      (v.engine === "echarts" && v.echartsOption) ||
      (v.engine === "mermaid" && v.mermaidDefinition?.trim()) ||
      (v.engine === "physics" && v.physicsScene) ||
      ((v.engine === "html" || !v.engine) && v.html?.trim()),
    { message: "visual block is missing the payload for its engine" },
  );

const SingleQuestionSchema = z.object({
  kind: z.literal("single"),
  id: nonEmpty,
  question: nonEmpty,
  choices: z.array(z.object({ id: nonEmpty, text: nonEmpty })).min(2).max(6),
  correctId: nonEmpty,
  explanation: z.string().optional(),
});
const MultiQuestionSchema = z.object({
  kind: z.literal("multi"),
  id: nonEmpty,
  question: nonEmpty,
  choices: z.array(z.object({ id: nonEmpty, text: nonEmpty })).min(2).max(6),
  correctIds: z.array(nonEmpty).min(1),
  explanation: z.string().optional(),
});
const TrueFalseQuestionSchema = z.object({
  kind: z.literal("truefalse"),
  id: nonEmpty,
  question: nonEmpty,
  correct: z.boolean(),
  explanation: z.string().optional(),
});

const QuizContentSchema = z.object({
  title: nonEmpty,
  questions: z
    .array(z.discriminatedUnion("kind", [SingleQuestionSchema, MultiQuestionSchema, TrueFalseQuestionSchema]))
    .min(1)
    .max(6),
});

const CONTENT_SCHEMAS: Record<GeneratableBlockType, z.ZodTypeAny> = {
  text: TextContentSchema,
  analogy: AnalogyContentSchema,
  transfer: TransferContentSchema,
  visual: VisualContentSchema,
  code: CodeContentSchema,
  quiz: QuizContentSchema,
};

/** Stable, retry-safe block id. Namespacing by lessonId keeps it unique across
 * lessons while staying deterministic so a retry reuses the same id (doc §11.3). */
export function blockIdFor(job: BlockGenerationJob, lessonId: string): string {
  return `blk_${lessonId}_${job.order}`;
}

/** Parse one block's writer content and compile it into a final CourseBlock.
 * Throws BlockCompileError if a required semantic field is missing. */
export function compileBlockContent(job: BlockGenerationJob, rawContent: unknown, lessonId: string): CourseBlock {
  const schema = CONTENT_SCHEMAS[job.type];
  const parsed = schema.safeParse(rawContent);
  if (!parsed.success) {
    throw new BlockCompileError(
      `block ${job.order} (${job.type}) content invalid: ${parsed.error.message}`,
      { jobId: job.jobId, issues: parsed.error.flatten() },
    );
  }

  const base = {
    id: blockIdFor(job, lessonId),
    conceptIds: job.conceptIds,
    pedagogicalRole: job.pedagogicalRole,
  };

  // parsed.data carries exactly the type-specific fields (including title);
  // merge with the discriminating type and planner metadata.
  return { ...base, type: job.type, ...(parsed.data as object) } as CourseBlock;
}
