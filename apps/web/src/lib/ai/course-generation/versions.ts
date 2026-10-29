import { IR_VERSION } from "./lesson-plan-ir";
import { INTERACTIVE_CATALOG_HASH } from "@primoria/contracts/artifacts/interactive-catalog";

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
// Catalog capabilities are part of both planning and writing context.
export const PROMPT_VERSION = `2026-10-29-visual-capability-check:${INTERACTIVE_CATALOG_HASH}`;
export const COMPILER_VERSION = "5";

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
