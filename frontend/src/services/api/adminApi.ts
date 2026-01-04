/**
 * Admin API Service - Endpoints for admin dashboard functionality
 * Provides access to KPIs, system status, active users, error logs, and performance metrics
 */

import api from "../httpClient";

// Types
export interface KPIResponse {
  total_stock_value: number;
  verified_stock_value: number;
  verification_percentage: number;
  active_sessions: number;
  active_users: number;
  pending_variances: number;
  items_verified_today: number;
  timestamp: string;
}

export interface SystemStatusResponse {
  api_health: string;
  mongodb_status: string;
  sqlserver_status: string;
  avg_response_time_ms: number;
  error_rate_percent: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  uptime_seconds: number;
  timestamp: string;
}

export interface ActiveUserInfo {
  user_id: string;
  username: string;
  role: string;
  last_activity: string;
  current_session: string | null;
  status: "online" | "idle" | "offline";
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: "ERROR" | "WARNING" | "CRITICAL";
  message: string;
  endpoint?: string;
  user_id?: string;
  details?: Record<string, unknown>;
}

export interface PerformanceMetric {
  timestamp: string;
  latency_ms: number;
  throughput_rps: number;
  error_count: number;
}

export interface DashboardSummary {
  kpis: KPIResponse;
  system_status: SystemStatusResponse;
  active_users: ActiveUserInfo[];
  recent_errors_1h: number;
  timestamp: string;
}

// API Client
export const adminApi = {
  /**
   * Get live KPIs for admin dashboard
   */
  getKPIs: async (): Promise<KPIResponse> => {
    const response = await api.get<KPIResponse>("/api/admin/dashboard/kpis");
    return response.data;
  },

  /**
   * Get real-time system health metrics
   */
  getSystemStatus: async (): Promise<SystemStatusResponse> => {
    const response = await api.get<SystemStatusResponse>(
      "/api/admin/dashboard/system-status",
    );
    return response.data;
  },

  /**
   * Get list of currently active users
   */
  getActiveUsers: async (): Promise<ActiveUserInfo[]> => {
    const response = await api.get<ActiveUserInfo[]>(
      "/api/admin/dashboard/active-users",
    );
    return response.data;
  },

  /**
   * Get recent error logs
   */
  getErrorLogs: async (params?: {
    limit?: number;
    level?: "error" | "warning" | "critical";
    hours?: number;
  }): Promise<ErrorLogEntry[]> => {
    const response = await api.get<ErrorLogEntry[]>(
      "/api/admin/dashboard/error-logs",
      {
        params,
      },
    );
    return response.data;
  },

  /**
   * Get performance metrics for charts
   */
  getPerformanceMetrics: async (params?: {
    hours?: number;
    intervalMinutes?: number;
  }): Promise<PerformanceMetric[]> => {
    const queryParams = {
      hours: params?.hours ?? 24,
      interval_minutes: params?.intervalMinutes ?? 60,
    };
    const response = await api.get<PerformanceMetric[]>(
      "/api/admin/dashboard/performance-metrics",
      { params: queryParams },
    );
    return response.data;
  },

  /**
   * Get complete dashboard summary in one call
   */
  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const response = await api.get<DashboardSummary>(
      "/api/admin/dashboard/summary",
    );
    return response.data;
  },
};

export default adminApi;
