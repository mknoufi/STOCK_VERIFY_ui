/**
 * API Type Definitions
 * Standardized types for API requests and responses
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
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
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, {
    status: string;
    details?: Record<string, unknown>;
  }>;
  timestamp: string;
  version?: string;
}

/**
 * Connection pool status response
 */
export interface ConnectionPoolStatusResponse {
  status: string;
  pool_size: number;
  created: number;
  available: number;
  checked_out: number;
  utilization: number;
  metrics: Record<string, unknown>;
  health_check?: string;
}
