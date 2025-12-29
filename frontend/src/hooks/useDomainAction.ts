import { useState, useCallback } from 'react';
import { ApiResponse } from '../types/api';

/**
 * Options for useDomainAction hook.
 * Supports two action types:
 * 1. Raw action: (params: T) => Promise<R> - Returns data directly
 * 2. API action: (params: T) => Promise<ApiResponse<R>> - Returns wrapped response
 */
interface UseDomainActionOptions<T, R> {
  action: (params: T) => Promise<R | ApiResponse<R>>;
  onSuccess?: (data: R) => void;
  onError?: (error: Error) => void;
  /** Set to true if action returns raw data, false if it returns ApiResponse */
  isRawAction?: boolean;
}

interface UseDomainActionResult<T, R> {
  execute: (params: T) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  data: R | null;
  reset: () => void;
}

function isApiResponse<R>(value: unknown): value is ApiResponse<R> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    typeof (value as ApiResponse<R>).success === 'boolean'
  );
}

export function useDomainAction<T, R>({
  action,
  onSuccess,
  onError,
  isRawAction = true,
}: UseDomainActionOptions<T, R>): UseDomainActionResult<T, R> {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<R | null>(null);

  const execute = useCallback(
    async (params: T) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await action(params);

        // Handle both raw data and ApiResponse formats
        if (isRawAction || !isApiResponse<R>(response)) {
          // Raw action - response is the data itself
          setData(response as R);
          onSuccess?.(response as R);
        } else {
          // API action - response is ApiResponse<R>
          if (response.success && response.data) {
            setData(response.data);
            onSuccess?.(response.data);
          } else {
            const errorMsg = response.error?.message || response.message || 'Unknown error occurred';
            throw new Error(errorMsg);
          }
        }
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        onError?.(errorObj);
      } finally {
        setIsLoading(false);
      }
    },
    [action, onSuccess, onError, isRawAction]
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { execute, isLoading, error, data, reset };
}
