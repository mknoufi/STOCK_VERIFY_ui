import { QueryClient } from '@tanstack/react-query';

/**
 * Global Query Client Configuration
 * Optimized for offline-first usage and performance.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Time until data is considered "stale" and a refetch is triggered
      // 5 minutes: We don't want to spam the server, and inventory doesn't change *that* fast
      staleTime: 1000 * 60 * 5,

      // Time until inactive cache data is garbage collected
      // 24 hours: Keep data available for offline usage for a long time
      gcTime: 1000 * 60 * 60 * 24,

      // Retry logic
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Network mode: 'offlineFirst' allows queries to run even if we think we are offline
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
});
