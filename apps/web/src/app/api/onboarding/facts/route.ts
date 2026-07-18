import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import {
  enqueueProfileFactIntakeJob,
  ProfileFactIntakeBusyError,
} from "@/lib/learner-facts/intake-jobs";
import { buildOnboardingCourseIfReady } from "@/lib/learner-profile/onboarding-course-readiness";
import { getLearnerOnboardingState, skipFactsIntake } from "@/lib/learner-profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.union([
  z.object({ text: z.string().trim().min(2).max(2_000) }).strict(),
  z.object({ skip: z.literal(true) }).strict(),
]);

export async function POST(request: Request) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    if ("skip" in body) {
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
      return NextResponse.json({ error: "Write 2–2000 characters about your learning background, or skip this step." }, { status: 400 });
    }
    if (error instanceof ProfileFactIntakeBusyError) {
      return NextResponse.json({ error: error.message, code: "profile_fact_intake_busy" }, { status: 409 });
    }
    console.error("[onboarding/facts]", error instanceof Error ? error.name : "unknown_error");
    return NextResponse.json({ error: "Could not save your introduction right now. Please retry or skip." }, { status: 503 });
  }
}
