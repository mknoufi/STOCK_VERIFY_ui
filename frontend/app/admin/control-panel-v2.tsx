/**
 * Admin Control Panel v2.0 - Aurora Design
 *
 * Features:
 * - Real-time system health monitoring
 * - Service status management (Backend, Frontend, DB)
 * - Critical issues tracking
 * - System statistics
 * - Aurora UI components (Glass cards, gradients, animations)
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
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { AuroraBackground } from "@/components/ui/AuroraBackground";
import { GlassCard } from "@/components/ui/GlassCard";
// @ts-ignore - StatsCard might have strict type checks that we are fixing
import { StatsCard } from "@/components/ui";
import { AnimatedPressable } from "@/components/ui/AnimatedPressable";
import {
  modernColors,
  modernTypography,
} from "@/styles/modernDesignSystem";
import {
  getServicesStatus,
  getSystemIssues,
  getLoginDevices,
  startService,
  stopService,
} from "@/services/api/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Health Score Component
const HealthScore = ({ score }: { score: number }) => {
  const getColor = (s: number) => {
    if (s >= 90) return modernColors.success.main;
    if (s >= 70) return modernColors.warning.main;
    return modernColors.error.main;
  };

  const getStatus = (s: number) => {
    if (s >= 90) return "Healthy";
    if (s >= 70) return "Degraded";
    return "Critical";
  };

  return (
    <View style={styles.healthScoreContainer}>
      <Text style={styles.healthScoreLabel}>System Health</Text>
      <View style={styles.scoreCircle}>
        <Text style={[styles.scoreValue, { color: getColor(score) }]}>
          {score}%
        </Text>
        <Text style={[styles.scoreStatus, { color: getColor(score) }]}>
          {getStatus(score)}
        </Text>
      </View>
    </View>
  );
};

// Service Item Component
const ServiceItem = ({
  name,
  status,
  onToggle,
  loading,
}: {
  name: string;
  status: any;
  onToggle: () => void;
  loading: boolean;
}) => {
  const isRunning = status?.running;

  return (
    <View style={styles.serviceItem}>
      <View style={styles.serviceInfo}>
        <View
          style={[
            styles.statusIndicator,
            {
              backgroundColor: isRunning
                ? modernColors.success.main
                : modernColors.error.main,
            },
          ]}
        />
        <View>
          <Text style={styles.serviceName}>
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </Text>
          <Text style={styles.serviceDetail}>
            {isRunning ? `Running on port ${status.port}` : "Stopped"}
          </Text>
        </View>
      </View>

      {name !== "database" && name !== "sql_server" && (
        <AnimatedPressable
          onPress={onToggle}
          style={[
            styles.actionButton,
            {
              backgroundColor: isRunning
                ? modernColors.error.main + "20"
                : modernColors.success.main + "20",
              borderColor: isRunning
                ? modernColors.error.main + "40"
                : modernColors.success.main + "40",
            },
          ]}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={modernColors.text.primary} />
          ) : (
            <Text
              style={[
                styles.actionButtonText,
                {
                  color: isRunning
                    ? modernColors.error.main
                    : modernColors.success.main,
                },
              ]}
            >
              {isRunning ? "Stop" : "Start"}
            </Text>
          )}
        </AnimatedPressable>
      )}
    </View>
  );
};

export default function AdminControlPanelV2() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // System Data State
  const [services, setServices] = useState<any>({});
  const [issues, setIssues] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState(0);
  const [stats, setStats] = useState<any>({});

  const loadData = useCallback(async () => {
    try {
      const [servicesRes, issuesRes, devicesRes] = await Promise.all([
        getServicesStatus(),
        getSystemIssues(),
        getLoginDevices(),
      ]);

      if (servicesRes.success) setServices(servicesRes.data);
      if (issuesRes.success) {
        setIssues(issuesRes.data.issues || []);
        let score = 100;
        if (issuesRes.data.issues?.length > 0)
          score -= issuesRes.data.issues.length * 10;
        if (!servicesRes.data.backend?.running) score -= 20;
        if (!servicesRes.data.mongodb?.running) score -= 20;
        setHealthScore(Math.max(0, score));
      }

      setStats({
        activeDevices: devicesRes.data?.count || 0,
        pendingTasks: 0,
        systemLoad: "Low",
      });
    } catch (error) {
      console.error("Failed to load admin data:", error);
      // Alert.alert("Error", "Failed to load system status");
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

  const handleServiceAction = async (
    service: string,
    action: "start" | "stop",
  ) => {
    setActionLoading(service);
    try {
      if (action === "start") {
        await startService(service);
      } else {
        await stopService(service);
      }
      setTimeout(() => {
        loadData();
        setActionLoading(null);
      }, 2000);
    } catch (error) {
      console.error(`Failed to ${action} ${service}:`, error);
      Alert.alert("Error", `Failed to ${action} ${service}`);
      setActionLoading(null);
    }
  };

  const menuItems = [
    { title: "User Management", icon: "people", route: "/admin/users" },
    { title: "System Settings", icon: "settings", route: "/admin/settings" },
    { title: "Audit Logs", icon: "list", route: "/admin/logs" },
    { title: "Database Tools", icon: "server", route: "/admin/database" },
  ];

  if (loading) {
    return (
      <AuroraBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={modernColors.primary[400]} />
          <Text style={styles.loadingText}>Loading System Data...</Text>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AuroraBackground variant="secondary" intensity="medium" animated={true}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={modernColors.primary[500]}
            />
          }
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            style={styles.header}
          >
            <View>
              <Text style={styles.headerTitle}>System Control</Text>
              <Text style={styles.headerSubtitle}>Admin Dashboard</Text>
            </View>
            <View style={styles.headerActions}>
              <AnimatedPressable
                style={styles.iconButton}
                onPress={() => router.back()}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={modernColors.text.secondary}
                />
              </AnimatedPressable>
            </View>
          </Animated.View>

          {/* Quick Stats Grid */}
          <View style={styles.statsGrid}>
            <Animated.View
              entering={FadeInUp.delay(200)}
              style={styles.statCol}
            >
              <StatsCard
                title="Active Devices"
                value={stats.activeDevices?.toString() || "0"}
                icon="phone-portrait-outline"
                subtitle={stats.activeDevices > 0 ? "Online" : "None"}
                variant="primary"
              />
            </Animated.View>
            <Animated.View
              entering={FadeInUp.delay(300)}
              style={styles.statCol}
            >
              <StatsCard
                title="Critical Issues"
                value={issues.length.toString()}
                icon="alert-circle-outline"
                subtitle={issues.length > 0 ? "Action Required" : "None"}
                variant={issues.length > 0 ? "error" : "success"}
              />
            </Animated.View>
          </View>

          {/* Health & Services */}
          <Animated.View
            entering={FadeInDown.delay(400).springify()}
            style={styles.section}
          >
            <GlassCard variant="medium" style={styles.servicesCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>System Services</Text>
                <HealthScore score={healthScore} />
              </View>

              {/* Service List */}
              <View style={styles.serviceList}>
                <ServiceItem
                  name="backend"
                  status={services.backend}
                  loading={actionLoading === "backend"}
                  onToggle={() =>
                    handleServiceAction(
                      "backend",
                      services.backend?.running ? "stop" : "start",
                    )
                  }
                />
                <ServiceItem
                  name="frontend"
                  status={services.frontend}
                  loading={actionLoading === "frontend"}
                  onToggle={() =>
                    handleServiceAction(
                      "frontend",
                      services.frontend?.running ? "stop" : "start",
                    )
                  }
                />
                <ServiceItem
                  name="database"
                  status={services.mongodb}
                  loading={false}
                  onToggle={() => { }}
                />
                <ServiceItem
                  name="sql_server"
                  status={services.sql_server}
                  loading={false}
                  onToggle={() => { }}
                />
              </View>
            </GlassCard>
          </Animated.View>

          {/* Critical Issues List */}
          {issues.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(500).springify()}
              style={styles.section}
            >
              <Text style={styles.sectionTitle}>Critical Issues</Text>
              {issues.map((issue, index) => (
                <GlassCard
                  key={index}
                  variant="medium"
                  style={styles.issueCard}
                >
                  <Ionicons
                    name="warning"
                    size={24}
                    color={modernColors.error.main}
                  />
                  <View style={styles.issueContent}>
                    <Text style={styles.issueMessage}>{issue.message}</Text>
                    <Text style={styles.issueService}>
                      {issue.service} • {issue.type}
                    </Text>
                  </View>
                </GlassCard>
              ))}
            </Animated.View>
          )}

          {/* Admin Tools Grid */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Management Tools</Text>
            <View style={styles.toolsGrid}>
              {menuItems.map((item, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInDown.delay(600 + index * 100)}
                >
                  <AnimatedPressable
                    style={styles.toolCard}
                    onPress={() => router.push(item.route as any)}
                  >
                    <GlassCard variant="medium" style={styles.toolCardContent}>
                      <View style={styles.toolIcon}>
                        <Ionicons
                          name={item.icon as any}
                          size={28}
                          color={modernColors.primary[400]}
                        />
                      </View>
                      <Text style={styles.toolTitle}>{item.title}</Text>
                    </GlassCard>
                  </AnimatedPressable>
                </Animated.View>
              ))}
            </View>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </AuroraBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: modernColors.text.secondary,
    ...modernTypography.body.large,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  headerTitle: {
    ...modernTypography.h1,
    color: modernColors.text.primary,
    fontSize: 28,
  },
  headerSubtitle: {
    ...modernTypography.body.medium,
    color: modernColors.primary[400],
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: modernColors.background.glass,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCol: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
    marginBottom: 16,
    marginLeft: 4,
  },
  servicesCard: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    padding: 20,
  },
  cardTitle: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
  },
  serviceList: {
    gap: 0,
  },
  serviceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  serviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  serviceName: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
  },
  serviceDetail: {
    ...modernTypography.label.small,
    color: modernColors.text.secondary,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 70,
    alignItems: "center",
  },
  actionButtonText: {
    ...modernTypography.button.small,
  },
  healthScoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  healthScoreLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  scoreCircle: {
    alignItems: "center",
  },
  scoreValue: {
    ...modernTypography.h3,
    fontWeight: "bold",
  },
  scoreStatus: {
    ...modernTypography.label.small,
    marginTop: -2,
  },
  issueCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 16,
    backgroundColor: modernColors.error.main + "10",
    marginBottom: 12,
    borderColor: modernColors.error.main + "30",
  },
  issueContent: {
    flex: 1,
  },
  issueMessage: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: "500",
  },
  issueService: {
    ...modernTypography.label.small,
    color: modernColors.error.main,
    marginTop: 4,
  },
  toolsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  toolCard: {
    width: (SCREEN_WIDTH - 52) / 2, // 20 padding * 2 = 40, + 12 gap = 52
  },
  toolCardContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    gap: 12,
  },
  toolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: modernColors.primary[500] + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  toolTitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  bottomSpacer: {
    height: 40,
  },
});
