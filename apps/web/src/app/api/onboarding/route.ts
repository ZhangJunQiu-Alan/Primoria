import { after, NextResponse } from "next/server";

import { requireAuthUser } from "@/lib/auth/guard";
import { getOnboardingCourseId } from "@/lib/learner-profile/onboarding-course";
import { buildOnboardingCourseIfReady } from "@/lib/learner-profile/onboarding-course-readiness";
import { getLearnerOnboardingState } from "@/lib/learner-profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await getLearnerOnboardingState(user.id);
  const courseId = await getOnboardingCourseId(user.id, state.profile);
  if (!courseId && state.profile?.factsIntakeStatus === "failed") {
    after(() => buildOnboardingCourseIfReady(user.id, state.profile).catch((error) => {
      console.error("[onboarding] course build after stale facts intake failed", {
        ownerId: user.id,
        error: error instanceof Error ? error.name : "unknown_error",
      });
    }));
  }
  return NextResponse.json({ ...state, courseId });
}
