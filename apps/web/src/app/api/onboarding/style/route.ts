import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import { syncOnboardingFact } from "@/lib/learner-facts/store";
import {
  buildOnboardingCourseWithStatus,
  OnboardingCourseBuildError,
} from "@/lib/learner-profile/onboarding-course-build";
import { getLearnerOnboardingState, saveTutorStyle, skipTutorStyle } from "@/lib/learner-profile/store";
import { isTutorStyle } from "@/lib/learner-profile/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  tutorStyle: z.string().optional(),
  skip: z.boolean().optional(),
}).strict();

export async function POST(request: Request) {
  const { denied, user } = await requireAuthUser();
  if (denied) return denied;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    let profile;
    if (body.skip) {
      profile = await skipTutorStyle(user.id);
      await syncOnboardingFact(user.id, { kind: "tutor_style", value: null });
    } else if (isTutorStyle(body.tutorStyle)) {
      profile = await saveTutorStyle(user.id, body.tutorStyle);
      await syncOnboardingFact(user.id, { kind: "tutor_style", value: body.tutorStyle });
    } else {
      return NextResponse.json({ error: "Choose a tutor style or skip this step." }, { status: 400 });
    }

    const course = await buildOnboardingCourseWithStatus(user.id, profile);
    return NextResponse.json({ ...(await getLearnerOnboardingState(user.id)), course });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid onboarding style request." }, { status: 400 });
    }
    if (error instanceof OnboardingCourseBuildError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("[onboarding/style]", error);
    return NextResponse.json({ error: "Could not save your tutor style right now. Please retry." }, { status: 503 });
  }
}
