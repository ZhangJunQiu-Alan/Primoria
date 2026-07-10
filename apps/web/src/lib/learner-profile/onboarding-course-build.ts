import { toSafeKnowledgeGraphError } from "@/lib/knowledge-graph/errors";
import { buildOnboardingCourse } from "./onboarding-course";
import { saveOnboardingCourseStatus } from "./store";
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

  try {
    await saveOnboardingCourseStatus({ ownerId, status: "building" });
    const course = await buildOnboardingCourse(ownerId, profile);
    if (!course.courseId) throw new Error("Onboarding course build returned no course.");
    await saveOnboardingCourseStatus({ ownerId, status: "ready" });
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

    console.error("[onboarding] course prebuild failed", { ownerId, code: safe.code, error });
    try {
      await saveOnboardingCourseStatus({ ownerId, status: "failed", message: safe.message });
    } catch (persistenceError) {
      console.error("[onboarding] could not persist course prebuild failure", { ownerId, persistenceError });
    }
    throw new OnboardingCourseBuildError({ ...safe, cause: error });
  }
}
