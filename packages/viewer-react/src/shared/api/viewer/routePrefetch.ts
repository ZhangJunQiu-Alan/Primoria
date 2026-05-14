import type { QueryClient } from '@tanstack/react-query';
import { prefetchHomePayload, prefetchLibraryCatalog, prefetchProfileOverview } from '@/shared/api/viewer/prefetch';

export function prefetchViewerRouteChunk(pathname: string) {
  switch (pathname) {
    case '/home':
      void import('@/features/home/HomePage');
      return;
    case '/library':
      void import('@/features/library/LibraryPage');
      return;
    case '/profile':
      void import('@/features/profile/ProfilePage');
      return;
    case '/builder/dashboard':
      void import('@/pages/dashboard/DashboardPage');
      return;
    default:
      return;
  }
}

export function prefetchViewerNavigationTarget(
  queryClient: QueryClient,
  pathname: string,
  userId?: string,
) {
  prefetchViewerRouteChunk(pathname);

  if (!userId) {
    return;
  }

  if (pathname === '/home') {
    prefetchHomePayload(queryClient, userId, null, { idle: true });
    return;
  }

  if (pathname === '/library') {
    prefetchLibraryCatalog(queryClient, { searchQuery: '', subjectId: null }, { idle: true });
    return;
  }

  if (pathname === '/profile') {
    prefetchProfileOverview(queryClient, userId, { idle: true });
  }
}
