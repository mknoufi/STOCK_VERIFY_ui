/**
 * Analytics API Service
 *
 * Provides access to analytics and reporting data for supervisor dashboards.
 * Includes session analytics, variance tracking, and performance metrics.
 *
 * @module services/api/analyticsApi
 *
 * @example
 * ```typescript
 * import { analyticsApi } from "./analyticsApi";
 *
 * // Get session analytics
 * const analytics = await analyticsApi.getSessionAnalytics();
 * console.log(analytics.data.total_sessions);
 *
 * // Get variance trends
 * const trends = await analyticsApi.getVarianceTrends("2024-01-01", "2024-01-31");
 * ```
 */
import api from "../httpClient";
import { createLogger } from "../logging";
import { isOnline } from "../../utils/network";

const log = createLogger("AnalyticsApi");

// ============================================================================
// Types
// ============================================================================

export interface AnalyticsOverall {
  total_sessions: number;
  total_items: number;
  total_variance: number;
  avg_variance: number;
}

export interface SessionAnalyticsData {
  overall: AnalyticsOverall;
  sessions_by_date: Record<string, number>;
  variance_by_warehouse: Record<string, number>;
  items_by_staff: Record<string, number>;
  total_sessions: number;
}

export interface SessionAnalyticsResponse {
  success: boolean;
  data: SessionAnalyticsData;
}

export interface EnrichmentStats {
  total_enriched: number;
  pending: number;
  failed: number;
  by_type: Record<string, number>;
}

export interface SyncStats {
  pending_changes: number;
  last_sync: string | null;
  conflicts: number;
}

export interface ConflictStats {
  total: number;
  unresolved: number;
  resolved_today: number;
  by_type: Record<string, number>;
}

export interface VarianceTrendPoint {
  date: string;
  variance: number;
  items_counted: number;
  sessions: number;
}

export interface PerformanceMetrics {
  avg_items_per_session: number;
  avg_session_duration: number;
  items_per_hour: number;
  accuracy_rate: number;
}

export interface DashboardSummary {
  sessions: {
    today: number;
    this_week: number;
    this_month: number;
    trend: "up" | "down" | "stable";
    trend_percent: number;
  };
  items: {
    counted_today: number;
    counted_week: number;
    total_variance: number;
    accuracy_percent: number;
  };
  staff: {
    active_today: number;
    top_performer: string | null;
    items_leader: number;
  };
  alerts: {
    high_variance_count: number;
    unresolved_conflicts: number;
    pending_reconcile: number;
  };
}

// ============================================================================
// Error class
// ============================================================================

export class AnalyticsApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AnalyticsApiError";
  }
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Analytics API client for supervisor dashboard data
 */
export const analyticsApi = {
  // --------------------------------------------------------------------------
  // Session Analytics
  // --------------------------------------------------------------------------

  /**
   * Get aggregated session analytics
   * @returns Session analytics data including totals and breakdowns
   */
  async getSessionAnalytics(): Promise<SessionAnalyticsResponse> {
    log.debug("Fetching session analytics");

    if (!(await isOnline())) {
      throw new AnalyticsApiError(
        "ANALYTICS_OFFLINE",
        "Analytics require network connection",
        "Please connect to the network to view analytics."
      );
    }

    try {
      const response = await api.get<SessionAnalyticsResponse>(
        "/api/sessions/analytics"
      );

      log.info("Session analytics fetched", {
        totalSessions: response.data.data.total_sessions,
      });

      return response.data;
    } catch (error) {
      log.error("Failed to fetch session analytics", { error });
      throw new AnalyticsApiError(
        "ANALYTICS_FETCH_FAILED",
        "Failed to fetch analytics",
        "Could not load analytics data. Please try again.",
        { error }
      );
    }
  },

  // --------------------------------------------------------------------------
  // Enrichment Stats
  // --------------------------------------------------------------------------

  /**
   * Get enrichment statistics
   * @param warehouseId - Optional warehouse filter
   * @returns Enrichment stats
   */
  async getEnrichmentStats(warehouseId?: string): Promise<EnrichmentStats> {
    log.debug("Fetching enrichment stats", { warehouseId });

    if (!(await isOnline())) {
      throw new AnalyticsApiError(
        "ENRICHMENT_STATS_OFFLINE",
        "Enrichment stats require network",
        "Please connect to view enrichment statistics."
      );
    }

    try {
      const params = warehouseId ? `?warehouse_id=${warehouseId}` : "";
      const response = await api.get<{ success: boolean; stats: EnrichmentStats }>(
        `/api/enrichment/stats${params}`
      );

      return response.data.stats;
    } catch (error) {
      log.error("Failed to fetch enrichment stats", { error });
      throw new AnalyticsApiError(
        "ENRICHMENT_STATS_FAILED",
        "Failed to fetch enrichment stats",
        "Could not load enrichment data.",
        { error }
      );
    }
  },

  // --------------------------------------------------------------------------
  // Sync & Conflict Stats
  // --------------------------------------------------------------------------

  /**
   * Get sync change statistics
   * @returns Sync stats
   */
  async getSyncStats(): Promise<SyncStats> {
    log.debug("Fetching sync stats");

    if (!(await isOnline())) {
      // Return empty stats when offline
      return {
        pending_changes: 0,
        last_sync: null,
        conflicts: 0,
      };
    }

    try {
      const response = await api.get<SyncStats>("/api/sync/changes/stats");
      return response.data;
    } catch (error) {
      log.warn("Failed to fetch sync stats, returning defaults", { error });
      return {
        pending_changes: 0,
        last_sync: null,
        conflicts: 0,
      };
    }
  },

  /**
   * Get conflict resolution statistics
   * @returns Conflict stats
   */
  async getConflictStats(): Promise<ConflictStats> {
    log.debug("Fetching conflict stats");

    if (!(await isOnline())) {
      throw new AnalyticsApiError(
        "CONFLICT_STATS_OFFLINE",
        "Conflict stats require network",
        "Please connect to view conflict statistics."
      );
    }

    try {
      const response = await api.get<{ success: boolean; data: ConflictStats }>(
        "/api/sync-conflicts/stats/summary"
      );
      return response.data.data;
    } catch (error) {
      log.error("Failed to fetch conflict stats", { error });
      throw new AnalyticsApiError(
        "CONFLICT_STATS_FAILED",
        "Failed to fetch conflict stats",
        "Could not load conflict data.",
        { error }
      );
    }
  },

  // --------------------------------------------------------------------------
  // Dashboard Summary (Aggregated)
  // --------------------------------------------------------------------------

  /**
   * Get dashboard summary with all key metrics
   * This aggregates multiple analytics endpoints for the main dashboard
   * @returns Comprehensive dashboard summary
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    log.debug("Fetching dashboard summary");

    if (!(await isOnline())) {
      throw new AnalyticsApiError(
        "DASHBOARD_OFFLINE",
        "Dashboard requires network connection",
        "Please connect to the network to view the dashboard."
      );
    }

    try {
      // Fetch multiple endpoints in parallel
      const [sessionAnalytics, conflictStats] = await Promise.all([
        this.getSessionAnalytics().catch(() => null),
        this.getConflictStats().catch(() => null),
      ]);

      // Calculate derived metrics
      const today = new Date().toISOString().slice(0, 10);
      const sessionsToday = sessionAnalytics?.data.sessions_by_date[today] ?? 0;

      // Build summary (using available data, with fallbacks)
      const summary: DashboardSummary = {
        sessions: {
          today: sessionsToday,
          this_week: Object.values(sessionAnalytics?.data.sessions_by_date ?? {}).reduce(
            (sum, count) => sum + count,
            0
          ),
          this_month: sessionAnalytics?.data.total_sessions ?? 0,
          trend: "stable",
          trend_percent: 0,
        },
        items: {
          counted_today: 0, // Would need additional endpoint
          counted_week: sessionAnalytics?.data.overall.total_items ?? 0,
          total_variance: sessionAnalytics?.data.overall.total_variance ?? 0,
          accuracy_percent:
            sessionAnalytics?.data.overall.total_items &&
            sessionAnalytics.data.overall.total_variance
              ? Math.round(
                  (1 -
                    Math.abs(sessionAnalytics.data.overall.avg_variance) /
                      sessionAnalytics.data.overall.total_items) *
                    100
                )
              : 100,
        },
        staff: {
          active_today: Object.keys(sessionAnalytics?.data.items_by_staff ?? {}).length,
          top_performer:
            Object.entries(sessionAnalytics?.data.items_by_staff ?? {}).sort(
              (a, b) => b[1] - a[1]
            )[0]?.[0] ?? null,
          items_leader:
            Object.values(sessionAnalytics?.data.items_by_staff ?? {}).sort(
              (a, b) => b - a
            )[0] ?? 0,
        },
        alerts: {
          high_variance_count: Object.values(
            sessionAnalytics?.data.variance_by_warehouse ?? {}
          ).filter((v) => Math.abs(v) > 100).length,
          unresolved_conflicts: conflictStats?.unresolved ?? 0,
          pending_reconcile: 0, // Would need additional endpoint
        },
      };

      log.info("Dashboard summary fetched", {
        totalSessions: summary.sessions.this_month,
        alerts: summary.alerts.high_variance_count + summary.alerts.unresolved_conflicts,
      });

      return summary;
    } catch (error) {
      log.error("Failed to fetch dashboard summary", { error });
      throw new AnalyticsApiError(
        "DASHBOARD_FETCH_FAILED",
        "Failed to fetch dashboard data",
        "Could not load dashboard. Please try again.",
        { error }
      );
    }
  },

  // --------------------------------------------------------------------------
  // Variance Analysis
  // --------------------------------------------------------------------------

  /**
   * Get variance trends over time
   * @param startDate - Start date (ISO string)
   * @param endDate - End date (ISO string)
   * @param warehouseId - Optional warehouse filter
   * @returns Variance trend data points
   */
  async getVarianceTrends(
    startDate: string,
    endDate: string,
    warehouseId?: string
  ): Promise<VarianceTrendPoint[]> {
    log.debug("Fetching variance trends", { startDate, endDate, warehouseId });

    if (!(await isOnline())) {
      throw new AnalyticsApiError(
        "VARIANCE_OFFLINE",
        "Variance analysis requires network",
        "Please connect to view variance trends."
      );
    }

    try {
      // Use session analytics to derive variance trends
      const analytics = await this.getSessionAnalytics();
      const sessionsByDate = analytics.data.sessions_by_date;

      // Transform to trend points
      const trends: VarianceTrendPoint[] = Object.entries(sessionsByDate)
        .filter(([date]) => date >= startDate && date <= endDate)
        .map(([date, sessions]) => ({
          date,
          variance: 0, // Would need per-date variance from backend
          items_counted: 0,
          sessions,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return trends;
    } catch (error) {
      log.error("Failed to fetch variance trends", { error });
      throw new AnalyticsApiError(
        "VARIANCE_TRENDS_FAILED",
        "Failed to fetch variance trends",
        "Could not load variance data.",
        { error }
      );
    }
  },

  // --------------------------------------------------------------------------
  // Performance Metrics
  // --------------------------------------------------------------------------

  /**
   * Get staff performance metrics
   * @param staffId - Optional staff user filter
   * @returns Performance metrics
   */
  async getPerformanceMetrics(staffId?: string): Promise<PerformanceMetrics> {
    log.debug("Fetching performance metrics", { staffId });

    if (!(await isOnline())) {
      throw new AnalyticsApiError(
        "PERFORMANCE_OFFLINE",
        "Performance metrics require network",
        "Please connect to view performance data."
      );
    }

    try {
      const analytics = await this.getSessionAnalytics();
      const { total_items, total_sessions, avg_variance } =
        analytics.data.overall;

      // Calculate metrics
      const avgItemsPerSession =
        total_sessions > 0 ? total_items / total_sessions : 0;

      const metrics: PerformanceMetrics = {
        avg_items_per_session: Math.round(avgItemsPerSession),
        avg_session_duration: 45, // Would need duration data from backend
        items_per_hour: Math.round(avgItemsPerSession / 0.75), // Estimate
        accuracy_rate:
          total_items > 0
            ? Math.round((1 - Math.abs(avg_variance) / total_items) * 100)
            : 100,
      };

      return metrics;
    } catch (error) {
      log.error("Failed to fetch performance metrics", { error });
      throw new AnalyticsApiError(
        "PERFORMANCE_FAILED",
        "Failed to fetch performance metrics",
        "Could not load performance data.",
        { error }
      );
    }
  },
};

// Default export
export default analyticsApi;
