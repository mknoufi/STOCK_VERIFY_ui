import { useState, useEffect, useCallback } from 'react';

interface UseApiOptions<T> {
  /** Initial data value */
  initialData?: T;
  /** Auto-fetch on mount */
  immediate?: boolean;
  /** Refetch interval in ms */
  refetchInterval?: number;
}

interface UseApiResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for API data fetching with loading/error states
 */
export function useApi<T>(
  fetchFn: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData, immediate = true, refetchInterval } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (immediate) {
      fetch();
    }
  }, [immediate, fetch]);

  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(fetch, refetchInterval);
    return () => clearInterval(interval);
  }, [refetchInterval, fetch]);

  return { data, loading, error, refetch: fetch };
}

/**
 * Hook for paginated API data
 */
interface UsePaginatedApiOptions {
  initialPage?: number;
  initialLimit?: number;
}

interface UsePaginatedApiResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  loading: boolean;
  error: Error | null;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  refetch: () => Promise<void>;
}

export function usePaginatedApi<T>(
  fetchFn: (page: number, limit: number) => Promise<{ items: T[]; total: number }>,
  options: UsePaginatedApiOptions = {}
): UsePaginatedApiResult<T> {
  const { initialPage = 1, initialLimit = 10 } = options;

  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(page, limit);
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [fetchFn, page, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    items,
    total,
    page,
    limit,
    loading,
    error,
    setPage,
    setLimit,
    refetch: fetch,
  };
}
