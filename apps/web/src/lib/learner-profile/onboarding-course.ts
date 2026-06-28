import { initializeCourseOutline } from "@/lib/ai/deepagent/course-generator";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { getCourseByGraph } from "@/lib/courses/store";
import { resolveCourseContextFromTopicAnchor } from "@/lib/knowledge-graph/course-context";
import { detectKgLanguage } from "@/lib/knowledge-graph/display-name";
import type { LearnerProfile } from "./types";

export async function buildOnboardingCourse(ownerId: string, profile: LearnerProfile | null) {
  if (!profile?.goalGraphId || !profile.goalStartTopicId) {
    return { courseId: null, lessonId: null, job: null, summary: null };
  }

  const language = profile.learningGoal ? detectKgLanguage(profile.learningGoal) : null;
  const courseContext = resolveCourseContextFromTopicAnchor({
    graphId: profile.goalGraphId,
    startTopicId: profile.goalStartTopicId,
    targetConceptId: profile.goalTargetConceptId,
    language,
  });

  const { course, firstLesson, summary } = await initializeCourseOutline({
    ownerId,
    topic: courseContext.startTopic.name,
    kgContext: courseContext,
    source: "cold_start",
    language,
  });

  const enqueued = await enqueueLessonGenerationJob({ ownerId, courseId: course.id, lessonId: firstLesson.id });
  const job = enqueued.job ? toLessonGenerationJobSummary(enqueued.job) : null;
  return { courseId: course.id, lessonId: firstLesson.id, job, summary };
}

export async function getOnboardingCourseId(ownerId: string, profile: LearnerProfile | null) {
  if (!profile?.goalGraphId) return null;
  const course = await getCourseByGraph(ownerId, profile.goalGraphId);
  return course?.id ?? null;
}
