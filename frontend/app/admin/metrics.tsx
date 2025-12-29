import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Dimensions,
  RefreshControl,
} from "react-native";
import {
  LoadingSpinner,
  ScreenHeader,
  AuroraBackground,
  AnimatedPressable,
} from "@/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePermission } from "../../src/hooks/usePermission";
import {
  getMetricsStats,
  getMetricsHealth,
  getSyncStatus,
  triggerManualSync,
} from "../../src/services/api";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width > 768;
const cardWidth = isWeb && isTablet ? "30%" : isWeb ? "48%" : "48%";

export default function MetricsScreen() {
  const router = useRouter();
  const { hasRole } = usePermission();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    if (!hasRole("admin")) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to view system metrics.",
        [{ text: "OK", onPress: () => router.back() }],
      );
      return;
    }
    loadMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMetrics = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const [statsResponse, healthResponse, syncResponse] = await Promise.all([
        getMetricsStats(),
        getMetricsHealth(),
        getSyncStatus().catch(() => ({ success: false, data: null })), // Sync status is optional
      ]);
      setStats(statsResponse.data);
      setHealth(healthResponse.data);
      if (syncResponse.success) {
        setSyncStatus(syncResponse.data);
      }
      setLastUpdate(new Date());
    } catch (error: any) {
      if (!isRefresh) {
        Alert.alert("Error", error.message || "Failed to load metrics");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadMetrics(true);
  };

  const handleTriggerSync = async () => {
    try {
      const result = await triggerManualSync();
      if (result.success) {
        Alert.alert("Success", "Sync triggered successfully");
        setTimeout(() => loadMetrics(true), 1000); // Refresh status after 1 second
      } else {
        Alert.alert("Error", result.error || "Failed to trigger sync");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to trigger sync");
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const renderMetricCard = (
    title: string,
    value: string | number,
    color: string = "#fff",
    icon?: keyof typeof Ionicons.glyphMap,
    subtitle?: string,
  ) => (
    <View style={[styles.metricCard, isWeb && styles.metricCardWeb] as any}>
      {icon && (
        <View style={styles.metricIconContainer}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
      )}
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {subtitle ? <Text style={styles.metricSubtitle}>{subtitle}</Text> : null}
    </View>
  );

  if (loading && !stats) {
    return (
      <AuroraBackground>
        <View style={styles.centered}>
          <LoadingSpinner size={48} color={auroraTheme.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading metrics...</Text>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <AuroraBackground>
      <ScreenHeader
        title="System Metrics"
        subtitle="Performance & Health"
        showBackButton
        customRightContent={
          <View style={styles.headerActions}>
            <AnimatedPressable
              style={styles.refreshButton}
              onPress={() => loadMetrics(true)}
            >
              <Ionicons
                name="refresh"
                size={24}
                color={auroraTheme.colors.primary[500]}
                style={refreshing ? styles.refreshingIcon : undefined}
              />
            </AnimatedPressable>
            <AnimatedPressable
              style={styles.controlPanelButton}
              onPress={() => router.push("/admin/control-panel" as any)}
            >
              <Ionicons
                name="settings"
                size={24}
                color={auroraTheme.colors.primary[500]}
              />
            </AnimatedPressable>
          </View>
        }
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          isWeb && styles.contentContainerWeb,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={auroraTheme.colors.primary[500]}
          />
        }
        showsVerticalScrollIndicator={isWeb}
      >
        {health && (
          <View style={[styles.section, styles.healthSection]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={24} color="#4CAF50" />
              <Text style={styles.sectionTitle}>System Health</Text>
            </View>
            <View style={styles.healthCard}>
              <View style={styles.healthIndicator}>
                <View
                  style={[
                    styles.healthDot,
                    {
                      backgroundColor:
                        health.status === "healthy" ? "#4CAF50" : "#f44336",
                    },
                  ]}
                />
                <Text style={styles.healthText}>
                  {health.status === "healthy"
                    ? "System Healthy"
                    : "System Issues Detected"}
                </Text>
              </View>
              <View style={styles.healthDetails}>
                {health.mongodb && (
                  <View style={styles.healthDetailRow}>
                    <Ionicons
                      name={
                        health.mongodb.status === "connected"
                          ? "checkmark-circle"
                          : "close-circle"
                      }
                      size={18}
                      color={
                        health.mongodb.status === "connected"
                          ? "#4CAF50"
                          : "#f44336"
                      }
                    />
                    <Text style={styles.healthDetail}>
                      MongoDB:{" "}
                      {health.mongodb.status === "connected"
                        ? "Connected"
                        : "Disconnected"}
                    </Text>
                  </View>
                )}
                {health.dependencies?.sql_server && (
                  <View style={styles.healthDetailRow}>
                    <Ionicons
                      name={
                        health.dependencies.sql_server.status === "healthy"
                          ? "checkmark-circle"
                          : "warning"
                      }
                      size={18}
                      color={
                        health.dependencies.sql_server.status === "healthy"
                          ? "#4CAF50"
                          : "#ff9800"
                      }
                    />
                    <Text
                      style={[
                        styles.healthDetail,
                        {
                          color:
                            health.dependencies.sql_server.status === "healthy"
                              ? "#4CAF50"
                              : "#ff9800",
                        },
                      ]}
                    >
                      SQL Server:{" "}
                      {health.dependencies.sql_server.status === "healthy"
                        ? "Connected"
                        : "Unavailable"}
                    </Text>
                  </View>
                )}
                {health.uptime && (
                  <View style={styles.healthDetailRow}>
                    <Ionicons name="time" size={18} color="#007AFF" />
                    <Text style={styles.healthDetail}>
                      Uptime: {formatUptime(health.uptime)}
                    </Text>
                  </View>
                )}
              </View>
              {health.dependencies?.sql_server?.status !== "healthy" && (
                <View style={styles.notificationBanner}>
                  <Ionicons name="warning" size={20} color="#ff9800" />
                  <Text style={styles.notificationText}>
                    SQL Server is unavailable. App is running in offline mode.
                    ERP sync features are disabled.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {syncStatus && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sync" size={24} color="#007AFF" />
              <Text style={styles.sectionTitle}>Sync Status</Text>
            </View>
            <View style={styles.syncStatusCard}>
              <View style={styles.syncStatusRow}>
                <View style={styles.syncStatusLabelRow}>
                  <Ionicons name="server" size={20} color="#aaa" />
                  <Text style={styles.syncStatusLabel}>
                    SQL Server Connection
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: syncStatus.sql_available
                        ? "#4CAF50"
                        : "#ff9800",
                    },
                  ]}
                >
                  <Ionicons
                    name={syncStatus.sql_available ? "checkmark" : "close"}
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.statusBadgeText}>
                    {syncStatus.sql_available ? "Connected" : "Disconnected"}
                  </Text>
                </View>
              </View>
              {syncStatus.sync_in_progress && (
                <View style={styles.syncProgressRow}>
                  <LoadingSpinner size={20} color="#007AFF" />
                  <Text style={styles.syncProgressText}>
                    Sync in progress...
                  </Text>
                </View>
              )}
              {syncStatus.stats && (
                <View style={styles.syncStatsRow}>
                  <View style={styles.syncStatItem}>
                    <Ionicons name="play-circle" size={16} color="#007AFF" />
                    <Text style={styles.syncStatsText}>
                      Triggered: {syncStatus.stats.syncs_triggered || 0}
                    </Text>
                  </View>
                  <View style={styles.syncStatItem}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#4CAF50"
                    />
                    <Text style={styles.syncStatsText}>
                      Completed: {syncStatus.stats.syncs_completed || 0}
                    </Text>
                  </View>
                  {syncStatus.last_sync_attempt && (
                    <View style={styles.syncStatItem}>
                      <Ionicons name="time" size={16} color="#888" />
                      <Text style={styles.syncStatsText}>
                        Last:{" "}
                        {new Date(
                          syncStatus.last_sync_attempt,
                        ).toLocaleString()}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              {syncStatus.sql_available && !syncStatus.sync_in_progress && (
                <AnimatedPressable
                  style={styles.syncButton}
                  onPress={handleTriggerSync}
                >
                  <Ionicons name="sync" size={18} color="#fff" />
                  <Text style={styles.syncButtonText}>Trigger Manual Sync</Text>
                </AnimatedPressable>
              )}
            </View>
          </View>
        )}

        {stats && (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="speedometer" size={24} color="#007AFF" />
                <Text style={styles.sectionTitle}>API Performance</Text>
              </View>
              <View style={styles.metricsGrid}>
                {renderMetricCard(
                  "Total Requests",
                  stats.total_requests?.toLocaleString() || "0",
                  "#007AFF",
                  "stats-chart",
                )}
                {renderMetricCard(
                  "Success Rate",
                  `${((stats.success_rate || 0) * 100).toFixed(1)}%`,
                  stats.success_rate > 0.95 ? "#4CAF50" : "#FF9800",
                  stats.success_rate > 0.95 ? "checkmark-circle" : "warning",
                )}
                {renderMetricCard(
                  "Avg Response Time",
                  `${(stats.avg_response_time || 0).toFixed(0)}ms`,
                  stats.avg_response_time < 500 ? "#4CAF50" : "#FF9800",
                  "time",
                )}
                {renderMetricCard(
                  "Error Count",
                  stats.error_count || "0",
                  "#f44336",
                  "alert-circle",
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={24} color="#4CAF50" />
                <Text style={styles.sectionTitle}>User Activity</Text>
              </View>
              <View style={styles.metricsGrid}>
                {renderMetricCard(
                  "Active Users",
                  stats.active_users || "0",
                  "#007AFF",
                  "people-circle",
                )}
                {renderMetricCard(
                  "Total Sessions",
                  stats.total_sessions || "0",
                  "#fff",
                  "calendar",
                )}
                {renderMetricCard(
                  "Active Sessions",
                  stats.active_sessions || "0",
                  "#4CAF50",
                  "radio-button-on",
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="server" size={24} color="#FF9800" />
                <Text style={styles.sectionTitle}>Database Statistics</Text>
              </View>
              <View style={styles.metricsGrid}>
                {renderMetricCard(
                  "Total Count Lines",
                  stats.total_count_lines?.toLocaleString() || "0",
                  "#fff",
                  "list",
                )}
                {renderMetricCard(
                  "Pending Approvals",
                  stats.pending_approvals || "0",
                  "#FF9800",
                  "time-outline",
                )}
                {renderMetricCard(
                  "Total Items",
                  stats.total_items?.toLocaleString() || "0",
                  "#fff",
                  "cube",
                )}
                {renderMetricCard(
                  "Unknown Items",
                  stats.unknown_items || "0",
                  "#f44336",
                  "help-circle",
                )}
              </View>
            </View>

            {stats.top_endpoints && stats.top_endpoints.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="pulse" size={24} color="#9C27B0" />
                  <Text style={styles.sectionTitle}>Top Endpoints</Text>
                </View>
                <View style={styles.endpointsContainer}>
                  {stats.top_endpoints.map((endpoint: any, index: number) => (
                    <View key={index} style={styles.endpointRow}>
                      <View style={styles.endpointInfo}>
                        <Ionicons name="link" size={16} color="#007AFF" />
                        <Text style={styles.endpointPath}>{endpoint.path}</Text>
                      </View>
                      <View style={styles.endpointBadge}>
                        <Text style={styles.endpointCount}>
                          {endpoint.count}
                        </Text>
                        <Text style={styles.endpointLabel}>requests</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {stats.recent_errors && stats.recent_errors.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="warning" size={24} color="#f44336" />
                  <Text style={styles.sectionTitle}>Recent Errors</Text>
                </View>
                <View style={styles.errorsContainer}>
                  {stats.recent_errors.map((error: any, index: number) => (
                    <View key={index} style={styles.errorRow}>
                      <Ionicons name="alert-circle" size={20} color="#f44336" />
                      <Text style={styles.errorType}>{error.type}</Text>
                      <View style={styles.errorBadge}>
                        <Text style={styles.errorCount}>{error.count}x</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Ionicons
              name="refresh-circle"
              size={16}
              color={auroraTheme.colors.text.muted}
            />
            <Text style={styles.footerText}>Auto-refresh every 30 seconds</Text>
          </View>
          <View style={styles.footerRow}>
            <Ionicons
              name="time"
              size={16}
              color={auroraTheme.colors.text.muted}
            />
            <Text style={styles.footerText}>
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: auroraTheme.colors.text.primary,
    fontSize: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  refreshButton: {
    padding: 8,
    borderRadius: auroraTheme.borderRadius.md,
  },
  controlPanelButton: {
    padding: 8,
    borderRadius: auroraTheme.borderRadius.md,
  },
  refreshingIcon: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: auroraTheme.spacing.lg,
    paddingBottom: 32,
  },
  contentContainerWeb: {
    padding: isWeb ? 32 : auroraTheme.spacing.lg,
    maxWidth: isWeb ? 1400 : "100%",
    alignSelf: "center",
    width: "100%",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.lg,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: auroraTheme.colors.text.primary,
  },
  healthSection: {
    marginBottom: 32,
  },
  healthCard: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
    ...(Platform.OS === "web" && {
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }),
  },
  healthIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.lg,
  },
  healthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    ...(Platform.OS === "web" && {
      boxShadow: "0 0 8px currentColor",
    }),
  },
  healthText: {
    fontSize: 18,
    color: auroraTheme.colors.text.primary,
    fontWeight: "600",
  },
  healthDetails: {
    gap: 12,
  },
  healthDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  healthDetail: {
    fontSize: 14,
    color: auroraTheme.colors.text.secondary,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    ...(Platform.OS === "web" && {
      justifyContent: "flex-start",
    }),
  },
  metricCard: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.lg,
    padding: 20,
    flex: 1,
    minWidth: cardWidth,
    maxWidth: isWeb && isTablet ? "30%" : "100%",
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
    ...(Platform.OS === "web" && {
      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      transition: "transform 0.2s, box-shadow 0.2s",
      ":hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      },
    }),
  },
  metricCardWeb: {
    ...(Platform.OS === "web"
      ? {
          cursor: "default" as const,
        }
      : {}),
  } as any,
  metricIconContainer: {
    marginBottom: auroraTheme.spacing.md,
  },
  metricTitle: {
    fontSize: 13,
    color: auroraTheme.colors.text.secondary,
    marginBottom: 8,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metricSubtitle: {
    fontSize: 12,
    color: auroraTheme.colors.text.muted,
    marginTop: 4,
  },
  endpointsContainer: {
    gap: 8,
  },
  endpointRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: auroraTheme.colors.surface.base,
    padding: auroraTheme.spacing.lg,
    borderRadius: auroraTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
    ...(Platform.OS === "web" && {
      transition: "background-color 0.2s",
      ":hover": {
        backgroundColor: auroraTheme.colors.surface.elevated,
      },
    }),
  },
  endpointInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  endpointPath: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
    fontFamily: Platform.OS === "web" ? "monospace" : "monospace",
  },
  endpointBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${auroraTheme.colors.primary[500]}20`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: auroraTheme.borderRadius.md,
  },
  endpointCount: {
    fontSize: 14,
    color: auroraTheme.colors.primary[500],
    fontWeight: "700",
  },
  endpointLabel: {
    fontSize: 11,
    color: auroraTheme.colors.primary[500],
    opacity: 0.7,
  },
  errorsContainer: {
    gap: 8,
  },
  errorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: `${auroraTheme.colors.error[500]}15`,
    padding: auroraTheme.spacing.lg,
    borderRadius: auroraTheme.borderRadius.md,
    borderWidth: 1,
    borderColor: `${auroraTheme.colors.error[500]}30`,
    gap: 12,
  },
  errorType: {
    flex: 1,
    fontSize: 14,
    color: auroraTheme.colors.error[500],
    fontWeight: "500",
  },
  errorBadge: {
    backgroundColor: auroraTheme.colors.error[500],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: auroraTheme.borderRadius.md,
  },
  errorCount: {
    fontSize: 12,
    color: auroraTheme.colors.text.primary,
    fontWeight: "700",
  },
  notificationBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: `${auroraTheme.colors.warning[500]}15`,
    borderLeftWidth: 4,
    borderLeftColor: auroraTheme.colors.warning[500],
    padding: auroraTheme.spacing.lg,
    borderRadius: auroraTheme.borderRadius.md,
    marginTop: auroraTheme.spacing.lg,
    gap: 12,
  },
  notificationText: {
    flex: 1,
    fontSize: 13,
    color: auroraTheme.colors.warning[500],
    lineHeight: 20,
  },
  errorTypeDuplicate: {
    flex: 1,
    fontSize: 14,
    color: auroraTheme.colors.error[500],
  },
  errorCountDuplicate: {
    fontSize: 14,
    color: auroraTheme.colors.error[500],
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
    color: auroraTheme.colors.text.muted,
    marginBottom: 4,
  },
  syncStatusCard: {
    backgroundColor: auroraTheme.colors.surface.base,
    borderRadius: auroraTheme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.subtle,
    ...(Platform.OS === "web" && {
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    }),
  },
  syncStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.lg,
  },
  syncStatusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  syncStatusLabel: {
    fontSize: 15,
    color: auroraTheme.colors.text.secondary,
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    ...(Platform.OS === "web" && {
      boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
    }),
  },
  statusBadgeText: {
    color: auroraTheme.colors.text.primary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  syncProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  syncProgressText: {
    color: auroraTheme.colors.primary[500],
    fontSize: 14,
    marginLeft: 8,
  },
  syncStatsRow: {
    marginTop: auroraTheme.spacing.lg,
    paddingTop: auroraTheme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: auroraTheme.colors.border.subtle,
    gap: 10,
  },
  syncStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  syncStatsText: {
    fontSize: 13,
    color: auroraTheme.colors.text.secondary,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: auroraTheme.colors.primary[500],
    padding: 14,
    borderRadius: auroraTheme.borderRadius.md,
    marginTop: auroraTheme.spacing.lg,
    gap: 8,
    ...(Platform.OS === "web" && {
      cursor: "pointer",
      transition: "background-color 0.2s, transform 0.1s",
      ":hover": {
        backgroundColor: "#0056CC",
      },
      ":active": {
        transform: "scale(0.98)",
      },
    }),
  },
  syncButtonText: {
    color: auroraTheme.colors.text.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  footerDuplicate: {
    alignItems: "center",
    paddingVertical: 24,
    paddingTop: 32,
    gap: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerTextDuplicate: {
    fontSize: 12,
    color: auroraTheme.colors.text.muted,
  },
});
