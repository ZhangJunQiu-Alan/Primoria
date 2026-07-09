import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import { buildOnboardingCourse } from "@/lib/learner-profile/onboarding-course";
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

    const course = await buildOnboardingCourse(user.id, profile);
    return NextResponse.json({
      ...(await getLearnerOnboardingState(user.id)),
      profile,
      course,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid onboarding background request." }, { status: 400 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save background." }, { status: 503 });
  }
}
