import { usesViewerFixtures } from '@/shared/api/viewer/core';
import { loadFixtureStore } from '@/shared/api/viewer/fixtureLoader';
import { supabase } from '@/shared/api/supabase';

export interface ViewerHomePayload {
  resolved_selected_course_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  selected_course_detail: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  in_progress_enrollments: any[];
}

export async function fetchViewerHomePayload(
  userId: string,
  selectedCourseId: string | null,
): Promise<ViewerHomePayload> {
  if (usesViewerFixtures()) {
    const fixture = loadFixtureStore();
    const enrollments = (fixture.enrollments ?? []).filter(
      (e: any) => e.status === 'in_progress',
    );
    enrollments.sort(
      (a: any, b: any) =>
        new Date(b.last_accessed_at ?? 0).getTime() -
        new Date(a.last_accessed_at ?? 0).getTime(),
    );
    const resolvedId =
      selectedCourseId && enrollments.some((e: any) => e.course_id === selectedCourseId)
        ? selectedCourseId
        : enrollments[0]?.course_id ?? null;
    const selectedEnrollment = enrollments.find(
      (e: any) => e.course_id === resolvedId,
    );
    return {
      resolved_selected_course_id: resolvedId,
      selected_course_detail: selectedEnrollment
        ? {
            course: selectedEnrollment.courses ?? {},
            lessons: [],
            completed_lesson_ids: fixture.completedLessonIds ?? [],
          }
        : null,
      in_progress_enrollments: enrollments,
    };
  }

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('course_id, status, progress_bp, last_accessed_at, courses(*)')
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .order('last_accessed_at', { ascending: false });

  const list = enrollments ?? [];
  const resolvedId =
    selectedCourseId && list.some((e: any) => e.course_id === selectedCourseId)
      ? selectedCourseId
      : list[0]?.course_id ?? null;

  const selectedEnrollment = list.find((e: any) => e.course_id === resolvedId);

  return {
    resolved_selected_course_id: resolvedId,
    selected_course_detail: selectedEnrollment
      ? {
          course: selectedEnrollment.courses ?? {},
          lessons: [],
          completed_lesson_ids: [],
        }
      : null,
    in_progress_enrollments: list,
  };
}
