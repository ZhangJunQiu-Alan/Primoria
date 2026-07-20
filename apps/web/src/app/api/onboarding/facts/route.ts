import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import {
  enqueueProfileFactIntakeJob,
  ProfileFactIntakeBusyError,
} from "@/lib/learner-facts/intake-jobs";
import { syncOnboardingFact } from "@/lib/learner-facts/store";
import { buildOnboardingCourseIfReady } from "@/lib/learner-profile/onboarding-course-readiness";
import { isCurriculumValidForStage } from "@/lib/learner-profile/education-context";
import { getLearnerOnboardingState, saveEducationContext, skipFactsIntake } from "@/lib/learner-profile/store";
import {
  EDUCATION_CONTEXT_SOURCES,
  EDUCATION_CURRICULA,
  EDUCATION_STAGES,
} from "@/lib/learner-profile/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  educationStage: z.enum(EDUCATION_STAGES),
  curriculumSystem: z.enum(EDUCATION_CURRICULA),
  educationContextSource: z.enum(EDUCATION_CONTEXT_SOURCES),
  text: z.string().trim().min(2).max(2_000).optional(),
}).strict().superRefine((value, ctx) => {
  if (!isCurriculumValidForStage(value.educationStage, value.curriculumSystem)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["curriculumSystem"], message: "Curriculum does not match the selected learning stage." });
  }
});

export async function POST(request: Request) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    const saved = await saveEducationContext({
      ownerId: user.id,
      educationStage: body.educationStage,
      curriculumSystem: body.curriculumSystem,
      source: body.educationContextSource,
    });
    await Promise.all([
      syncOnboardingFact(user.id, { kind: "knowledge_background", value: saved.knowledgeBackground }),
      syncOnboardingFact(user.id, { kind: "curriculum_system", value: saved.curriculumSystem }),
    ]);

    if (!body.text) {
      const profile = await skipFactsIntake(user.id);
      const course = await buildOnboardingCourseIfReady(user.id, profile);
      return NextResponse.json({ ...(await getLearnerOnboardingState(user.id)), course, intake: { status: "skipped" } });
    }

    const intake = await enqueueProfileFactIntakeJob({
      ownerId: user.id,
      sourceKind: "onboarding",
      sourceText: body.text,
    });
    return NextResponse.json(
      {
        ...(await getLearnerOnboardingState(user.id)),
        intake: { jobId: intake.job.id, status: intake.job.status },
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Choose your learning stage and curriculum before continuing." }, { status: 400 });
    }
    if (error instanceof ProfileFactIntakeBusyError) {
      return NextResponse.json({ error: error.message, code: "profile_fact_intake_busy" }, { status: 409 });
    }
    console.error("[onboarding/facts]", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Could not save your learning profile right now. Please retry." }, { status: 503 });
  }
}
