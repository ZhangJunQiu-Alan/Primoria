import type { QueryClient } from '@tanstack/react-query';
import { fetchCourseDetail, fetchCourses, fetchSubjects } from '@/shared/api/viewer/catalogApi';
import { fetchViewerHomePayload } from '@/shared/api/viewer/homeApi';
import {
  fetchAchievements,
  fetchDailyXpHistory,
  fetchFollowCounts,
  fetchPinnedAchievementIds,
  fetchUserStats,
  fetchViewerProfile,
} from '@/shared/api/viewer/profileApi';
import { scheduleIdleTask } from '@/shared/utils/idleTask';

type IdlePrefetchOptions = {
  idle?: boolean;
};

function runPrefetch(task: () => Promise<unknown>, options: IdlePrefetchOptions = {}) {
  if (options.idle) {
    return scheduleIdleTask(() => {
      void task().catch(() => undefined);
    });
  }

  void task().catch(() => undefined);
  return () => undefined;
}

export function prefetchHomePayload(
  queryClient: QueryClient,
  userId: string,
  selectedCourseId?: string | null,
  options: IdlePrefetchOptions = {},
) {
  return runPrefetch(
    () =>
      queryClient.prefetchQuery({
        queryKey: ['viewer', 'home', userId, selectedCourseId ?? null],
        queryFn: () => fetchViewerHomePayload(userId, selectedCourseId ?? null),
      }),
    options,
  );
}

export function prefetchCourseDetail(
  queryClient: QueryClient,
  courseId: string,
  userId?: string,
  options: IdlePrefetchOptions = {},
) {
  if (!courseId) {
    return () => undefined;
  }

  return runPrefetch(
    () =>
      queryClient.prefetchQuery({
        queryKey: ['viewer', 'course', courseId, userId],
        queryFn: () => fetchCourseDetail(courseId, userId),
      }),
    options,
  );
}

export function prefetchLibraryCatalog(
  queryClient: QueryClient,
  params: { searchQuery?: string; subjectId?: string | null } = {},
  options: IdlePrefetchOptions = {},
) {
  const searchQuery = params.searchQuery?.trim() ?? '';
  const subjectId = params.subjectId ?? null;

  return runPrefetch(
    () =>
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'subjects'],
          queryFn: fetchSubjects,
        }),
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'courses', searchQuery, subjectId],
          queryFn: () => fetchCourses({ searchQuery, subjectId: subjectId ?? undefined }),
        }),
      ]),
    options,
  );
}

export function prefetchProfileOverview(
  queryClient: QueryClient,
  userId: string,
  options: IdlePrefetchOptions = {},
) {
  return runPrefetch(
    () =>
      Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'profile', userId],
          queryFn: () => fetchViewerProfile(userId),
        }),
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'stats', userId],
          queryFn: () => fetchUserStats(userId),
        }),
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'follow-counts', userId],
          queryFn: () => fetchFollowCounts(userId),
        }),
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'achievements', userId],
          queryFn: () => fetchAchievements(userId),
        }),
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'achievement-pins', userId],
          queryFn: () => fetchPinnedAchievementIds(userId),
        }),
        queryClient.prefetchQuery({
          queryKey: ['viewer', 'xp-history', userId],
          queryFn: () => fetchDailyXpHistory(userId),
        }),
      ]),
    options,
  );
}
