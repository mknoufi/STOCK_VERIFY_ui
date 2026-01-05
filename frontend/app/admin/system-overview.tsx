/**
 * System Overview - Modern Admin Dashboard
 * Real-time system monitoring with enhanced UI
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { auroraTheme } from "@/theme/auroraTheme";
import { colors, spacing } from "@/theme/unified";
import {
  getMetricsStats,
  getMetricsHealth,
  getSyncStatus,
} from "@/services/api";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width > 768;

interface SystemMetrics {
  totalSessions: number;
  activeSessions: number;
  totalItems: number;
  totalDiscrepancies: number;
  averageAccuracy: number;
  systemUptime: number;
}

interface HealthStatus {
  database: "healthy" | "warning" | "error";
  api: "healthy" | "warning" | "error";
  cache: "healthy" | "warning" | "error";
  overall: "healthy" | "warning" | "error";
}

export default function SystemOverview() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [metricsRes, healthRes, syncRes] = await Promise.all([
        getMetricsStats(),
        getMetricsHealth(),
        getSyncStatus().catch(() => ({ success: false, data: null })),
      ]);

      if (metricsRes.data) {
        setMetrics(metricsRes.data);
      }
      if (healthRes.data) {
        setHealth(healthRes.data);
      }
      if (syncRes.success && syncRes.data) {
        setSyncStatus(syncRes.data);
      }
    } catch (error) {
      console.error("Failed to load system overview:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getHealthColor = (status: string) => {
    switch (status) {
      case "healthy":
        return colors.success[500];
      case "warning":
        return colors.warning[500];
      case "error":
        return colors.error[500];
      default:
        return colors.neutral[400];
    }
  };

  const getHealthIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case "healthy":
        return "checkmark-circle";
      case "warning":
        return "alert-circle";
      case "error":
        return "close-circle";
      default:
        return "help-circle";
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingSpinner />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary[400]}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <View>
            <Text style={styles.title}>System Overview</Text>
            <Text style={styles.subtitle}>Real-time monitoring & insights</Text>
          </View>
          <AnimatedPressable
            style={styles.settingsButton}
            onPress={() => router.push("/admin/settings")}
          >
            <Ionicons name="settings-outline" size={24} color={colors.neutral[100]} />
          </AnimatedPressable>
        </Animated.View>

        {/* Health Status Cards */}
        <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>System Health</Text>
          <View style={styles.healthGrid}>
            {health && (
              <>
                <GlassCard variant="strong" style={styles.healthCard}>
                  <Ionicons
                    name={getHealthIcon(health.database)}
                    size={32}
                    color={getHealthColor(health.database)}
                  />
                  <Text style={styles.healthLabel}>Database</Text>
                  <Text style={[styles.healthStatus, { color: getHealthColor(health.database) }]}>
                    {health.database}
                  </Text>
                </GlassCard>

                <GlassCard variant="strong" style={styles.healthCard}>
                  <Ionicons
                    name={getHealthIcon(health.api)}
                    size={32}
                    color={getHealthColor(health.api)}
                  />
                  <Text style={styles.healthLabel}>API</Text>
                  <Text style={[styles.healthStatus, { color: getHealthColor(health.api) }]}>
                    {health.api}
                  </Text>
                </GlassCard>

                <GlassCard variant="strong" style={styles.healthCard}>
                  <Ionicons
                    name={getHealthIcon(health.cache)}
                    size={32}
                    color={getHealthColor(health.cache)}
                  />
                  <Text style={styles.healthLabel}>Cache</Text>
                  <Text style={[styles.healthStatus, { color: getHealthColor(health.cache) }]}>
                    {health.cache}
                  </Text>
                </GlassCard>

                <GlassCard variant="strong" style={styles.healthCard}>
                  <Ionicons
                    name={getHealthIcon(health.overall)}
                    size={32}
                    color={getHealthColor(health.overall)}
                  />
                  <Text style={styles.healthLabel}>Overall</Text>
                  <Text style={[styles.healthStatus, { color: getHealthColor(health.overall) }]}>
                    {health.overall}
                  </Text>
                </GlassCard>
              </>
            )}
          </View>
        </Animated.View>

        {/* Key Metrics */}
        {metrics && (
          <Animated.View entering={FadeInDown.delay(400).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <GlassCard variant="medium" style={styles.metricCard}>
                <Ionicons name="analytics" size={28} color={colors.primary[400]} />
                <Text style={styles.metricValue}>{metrics.totalSessions?.toLocaleString() || 0}</Text>
                <Text style={styles.metricLabel}>Total Sessions</Text>
              </GlassCard>

              <GlassCard variant="medium" style={styles.metricCard}>
                <Ionicons name="pulse" size={28} color={colors.success[400]} />
                <Text style={styles.metricValue}>{metrics.activeSessions?.toLocaleString() || 0}</Text>
                <Text style={styles.metricLabel}>Active Now</Text>
              </GlassCard>

              <GlassCard variant="medium" style={styles.metricCard}>
                <Ionicons name="cube" size={28} color={colors.info[400]} />
                <Text style={styles.metricValue}>{metrics.totalItems?.toLocaleString() || 0}</Text>
                <Text style={styles.metricLabel}>Total Items</Text>
              </GlassCard>

              <GlassCard variant="medium" style={styles.metricCard}>
                <Ionicons name="warning" size={28} color={colors.warning[400]} />
                <Text style={styles.metricValue}>{metrics.totalDiscrepancies?.toLocaleString() || 0}</Text>
                <Text style={styles.metricLabel}>Discrepancies</Text>
              </GlassCard>

              <GlassCard variant="medium" style={styles.metricCard}>
                <Ionicons name="speedometer" size={28} color={colors.secondary[400]} />
                <Text style={styles.metricValue}>
                  {metrics.averageAccuracy?.toFixed(1) || 0}%
                </Text>
                <Text style={styles.metricLabel}>Avg Accuracy</Text>
              </GlassCard>

              <GlassCard variant="medium" style={styles.metricCard}>
                <Ionicons name="time" size={28} color={colors.neutral[400]} />
                <Text style={styles.metricValue}>
                  {Math.floor((metrics.systemUptime || 0) / 3600)}h
                </Text>
                <Text style={styles.metricLabel}>Uptime</Text>
              </GlassCard>
            </View>
          </Animated.View>
        )}

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(600).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <AnimatedPressable
              style={styles.actionCard}
              onPress={() => router.push("/admin/users")}
            >
              <GlassCard variant="medium" style={styles.actionCardInner}>
                <Ionicons name="people" size={32} color={colors.primary[400]} />
                <Text style={styles.actionLabel}>Manage Users</Text>
              </GlassCard>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.actionCard}
              onPress={() => router.push("/admin/security")}
            >
              <GlassCard variant="medium" style={styles.actionCardInner}>
                <Ionicons name="shield-checkmark" size={32} color={colors.success[400]} />
                <Text style={styles.actionLabel}>Security</Text>
              </GlassCard>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.actionCard}
              onPress={() => router.push("/admin/logs")}
            >
              <GlassCard variant="medium" style={styles.actionCardInner}>
                <Ionicons name="document-text" size={32} color={colors.info[400]} />
                <Text style={styles.actionLabel}>View Logs</Text>
              </GlassCard>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.actionCard}
              onPress={() => router.push("/admin/sql-config")}
            >
              <GlassCard variant="medium" style={styles.actionCardInner}>
                <Ionicons name="server" size={32} color={colors.warning[400]} />
                <Text style={styles.actionLabel}>SQL Config</Text>
              </GlassCard>
            </AnimatedPressable>
          </View>
        </Animated.View>

        {/* Sync Status */}
        {syncStatus && (
          <Animated.View entering={FadeInDown.delay(800).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Data Sync</Text>
            <GlassCard variant="strong" style={styles.syncCard}>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>Last Sync:</Text>
                <Text style={styles.syncValue}>
                  {syncStatus.lastSync
                    ? new Date(syncStatus.lastSync).toLocaleTimeString()
                    : "Never"}
                </Text>
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>Items Synced:</Text>
                <Text style={styles.syncValue}>{syncStatus.itemsSynced || 0}</Text>
              </View>
              <View style={styles.syncRow}>
                <Text style={styles.syncLabel}>Status:</Text>
                <Text
                  style={[
                    styles.syncValue,
                    { color: syncStatus.isHealthy ? colors.success[400] : colors.warning[400] },
                  ]}
                >
                  {syncStatus.isHealthy ? "Healthy" : "Needs Attention"}
                </Text>
              </View>
            </GlassCard>
          </Animated.View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.neutral[50],
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.neutral[400],
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.neutral[100],
    marginBottom: spacing.md,
  },
  healthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  healthCard: {
    width: isWeb && isTablet ? "25%" : "50%",
    padding: spacing.lg,
    alignItems: "center",
  },
  healthLabel: {
    fontSize: 14,
    color: colors.neutral[300],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  healthStatus: {
    fontSize: 16,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  metricCard: {
    width: isWeb && isTablet ? "33.33%" : "50%",
    padding: spacing.lg,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.neutral[50],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.neutral[400],
    textAlign: "center",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  actionCard: {
    width: isWeb && isTablet ? "25%" : "50%",
  },
  actionCardInner: {
    padding: spacing.lg,
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.neutral[100],
    marginTop: spacing.sm,
    textAlign: "center",
  },
  syncCard: {
    padding: spacing.lg,
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  syncLabel: {
    fontSize: 14,
    color: colors.neutral[400],
  },
  syncValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.neutral[100],
  },
});
