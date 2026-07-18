import { buildCourseScopeKey, initializeCourseOutline } from "@/lib/ai/deepagent/course-generator";
import { enqueueLessonGenerationJob, toLessonGenerationJobSummary } from "@/lib/courses/lesson-generation-jobs";
import { getCourseByScopeKey } from "@/lib/courses/store";
import { resolveCourseContextFromTopicAnchor } from "@/lib/knowledge-graph/course-context";
import { detectKgLanguage } from "@/lib/knowledge-graph/display-name";
import { GENERATED_GRAPH_PREFIX, getGeneratedGraphById } from "@/lib/knowledge-graph/generated-graph";
import type { LearnerProfile } from "./types";

export async function buildOnboardingCourse(ownerId: string, profile: LearnerProfile | null) {
  if (!profile?.goalGraphId || !profile.goalStartTopicId) {
    return { courseId: null, lessonId: null, job: null, summary: null };
  }

  const language = profile.learningGoal ? detectKgLanguage(profile.learningGoal) : null;

  // Out-of-library goal positioned during onboarding: the profile anchors a
  // gen_* graph, so build the outline from it exactly like the Home input path.
  let outlineInput;
  if (profile.goalGraphId.startsWith(GENERATED_GRAPH_PREFIX)) {
    const graph = await getGeneratedGraphById(profile.goalGraphId);
    if (!graph) throw new Error(`Generated graph ${profile.goalGraphId} not found.`);
    outlineInput = {
      ownerId,
      topic: profile.learningGoal ?? graph.subject,
      source: "cold_start" as const,
      language,
      generatedGraph: graph,
    };
  } else {
    const courseContext = resolveCourseContextFromTopicAnchor({
      graphId: profile.goalGraphId,
      startTopicId: profile.goalStartTopicId,
      targetConceptId: profile.goalTargetConceptId,
      targetConceptIds: profile.goalTargetConceptIds,
      scope: profile.goalScope ?? "canonical",
      learningGoal: profile.goalScope === "goal" ? profile.learningGoal : null,
      language,
    });
    outlineInput = {
      ownerId,
      topic: courseContext.learningGoal ?? courseContext.startTopic.name,
      kgContext: courseContext,
      source: "cold_start" as const,
      language,
    };
  }

  const { course, firstLesson, summary } = await initializeCourseOutline(outlineInput);

  const enqueued = await enqueueLessonGenerationJob({ ownerId, courseId: course.id, lessonId: firstLesson.id });
  const job = enqueued.job ? toLessonGenerationJobSummary(enqueued.job) : null;
  return { courseId: course.id, lessonId: firstLesson.id, job, summary };
}

export async function getOnboardingCourseId(ownerId: string, profile: LearnerProfile | null) {
  if (!profile?.goalGraphId) return null;
  const scopeKey = buildCourseScopeKey({
    graphId: profile.goalGraphId,
    startTopicId: profile.goalStartTopicId,
    targetConceptIds: profile.goalTargetConceptIds,
    scope: profile.goalScope ?? "canonical",
    learningGoal: profile.goalScope === "goal" ? profile.learningGoal : null,
  });
  if (!scopeKey) return null;
  const course = await getCourseByScopeKey(ownerId, scopeKey);
  return course?.id ?? null;
}
