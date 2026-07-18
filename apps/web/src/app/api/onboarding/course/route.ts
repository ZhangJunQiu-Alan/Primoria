import { NextResponse } from "next/server";

import { requireAuthUser } from "@/lib/auth/guard";
import {
  OnboardingCourseBuildError,
} from "@/lib/learner-profile/onboarding-course-build";
import { buildOnboardingCourseIfReady } from "@/lib/learner-profile/onboarding-course-readiness";
import { getLearnerOnboardingState, getLearnerProfile } from "@/lib/learner-profile/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await getLearnerProfile(user.id);
  if (!profile?.goalGraphId || !profile.goalStartTopicId) {
    return NextResponse.json(
      { error: "Choose a learning goal before preparing a course.", code: "onboarding_course_goal_required" },
      { status: 409 },
    );
  }

  try {
    const course = await buildOnboardingCourseIfReady(user.id, profile);
    return NextResponse.json({ ...(await getLearnerOnboardingState(user.id)), course });
  } catch (error) {
    if (error instanceof OnboardingCourseBuildError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[onboarding/course]", error);
    return NextResponse.json(
      { error: "We couldn't prepare your course right now. Please retry.", code: "onboarding_course_failed" },
      { status: 503 },
    );
  }
}
