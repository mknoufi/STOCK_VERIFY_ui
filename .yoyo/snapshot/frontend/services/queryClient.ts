import { QueryClient } from '@tanstack/react-query';
import { API_MAX_RETRIES, API_RETRY_BACKOFF_MS, QUERY_CACHE_TIME_MS, QUERY_STALE_TIME_MS } from '../constants/config';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_STALE_TIME_MS,
      gcTime: QUERY_CACHE_TIME_MS,
      retry: API_MAX_RETRIES,
      retryDelay: (attemptIndex) => Math.min(API_RETRY_BACKOFF_MS * 2 ** attemptIndex, 1000 * 10),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: API_MAX_RETRIES,
      retryDelay: (attemptIndex) => Math.min(API_RETRY_BACKOFF_MS * 2 ** attemptIndex, 1000 * 10),
    },
  },
});
