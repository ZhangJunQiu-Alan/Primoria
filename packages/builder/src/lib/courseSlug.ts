export function buildCourseSlug(title: string, courseId: string) {
  const normalized = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const fallback = normalized.length > 0 ? normalized : 'course';
  const suffix = courseId.split('-')[0] ?? courseId;
  return `${fallback}-${suffix}`;
}
