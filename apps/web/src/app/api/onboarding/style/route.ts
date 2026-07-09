import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuth } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/session";
import { buildOnboardingCourse, getOnboardingCourseId } from "@/lib/learner-profile/onboarding-course";
import { getLearnerOnboardingState, saveTutorStyle, skipTutorStyle } from "@/lib/learner-profile/store";
import { isTutorStyle } from "@/lib/learner-profile/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  tutorStyle: z.string().optional(),
  skip: z.boolean().optional(),
}).strict();

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    let profile;
    if (body.skip) {
      profile = await skipTutorStyle(user.id);
    } else if (isTutorStyle(body.tutorStyle)) {
      profile = await saveTutorStyle(user.id, body.tutorStyle);
    } else {
      return NextResponse.json({ error: "Choose a tutor style or skip this step." }, { status: 400 });
    }

    const state = await getLearnerOnboardingState(user.id);
    const existingCourseId = await getOnboardingCourseId(user.id, profile);
    const course = existingCourseId ? null : await buildOnboardingCourse(user.id, profile);
    const courseId = existingCourseId ?? course?.courseId ?? null;
    return NextResponse.json({ ...state, profile, courseId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid onboarding style request." }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save tutor style." }, { status: 503 });
  }
}
