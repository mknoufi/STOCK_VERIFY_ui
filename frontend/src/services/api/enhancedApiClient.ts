/**
 * Enhanced API Client
 * Upgraded API client with retry logic, better error handling, and standardized responses
 */

import axios from "axios";
import api from "../httpClient";
import { retryWithBackoff } from "../../utils/retry";
import { ApiResponse, PaginatedResponse } from "../../types/api";

/**
 * Enhanced API client with retry logic and standardized error handling
 */
class EnhancedApiClient {
  private baseURL: string;

  constructor(baseURL: string = "/api/v2") {
    this.baseURL = baseURL;
  }

  /**
   * Handle API response and convert to standardized format
   */
  private handleResponse<T>(response: unknown): ApiResponse<T> {
    // If response already has success field, it's already standardized
    if (
      response &&
      typeof response === "object" &&
      "success" in response &&
      (response as Record<string, unknown>).success === true
    ) {
      return response as ApiResponse<T>;
    }

    // Convert legacy response format to standardized format
    if (response && typeof response === "object" && "data" in response) {
      const legacyResponse = response as {
        data: T;
        message?: string;
        timestamp?: string;
        request_id?: string;
      };
      return {
        success: true,
        data: legacyResponse.data,
        message: legacyResponse.message,
        timestamp: legacyResponse.timestamp,
        request_id: legacyResponse.request_id,
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
  private handleError(error: unknown): ApiResponse<never> {
    if (axios.isAxiosError(error) && error.response?.data) {
      const errorData = error.response.data as {
        error?: {
          code?: string;
          message?: string;
          details?: Record<string, unknown>;
        };
        request_id?: string;
        error_code?: string;
        detail?: string;
        message?: string;
        details?: Record<string, unknown>;
      };

      // Check if it's already a standardized error response
      if (errorData.error) {
        return {
          success: false,
          error: {
            code: errorData.error.code || "UNKNOWN_ERROR",
            message:
              errorData.error.message || error.message || "An error occurred",
            details: errorData.error.details,
          },
          request_id: errorData.request_id,
        };
      }

      // Convert legacy error format
      return {
        success: false,
        error: {
          code: errorData.error_code || "UNKNOWN_ERROR",
          message:
            errorData.detail ||
            errorData.message ||
            error.message ||
            "An error occurred",
          details: errorData.details || {},
        },
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    // Network or other error
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: errorMessage || "Network error occurred",
        details: {
          original_error: String(error),
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
    retries: number = 3,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.get(`${this.baseURL}${endpoint}`, { params });
        },
        { retries },
      );

      return this.handleResponse<T>(response.data);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * POST request with retry logic
   */
  async post<T>(
    endpoint: string,
    data?: unknown,
    retries: number = 3,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.post(`${this.baseURL}${endpoint}`, data);
        },
        { retries },
      );

      return this.handleResponse<T>(response.data);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * PUT request with retry logic
   */
  async put<T>(
    endpoint: string,
    data?: unknown,
    retries: number = 3,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.put(`${this.baseURL}${endpoint}`, data);
        },
        { retries },
      );

      return this.handleResponse<T>(response.data);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * PATCH request with retry logic
   */
  async patch<T>(
    endpoint: string,
    data?: unknown,
    retries: number = 3,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.patch(`${this.baseURL}${endpoint}`, data);
        },
        { retries },
      );

      return this.handleResponse<T>(response.data);
    } catch (error: unknown) {
      return this.handleError(error);
    }
  }

  /**
   * DELETE request with retry logic
   */
  async delete<T>(
    endpoint: string,
    retries: number = 3,
  ): Promise<ApiResponse<T>> {
    try {
      const response = await retryWithBackoff(
        async () => {
          return await api.delete(`${this.baseURL}${endpoint}`);
        },
        { retries },
      );

      return this.handleResponse<T>(response.data);
    } catch (error: unknown) {
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
    retries: number = 3,
  ): Promise<ApiResponse<PaginatedResponse<T>>> {
    const response = await this.get<PaginatedResponse<T>>(
      endpoint,
      params,
      retries,
    );
    return response;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<
    ApiResponse<{
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
    return this.get("/health");
  }

  /**
   * Connection pool status
   */
  async getConnectionPoolStatus(): Promise<
    ApiResponse<{
      status: string;
      pool_size: number;
      created: number;
      available: number;
      checked_out: number;
      utilization: number;
      metrics: Record<string, unknown>;
    }>
  > {
    return this.get("/connections/pool/status");
  }
}

// Export singleton instance
export const enhancedApiClient = new EnhancedApiClient("/api/v2");

// Export class for custom instances
export default EnhancedApiClient;
