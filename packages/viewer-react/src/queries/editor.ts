import { useQuery } from '@tanstack/react-query';
import type { Course } from '@primoria/schema';
import { parseCourse, migrateCourseJson } from '@primoria/schema';
import { fetchAgentJson } from '@/shared/api/agentService';

export const editorKeys = {
  course: (id: string) => ['editor', 'course', id] as const,
};

export function useCourseForEditor(courseId: string | undefined) {
  return useQuery({
    queryKey: editorKeys.course(courseId ?? ''),
    enabled: !!courseId,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async () => {
      const data = await fetchAgentJson<Record<string, unknown>>(`/v1/builder/courses/${courseId!}/draft`);
      return parseCourse(migrateCourseJson(data));
    },
  });
}
