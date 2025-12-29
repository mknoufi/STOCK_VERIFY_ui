/**
 * Domain Error Types for Stock Verification System
 * Provides structured error handling with codes, severity levels, and user-friendly messages.
 */

/**
 * Error severity levels for categorizing error handling behavior
 */
export type ErrorSeverity =
  | 'USER'       // User-facing errors that can be recovered by user action
  | 'SYSTEM'     // System errors that require technical intervention
  | 'NETWORK'    // Network-related transient errors that may resolve on retry
  | 'CRITICAL';  // Critical errors that block core functionality

/**
 * Error codes for domain-specific error classification
 */
export type AppErrorCode =
  // Barcode & Item errors
  | 'ITEM_NOT_FOUND'
  | 'INVALID_BARCODE'
  | 'BARCODE_LOOKUP_FAILED'
  | 'ITEM_CACHE_MISS'
  | 'ITEM_STALE_DATA'
  // Network errors
  | 'NETWORK_OFFLINE'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_UNREACHABLE'
  | 'BACKEND_UNAVAILABLE'
  // Session & Count Line errors
  | 'SESSION_NOT_FOUND'
  | 'SESSION_CLOSED'
  | 'COUNT_LINE_FAILED'
  | 'COUNT_LINE_DUPLICATE'
  // Auth errors
  | 'AUTH_EXPIRED'
  | 'AUTH_INVALID'
  | 'PERMISSION_DENIED'
  // Cache errors
  | 'CACHE_READ_ERROR'
  | 'CACHE_WRITE_ERROR'
  | 'CACHE_VALIDATION_FAILED'
  // Sync errors
  | 'SYNC_CONFLICT'
  | 'SYNC_FAILED'
  // Generic
  | 'UNKNOWN_ERROR'
  | 'VALIDATION_ERROR';

export interface AppErrorOptions {
  code: AppErrorCode;
  severity: ErrorSeverity;
  message: string;
  userMessage?: string;  // Optional user-friendly message
  originalError?: unknown;
  context?: Record<string, unknown>;
}

/**
 * AppError - Domain error wrapper for consistent error handling.
 *
 * Usage:
 * ```ts
 * throw new AppError({
 *   code: 'ITEM_NOT_FOUND',
 *   severity: 'USER',
 *   message: `Barcode ${barcode} not found in database`,
 *   userMessage: 'Item not found. Check the barcode and try again.',
 * });
 * ```
 */
export class AppError extends Error {
  public readonly code: AppErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly userMessage: string;
  public readonly originalError?: unknown;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = 'AppError';
    this.code = options.code;
    this.severity = options.severity;
    this.userMessage = options.userMessage || options.message;
    this.originalError = options.originalError;
    this.context = options.context;
    this.timestamp = new Date().toISOString();

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);
  }

  /**
   * Check if this error is retryable
   */
  get isRetryable(): boolean {
    return (
      this.severity === 'NETWORK' ||
      ['NETWORK_TIMEOUT', 'BACKEND_UNAVAILABLE', 'NETWORK_UNREACHABLE'].includes(this.code)
    );
  }

  /**
   * Check if this error should be shown to the user
   */
  get isUserFacing(): boolean {
    return this.severity === 'USER' || this.severity === 'NETWORK';
  }

  /**
   * Serialize for logging/analytics
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      severity: this.severity,
      message: this.message,
      userMessage: this.userMessage,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Create AppError from an unknown error
   */
  static fromUnknown(error: unknown, fallbackCode: AppErrorCode = 'UNKNOWN_ERROR'): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return new AppError({
        code: fallbackCode,
        severity: 'SYSTEM',
        message: error.message,
        originalError: error,
      });
    }

    return new AppError({
      code: fallbackCode,
      severity: 'SYSTEM',
      message: String(error),
      originalError: error,
    });
  }

  /**
   * Create AppError from API error response
   */
  static fromApiError(error: any, context: Record<string, unknown> = {}): AppError {
    const status = error?.response?.status;
    const detail = error?.response?.data?.detail;
    const message = typeof detail === 'string' ? detail : error?.message || 'API request failed';

    // Map HTTP status codes to error codes
    let code: AppErrorCode;
    let severity: ErrorSeverity;

    if (!error?.response) {
      // No response means network error
      if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
        code = 'NETWORK_TIMEOUT';
        severity = 'NETWORK';
      } else if (error?.code === 'ECONNREFUSED') {
        code = 'BACKEND_UNAVAILABLE';
        severity = 'NETWORK';
      } else {
        code = 'NETWORK_UNREACHABLE';
        severity = 'NETWORK';
      }
    } else {
      switch (status) {
        case 400:
          code = 'VALIDATION_ERROR';
          severity = 'USER';
          break;
        case 401:
          code = 'AUTH_EXPIRED';
          severity = 'USER';
          break;
        case 403:
          code = 'PERMISSION_DENIED';
          severity = 'USER';
          break;
        case 404:
          code = 'ITEM_NOT_FOUND';
          severity = 'USER';
          break;
        case 409:
          code = 'SYNC_CONFLICT';
          severity = 'SYSTEM';
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          code = 'BACKEND_UNAVAILABLE';
          severity = 'NETWORK';
          break;
        default:
          code = 'UNKNOWN_ERROR';
          severity = 'SYSTEM';
      }
    }

    return new AppError({
      code,
      severity,
      message,
      originalError: error,
      context: { status, detail, ...context },
    });
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract user-friendly message from any error
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
