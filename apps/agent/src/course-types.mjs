// @ts-check

/**
 * @param {any} course
 */
export function summarizeCourse(course) {
  return {
    id: course.id,
    title: course.title,
    topic: course.topic,
    summary: course.summary,
    estimatedMinutes: course.estimatedMinutes,
    outline: course.blocks.map((/** @type {any} */ block) => ({
      type: block.type,
      title: block.title ?? defaultTitleFor(block),
    })),
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
    default:
      return "Block";
  }
}
