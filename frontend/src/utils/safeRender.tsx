/**
 * Safe Render Utilities
 * Helper functions to prevent crashes during rendering
 */

import React, { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

/**
 * Safely render a component with error boundary
 */
export function safeRender(component: () => ReactNode, fallback?: ReactNode): ReactNode {
  try {
    return component();
  } catch (error) {
    __DEV__ && console.error('Render error caught:', error);
    return fallback || null;
  }
}

/**
 * Wrap component with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error) => ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback ? (error) => fallback(error) : undefined}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Safe async operation wrapper
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  fallback?: T,
  onError?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    __DEV__ && console.error('Safe async error:', err);
    if (onError) {
      onError(err);
    }
    return fallback;
  }
}

/**
 * Safe value getter with fallback
 */
export function safeGet<T>(getter: () => T, fallback: T): T {
  try {
    return getter();
  } catch (error) {
    __DEV__ && console.error('Safe get error:', error);
    return fallback;
  }
}
