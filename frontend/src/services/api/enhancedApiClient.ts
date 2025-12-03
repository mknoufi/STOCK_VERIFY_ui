/**
 * Enhanced API Client
 * Upgraded API client with retry logic, better error handling, and standardized responses
 */

import api from '../httpClient';
import { retryWithBackoff } from '../../utils/retry';

/**
 * Standardized API response type
 */
export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  message?: string;
  timestamp?: string;
  request_id?: string;
}

/**
 * Paginated API response type
 */
export interface StandardPaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Enhanced API client with retry logic and standardized error handling
 */
class EnhancedApiClient {
  private baseURL: string;

  constructor(baseURL: string = '/api/v2') {
    this.baseURL = baseURL;
  }

  /**
   * Handle API response and convert to standardized format
   */
  private handleResponse<T>(response: any): StandardApiResponse<T> {
    // If response already has success field, it's already standardized
    if (response.success !== undefined) {
      return response as StandardApiResponse<T>;
    }

    // Convert legacy response format to standardized format
    if (response.data !== undefined) {
      return {
        success: true,
        data: response.data,
        message: response.message,
        timestamp: response.timestamp,
        request_id: response.request_id,
      };
    }

    // If no data field, assume success
    return {
      success: true,
      data: response as T,
    };
  }

  /**
   * Handle API errors and convert to standardized format
   */
  private handleError(error: any): StandardApiResponse<never> {
    if (error.response?.data) {
      const errorData = error.response.data;

      // Check if it's already a standardized error response
      if (errorData.error) {
        return {
          success: false,
          error: {
            code: errorData.error.code || 'UNKNOWN_ERROR',
            message: errorData.error.message || error.message || 'An error occurred',
            details: errorData.error.details,
          },
          request_id: errorData.request_id,
        };
      }

      // Convert legacy error format
      return {
        success: false,
        error: {
          code: errorData.error_code || 'UNKNOWN_ERROR',
          message: errorData.detail || errorData.message || error.message || 'An error occurred',
          details: errorData.details || {},
        },
      };
    }

    // Network or other error
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        details: {
          original_error: error.toString(),
        },
      },
    };
  }

  /**
   * GET request with retry logic
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    retries: number = 3
  ): Promise<StandardApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.get(`${this.baseURL}${endpoint}`, { params });
        },
        { retries }
      );

      return this.handleResponse<T>(response.data);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * POST request with retry logic
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    retries: number = 3
  ): Promise<StandardApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.post(`${this.baseURL}${endpoint}`, data);
        },
        { retries }
      );

      return this.handleResponse<T>(response.data);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * PUT request with retry logic
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    retries: number = 3
  ): Promise<StandardApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.put(`${this.baseURL}${endpoint}`, data);
        },
        { retries }
      );

      return this.handleResponse<T>(response.data);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * PATCH request with retry logic
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    retries: number = 3
  ): Promise<StandardApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.patch(`${this.baseURL}${endpoint}`, data);
        },
        { retries }
      );

      return this.handleResponse<T>(response.data);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE request with retry logic
   */
  async delete<T>(endpoint: string, retries: number = 3): Promise<StandardApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.delete(`${this.baseURL}${endpoint}`);
        },
        { retries }
      );

      return this.handleResponse<T>(response.data);
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  /**
   * Get paginated items
   */
  async getPaginated<T>(
    endpoint: string,
    params?: {
      page?: number;
      page_size?: number;
      [key: string]: unknown;
    },
    retries: number = 3
  ): Promise<StandardApiResponse<StandardPaginatedResponse<T>>> {
    const response = await this.get<StandardPaginatedResponse<T>>(endpoint, params, retries);
    return response;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<
    StandardApiResponse<{
      status: string;
      services: Record<
        string,
        {
          status: string;
          details?: Record<string, unknown>;
        }
      >;
      timestamp: string;
      version?: string;
    }>
  > {
    return this.get('/health');
  }

  /**
   * Connection pool status
   */
  async getConnectionPoolStatus(): Promise<
    StandardApiResponse<{
      status: string;
      pool_size: number;
      created: number;
      available: number;
      checked_out: number;
      utilization: number;
      metrics: Record<string, unknown>;
    }>
  > {
    return this.get('/connections/pool/status');
  }
}

// Export singleton instance
export const enhancedApiClient = new EnhancedApiClient('/api/v2');

// Export class for custom instances
export default EnhancedApiClient;
