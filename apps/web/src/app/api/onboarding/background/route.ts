import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import { logKnowledgeGraphError, toSafeKnowledgeGraphError } from "@/lib/knowledge-graph/errors";
import {
  buildOnboardingCourseWithStatus,
  OnboardingCourseBuildError,
} from "@/lib/learner-profile/onboarding-course-build";
import { getLearnerOnboardingState, saveKnowledgeBackground, skipKnowledgeBackground } from "@/lib/learner-profile/store";
import { isKnowledgeBackground } from "@/lib/learner-profile/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  knowledgeBackground: z.string().optional(),
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
      profile = await skipKnowledgeBackground(user.id);
    } else if (isKnowledgeBackground(body.knowledgeBackground)) {
      profile = await saveKnowledgeBackground(user.id, body.knowledgeBackground);
    } else {
      return NextResponse.json({ error: "Choose a background or skip this step." }, { status: 400 });
    }

    const course = await buildOnboardingCourseWithStatus(user.id, profile);
    return NextResponse.json({
      ...(await getLearnerOnboardingState(user.id)),
      course,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid onboarding background request." }, { status: 400 });
    }
    if (error instanceof OnboardingCourseBuildError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    logKnowledgeGraphError("onboarding/background", error);
    const safe = toSafeKnowledgeGraphError(error, {
      code: "onboarding_background_failed",
      message: "Could not save your background right now. Please retry later.",
    });
    return NextResponse.json({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
