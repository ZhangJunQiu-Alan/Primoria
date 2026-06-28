import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import { getOnboardingCourseId } from "@/lib/learner-profile/onboarding-course";
import { getLearnerOnboardingState } from "@/lib/learner-profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const state = await getLearnerOnboardingState(user.id);
  const courseId = await getOnboardingCourseId(user.id, state.profile);
  return NextResponse.json({ ...state, courseId });
}
