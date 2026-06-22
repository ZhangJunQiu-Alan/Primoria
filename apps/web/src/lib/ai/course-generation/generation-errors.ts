// Classified errors for the lesson generation pipeline. The category drives the
// retry strategy (doc §11.2): transport/JSON errors retry the task, coverage
// errors trigger targeted regeneration, semantic-missing fails the block.

export type GenerationErrorCategory =
  | "ir_parse"
  | "coverage"
  | "block_compile"
  | "writer"
  | "validation";

export class GenerationError extends Error {
  readonly category: GenerationErrorCategory;
  readonly details?: unknown;

  constructor(message: string, category: GenerationErrorCategory, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.category = category;
    this.details = details;
  }
}

/** Syntax-level failure decoding the compact LessonPlan IR (bad shape, version,
 * type code, or pedagogical role). */
export class IrParseError extends GenerationError {
  constructor(message: string, details?: unknown) {
    super(message, "ir_parse", details);
  }
}

/** The plan is syntactically valid but fails a deterministic teaching-coverage
 * rule (concept missing explanation/example, quiz omits a concept, wrong block
 * count, duplicate/out-of-order, illegal concept id). `missing` enumerates the
 * gaps so a caller can target regeneration. */
export class CoverageError extends GenerationError {
  readonly missing: string[];

  constructor(message: string, missing: string[]) {
    super(message, "coverage", { missing });
    this.missing = missing;
  }
}

/** A single block's writer output could not be compiled into a CourseBlock
 * (missing semantic field). Never papered over with a generic fallback. */
export class BlockCompileError extends GenerationError {
  constructor(message: string, details?: unknown) {
    super(message, "block_compile", details);
  }
}

/** The block writer LLM returned unparseable/invalid content. */
export class WriterError extends GenerationError {
  constructor(message: string, details?: unknown) {
    super(message, "writer", details);
  }
}

/** Final assembled lesson failed validation (coverage/order/quiz/duplicates). */
export class LessonValidationError extends GenerationError {
  readonly missing: string[];

  constructor(message: string, missing: string[]) {
    super(message, "validation", { missing });
    this.missing = missing;
  }
}
