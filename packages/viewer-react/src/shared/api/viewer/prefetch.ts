import type { QueryClient } from '@tanstack/react-query';

export function prefetchViewerNavigationTarget(
  _queryClient: QueryClient,
  _target: string,
  _options?: PrefetchOptions,
): void {
  // no-op: prefetch stub
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrefetchOptions = { idle?: boolean; [key: string]: any };

export function prefetchHomePayload(
  _queryClient: QueryClient,
  _userId: string,
  _param: null,
  _options?: PrefetchOptions,
): void {
  // no-op: prefetch stub
}

export function prefetchLibraryCatalog(
  _queryClient: QueryClient,
  _params: { searchQuery: string; subjectId: string | null },
  _options?: PrefetchOptions,
): void {
  // no-op: prefetch stub
}


export function prefetchCourseDetail(
  _queryClient: QueryClient,
  _courseSlug: string,
  _options?: PrefetchOptions,
): void {
  // no-op: prefetch stub
}
