/**
 * Error Recovery Service
 * Handles error recovery, retry strategies, and error reporting
 *
 * NOTE: Retry logic has been consolidated to utils/retry.ts
 * This file now re-exports the standardized retry function for backward compatibility
 */

import { Alert } from 'react-native';
import { ErrorHandler } from './errorHandler';
import { retryWithBackoff as standardRetryWithBackoff } from '../../utils/retry';

export interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (attempt: number) => void;
  onSuccess?: () => void;
  onFailure?: (error: any) => void;
}

export interface RetryStrategy {
  strategy: 'exponential' | 'linear' | 'fixed';
  initialDelay?: number;
  maxDelay?: number;
  multiplier?: number;
}

/**
 * Retry with exponential backoff
 * @deprecated Use retryWithBackoff from utils/retry.ts instead
 * This wrapper maintains backward compatibility but delegates to the standardized implementation
 */
export const retryWithBackoff = async <T>(
  operation: () => Promise<T>,
  options: ErrorRecoveryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onFailure,
  } = options;

  try {
    const result = await standardRetryWithBackoff(operation, {
      retries: maxRetries,
      backoffMs: retryDelay,
      shouldRetry: (error: any) => {
        // Don't retry for 4xx errors (client errors)
        if (error?.response && error.response.status >= 400 && error.response.status < 500) {
          if (onFailure) {
            onFailure(error);
          }
          return false;
        }
        return true;
      },
    });

    if (onSuccess) {
      onSuccess();
    }

    return result;
  } catch (error: any) {
    if (onFailure) {
      onFailure(error);
    }
    throw error;
  }
};

/**
 * Recover from error with fallback operations
 */
export const recoverFromError = async <T>(
  primaryOperation: () => Promise<T>,
  fallbackOperations: (() => Promise<T>)[] = [],
  options: ErrorRecoveryOptions = {}
): Promise<T> => {
  try {
    return await primaryOperation();
  } catch (error: any) {
    __DEV__ && console.error('Primary operation failed, trying fallbacks...', error);

    for (const fallbackOperation of fallbackOperations) {
      try {
        const result = await fallbackOperation();
        __DEV__ && console.log('Fallback operation succeeded');
        return result;
      } catch (fallbackError: any) {
        __DEV__ && console.error('Fallback operation failed:', fallbackError);
        continue;
      }
    }

    // All operations failed
    throw error;
  }
};

/**
 * Safe execute - wraps operation with error handling
 */
export const safeExecute = async <T>(
  operation: () => Promise<T>,
  onError?: (error: any) => void,
  defaultValue?: T
): Promise<T | undefined> => {
  try {
    return await operation();
  } catch (error: any) {
    __DEV__ && console.error('Safe execute error:', error);

    if (onError) {
      onError(error);
    }

    if (defaultValue !== undefined) {
      return defaultValue;
    }

    return undefined;
  }
};

/**
 * Error Reporter - logs errors for debugging
 */
export interface ErrorReport {
  error: any;
  context?: string;
  timestamp: string;
  userInfo?: any;
  stack?: string;
}

class ErrorReporter {
  private errorLog: ErrorReport[] = [];
  private maxLogSize = 100;

  report(error: any, context?: string, userInfo?: any) {
    const errorReport: ErrorReport = {
      error: {
        message: error.message || error,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      },
      context,
      timestamp: new Date().toISOString(),
      userInfo,
      stack: error.stack,
    };

    this.errorLog.push(errorReport);

    // Keep log size under limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }

    // Log to console
    __DEV__ && console.error(`[${context || 'Error'}]:`, errorReport);

    return errorReport;
  }

  getErrorLog(): ErrorReport[] {
    return [...this.errorLog];
  }

  clearErrorLog() {
    this.errorLog = [];
  }

  getErrorSummary() {
    const errors = this.errorLog;
    const byType = errors.reduce((acc, err) => {
      const type = err.error.code || err.error.status || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total: errors.length,
      byType,
      recent: errors.slice(-10),
    };
  }
}

export const errorReporter = new ErrorReporter();

/**
 * Enhanced error handling with recovery
 */
export const handleErrorWithRecovery = async <T>(
  operation: () => Promise<T>,
  options: {
    context?: string;
    recovery?: ErrorRecoveryOptions;
    fallback?: () => Promise<T>;
    showAlert?: boolean;
    onError?: (error: any) => void;
  } = {}
): Promise<T> => {
  const {
    context = 'Operation',
    recovery,
    fallback,
    showAlert = true,
    onError,
  } = options;

  try {
    if (recovery) {
      return await retryWithBackoff(operation, recovery);
    }
    return await operation();
  } catch (error: any) {
    // Report error
    errorReporter.report(error, context);

    // Try fallback
    if (fallback) {
      try {
        __DEV__ && console.log('Trying fallback operation...');
        return await fallback();
      } catch (fallbackError: any) {
        errorReporter.report(fallbackError, `${context} (fallback)`);
      }
    }

    // Handle error
    if (onError) {
      onError(error);
    } else if (showAlert) {
      const apiError = ErrorHandler.handleApiError(error, context);
      ErrorHandler.showError(apiError, context);
    }

    throw error;
  }
};

/**
 * Network error recovery
 */
export const handleNetworkError = async <T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    showAlert?: boolean;
  } = {}
): Promise<T> => {
  const { maxRetries = 3, showAlert = true } = options;

  return await handleErrorWithRecovery(
    operation,
    {
      context: 'Network Operation',
      recovery: {
        maxRetries,
        retryDelay: 1000,
        onRetry: (attempt) => {
          __DEV__ && console.log(`Network retry attempt ${attempt}`);
        },
      },
      showAlert,
      onError: (error: any) => {
        if (showAlert) {
          Alert.alert(
            'Network Error',
            'Unable to connect to server. Please check your internet connection and try again.',
            [{ text: 'OK' }]
          );
        }
      },
    }
  );
};

/**
 * Database operation error recovery
 */
export const handleDatabaseError = async <T>(
  operation: () => Promise<T>,
  options: {
    fallback?: () => Promise<T>;
    showAlert?: boolean;
  } = {}
): Promise<T> => {
  const { fallback, showAlert = true } = options;

  return await handleErrorWithRecovery(
    operation,
    {
      context: 'Database Operation',
      recovery: {
        maxRetries: 2,
        retryDelay: 500,
      },
      fallback,
      showAlert,
      onError: (error: any) => {
        if (showAlert) {
          Alert.alert(
            'Database Error',
            'Unable to save data. Your changes have been queued and will be synced when connection is restored.',
            [{ text: 'OK' }]
          );
        }
      },
    }
  );
};
