import { toSafeKnowledgeGraphError } from "@/lib/knowledge-graph/errors";
import { buildOnboardingCourse } from "./onboarding-course";
import {
  beginOnboardingCourseBuild,
  completeOnboardingCourseBuild,
  failOnboardingCourseBuild,
} from "./store";
import type { LearnerProfile } from "./types";

const COURSE_BUILD_ERROR_MESSAGE = "We couldn't prepare your course right now. Please retry.";

export class OnboardingCourseBuildError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(input: { status: number; code: string; message: string; cause: unknown }) {
    super(input.message, { cause: input.cause });
    this.name = "OnboardingCourseBuildError";
    this.status = input.status;
    this.code = input.code;
  }
}

export async function buildOnboardingCourseWithStatus(ownerId: string, profile: LearnerProfile | null) {
  if (!profile?.goalGraphId || !profile.goalStartTopicId) return null;

  let attemptId: string | null = null;
  try {
    const attempt = await beginOnboardingCourseBuild(ownerId);
    attemptId = attempt.attemptId;
    const course = await buildOnboardingCourse(ownerId, profile);
    if (!course.courseId) throw new Error("Onboarding course build returned no course.");
    const completed = await completeOnboardingCourseBuild({ ownerId, attemptId });
    if (!completed) {
      console.info("[onboarding] ignored stale course build completion", { ownerId, attemptId });
    }
    return course;
  } catch (error) {
    const mapped = toSafeKnowledgeGraphError(error, {
      status: 503,
      code: "onboarding_course_failed",
      message: COURSE_BUILD_ERROR_MESSAGE,
    });
    const safe = {
      status: mapped.status,
      code: mapped.code === "knowledge_graph_unavailable" ? "onboarding_course_unavailable" : "onboarding_course_failed",
      message: COURSE_BUILD_ERROR_MESSAGE,
    };

    console.error("[onboarding] course prebuild failed", { ownerId, attemptId, code: safe.code, error });
    if (attemptId) {
      try {
        const failed = await failOnboardingCourseBuild({ ownerId, attemptId, message: safe.message });
        if (!failed) {
          console.info("[onboarding] ignored stale course build failure", { ownerId, attemptId });
        }
      } catch (persistenceError) {
        console.error("[onboarding] could not persist course prebuild failure", {
          ownerId,
          attemptId,
          persistenceError,
        });
      }
    }
    throw new OnboardingCourseBuildError({ ...safe, cause: error });
  }
}
