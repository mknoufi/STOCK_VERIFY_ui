import { useDebouncedCallback } from 'use-debounce';
import { SEARCH_DEBOUNCE_MS } from '../constants/config';

/**
 * Stable debounced callback hook that maintains a consistent reference across renders
 * 
 * Note: useDebouncedCallback from 'use-debounce' already maintains a stable reference.
 * This wrapper provides a consistent API and default delay configuration.
 * 
 * The callback passed to this hook should be wrapped in useCallback to ensure stability.
 */
export const useStableDebouncedCallback = <Args extends any[]>(
  callback: (...args: Args) => void,
  delay: number = SEARCH_DEBOUNCE_MS
) => {
  // useDebouncedCallback already handles memoization internally
  // It maintains a stable reference as long as callback and delay don't change
  return useDebouncedCallback(callback, delay);
};

