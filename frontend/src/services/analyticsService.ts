/**
 * Analytics Service
 * Provides real-time metrics and analytics data
 * Phase 0: Advanced Analytics Dashboard
 */

import {
  getSessionsAnalytics,
  getSystemStats,
  getSystemIssues,
} from "./api/api";

export interface AnalyticsMetric {
  label: string;
  value: number;
  change?: number; // Percentage change
  trend?: "up" | "down" | "neutral";
  format?: "number" | "currency" | "percentage";
}

export interface SessionAnalytics {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  averageDuration: number; // in minutes
  totalItemsScanned: number;
  varianceRate: number; // percentage
}

export interface VarianceTrend {
  date: string;
  variance: number;
  itemsScanned: number;
}

export interface TopPerformer {
  userId: string;
  userName: string;
  itemsScanned: number;
  accuracy: number;
  sessionsCompleted: number;
}

export interface AnalyticsDashboardData {
  overview: AnalyticsMetric[];
  sessionAnalytics: SessionAnalytics;
  varianceTrends: VarianceTrend[];
  topPerformers: TopPerformer[];
  recentActivity: {
    id: string;
    type: "scan" | "session" | "variance";
    message: string;
    timestamp: Date;
    user?: string;
  }[];
}

class AnalyticsService {
  /**
   * Get dashboard analytics data
   */
  async getDashboardData(
    _timeRange: "24h" | "7d" | "30d" = "7d",
  ): Promise<AnalyticsDashboardData> {
    try {
      const [analyticsRes, statsRes] = await Promise.all([
        getSessionsAnalytics(),
        getSystemStats(),
      ]);

      const analytics = analyticsRes.data || {};
      const stats = statsRes.data || {};

      return {
        overview: [
          {
            label: "Total Items Scanned",
            value: analytics.total_items || 0,
            trend: "up",
            format: "number",
          },
          {
            label: "Active Sessions",
            value: stats.active_sessions || 0,
            trend: "neutral",
            format: "number",
          },
          {
            label: "Variance Rate",
            value: analytics.avg_variance || 0,
            trend: "down",
            format: "percentage",
          },
          {
            label: "Accuracy",
            value: 100 - (analytics.avg_variance || 0),
            trend: "up",
            format: "percentage",
          },
        ],
        sessionAnalytics: {
          totalSessions: analytics.total_sessions || 0,
          activeSessions: stats.active_sessions || 0,
          completedSessions:
            (analytics.total_sessions || 0) - (stats.active_sessions || 0),
          averageDuration: 0,
          totalItemsScanned: analytics.total_items || 0,
          varianceRate: analytics.avg_variance || 0,
        },
        varianceTrends: this.mapSessionsToTrends(
          analytics.sessions_by_date || {},
        ),
        topPerformers: [],
        recentActivity: [],
      };
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
      return this.getEmptyDashboardData();
    }
  }

  private mapSessionsToTrends(
    sessionsByDate: Record<string, number>,
  ): VarianceTrend[] {
    return Object.entries(sessionsByDate)
      .map(([date, count]) => ({
        date,
        variance: 0,
        itemsScanned: count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getEmptyDashboardData(): AnalyticsDashboardData {
    return {
      overview: [],
      sessionAnalytics: {
        totalSessions: 0,
        activeSessions: 0,
        completedSessions: 0,
        averageDuration: 0,
        totalItemsScanned: 0,
        varianceRate: 0,
      },
      varianceTrends: [],
      topPerformers: [],
      recentActivity: [],
    };
  }

  /**
   * Get variance trends over time
   */
  async getVarianceTrends(days: number = 7): Promise<VarianceTrend[]> {
    try {
      const analyticsRes = await getSessionsAnalytics();
      const sessionsByDate = analyticsRes.data?.sessions_by_date || {};
      return this.mapSessionsToTrends(sessionsByDate).slice(-days);
    } catch (error) {
      console.error("Failed to fetch variance trends:", error);
      return [];
    }
  }

  /**
   * Get top performing users
   */
  async getTopPerformers(_limit: number = 5): Promise<TopPerformer[]> {
    return [];
  }

  /**
   * Calculate metrics for a specific session
   */
  calculateSessionMetrics(_sessionData: any): {
    itemsScanned: number;
    duration: number;
    varianceCount: number;
    accuracy: number;
  } {
    return {
      itemsScanned: 0,
      duration: 0,
      varianceCount: 0,
      accuracy: 0,
    };
  }

  /**
   * Get active users
   */
  async getActiveUsers(): Promise<any[]> {
    try {
      const _statsRes = await getSystemStats();
      // This is a simplification, real active users would come from a different endpoint
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get recent error logs
   */
  async getErrorLogs(): Promise<any[]> {
    try {
      const issuesRes = await getSystemIssues();
      return (issuesRes.data || []).map((issue: any) => ({
        id: issue.id,
        timestamp: issue.timestamp,
        level: issue.severity === "critical" ? "error" : "warning",
        status: issue.status || "active",
        message: issue.message || issue.description,
        endpoint: issue.type,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Acknowledge an error log
   */
  async acknowledgeError(id: string): Promise<boolean> {
    console.log(`Acknowledging error ${id}`);
    return true;
  }

  /**
   * Resolve an error log
   */
  async resolveError(id: string): Promise<boolean> {
    console.log(`Resolving error ${id}`);
    return true;
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService();

export default analyticsService;
