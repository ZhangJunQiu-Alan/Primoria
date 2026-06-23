// Classified errors for the lesson generation pipeline. The category drives the
// retry strategy (doc §11.2): transport/JSON errors retry the task, coverage
// errors trigger targeted regeneration, semantic-missing fails the block.

export type GenerationErrorCategory =
  | "context"
  | "planner"
  | "ir_parse"
  | "coverage"
  | "writer"
  | "block_compile"
  | "validation"
  | "provider"
  | "lease_lost"
  | "persistence";

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

/** Immutable generation context could not be loaded (missing course/lesson/
 * graph/topic, or an illegal owner relationship). Non-retryable. */
export class ContextError extends GenerationError {
  constructor(message: string, details?: unknown) {
    super(message, "context", details);
  }
}

/** The Planner produced no usable plan and a fresh plan may succeed. */
export class PlannerError extends GenerationError {
  constructor(message: string, details?: unknown) {
    super(message, "planner", details);
  }
}

/** Model provider transport failure (timeout, network, socket, balance). */
export class ProviderError extends GenerationError {
  constructor(message: string, details?: unknown) {
    super(message, "provider", details);
  }
}

/** The worker's lease/fencing token is no longer valid; it must stop writing. */
export class LeaseLostError extends GenerationError {
  constructor(message = "worker lost its lease", details?: unknown) {
    super(message, "lease_lost", details);
  }
}

/** A database write failed (publish, checkpoint, transition). */
export class PersistenceError extends GenerationError {
  constructor(message: string, details?: unknown) {
    super(message, "persistence", details);
  }
}

const RETRYABLE: ReadonlySet<GenerationErrorCategory> = new Set([
  "planner",
  "ir_parse",
  "coverage",
  "writer",
  "block_compile",
  "validation",
  "provider",
  "lease_lost",
  "persistence",
]);

const PROVIDER_PATTERN = /fetch failed|socket|econn|closed|timeout|timed out|network|insufficient.*balance|quota|credit|rate.?limit|429|50\d\b/i;

/** Classify an arbitrary thrown value into a generation error category and
 * whether the job should be retried (doc §10.2). Unclassified network-shaped
 * errors are treated as retryable provider failures; everything else is a
 * non-retryable bug surfaced to the user. */
export function classifyGenerationError(error: unknown): { category: GenerationErrorCategory; retryable: boolean } {
  if (error instanceof GenerationError) {
    return { category: error.category, retryable: RETRYABLE.has(error.category) };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (PROVIDER_PATTERN.test(message)) return { category: "provider", retryable: true };
  return { category: "persistence", retryable: false };
}
