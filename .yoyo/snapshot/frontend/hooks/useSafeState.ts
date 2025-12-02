/**
 * useSafeState Hook
 * Prevents state updates on unmounted components
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Safe state hook that prevents updates after unmount
 */
export function useSafeState<T>(initialValue: T) {
  const [state, setState] = useState<T>(initialValue);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMountedRef.current) {
      setState(value);
    }
  }, []);

  return [state, safeSetState] as const;
}

/**
 * Safe async state hook
 */
export function useSafeAsyncState<T>(initialValue: T) {
  const [state, setState] = useSafeState<T>(initialValue);
  const [loading, setLoading] = useSafeState(false);
  const [error, setError] = useSafeState<Error | null>(null);

  const execute = useCallback(async (asyncFn: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      setState(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setState, setLoading, setError]);

  return {
    state,
    loading,
    error,
    execute,
    setState,
  };
}

