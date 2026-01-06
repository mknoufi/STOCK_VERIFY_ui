/**
 * AnalyticsDashboard Component
 * Main analytics dashboard with real-time metrics
 * Phase 0: Advanced Analytics Dashboard
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { KPICard, ActiveUsersPanel, ErrorLogsPanel } from "../admin";
import { ErrorBoundary } from "../feedback/ErrorBoundary";
import { VarianceChart } from "./VarianceChart";
import { colorPalette, spacing, typography } from "@/theme/designTokens";
import {
  analyticsService,
  type AnalyticsDashboardData,
} from "@/services/analyticsService";

interface AnalyticsDashboardProps {
  timeRange?: "24h" | "7d" | "30d";
  onRefresh?: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  timeRange = "7d",
  onRefresh,
}) => {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [dashboardData, trends, users, logs] = await Promise.all([
        analyticsService.getDashboardData(timeRange),
        analyticsService.getVarianceTrends(7),
        analyticsService.getActiveUsers(),
        analyticsService.getErrorLogs(),
      ]);

      setData({
        ...dashboardData,
        varianceTrends: trends,
      });
      setActiveUsers(users);
      setErrorLogs(logs);
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    onRefresh?.();
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Overview Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricsContainer}
        >
          {data?.overview.map((metric, index) => {
            // Derive intent based on label (simplified logic)
            const isNegativeGood =
              metric.label.includes("Variance") ||
              metric.label.includes("Error");
            let intent: "good" | "bad" | "neutral" = "neutral";

            if (metric.change) {
              if (metric.change > 0) intent = isNegativeGood ? "bad" : "good";
              else if (metric.change < 0)
                intent = isNegativeGood ? "good" : "bad";
            }

            return (
              <KPICard
                key={index}
                title={metric.label}
                value={metric.value}
                icon={
                  metric.label.includes("Error")
                    ? "alert-circle-outline"
                    : metric.label.includes("Variance")
                      ? "swap-vertical"
                      : "chart-line"
                }
                trend={metric.change}
                trendIntent={intent}
                formatOptions={
                  metric.format === "percentage"
                    ? { style: "percent", maximumFractionDigits: 1 }
                    : { style: "decimal" }
                }
                // Mock onPress for now
                onPress={() => console.log("Drill-down", metric.label)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* Variance Trends Chart */}
      {data?.varianceTrends && data.varianceTrends.length > 0 && (
        <View style={styles.section}>
          <VarianceChart data={data.varianceTrends} />
        </View>
      )}

      {/* Operational Panels */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operational Monitoring</Text>
        <View style={styles.panelsContainer}>
          <View style={styles.panelWrapper}>
            <ErrorBoundary>
              <ActiveUsersPanel
                users={activeUsers.slice(0, 5)}
                scrollEnabled={false}
              />
            </ErrorBoundary>
          </View>
          <View style={styles.panelWrapper}>
            <ErrorBoundary>
              <ErrorLogsPanel
                logs={errorLogs.slice(0, 5)}
                onAcknowledge={async (id) => {
                  await analyticsService.acknowledgeError(id);
                  // Optimistic update or refresh could go here
                }}
                onResolve={async (id) => {
                  await analyticsService.resolveError(id);
                }}
                scrollEnabled={false}
              />
            </ErrorBoundary>
          </View>
        </View>
      </View>

      {/* Session Analytics */}
      {data?.sessionAnalytics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Session Analytics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {data.sessionAnalytics.totalSessions}
              </Text>
              <Text style={styles.statLabel}>Total Sessions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {data.sessionAnalytics.activeSessions}
              </Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {data.sessionAnalytics.completedSessions}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {data.sessionAnalytics.averageDuration}m
              </Text>
              <Text style={styles.statLabel}>Avg Duration</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorPalette.neutral[50],
  },
  contentContainer: {
    padding: spacing.base,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colorPalette.neutral[50],
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    color: colorPalette.neutral[600],
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colorPalette.neutral[900],
    marginBottom: spacing.base,
  },
  metricsContainer: {
    gap: spacing.sm,
    paddingRight: spacing.base,
    paddingBottom: spacing.sm, // Add padding for shadow visibility
  },
  panelsContainer: {
    gap: spacing.md,
  },
  panelWrapper: {
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colorPalette.neutral[0],
    padding: spacing.base,
    borderRadius: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colorPalette.primary[500],
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.fontSize.sm,
    color: colorPalette.neutral[600],
    textAlign: "center",
  },
});
