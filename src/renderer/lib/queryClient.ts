import { QueryClient, QueryCache } from '@tanstack/react-query';
import { ApiError } from './api';

/**
 * Global query error handler — prevents query errors from surfacing as
 * unhandled promise rejections (which RuntimeErrorOverlay displays as
 * red toast overlays).
 *
 * 403 "not a member" errors are expected when queries fire before the
 * server has fully validated membership (e.g. during gateway.ready
 * invalidation). They are silently swallowed here.
 */
function handleQueryError(error: unknown, query: { queryKey: readonly unknown[] }): void {
  if (error instanceof ApiError && error.status === 403) {
    // Silently handle "not a member" and similar 403 errors — the user
    // may still be joining or the query will retry on its own.
    return;
  }

  // Log non-403 query errors for debugging (but don't re-throw — that
  // would create the unhandled rejection we're trying to prevent).
  const message = error instanceof Error ? error.message : String(error);
  console.warn(
    `[queryClient] Query error [${String(query.queryKey)}]:`,
    message,
  );
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      retry: (failureCount, error) => {
        // Don't retry 403 "not a member" errors — they won't resolve on retry
        if (error instanceof ApiError && error.status === 403) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: true,
      throwOnError: false,
    },
    mutations: {
      throwOnError: false,
    },
  },
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
});
