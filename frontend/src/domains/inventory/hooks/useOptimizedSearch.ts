/**
 * useOptimizedSearch - Debounced search hook with relevance scoring
 *
 * Features:
 * - 300ms debounce for typing
 * - Relevance-scored results
 * - Pagination support
 * - Loading and error states
 * - Cache-friendly with React Query
 *
 * Part of US1: Optimized Item Search
 */

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import api from "@/services/httpClient";

// Constants
const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;
const DEFAULT_PAGE_SIZE = 20;

// Types
export interface SearchItem {
  id: string;
  item_name: string;
  item_code: string | null;
  barcode: string | null;
  stock_qty: number;
  mrp: number | null;
  category: string | null;
  subcategory: string | null;
  warehouse: string | null;
  uom_name: string | null;
  relevance_score: number;
  match_type: "exact_barcode" | "partial_barcode" | "exact_code" | "name_prefix" | "name_contains" | "fuzzy" | "none";
}

export interface SearchMetadata {
  query: string;
  has_more: boolean;
}

export interface OptimizedSearchResponse {
  items: SearchItem[];
  total: number;
  page: number;
  page_size: number;
  metadata: SearchMetadata;
}

export interface UseOptimizedSearchOptions {
  /** Initial query value */
  initialQuery?: string;
  /** Minimum characters before search triggers */
  minChars?: number;
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
  /** Items per page (default: 20, max: 50) */
  pageSize?: number;
  /** Enable/disable the search */
  enabled?: boolean;
}

export interface UseOptimizedSearchResult {
  /** Current search query */
  query: string;
  /** Debounced query value */
  debouncedQuery: string;
  /** Set the search query (triggers debounced search) */
  setQuery: (query: string) => void;
  /** Clear the search */
  clear: () => void;
  /** Search results */
  items: SearchItem[];
  /** Total results count */
  total: number;
  /** Current page number */
  page: number;
  /** Whether more results are available */
  hasMore: boolean;
  /** Loading state */
  isLoading: boolean;
  /** Initial loading (no cache) */
  isInitialLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Navigate to next page */
  nextPage: () => void;
  /** Navigate to previous page */
  prevPage: () => void;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Refetch current results */
  refetch: () => void;
}

/**
 * Fetch optimized search results from backend
 */
async function fetchOptimizedSearch(
  query: string,
  page: number,
  pageSize: number,
): Promise<OptimizedSearchResponse> {
  const offset = (page - 1) * pageSize;

  const response = await api.get<{
    success: boolean;
    data: OptimizedSearchResponse;
    message: string;
  }>("/api/items/search/optimized", {
    params: {
      q: query,
      limit: pageSize,
      offset,
    },
  });

  if (!response.data.success) {
    throw new Error(response.data.message || "Search failed");
  }

  return response.data.data;
}

/**
 * Optimized search hook with debouncing and pagination
 *
 * @example
 * ```tsx
 * const {
 *   query,
 *   setQuery,
 *   items,
 *   isLoading,
 *   hasMore,
 *   nextPage,
 * } = useOptimizedSearch({ pageSize: 20 });
 *
 * return (
 *   <TextInput value={query} onChangeText={setQuery} />
 *   {items.map(item => <ItemCard key={item.id} item={item} />)}
 *   {hasMore && <Button onPress={nextPage}>Load More</Button>}
 * );
 * ```
 */
export function useOptimizedSearch(
  options: UseOptimizedSearchOptions = {},
): UseOptimizedSearchResult {
  const {
    initialQuery = "",
    minChars = MIN_QUERY_LENGTH,
    debounceMs = DEBOUNCE_MS,
    pageSize = DEFAULT_PAGE_SIZE,
    enabled = true,
  } = options;

  // State
  const [query, setQueryState] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);

  // Debounced setter for triggering search
  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    setDebouncedQuery(value);
    setPage(1); // Reset to page 1 on new search
  }, debounceMs);

  // Update query and trigger debounced search
  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      debouncedSetQuery(value);
    },
    [debouncedSetQuery],
  );

  // Clear search
  const clear = useCallback(() => {
    setQueryState("");
    setDebouncedQuery("");
    setPage(1);
  }, []);

  // Should we fetch?
  const shouldFetch = useMemo(
    () => enabled && debouncedQuery.trim().length >= minChars,
    [enabled, debouncedQuery, minChars],
  );

  // React Query for fetching
  const {
    data,
    isLoading: queryIsLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ["optimized-search", debouncedQuery, page, pageSize],
    queryFn: () => fetchOptimizedSearch(debouncedQuery, page, pageSize),
    enabled: shouldFetch,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: (previousData) => previousData,
    retry: 1,
  });

  // Pagination controls
  const nextPage = useCallback(() => {
    if (data?.metadata.has_more) {
      setPage((p) => p + 1);
    }
  }, [data?.metadata.has_more]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  }, [page]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1) {
      setPage(newPage);
    }
  }, []);

  // Derived state
  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.metadata.has_more ?? false;
  const isLoading = queryIsLoading || isFetching;
  const isInitialLoading = queryIsLoading && !data;

  return {
    query,
    debouncedQuery,
    setQuery,
    clear,
    items,
    total,
    page,
    hasMore,
    isLoading,
    isInitialLoading,
    error: error as Error | null,
    nextPage,
    prevPage,
    goToPage,
    refetch,
  };
}

export default useOptimizedSearch;
