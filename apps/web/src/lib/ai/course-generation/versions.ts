import { IR_VERSION } from "./lesson-plan-ir";

// Checkpoint compatibility versions (engineering doc §4.2). A stored checkpoint
// is only reused when all three match the running worker, so a deployment that
// changes the IR shape, the planner/writer prompts, or the deterministic
// compiler automatically invalidates incompatible checkpoints.
//
//  - IR_VERSION: bump when the compact LessonPlan IR tuple shape changes.
//  - PROMPT_VERSION: bump when planner or block-writer prompts change in a way
//    that would make a stored plan/batch semantically stale.
//  - COMPILER_VERSION: bump when the deterministic compiler/validator output
//    for the same IR + KG changes.

export { IR_VERSION };
// Bumped so resumed generation does not reuse writer batches created before the
// Markdown math delimiter contract. Previous: 2026-06-30-writer-instruction.
export const PROMPT_VERSION = "2026-07-17-markdown-math-delimiters";
export const COMPILER_VERSION = "3";

export type CheckpointVersions = {
  irVersion: number;
  promptVersion: string;
  compilerVersion: string;
};

export const CURRENT_CHECKPOINT_VERSIONS: CheckpointVersions = {
  irVersion: IR_VERSION,
  promptVersion: PROMPT_VERSION,
  compilerVersion: COMPILER_VERSION,
};

/** A stored checkpoint is reusable only when every version matches the running
 * worker (doc §9.2/§9.3). */
export function isCheckpointCompatible(versions: CheckpointVersions): boolean {
  return (
    versions.irVersion === IR_VERSION &&
    versions.promptVersion === PROMPT_VERSION &&
    versions.compilerVersion === COMPILER_VERSION
  );
}
