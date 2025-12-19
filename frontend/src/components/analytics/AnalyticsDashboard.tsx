/**
 * AnalyticsDashboard Component
 * Main analytics dashboard with real-time metrics
 * Phase 0: Advanced Analytics Dashboard
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { MetricCard } from "./MetricCard";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const dashboardData = await analyticsService.getDashboardData(timeRange);
      const trends = await analyticsService.getVarianceTrends(7);

      setData({
        ...dashboardData,
        varianceTrends: trends,
      });
    } catch (error) {
      console.error("Failed to load analytics data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

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
          {data?.overview.map((metric, index) => (
            <MetricCard key={index} metric={metric} />
          ))}
        </ScrollView>
      </View>

      {/* Variance Trends Chart */}
      {data?.varianceTrends && data.varianceTrends.length > 0 && (
        <View style={styles.section}>
          <VarianceChart data={data.varianceTrends} />
        </View>
      )}

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
