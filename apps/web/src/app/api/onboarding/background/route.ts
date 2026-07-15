import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAuthUser } from "@/lib/auth/guard";
import { logKnowledgeGraphError, toSafeKnowledgeGraphError } from "@/lib/knowledge-graph/errors";
import { createServerTiming } from "@/lib/observability/server-timing";
import { syncOnboardingFact } from "@/lib/learner-facts/store";
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
  const timing = createServerTiming();
  const respond = (body: unknown, init?: { status?: number }) => {
    timing.log("onboarding/background");
    return NextResponse.json(body, { status: init?.status, headers: { "Server-Timing": timing.header() } });
  };

  const { denied, user } = await timing.time("auth", () => requireAuthUser());
  if (denied) return denied;
  if (!user) return respond({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = RequestSchema.parse(await request.json());
    let profile;
    if (body.skip) {
      profile = await timing.time("save_background", () => skipKnowledgeBackground(user.id));
      await timing.time("sync_fact", () =>
        syncOnboardingFact(user.id, { kind: "knowledge_background", value: null }),
      );
    } else if (isKnowledgeBackground(body.knowledgeBackground)) {
      const knowledgeBackground = body.knowledgeBackground;
      profile = await timing.time("save_background", () => saveKnowledgeBackground(user.id, knowledgeBackground));
      await timing.time("sync_fact", () =>
        syncOnboardingFact(user.id, { kind: "knowledge_background", value: knowledgeBackground }),
      );
    } else {
      return respond({ error: "Choose a background or skip this step." }, { status: 400 });
    }

    const course = await timing.time("build_course", () => buildOnboardingCourseWithStatus(user.id, profile));
    return respond({
      ...(await timing.time("state", () => getLearnerOnboardingState(user.id))),
      course,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return respond({ error: "Invalid onboarding background request." }, { status: 400 });
    }
    if (error instanceof OnboardingCourseBuildError) {
      return respond({ error: error.message, code: error.code }, { status: error.status });
    }
    logKnowledgeGraphError("onboarding/background", error);
    const safe = toSafeKnowledgeGraphError(error, {
      code: "onboarding_background_failed",
      message: "Could not save your background right now. Please retry later.",
    });
    return respond({ error: safe.message, code: safe.code }, { status: safe.status });
  }
}
