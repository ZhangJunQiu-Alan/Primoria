import { and, eq } from "drizzle-orm";

import { distillProfileIntake } from "../ai/extractor/profile-intake";
import { ContextError, LeaseLostError } from "../ai/course-generation/generation-errors";
import { getDb } from "../db/client";
import { learnerProfiles } from "../db/schema";
import { buildOnboardingCourseIfReady } from "../learner-profile/onboarding-course-readiness";
import { applyFactPlan, listAllFactsForExtraction, planFactMutations } from "./store";
import {
  completeProfileFactIntakeJobTx,
  type ProfileFactIntakeClaim,
} from "./intake-jobs";

export type ProfileFactIntakeOutcome = {
  ownerId: string;
  added: number;
  reinforced: number;
  skipped: number;
};

type ProfileIntakeDeps = { distill: typeof distillProfileIntake };

export async function processProfileFactIntakeJob(
  claim: ProfileFactIntakeClaim,
  deps: ProfileIntakeDeps = { distill: distillProfileIntake },
): Promise<ProfileFactIntakeOutcome> {
  const { job } = claim;
  if (!job.sourceText) throw new ContextError(`profile fact intake ${job.id} has no source text`);

  if (job.sourceKind === "onboarding") {
    const profileRows = await getDb()
      .select({ status: learnerProfiles.factsIntakeStatus, jobId: learnerProfiles.factsIntakeJobId })
      .from(learnerProfiles)
      .where(eq(learnerProfiles.ownerId, job.ownerId))
      .limit(1);
    const profile = profileRows[0];
    if (profile?.status !== "pending" || profile.jobId !== job.id) {
      throw new ContextError(`profile fact intake ${job.id} is no longer the active onboarding intake`);
    }
  }

  const existingFacts = await listAllFactsForExtraction(job.ownerId);
  const distilled = await deps.distill({
    sourceText: job.sourceText,
    sourceKind: job.sourceKind,
    jobId: job.id,
    existingFacts,
  });
  const fence = { jobId: job.id, workerId: claim.workerId, leaseToken: claim.leaseToken };

  const applied = await getDb().transaction(async (tx) => {
    const currentFacts = await listAllFactsForExtraction(job.ownerId, tx);
    const plan = planFactMutations(currentFacts, distilled.ops);
    const result = { added: plan.added, reinforced: plan.reinforced, skipped: plan.skipped };
    if (!(await completeProfileFactIntakeJobTx(tx, fence, result))) return null;

    if (job.sourceKind === "onboarding") {
      const now = new Date();
      const profileRows = await tx
        .update(learnerProfiles)
        .set({
          factsIntakeStatus: "completed",
          factsIntakeMessage: null,
          factsIntakeUpdatedAt: now,
          knowledgeBackground: distilled.knowledgeBackground,
          knowledgeBackgroundSkippedAt: null,
          updatedAt: now,
        })
        .where(and(
          eq(learnerProfiles.ownerId, job.ownerId),
          eq(learnerProfiles.factsIntakeJobId, job.id),
          eq(learnerProfiles.factsIntakeStatus, "pending"),
        ))
        .returning({ ownerId: learnerProfiles.ownerId });
      if (!profileRows[0]) throw new ContextError(`profile fact intake ${job.id} lost its onboarding write fence`);
    } else if (distilled.knowledgeBackground) {
      await tx
        .update(learnerProfiles)
        .set({
          knowledgeBackground: distilled.knowledgeBackground,
          knowledgeBackgroundSkippedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(learnerProfiles.ownerId, job.ownerId));
    }

    await applyFactPlan(tx, job.ownerId, plan);
    return result;
  });
  if (!applied) throw new LeaseLostError(`lease lost before completing profile fact intake ${job.id}`);

  if (job.sourceKind === "onboarding") {
    try {
      await buildOnboardingCourseIfReady(job.ownerId);
    } catch (error) {
      console.error("[profile-fact-intake] course readiness check failed", {
        jobId: job.id,
        ownerId: job.ownerId,
        errorName: error instanceof Error ? error.name : "unknown_error",
      });
    }
  }
  return { ownerId: job.ownerId, ...applied };
}
