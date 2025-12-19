/**
 * Error Handler Utilities
 * Centralized error handling to prevent crashes
 */

export interface AppError {
  message: string;
  code?: string;
  recoverable?: boolean;
  userMessage?: string;
}

/**
 * Safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'An unexpected error occurred';
}

/**
 * Safely extract error code
 */
export function getErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object') {
    if ('code' in error) {
      return String(error.code);
    }
    if ('status' in error) {
      return String(error.status);
    }
    if ('statusCode' in error) {
      return String(error.statusCode);
    }
  }
  return undefined;
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const recoverablePatterns = [
    'network',
    'timeout',
    'connection',
    'econnrefused',
    'econnaborted',
    'temporary',
  ];
  return recoverablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Create user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes('network') || message.includes('connection')) {
    return 'Network connection failed. Please check your internet connection and try again.';
  }
  if (message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  if (message.includes('unauthorized') || message.includes('invalid credentials')) {
    return 'Invalid username or password. Please check your credentials.';
  }
  if (message.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.includes('not found')) {
    return 'The requested resource was not found.';
  }
  if (message.includes('server error') || message.includes('500')) {
    return 'Server error occurred. Please try again later.';
  }

  return 'An error occurred. Please try again.';
}

/**
 * Format error for logging (removes sensitive data)
 */
export function formatErrorForLogging(error: unknown): string {
  const message = getErrorMessage(error);
  // Remove potential sensitive data
  return message
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/token[=:]\s*\S+/gi, 'token=***')
    .replace(/secret[=:]\s*\S+/gi, 'secret=***');
}
