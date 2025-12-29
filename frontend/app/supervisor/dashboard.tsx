/**
 * Supervisor Dashboard v2.0 - Aurora Design
 *
 * Features:
 * - Aurora animated background
 * - Glassmorphic stats cards with gradients
 * - Live activity feed with animations
 * - Speed dial menu for quick actions
 * - Real-time session monitoring
 * - Enhanced analytics view
 * - Smooth transitions and haptic feedback
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAutoLogout } from "../../src/hooks/useAutoLogout";
import { getSessions } from "../../src/services/api/api";
import {
  GlassCard,
  StatsCard,
  SpeedDialMenu,
  LiveIndicator,
  ActivityFeedItem,
  ProgressRing,
  AnimatedPressable,
  ScreenContainer,
} from "../../src/components/ui";
import { SpeedDialAction, ActivityType } from "../../src/components/ui";
import { theme } from "../../src/styles/modernDesignSystem";
import { Session } from "../../src/types";

interface DashboardStats {
  totalSessions: number;
  openSessions: number;
  closedSessions: number;
  reconciledSessions: number;
  totalItems: number;
  totalVariance: number;
  positiveVariance: number;
  negativeVariance: number;
  avgVariancePerSession: number;
  highRiskSessions: number;
}

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  status?: "success" | "warning" | "error" | "info";
}

export default function SupervisorDashboard() {
  const router = useRouter();
  useAutoLogout();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalSessions: 0,
    openSessions: 0,
    closedSessions: 0,
    reconciledSessions: 0,
    totalItems: 0,
    totalVariance: 0,
    positiveVariance: 0,
    negativeVariance: 0,
    avgVariancePerSession: 0,
    highRiskSessions: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const sessionsRes = await getSessions(1, 100); // Get first 100 sessions
      const sessionData = sessionsRes.items || [];
      setSessions(sessionData);

      // Calculate stats
      const newStats = sessionData.reduce(
        (acc: DashboardStats, session: Session) => {
          acc.totalSessions++;
          if (session.status === "OPEN") acc.openSessions++;
          if (session.status === "CLOSED") acc.closedSessions++;
          if (session.status === "RECONCILE") acc.reconciledSessions++;

          acc.totalItems += session.total_items || 0;
          acc.totalVariance += session.total_variance || 0;

          if ((session.total_variance || 0) > 0)
            acc.positiveVariance += session.total_variance;
          if ((session.total_variance || 0) < 0)
            acc.negativeVariance += session.total_variance;

          if (Math.abs(session.total_variance ?? 0) > 1000)
            acc.highRiskSessions++;

          return acc;
        },
        {
          totalSessions: 0,
          openSessions: 0,
          closedSessions: 0,
          reconciledSessions: 0,
          totalItems: 0,
          totalVariance: 0,
          positiveVariance: 0,
          negativeVariance: 0,
          avgVariancePerSession: 0,
          highRiskSessions: 0,
        },
      );

      newStats.avgVariancePerSession =
        newStats.totalSessions > 0
          ? newStats.totalVariance / newStats.totalSessions
          : 0;

      setStats(newStats);

      // Generate activity feed from recent sessions
      const recentActivities: ActivityItem[] = sessionData
        .slice(0, 10)
        .map((session: Session, _index: number) => ({
          id: session.id,
          type: "session" as ActivityType,
          title: `Session ${session.status.toLowerCase()}`,
          description: `${session.warehouse} - ${session.staff_name || "Unknown"} - ${session.total_items} items`,
          timestamp: new Date(session.started_at),
          status:
            session.status === "OPEN"
              ? "info"
              : session.status === "CLOSED"
                ? "success"
                : "warning",
        }));

      setActivities(recentActivities);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      Alert.alert("Error", "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    loadData();
  };

  const handleStatPress = (statType: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Navigate to filtered view or show details
    __DEV__ && console.log("Stat pressed:", statType);
  };

  const speedDialActions: SpeedDialAction[] = [
    {
      icon: "eye-outline",
      label: "Watchtower",
      onPress: () => router.push("/supervisor/watchtower" as any),
    },
    {
      icon: "cloud-offline-outline",
      label: "Offline Queue",
      onPress: () => router.push("/supervisor/offline-queue" as any),
    },
    {
      icon: "pricetag-outline",
      label: "Update MRP",
      onPress: () => Alert.alert("Update MRP", "MRP update feature"),
    },
    {
      icon: "filter-outline",
      label: "Filter",
      onPress: () => Alert.alert("Filter", "Filter sessions"),
    },
    {
      icon: "bar-chart-outline",
      label: "Analytics",
      onPress: () => Alert.alert("Analytics", "View analytics"),
    },
    {
      icon: "layers-outline",
      label: "Bulk Ops",
      onPress: () => Alert.alert("Bulk Operations", "Perform bulk operations"),
    },
  ];

  const completionPercentage =
    stats.totalSessions > 0
      ? ((stats.closedSessions + stats.reconciledSessions) /
          stats.totalSessions) *
        100
      : 0;

  return (
    <ScreenContainer
      header={{
        title: "Dashboard",
        subtitle: "Supervisor Panel",
        showUsername: true,
        showLogoutButton: true,
        rightAction: {
          icon: "settings-outline",
          onPress: () => router.push("/supervisor/settings" as any),
        },
      }}
      statusBarStyle="light"
      contentMode="static"
      noPadding
    >
      {loading && !refreshing ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Ionicons
            name="cube-outline"
            size={48}
            color={theme.colors.primary[500]}
            style={{ marginBottom: 16 }}
          />
          <Text style={{ color: theme.colors.text.secondary }}>
            Loading Dashboard...
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary[500]}
              colors={[theme.colors.primary[500]]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(0).springify()}
            style={styles.header}
          >
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  {
                    fontSize: 48,
                    color: theme.colors.text.primary,
                  },
                ]}
              >
                Dashboard
              </Text>
              <LiveIndicator label="Real-time monitoring" size="small" />
            </View>
            <AnimatedPressable
              onPress={() => router.push("/supervisor/settings" as any)}
              hapticFeedback="light"
            >
              <View style={styles.settingsButton}>
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={theme.colors.text.primary}
                />
              </View>
            </AnimatedPressable>
          </Animated.View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statsRow}>
              <StatsCard
                title="Total Sessions"
                value={stats.totalSessions}
                icon="folder-open"
                variant="primary"
                onPress={() => handleStatPress("total")}
                style={styles.statCard}
                delay={100}
                animated
              />
              <StatsCard
                title="Open Sessions"
                value={stats.openSessions}
                icon="time"
                variant="warning"
                onPress={() => handleStatPress("open")}
                style={styles.statCard}
                delay={150}
                animated
              />
            </View>

            <View style={styles.statsRow}>
              <StatsCard
                title="Items Counted"
                value={stats.totalItems}
                icon="cube"
                variant="info"
                onPress={() => handleStatPress("items")}
                style={styles.statCard}
                delay={200}
                animated
              />
              <StatsCard
                title="High Risk"
                value={stats.highRiskSessions}
                icon="warning"
                variant="error"
                subtitle="Sessions"
                onPress={() => handleStatPress("risk")}
                style={styles.statCard}
                delay={250}
                animated
              />
            </View>
          </View>

          {/* Completion Progress */}
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <GlassCard
              variant="medium"
              intensity={25}
              borderRadius={theme.borderRadius.xl}
              padding={theme.spacing.lg}
              withGradientBorder={true}
              elevation="lg"
              style={styles.progressCard}
            >
              <View style={styles.progressContent}>
                <View style={styles.progressInfo}>
                  <Text
                    style={[
                      styles.progressTitle,
                      {
                        fontSize: 20,
                        color: theme.colors.text.primary,
                      },
                    ]}
                  >
                    Session Completion
                  </Text>
                  <Text
                    style={[
                      styles.progressSubtitle,
                      {
                        fontSize: 14,
                        color: theme.colors.text.secondary,
                      },
                    ]}
                  >
                    {stats.closedSessions + stats.reconciledSessions} of{" "}
                    {stats.totalSessions} completed
                  </Text>
                </View>
                <ProgressRing
                  progress={completionPercentage}
                  size={100}
                  strokeWidth={10}
                  colors={[
                    theme.colors.success.main,
                    theme.colors.success.main + "CC",
                  ]}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Activity Feed */}
          <Animated.View
            entering={FadeInDown.delay(350).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    fontSize: 24,
                    color: theme.colors.text.primary,
                  },
                ]}
              >
                Recent Activity
              </Text>
              <AnimatedPressable
                onPress={() => router.push("/supervisor/activity" as any)}
                hapticFeedback="light"
              >
                <Text
                  style={[
                    styles.sectionLink,
                    {
                      fontSize: 14,
                      color: theme.colors.primary[500],
                    },
                  ]}
                >
                  View All
                </Text>
              </AnimatedPressable>
            </View>

            <GlassCard
              variant="medium"
              intensity={25}
              borderRadius={theme.borderRadius.xl}
              padding={theme.spacing.lg}
              elevation="md"
            >
              {activities.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="time-outline"
                    size={48}
                    color={theme.colors.text.secondary}
                  />
                  <Text
                    style={[
                      styles.emptyText,
                      {
                        fontSize: 16,
                        color: theme.colors.text.secondary,
                      },
                    ]}
                  >
                    No recent activity
                  </Text>
                </View>
              ) : (
                activities
                  .slice(0, 5)
                  .map((activity, index) => (
                    <ActivityFeedItem
                      key={activity.id}
                      type={activity.type}
                      title={activity.title}
                      description={activity.description}
                      timestamp={activity.timestamp}
                      status={activity.status}
                      onPress={() =>
                        router.push(`/supervisor/session/${activity.id}` as any)
                      }
                      delay={index * 50}
                    />
                  ))
              )}
            </GlassCard>
          </Animated.View>

          {/* Recent Sessions */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    fontSize: 24,
                    color: theme.colors.text.primary,
                  },
                ]}
              >
                Recent Sessions
              </Text>
              <AnimatedPressable
                onPress={() => router.push("/supervisor/sessions" as any)}
                hapticFeedback="light"
              >
                <Text
                  style={[
                    styles.sectionLink,
                    {
                      fontSize: 14,
                      color: theme.colors.primary[500],
                    },
                  ]}
                >
                  View All
                </Text>
              </AnimatedPressable>
            </View>

            {sessions.slice(0, 3).map((session, index) => (
              <Animated.View
                key={session.id}
                entering={FadeInDown.delay(450 + index * 50).springify()}
              >
                <AnimatedPressable
                  onPress={() =>
                    router.push(`/supervisor/session/${session.id}` as any)
                  }
                  hapticFeedback="light"
                >
                  <GlassCard
                    variant="medium"
                    intensity={25}
                    borderRadius={theme.borderRadius.lg}
                    padding={theme.spacing.md}
                    elevation="md"
                    style={styles.sessionCard}
                  >
                    <View style={styles.sessionHeader}>
                      <View style={styles.sessionInfo}>
                        <Text
                          style={[
                            styles.sessionWarehouse,
                            {
                              fontSize: 16,
                              color: theme.colors.text.primary,
                            },
                          ]}
                        >
                          {session.warehouse}
                        </Text>
                        <Text
                          style={[
                            styles.sessionStaff,
                            {
                              fontSize: 14,
                              color: theme.colors.text.secondary,
                            },
                          ]}
                        >
                          {session.staff_name || "Unknown"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              session.status === "OPEN"
                                ? theme.colors.warning.main
                                : session.status === "CLOSED"
                                  ? theme.colors.success.main
                                  : theme.colors.secondary[500],
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              fontSize: 12,
                            },
                          ]}
                        >
                          {session.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.sessionStats}>
                      <View style={styles.sessionStat}>
                        <Ionicons
                          name="cube-outline"
                          size={16}
                          color={theme.colors.text.secondary}
                        />
                        <Text
                          style={[
                            styles.sessionStatText,
                            {
                              fontSize: 14,
                              color: theme.colors.text.secondary,
                            },
                          ]}
                        >
                          {session.total_items} items
                        </Text>
                      </View>
                      <View style={styles.sessionStat}>
                        <Ionicons
                          name="analytics-outline"
                          size={16}
                          color={
                            Math.abs(session.total_variance) > 0
                              ? theme.colors.error.main
                              : theme.colors.text.secondary
                          }
                        />
                        <Text
                          style={[
                            styles.sessionStatText,
                            {
                              fontSize: 14,
                              color:
                                Math.abs(session.total_variance) > 0
                                  ? theme.colors.error.main
                                  : theme.colors.text.secondary,
                            },
                          ]}
                        >
                          Var: {session.total_variance}
                        </Text>
                      </View>
                    </View>
                  </GlassCard>
                </AnimatedPressable>
              </Animated.View>
            ))}
          </Animated.View>

          {/* Bottom Spacing for Speed Dial */}
          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Speed Dial Menu */}
      <SpeedDialMenu actions={speedDialActions} position="bottom-right" />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.xl,
  },
  headerTitle: {
    fontWeight: "700",
    marginBottom: theme.spacing.sm,
    letterSpacing: -1,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.xl,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  statsGrid: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.md,
  },
  statCard: {
    flex: 1,
  },
  progressCard: {
    marginBottom: theme.spacing.xl,
  },
  progressContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  progressTitle: {
    fontWeight: "600",
  },
  progressSubtitle: {},
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontWeight: "600",
  },
  sectionLink: {
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
  sessionCard: {
    marginBottom: theme.spacing.md,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
  },
  sessionInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  sessionWarehouse: {
    fontWeight: "600",
  },
  sessionStaff: {},
  statusBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
  statusText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sessionStats: {
    flexDirection: "row",
    gap: theme.spacing.lg,
  },
  sessionStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
  },
  sessionStatText: {},
  scrollView: {
    flex: 1,
  },
});
