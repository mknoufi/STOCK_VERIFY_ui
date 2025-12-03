/**
 * Centralized Error Handling Service
 * Provides professional error handling for the entire application
 */

import { Alert } from 'react-native';

export interface ApiError {
  message: string;
  detail?: string;
  code?: string;
  category?: string;
  statusCode?: number;
  details?: any;
  context?: any;
}

export class ErrorHandler {
  /**
   * Handle API errors with user-friendly messages
   */
  static handleApiError(error: any, context?: string): ApiError {
    __DEV__ && console.error(`[${context || 'API Error'}]:`, error);

    let message = 'An unexpected error occurred';
    let detail = 'Please try again or contact support if the problem persists.';
    let code = 'UNK_001';
    let category = 'unknown';
    let statusCode = 500;
    let details = null;
    let errorContext = null;

    if (error.response) {
      // Server responded with error
      statusCode = error.response.status;
      details = error.response.data;

      // Check if server returned structured error response
      if (details && typeof details === 'object') {
        // New structured error format
        if (details.message) message = details.message;
        if (details.detail) detail = details.detail;
        if (details.code) code = details.code;
        if (details.category) category = details.category;
        if (details.context) errorContext = details.context;
      } else if (typeof details === 'string') {
        // Legacy string error format
        message = details;
        detail = details;
      }

      // Fallback to status code based messages if structured format not available
      if (!details || typeof details === 'string') {
        switch (statusCode) {
          case 400:
            message = message || 'Invalid request. Please check your input.';
            code = code || 'VAL_002';
            category = category || 'validation';
            break;
          case 401:
            message = message || 'Session expired. Please login again.';
            code = code || 'AUTH_003';
            category = category || 'authentication';
            break;
          case 403:
            message = message || 'You don\'t have permission to perform this action.';
            code = code || 'AUTHZ_001';
            category = category || 'authorization';
            break;
          case 404:
            message = message || 'Requested resource not found.';
            code = code || 'RES_001';
            category = category || 'resource';
            break;
          case 409:
            message = message || 'This operation conflicts with existing data.';
            code = code || 'VAL_002';
            category = category || 'validation';
            break;
          case 422:
            message = message || 'Validation error. Please check your input.';
            code = code || 'VAL_002';
            category = category || 'validation';
            break;
          case 429:
            message = message || 'Too many requests. Please wait a moment and try again.';
            code = code || 'SRV_002';
            category = category || 'server';
            break;
          case 500:
            message = message || 'Server error. Please try again later.';
            code = code || 'SRV_001';
            category = category || 'server';
            break;
          case 503:
            message = message || 'Service temporarily unavailable. Please try again.';
            code = code || 'DB_001';
            category = category || 'database';
            break;
          default:
            message = message || 'An error occurred';
        }
      }
    } else if (error.request) {
      // Request made but no response
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        message = 'Connection timeout. Please check your internet connection and try again.';
        code = 'NET_001';
        category = 'network';
        detail = 'The request took too long to complete. Your connection may be slow or unstable.';
      } else if (error.code === 'ECONNREFUSED' || !error.response) {
        message = 'Cannot connect to server. Please check if the server is running.';
        code = 'NET_002';
        category = 'network';
        detail = 'The server is not responding. It may be down or unreachable.';
      } else {
        message = 'Network error. Please check your internet connection.';
        code = 'NET_001';
        category = 'network';
        detail = 'Unable to reach the server. Please check your network connection.';
      }
      statusCode = 0;
    } else {
      // Error in request setup
      message = error.message || 'An unexpected error occurred';
      detail = error.message || 'Please try again or contact support.';
      code = 'UNK_001';
      category = 'unknown';
    }

    return {
      message,
      detail,
      code,
      category,
      statusCode,
      details,
      context: errorContext
    };
  }

  /**
   * Show error alert to user
   */
  static showError(error: any, context?: string, title = 'Error') {
    const apiError = this.handleApiError(error, context);

    Alert.alert(
      title,
      apiError.message,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  }

  /**
   * Show success message
   */
  static showSuccess(message: string, title = 'Success') {
    Alert.alert(
      title,
      message,
      [{ text: 'OK', style: 'default' }],
      { cancelable: true }
    );
  }

  /**
   * Show confirmation dialog
   */
  static showConfirm(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    title = 'Confirm'
  ) {
    Alert.alert(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: onConfirm
        }
      ],
      { cancelable: true }
    );
  }

  /**
   * Validate required fields
   */
  static validateRequired(fields: Record<string, any>, fieldNames: Record<string, string>): string | null {
    for (const [key, label] of Object.entries(fieldNames)) {
      if (!fields[key] || fields[key].toString().trim() === '') {
        return `${label} is required`;
      }
    }
    return null;
  }

  /**
   * Validate barcode format
   * @deprecated Use validateBarcode() from utils/validation.ts instead
   * This method only checks numeric barcodes and returns a boolean.
   * The new implementation provides better validation and normalization.
   */
  static validateBarcode(barcode: string): boolean {
    return /^\d{8,13}$/.test(barcode);
  }

  /**
   * Validate numeric input
   */
  static validateNumeric(value: string): boolean {
    return /^\d+(\.\d+)?$/.test(value);
  }

  /**
   * Log error for debugging
   */
  static logError(context: string, error: any, additionalInfo?: any) {
    const timestamp = new Date().toISOString();
    __DEV__ && console.error(`[${timestamp}] [${context}]`, {
      error: error.message || error,
      stack: error.stack,
      ...additionalInfo
    });
  }
}

/**
 * Network status checker
 */
export class NetworkMonitor {
  static async checkConnectivity(): Promise<boolean> {
    try {
      await fetch('https://www.google.com', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      return true;
    } catch {
      return false;
    }
  }

  static showNoConnection() {
    Alert.alert(
      'No Internet Connection',
      'Please check your internet connection and try again.',
      [{ text: 'OK' }]
    );
  }
}

/**
 * Retry logic for failed operations
 * @deprecated Use utils/retry.ts retryWithBackoff instead
 * This class is kept for backward compatibility only
 */
export class RetryHandler {
  static async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        __DEV__ && console.log(`Attempt ${attempt} failed, retrying...`);

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }
}

/**
 * Enhanced error handling with context
 */

