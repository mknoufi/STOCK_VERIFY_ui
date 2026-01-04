import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { getWatchtowerStats } from "../../src/services/api/api";
import {
  AuroraBackground,
  GlassCard,
  StatsCard,
  LiveIndicator,
  ActivityFeedItem,
  AnimatedPressable,
} from "../../src/components/ui";
import { auroraTheme } from "../../src/theme/auroraTheme";

interface WatchtowerStats {
  active_sessions: number;
  total_scans_today: number;
  active_users: number;
  hourly_throughput: number[];
  predicted_risk_count?: number;
  high_risk_items?: {
    item_code: string;
    item_name: string;
    category: string;
    risk_score: number;
    reason: string;
  }[];
  recent_activity: {
    item_code: string;
    qty: number;
    user: string;
    time: string;
  }[];
}

const ChartBar = ({
  height,
  label,
  active,
}: {
  height: number;
  label: string;
  active?: boolean;
}) => (
  <View style={styles.chartBarContainer}>
    <View style={styles.chartBarWrapper}>
      <View
        style={[
          styles.chartBar,
          {
            height: Math.max(height, 4),
            backgroundColor: active
              ? auroraTheme.colors.success[500]
              : auroraTheme.colors.background.glass,
            borderColor: active
              ? auroraTheme.colors.success[400]
              : auroraTheme.colors.border.light,
          },
        ]}
      />
    </View>
    <Text
      style={[
        styles.chartLabel,
        active && {
          color: auroraTheme.colors.success[400],
          fontWeight: "bold",
        },
      ]}
    >
      {label}
    </Text>
  </View>
);

export default function WatchtowerScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<WatchtowerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = useCallback(async () => {
    try {
      if (!stats) setLoading(true);
      const data = await getWatchtowerStats();
      setStats(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to fetch watchtower stats", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats]);

  useEffect(() => {
    fetchStats();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const onRefresh = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setRefreshing(true);
    fetchStats();
  };

  const getProcessingRate = () => {
    if (!stats) return 0;
    // Simple throughput calculation (items / hour avg for active hours)
    const total = stats.total_scans_today;
    const currentHour = new Date().getHours();
    // Avoid division by zero, assume at least 1 hour operating if count > 0
    return currentHour > 0 ? Math.round(total / currentHour) : total;
  };

  return (
    <AuroraBackground variant="secondary" intensity="medium" animated={true}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={auroraTheme.colors.primary[500]}
            colors={[auroraTheme.colors.primary[500]]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInDown.delay(0).springify()}
          style={styles.header}
        >
          <View style={styles.headerLeft}>
            <AnimatedPressable
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={auroraTheme.colors.text.primary}
              />
            </AnimatedPressable>
            <View>
              <Text
                style={[
                  styles.headerTitle,
                  {
                    fontFamily: auroraTheme.typography.fontFamily.heading,
                    fontSize: auroraTheme.typography.fontSize["3xl"],
                    color: auroraTheme.colors.text.primary,
                  },
                ]}
              >
                Watchtower
              </Text>
              <Text style={styles.lastUpdatedText}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            </View>
          </View>
          <LiveIndicator label="LIVE" size="small" />
        </Animated.View>

        {loading && !stats && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={auroraTheme.colors.primary[500]}
            />
            <Text style={styles.loadingText}>Connecting to Watchtower...</Text>
          </View>
        ) : stats ? (
          <>
            {/* Primary Metrics Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statsRow}>
                <StatsCard
                  title="Active Staff"
                  value={stats.active_users}
                  icon="people"
                  variant="success"
                  style={styles.statCard}
                  delay={100}
                />
                <StatsCard
                  title="Open Sessions"
                  value={stats.active_sessions}
                  icon="folder-open"
                  variant="primary"
                  style={styles.statCard}
                  delay={150}
                />
              </View>

              <View style={styles.statsRow}>
                <StatsCard
                  title="Total Scans"
                  value={stats.total_scans_today}
                  icon="scan-circle"
                  variant="warning"
                  style={styles.statCard}
                  delay={200}
                />
                <StatsCard
                  title="Avg Items/Hr"
                  value={getProcessingRate()}
                  icon="speedometer"
                  variant="info"
                  style={styles.statCard}
                  delay={250}
                />
              </View>
            </View>

            {/* Throughput Chart */}
            <Animated.View
              entering={FadeInDown.delay(300).springify()}
              style={styles.section}
            >
              <GlassCard
                variant="medium"
                intensity={20}
                borderRadius={auroraTheme.borderRadius.lg}
                padding={auroraTheme.spacing.lg}
                elevation="md"
              >
                <Text style={styles.sectionTitle}>Hourly Throughput</Text>
                <View style={styles.chartContainer}>
                  {stats.hourly_throughput.map((count, index) => {
                    // Only show operational hours (e.g., 8 AM to 8 PM) or active hours
                    if (index < 6 || index > 22) return null;
                    const max = Math.max(...stats.hourly_throughput, 10); // Scale base
                    const height = (count / max) * 100;
                    const isCurrentHour = index === new Date().getHours();
                    return (
                      <ChartBar
                        key={index}
                        height={height}
                        label={`${index}:00`}
                        active={isCurrentHour}
                      />
                    );
                  })}
                </View>
              </GlassCard>
            </Animated.View>

            {/* AI Predictive Risk Section */}
            {stats.high_risk_items && stats.high_risk_items.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(325).springify()}
                style={styles.section}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    Predictive Risk Analysis
                  </Text>
                  <View style={styles.riskBadge}>
                    <Text style={styles.riskBadgeText}>
                      {stats.predicted_risk_count} High Risk
                    </Text>
                  </View>
                </View>

                <GlassCard
                  variant="medium"
                  intensity={25}
                  borderRadius={auroraTheme.borderRadius.lg}
                  padding={auroraTheme.spacing.md}
                  elevation="md"
                  style={styles.riskCard}
                >
                  {stats.high_risk_items.map((item, idx) => (
                    <View
                      key={`${item.item_code}-${idx}`}
                      style={[
                        styles.riskItem,
                        idx < (stats.high_risk_items?.length || 0) - 1 &&
                          styles.riskItemSeparator,
                      ]}
                    >
                      <View style={styles.riskItemLeft}>
                        <View
                          style={[
                            styles.riskIndicator,
                            {
                              backgroundColor:
                                item.risk_score > 0.7
                                  ? auroraTheme.colors.error[500]
                                  : auroraTheme.colors.warning[500],
                            },
                          ]}
                        />
                        <View>
                          <Text style={styles.itemName}>{item.item_name}</Text>
                          <Text style={styles.itemCode}>
                            {item.item_code} • {item.category}
                          </Text>
                          <Text style={styles.riskReason}>{item.reason}</Text>
                        </View>
                      </View>
                      <View style={styles.riskItemRight}>
                        <Text
                          style={[
                            styles.riskScore,
                            {
                              color:
                                item.risk_score > 0.7
                                  ? auroraTheme.colors.error[400]
                                  : auroraTheme.colors.warning[400],
                            },
                          ]}
                        >
                          {Math.round(item.risk_score * 100)}%
                        </Text>
                        <Text style={styles.riskLabel}>RISK</Text>
                      </View>
                    </View>
                  ))}
                </GlassCard>
              </Animated.View>
            )}
            <Animated.View
              entering={FadeInDown.delay(350).springify()}
              style={styles.section}
            >
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    marginBottom: auroraTheme.spacing.md,
                    marginLeft: auroraTheme.spacing.xs,
                  },
                ]}
              >
                Recent Activity
              </Text>

              <GlassCard
                variant="medium"
                intensity={15}
                borderRadius={auroraTheme.borderRadius.lg}
                padding={auroraTheme.spacing.md}
                elevation="sm"
              >
                {stats.recent_activity.length > 0 ? (
                  stats.recent_activity.map((activity, idx) => (
                    <ActivityFeedItem
                      key={`${idx}-${activity.time}`}
                      type="scan"
                      title={`${activity.user} scanned ${activity.item_code}`}
                      description={`Quantity: ${activity.qty}`}
                      timestamp={activity.time}
                      status="info"
                      delay={idx * 50}
                    />
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="time-outline"
                      size={48}
                      color={auroraTheme.colors.text.tertiary}
                    />
                    <Text style={styles.emptyText}>No recent activity</Text>
                  </View>
                )}
              </GlassCard>
            </Animated.View>
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={auroraTheme.colors.error[500]}
            />
            <Text style={styles.errorText}>Failed to load statistics</Text>
            <AnimatedPressable onPress={fetchStats} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </AnimatedPressable>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </AuroraBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: auroraTheme.spacing.lg,
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: auroraTheme.spacing.xl,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  backButton: {
    padding: auroraTheme.spacing.xs,
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  headerTitle: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  lastUpdatedText: {
    fontFamily: auroraTheme.typography.fontFamily.mono,
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    marginTop: 4,
  },
  loadingContainer: {
    padding: auroraTheme.spacing["2xl"],
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  loadingText: {
    fontSize: auroraTheme.typography.fontSize.md,
    color: auroraTheme.colors.text.secondary,
  },
  statsGrid: {
    gap: auroraTheme.spacing.md,
    marginBottom: auroraTheme.spacing.xl,
  },
  statsRow: {
    flexDirection: "row",
    gap: auroraTheme.spacing.md,
  },
  statCard: {
    flex: 1,
  },
  section: {
    marginBottom: auroraTheme.spacing.xl,
  },
  sectionTitle: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginBottom: auroraTheme.spacing.md,
  },
  chartContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 150,
    gap: 4,
    paddingTop: auroraTheme.spacing.md,
  },
  chartBarContainer: {
    alignItems: "center",
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  },
  chartBarWrapper: {
    width: "100%",
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 2,
  },
  chartBar: {
    width: "100%",
    borderRadius: 4,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  chartLabel: {
    fontSize: 10,
    color: auroraTheme.colors.text.tertiary,
    marginTop: 6,
    fontFamily: auroraTheme.typography.fontFamily.mono,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: auroraTheme.spacing.xl,
    gap: auroraTheme.spacing.md,
  },
  emptyText: {
    color: auroraTheme.colors.text.secondary,
    fontStyle: "italic",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: auroraTheme.spacing["2xl"],
    gap: auroraTheme.spacing.md,
  },
  errorText: {
    color: auroraTheme.colors.error[500],
    fontSize: auroraTheme.typography.fontSize.md,
  },
  retryButton: {
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.sm,
    backgroundColor: auroraTheme.colors.primary[500],
    borderRadius: auroraTheme.borderRadius.full,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.md,
  },
  riskBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: auroraTheme.colors.error[500] + "20",
    borderRadius: auroraTheme.borderRadius.full,
    borderWidth: 1,
    borderColor: auroraTheme.colors.error[500] + "40",
  },
  riskBadgeText: {
    color: auroraTheme.colors.error[400],
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: "bold",
  },
  riskCard: {
    marginBottom: auroraTheme.spacing.md,
  },
  riskItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: auroraTheme.spacing.md,
  },
  riskItemSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
  },
  riskItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
    flex: 1,
  },
  riskIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  itemName: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginBottom: 2,
  },
  itemCode: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.text.secondary,
    fontFamily: auroraTheme.typography.fontFamily.mono,
  },
  riskReason: {
    fontSize: auroraTheme.typography.fontSize.xs,
    color: auroraTheme.colors.warning[400],
    marginTop: 4,
    fontStyle: "italic",
  },
  riskItemRight: {
    alignItems: "flex-end",
    marginLeft: auroraTheme.spacing.md,
  },
  riskScore: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: "bold",
    fontFamily: auroraTheme.typography.fontFamily.mono,
  },
  riskLabel: {
    fontSize: 10,
    color: auroraTheme.colors.text.tertiary,
    fontWeight: "bold",
    marginTop: -2,
  },
});
