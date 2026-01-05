/**
 * Security Dashboard
 * Monitor security events, manage permissions, and audit logs
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { GlassCard } from "@/components/ui/GlassCard";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { colors, spacing } from "@/theme/unified";

const { width } = Dimensions.get("window");
const isTablet = width > 768;

type SecurityEventType =
  | "login"
  | "logout"
  | "failed_login"
  | "permission_change"
  | "data_access"
  | "api_error";
type SecurityLevel = "info" | "warning" | "critical";

interface SecurityMetric {
  title: string;
  value: number;
  change: number;
  icon: string;
  color: string;
  level: SecurityLevel;
}

interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  level: SecurityLevel;
  user: string;
  description: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

export default function SecurityDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<SecurityMetric[]>([]);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [threatLevel, setThreatLevel] = useState<SecurityLevel>("info");

  const loadSecurityData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Mock data - replace with actual API calls
      const mockMetrics: SecurityMetric[] = [
        {
          title: "Failed Logins (24h)",
          value: 3,
          change: -40,
          icon: "lock-closed",
          color: colors.error[500],
          level: "info",
        },
        {
          title: "Active Sessions",
          value: 12,
          change: +8,
          icon: "people",
          color: colors.success[500],
          level: "info",
        },
        {
          title: "API Rate Limit Hits",
          value: 5,
          change: +150,
          icon: "alert-circle",
          color: colors.warning[500],
          level: "warning",
        },
        {
          title: "Suspicious Activities",
          value: 1,
          change: 0,
          icon: "shield-checkmark",
          color: colors.info[500],
          level: "info",
        },
      ];

      const mockEvents: SecurityEvent[] = [
        {
          id: "1",
          type: "failed_login",
          level: "warning",
          user: "admin",
          description: "Failed login attempt",
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          ipAddress: "192.168.1.100",
        },
        {
          id: "2",
          type: "permission_change",
          level: "info",
          user: "admin",
          description: "Updated user permissions for 'john_doe'",
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: "3",
          type: "data_access",
          level: "info",
          user: "supervisor_1",
          description: "Accessed sensitive inventory data",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          ipAddress: "192.168.1.105",
        },
        {
          id: "4",
          type: "login",
          level: "info",
          user: "staff_user",
          description: "Successful login",
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
          ipAddress: "192.168.1.110",
        },
      ];

      setMetrics(mockMetrics);
      setRecentEvents(mockEvents);

      // Calculate overall threat level
      const criticalCount = mockMetrics.filter(
        (m) => m.level === "critical",
      ).length;
      const warningCount = mockMetrics.filter(
        (m) => m.level === "warning",
      ).length;

      if (criticalCount > 0) {
        setThreatLevel("critical");
      } else if (warningCount > 1) {
        setThreatLevel("warning");
      } else {
        setThreatLevel("info");
      }
    } catch (error) {
      console.error("Failed to load security data:", error);
      Alert.alert("Error", "Failed to load security data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSecurityData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => loadSecurityData(true), 30000);
    return () => clearInterval(interval);
  }, [loadSecurityData]);

  const getEventIcon = (type: SecurityEventType): string => {
    switch (type) {
      case "login":
        return "log-in";
      case "logout":
        return "log-out";
      case "failed_login":
        return "close-circle";
      case "permission_change":
        return "key";
      case "data_access":
        return "document-text";
      case "api_error":
        return "bug";
      default:
        return "information-circle";
    }
  };

  const getEventColor = (level: SecurityLevel): string => {
    switch (level) {
      case "critical":
        return colors.error[500];
      case "warning":
        return colors.warning[500];
      case "info":
        return colors.info[500];
      default:
        return colors.neutral[500];
    }
  };

  const getThreatLevelDisplay = () => {
    switch (threatLevel) {
      case "critical":
        return {
          color: colors.error[500],
          label: "Critical",
          icon: "warning",
          description: "Immediate attention required",
        };
      case "warning":
        return {
          color: colors.warning[500],
          label: "Elevated",
          icon: "alert-circle",
          description: "Monitor closely",
        };
      case "info":
        return {
          color: colors.success[500],
          label: "Normal",
          icon: "shield-checkmark",
          description: "All systems operational",
        };
    }
  };

  const threatDisplay = getThreatLevelDisplay();

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
            onRefresh={() => loadSecurityData(true)}
            tintColor={colors.primary[400]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Security Dashboard</Text>
            <Text style={styles.subtitle}>Real-time monitoring & auditing</Text>
          </View>
          <AnimatedPressable
            style={styles.settingsButton}
            onPress={() => router.push("/admin/security-settings")}
          >
            <Ionicons name="settings" size={20} color={colors.neutral[100]} />
          </AnimatedPressable>
        </View>

        {/* Threat Level */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)}>
          <GlassCard
            variant="strong"
            style={[
              styles.threatCard,
              { borderLeftColor: threatDisplay.color },
            ]}
          >
            <View style={styles.threatHeader}>
              <Ionicons
                name={threatDisplay.icon as any}
                size={32}
                color={threatDisplay.color}
              />
              <View style={styles.threatInfo}>
                <Text style={styles.threatLabel}>Threat Level</Text>
                <Text
                  style={[styles.threatLevel, { color: threatDisplay.color }]}
                >
                  {threatDisplay.label}
                </Text>
              </View>
            </View>
            <Text style={styles.threatDescription}>
              {threatDisplay.description}
            </Text>
          </GlassCard>
        </Animated.View>

        {/* Security Metrics */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(200 + index * 100).duration(600)}
              style={styles.metricCardWrapper}
            >
              <GlassCard variant="medium" style={styles.metricCard}>
                <View
                  style={[
                    styles.metricIcon,
                    { backgroundColor: metric.color + "20" },
                  ]}
                >
                  <Ionicons
                    name={metric.icon as any}
                    size={24}
                    color={metric.color}
                  />
                </View>
                <Text style={styles.metricTitle}>{metric.title}</Text>
                <View style={styles.metricValueRow}>
                  <Text style={styles.metricValue}>{metric.value}</Text>
                  {metric.change !== 0 && (
                    <View
                      style={[
                        styles.metricChange,
                        {
                          backgroundColor:
                            metric.change > 0
                              ? colors.error[900]
                              : colors.success[900],
                        },
                      ]}
                    >
                      <Ionicons
                        name={metric.change > 0 ? "arrow-up" : "arrow-down"}
                        size={12}
                        color={
                          metric.change > 0
                            ? colors.error[400]
                            : colors.success[400]
                        }
                      />
                      <Text
                        style={[
                          styles.metricChangeText,
                          {
                            color:
                              metric.change > 0
                                ? colors.error[400]
                                : colors.success[400],
                          },
                        ]}
                      >
                        {Math.abs(metric.change)}%
                      </Text>
                    </View>
                  )}
                </View>
              </GlassCard>
            </Animated.View>
          ))}
        </View>

        {/* Recent Security Events */}
        <Animated.View
          entering={FadeInDown.delay(800).duration(600)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            <AnimatedPressable
              onPress={() => router.push("/admin/security-logs")}
            >
              <Text style={styles.viewAllLink}>View All</Text>
            </AnimatedPressable>
          </View>

          <GlassCard variant="medium" style={styles.eventsCard}>
            {recentEvents.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <View
                  style={[
                    styles.eventIconContainer,
                    { backgroundColor: getEventColor(event.level) + "20" },
                  ]}
                >
                  <Ionicons
                    name={getEventIcon(event.type) as any}
                    size={20}
                    color={getEventColor(event.level)}
                  />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventDescription}>
                    {event.description}
                  </Text>
                  <View style={styles.eventMeta}>
                    <Text style={styles.eventUser}>{event.user}</Text>
                    {event.ipAddress && (
                      <>
                        <Text style={styles.eventMetaDot}>•</Text>
                        <Text style={styles.eventIp}>{event.ipAddress}</Text>
                      </>
                    )}
                    <Text style={styles.eventMetaDot}>•</Text>
                    <Text style={styles.eventTime}>
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.eventLevelBadge,
                    { backgroundColor: getEventColor(event.level) + "30" },
                  ]}
                >
                  <Text
                    style={[
                      styles.eventLevelText,
                      { color: getEventColor(event.level) },
                    ]}
                  >
                    {event.level}
                  </Text>
                </View>
              </View>
            ))}
          </GlassCard>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInDown.delay(1000).duration(600)}
          style={styles.section}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <AnimatedPressable
              style={styles.actionCard}
              onPress={() => router.push("/admin/permissions")}
            >
              <GlassCard variant="medium" style={styles.actionCardContent}>
                <Ionicons name="key" size={32} color={colors.primary[400]} />
                <Text style={styles.actionCardTitle}>Permissions</Text>
                <Text style={styles.actionCardDescription}>
                  Manage user access
                </Text>
              </GlassCard>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.actionCard}
              onPress={() => router.push("/admin/audit-logs")}
            >
              <GlassCard variant="medium" style={styles.actionCardContent}>
                <Ionicons
                  name="document-text"
                  size={32}
                  color={colors.secondary[400]}
                />
                <Text style={styles.actionCardTitle}>Audit Logs</Text>
                <Text style={styles.actionCardDescription}>
                  Review all activities
                </Text>
              </GlassCard>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.actionCard}
              onPress={() =>
                Alert.alert("Security Scan", "Starting security scan...")
              }
            >
              <GlassCard variant="medium" style={styles.actionCardContent}>
                <Ionicons name="scan" size={32} color={colors.warning[400]} />
                <Text style={styles.actionCardTitle}>Security Scan</Text>
                <Text style={styles.actionCardDescription}>
                  Run vulnerability check
                </Text>
              </GlassCard>
            </AnimatedPressable>

            <AnimatedPressable
              style={styles.actionCard}
              onPress={() => router.push("/admin/backup")}
            >
              <GlassCard variant="medium" style={styles.actionCardContent}>
                <Ionicons
                  name="cloud-upload"
                  size={32}
                  color={colors.success[400]}
                />
                <Text style={styles.actionCardTitle}>Backup</Text>
                <Text style={styles.actionCardDescription}>Manage backups</Text>
              </GlassCard>
            </AnimatedPressable>
          </View>
        </Animated.View>
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
    marginBottom: spacing.lg,
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
    padding: spacing.sm,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 10,
  },
  threatCard: {
    padding: spacing.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.xl,
  },
  threatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  threatInfo: {
    flex: 1,
  },
  threatLabel: {
    fontSize: 14,
    color: colors.neutral[400],
    marginBottom: spacing.xs,
  },
  threatLevel: {
    fontSize: 24,
    fontWeight: "700",
  },
  threatDescription: {
    fontSize: 14,
    color: colors.neutral[300],
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.xl,
  },
  metricCardWrapper: {
    width: isTablet ? "25%" : "50%",
    padding: spacing.xs,
  },
  metricCard: {
    padding: spacing.md,
    height: 140,
  },
  metricIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  metricTitle: {
    fontSize: 13,
    color: colors.neutral[400],
    marginBottom: spacing.xs,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.neutral[100],
  },
  metricChange: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  metricChangeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.neutral[100],
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary[400],
  },
  eventsCard: {
    padding: spacing.md,
    gap: spacing.md,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  eventIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  eventContent: {
    flex: 1,
    gap: spacing.xs,
  },
  eventDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.neutral[200],
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  eventUser: {
    fontSize: 12,
    color: colors.neutral[400],
    fontWeight: "500",
  },
  eventMetaDot: {
    fontSize: 12,
    color: colors.neutral[600],
  },
  eventIp: {
    fontSize: 12,
    color: colors.neutral[500],
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: "monospace",
    }),
  },
  eventTime: {
    fontSize: 12,
    color: colors.neutral[500],
  },
  eventLevelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  eventLevelText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -spacing.xs,
  },
  actionCard: {
    width: isTablet ? "25%" : "50%",
    padding: spacing.xs,
  },
  actionCardContent: {
    padding: spacing.md,
    alignItems: "center",
    height: 130,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.neutral[100],
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  actionCardDescription: {
    fontSize: 12,
    color: colors.neutral[400],
    textAlign: "center",
  },
});
