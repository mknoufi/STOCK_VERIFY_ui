import { useQuery } from '@tanstack/react-query';
import { searchItems } from '../services/api';

interface UseSearchItemsQueryOptions {
  query: string;
  enabled?: boolean;
  minChars?: number;
}

/**
 * React Query hook for searching items
 * Provides caching and debouncing via query key changes
 */
export const useSearchItemsQuery = ({
  query,
  enabled = true,
  minChars = 2,
}: UseSearchItemsQueryOptions) => {
  const shouldSearch = query.trim().length >= minChars;

  return useQuery({
    queryKey: ['items', 'search', query],
    queryFn: () => searchItems(query),
    enabled: enabled && shouldSearch,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: (previousData) => previousData, // Keep previous results while searching
  });
};

