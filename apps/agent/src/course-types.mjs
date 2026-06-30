// @ts-check

/**
 * @param {any} course
 */
export function courseBlocks(course) {
  const lessons = Array.isArray(course?.lessons) ? [...course.lessons] : [];
  const lessonBlocks = lessons
    .sort((a, b) => Number(a?.sortKey ?? 0) - Number(b?.sortKey ?? 0))
    .flatMap((/** @type {any} */ lesson) => Array.isArray(lesson?.blocks) ? lesson.blocks : []);
  if (lessonBlocks.length > 0 || !Array.isArray(course?.blocks)) return lessonBlocks;
  return course.blocks;
}

/**
 * @param {any} course
 */
export function courseLessons(course) {
  if (Array.isArray(course?.lessons)) {
    return [...course.lessons].sort((a, b) => Number(a?.sortKey ?? 0) - Number(b?.sortKey ?? 0));
  }
  const blocks = Array.isArray(course?.blocks) ? course.blocks : [];
  if (!blocks.length) return [];
  return [{
    id: `${course.id}:lesson:1`,
    title: course.title,
    description: course.summary ?? "",
    role: "new",
    progress: "not_started",
    status: "generated",
    sortKey: 1,
    topicId: null,
    triggeredFrom: null,
    blocks,
    estimatedMinutes: course.estimatedMinutes ?? null,
    version: course.version ?? 1,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  }];
}

/**
 * @param {any} course
 */
export function summarizeCourse(course) {
  const lessons = courseLessons(course).map((/** @type {any} */ lesson) => ({
    id: lesson.id,
    title: lesson.title,
    description: lesson.description ?? "",
    role: lesson.role ?? "new",
    progress: lesson.progress ?? "not_started",
    status: lesson.status ?? (Array.isArray(lesson.blocks) ? "generated" : "planned"),
    sortKey: Number(lesson.sortKey ?? 0),
    topicId: lesson.topicId ?? null,
    estimatedMinutes: lesson.estimatedMinutes ?? null,
    updatedAt: lesson.updatedAt,
  }));
  const generatedLessonCount = lessons.filter((lesson) => lesson.status === "generated").length;
  const plannedLessonCount = lessons.filter((lesson) => lesson.status === "planned").length;
  const completedLessonCount = lessons.filter((lesson) => lesson.progress === "completed").length;
  const currentLesson =
    lessons.find((lesson) => lesson.progress === "in_progress")
    ?? lessons.find((lesson) => lesson.progress !== "completed")
    ?? lessons[lessons.length - 1]
    ?? null;
  const blocks = courseBlocks(course);
  const generatedMinutes = courseLessons(course).reduce(
    (total, lesson) => total + Number(lesson.estimatedMinutes ?? 0),
    0,
  );
  return {
    id: course.id,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimatedMinutes: generatedMinutes || course.estimatedMinutes,
    outline: blocks.map((/** @type {any} */ block) => ({
      type: block.type,
      title: block.title ?? defaultTitleFor(block),
    })),
    lessons,
    lessonCount: lessons.length,
    generatedLessonCount,
    plannedLessonCount,
    completedLessonCount,
    currentLesson,
    archivedAt: course.archivedAt ?? null,
    version: course.version ?? 1,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

/**
 * @param {any} block
 */
function defaultTitleFor(block) {
  switch (block.type) {
    case "text":
      return "Concept";
    case "analogy":
      return `Analogy: ${block.source} → ${block.target}`;
    case "transfer":
      return `Transfer: ${block.fromDomain} → ${block.toDomain}`;
    case "visual":
      return "Interactive visual";
    case "code":
      return `Code (${block.language})`;
    case "quiz":
      return "Quiz";
    case "mind_map":
      return "Mind map";
    case "slide":
      return "Slides";
    case "worksheet":
      return "Worksheet";
    default:
      return "Block";
  }
}
