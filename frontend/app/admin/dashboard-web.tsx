/**
 * Admin Dashboard Web v2.0 - Aurora Design System
 *
 * Features:
 * - Real-time system monitoring (Health, Stats, Sessions)
 * - Interactive charts (Line, Bar, Pie)
 * - Detailed reporting engine
 * - Analytics and metrics
 * - Aurora UI components (Glassmorphism, Gradients)
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  RefreshControl,
  Modal as RNModal,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import Animated, { FadeInDown } from "react-native-reanimated";

import {
  getServicesStatus,
  getSystemIssues,
  getSystemHealthScore,
  getSystemStats,
  getMetricsStats,
  getMetricsHealth,
  getSessionsAnalytics,
  getAvailableReports,
  generateReport,
  getSessions,
  getDiagnosisHealth,
  diagnoseError,
} from "../../src/services/api";

import { AuroraBackground } from "../../src/components/ui/AuroraBackground";
import { GlassCard } from "../../src/components/ui/GlassCard";
import { AnimatedPressable } from "../../src/components/ui/AnimatedPressable";
import { auroraTheme } from "../../src/theme/auroraTheme";
import { SimpleLineChart } from "../../src/components/charts/SimpleLineChart";
import { SimpleBarChart } from "../../src/components/charts/SimpleBarChart";
import { SimplePieChart } from "../../src/components/charts/SimplePieChart";
import { DateRangePicker } from "../../src/components/forms/DateRangePicker";
import { useAuthStore } from "../../src/store/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isWeb = Platform.OS === "web";

type DashboardTab =
  | "overview"
  | "monitoring"
  | "reports"
  | "analytics"
  | "diagnosis";

// Typography helper to map Aurora tokens to styles
const typography = {
  h1: {
    fontFamily: auroraTheme.typography.fontFamily.display,
    fontSize: auroraTheme.typography.fontSize["4xl"],
    fontWeight: "800" as const,
    color: auroraTheme.colors.text.primary,
  },
  h2: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize["2xl"],
    fontWeight: "700" as const,
    color: auroraTheme.colors.text.primary,
  },
  h3: {
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: "600" as const,
    color: auroraTheme.colors.text.primary,
  },
  body: {
    fontFamily: auroraTheme.typography.fontFamily.body,
    fontSize: auroraTheme.typography.fontSize.base,
    color: auroraTheme.colors.text.secondary,
  },
  bodyStrong: {
    fontFamily: auroraTheme.typography.fontFamily.body,
    fontSize: auroraTheme.typography.fontSize.base,
    fontWeight: "600" as const,
    color: auroraTheme.colors.text.primary,
  },
  small: {
    fontFamily: auroraTheme.typography.fontFamily.body,
    fontSize: auroraTheme.typography.fontSize.sm,
    color: auroraTheme.colors.text.tertiary,
  },
  label: {
    fontFamily: auroraTheme.typography.fontFamily.label,
    fontSize: auroraTheme.typography.fontSize.sm,
    fontWeight: "600" as const,
    color: auroraTheme.colors.text.secondary,
  },
};

export default function DashboardWeb() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setLastUpdate] = useState<Date>(new Date());

  // Data States
  const [systemStats, setSystemStats] = useState<any>(null);
  const [servicesStatus, setServicesStatus] = useState<any>(null);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [sessionsAnalytics, setSessionsAnalytics] = useState<any>(null);
  const [diagnosisHealth, setDiagnosisHealth] = useState<any>(null);

  // Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportFilters] = useState<any>({});
  const [generating, setGenerating] = useState(false);

  // Analytics State
  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);

      const [
        servicesRes,
        statsRes,
        metricsRes,
        _healthRes,
        reportsRes,
        issuesRes,
        healthScoreRes,
        _sessionsRes,
        analyticsRes,
        diagnosisHealthRes,
      ] = await Promise.allSettled([
        getServicesStatus().catch(() => ({ data: null })),
        getSystemStats().catch(() => ({ data: null })),
        getMetricsStats().catch(() => ({ data: null })),
        getMetricsHealth().catch(() => ({ data: null })),
        getAvailableReports().catch(() => ({
          success: false,
          data: { reports: [] },
        })),
        getSystemIssues().catch(() => ({ data: { issues: [] } })),
        getSystemHealthScore().catch(() => ({ data: null })),
        getSessions(1, 100).catch(() => ({ data: { sessions: [] } })),
        getSessionsAnalytics().catch(() => ({ data: null })),
        getDiagnosisHealth().catch(() => ({ data: null })),
      ]);

      if (servicesRes.status === "fulfilled")
        setServicesStatus(servicesRes.value?.data);
      if (statsRes.status === "fulfilled") setSystemStats(statsRes.value?.data);
      if (metricsRes.status === "fulfilled") setMetrics(metricsRes.value?.data);
      if (reportsRes.status === "fulfilled")
        setReports(reportsRes.value?.data?.reports || []);
      if (issuesRes.status === "fulfilled")
        setIssues(issuesRes.value?.data?.issues || []);
      if (healthScoreRes.status === "fulfilled")
        setHealthScore(healthScoreRes.value?.data?.score);
      if (analyticsRes.status === "fulfilled")
        setSessionsAnalytics(analyticsRes.value?.data);
      if (diagnosisHealthRes.status === "fulfilled")
        setDiagnosisHealth(diagnosisHealthRes.value);

      setLastUpdate(new Date());
    } catch (error) {
      console.error("Dashboard data load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => loadDashboardData(), 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, [loadDashboardData]);

  const handleGenerateReport = async (reportType: string) => {
    setGenerating(true);
    try {
      const response = await generateReport(reportType, reportFilters);

      if (isWeb) {
        // Web download handling
        const blob = new Blob([response], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute(
          "download",
          `${reportType}_report_${new Date().toISOString()}.xlsx`,
        );
        document.body.appendChild(link);
        link.click();
        link.remove();
      } else {
        // Native file system handling
        const documentDir = (
          FileSystem as { documentDirectory?: string | null }
        ).documentDirectory;
        const encodingType = (
          FileSystem as { EncodingType?: { Base64?: string } }
        ).EncodingType;
        if (documentDir && encodingType?.Base64) {
          const fileUri = `${documentDir}${reportType}_report.xlsx`;
          await (
            FileSystem as {
              writeAsStringAsync?: (
                uri: string,
                contents: string,
                options: { encoding: string },
              ) => Promise<void>;
            }
          ).writeAsStringAsync?.(fileUri, response, {
            encoding: encodingType.Base64,
          });
          await Sharing.shareAsync(fileUri);
        }
      }
      setShowReportModal(false);
    } catch (error) {
      console.error("Report generation failed:", error);
      alert("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  const prepareSessionChartData = () => {
    if (
      !sessionsAnalytics?.sessions_by_date ||
      Object.keys(sessionsAnalytics.sessions_by_date).length === 0
    ) {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return days.map((day) => ({
        x: day,
        y: 0,
      }));
    }

    // Sort dates and take last 7 days
    const sortedDates = Object.keys(sessionsAnalytics.sessions_by_date).sort();
    const last7Dates = sortedDates.slice(-7);

    return last7Dates.map((date) => {
      const count = sessionsAnalytics.sessions_by_date[date];
      const dateObj = new Date(date);
      const label = dateObj.toLocaleDateString(undefined, { weekday: "short" });
      return {
        x: label,
        y: count,
      };
    });
  };

  const prepareStatusChartData = () => {
    if (!systemStats) return [];
    return [
      {
        label: "Active",
        value: systemStats.active_sessions || 0,
        color: auroraTheme.colors.success[500],
      },
      {
        label: "Idle",
        value:
          (systemStats.total_sessions || 0) -
          (systemStats.active_sessions || 0),
        color: auroraTheme.colors.neutral[400],
      },
    ];
  };

  const handleAutoFix = async (issueId: string) => {
    try {
      setRefreshing(true);
      const result = await diagnoseError({
        error_type: issueId,
        error_message: "auto_fix",
      });
      if (result.fixed) {
        Alert.alert("Success", "Issue has been automatically resolved.");
        await loadDashboardData(true);
      } else {
        Alert.alert(
          "Failed",
          "Could not auto-fix this issue. Please check logs.",
        );
      }
    } catch (error) {
      console.error("Auto-fix error:", error);
      Alert.alert("Error", "An error occurred while trying to fix the issue.");
    } finally {
      setRefreshing(false);
    }
  };

  const renderDiagnosis = () => (
    <Animated.View
      entering={FadeInDown.delay(200).springify()}
      style={styles.tabContent}
    >
      <GlassCard variant="medium" style={styles.diagnosisCard}>
        <View style={styles.diagnosisHeader}>
          <View>
            <Text style={styles.sectionTitle}>System Self-Diagnosis</Text>
            <Text style={styles.sectionSubtitle}>
              Automated health checks and issue resolution
            </Text>
          </View>
          <View style={styles.healthBadge}>
            <Text style={styles.healthScoreText}>
              {diagnosisHealth?.health_score || 0}%
            </Text>
          </View>
        </View>

        <View style={styles.diagnosisStats}>
          <View style={styles.diagStatItem}>
            <Text style={styles.diagStatValue}>
              {diagnosisHealth?.total_issues || 0}
            </Text>
            <Text style={styles.diagStatLabel}>Total Issues</Text>
          </View>
          <View style={styles.diagStatItem}>
            <Text
              style={[
                styles.diagStatValue,
                { color: auroraTheme.colors.error[500] },
              ]}
            >
              {diagnosisHealth?.critical_issues || 0}
            </Text>
            <Text style={styles.diagStatLabel}>Critical</Text>
          </View>
          <View style={styles.diagStatItem}>
            <Text
              style={[
                styles.diagStatValue,
                { color: auroraTheme.colors.success[500] },
              ]}
            >
              {diagnosisHealth?.resolved_issues || 0}
            </Text>
            <Text style={styles.diagStatLabel}>Auto-Fixed</Text>
          </View>
        </View>

        <View style={styles.issuesList}>
          {diagnosisHealth?.issues && diagnosisHealth.issues.length > 0 ? (
            diagnosisHealth.issues.map((issue: any, index: number) => (
              <View key={index} style={styles.issueRow}>
                <View
                  style={[
                    styles.issueIcon,
                    {
                      backgroundColor:
                        issue.severity === "critical"
                          ? auroraTheme.colors.error[500] + "20"
                          : auroraTheme.colors.warning[500] + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      issue.severity === "critical" ? "alert-circle" : "warning"
                    }
                    size={20}
                    color={
                      issue.severity === "critical"
                        ? auroraTheme.colors.error[500]
                        : auroraTheme.colors.warning[500]
                    }
                  />
                </View>
                <View style={styles.issueInfo}>
                  <Text style={styles.issueTitle}>
                    {issue.title || issue.type}
                  </Text>
                  <Text style={styles.issueDesc}>
                    {issue.description || issue.message}
                  </Text>
                  {issue.auto_fix_available && (
                    <TouchableOpacity
                      style={styles.autoFixButton}
                      onPress={() => handleAutoFix(issue.id)}
                    >
                      <Ionicons
                        name="build-outline"
                        size={14}
                        color={auroraTheme.colors.primary[400]}
                      />
                      <Text style={styles.autoFixText}>Auto-Fix Available</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.issueTime}>
                  <Text style={styles.timeText}>
                    {new Date(issue.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.noIssues}>
              <Ionicons
                name="checkmark-circle"
                size={48}
                color={auroraTheme.colors.success[500]}
              />
              <Text style={styles.noIssuesText}>No system issues detected</Text>
            </View>
          )}
        </View>
      </GlassCard>
    </Animated.View>
  );

  const renderOverview = () => (
    <Animated.View
      entering={FadeInDown.delay(200).springify()}
      style={styles.tabContent}
    >
      <View style={styles.quickStatsRow}>
        <GlassCard variant="medium" style={styles.quickStatCard}>
          <View style={styles.quickStatIcon}>
            <Ionicons
              name="people"
              size={24}
              color={auroraTheme.colors.primary[400]}
            />
          </View>
          <Text style={styles.quickStatValue}>
            {systemStats?.active_sessions || 0}
          </Text>
          <Text style={styles.quickStatLabel}>Active Sessions</Text>
        </GlassCard>

        <GlassCard variant="medium" style={styles.quickStatCard}>
          <View
            style={[
              styles.quickStatIcon,
              { backgroundColor: auroraTheme.colors.success[500] + "20" },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={24}
              color={auroraTheme.colors.success[500]}
            />
          </View>
          <Text
            style={[
              styles.quickStatValue,
              { color: auroraTheme.colors.success[500] },
            ]}
          >
            {healthScore || 0}%
          </Text>
          <Text style={styles.quickStatLabel}>System Health</Text>
        </GlassCard>

        <GlassCard variant="medium" style={styles.quickStatCard}>
          <View
            style={[
              styles.quickStatIcon,
              { backgroundColor: auroraTheme.colors.secondary[500] + "20" },
            ]}
          >
            <Ionicons
              name="server"
              size={24}
              color={auroraTheme.colors.secondary[500]}
            />
          </View>
          <Text style={styles.quickStatValue}>
            {servicesStatus
              ? Object.values(servicesStatus).filter((s: any) => s.running)
                  .length
              : 0}
            /4
          </Text>
          <Text style={styles.quickStatLabel}>Services Running</Text>
        </GlassCard>

        <GlassCard variant="medium" style={styles.quickStatCard}>
          <View
            style={[
              styles.quickStatIcon,
              { backgroundColor: auroraTheme.colors.warning[500] + "20" },
            ]}
          >
            <Ionicons
              name="warning"
              size={24}
              color={auroraTheme.colors.warning[500]}
            />
          </View>
          <Text
            style={[
              styles.quickStatValue,
              {
                color:
                  issues.length > 0
                    ? auroraTheme.colors.warning[500]
                    : auroraTheme.colors.text.primary,
              },
            ]}
          >
            {issues.length}
          </Text>
          <Text style={styles.quickStatLabel}>Critical Issues</Text>
        </GlassCard>
      </View>

      <View style={styles.chartsRow}>
        <GlassCard variant="medium" style={styles.chartCard} intensity={80}>
          <Text style={styles.chartTitle}>Session Activity</Text>
          <SimpleLineChart
            data={prepareSessionChartData()}
            color={auroraTheme.colors.primary[400]}
            textColor={auroraTheme.colors.text.secondary}
            gridColor={auroraTheme.colors.border.light}
            axisColor={auroraTheme.colors.border.medium}
            xAxisLabel="Last 7 Days"
          />
        </GlassCard>

        <GlassCard variant="medium" style={styles.chartCard} intensity={80}>
          <Text style={styles.chartTitle}>System Distribution</Text>
          <SimplePieChart data={prepareStatusChartData()} showLegend={true} />
        </GlassCard>
      </View>
    </Animated.View>
  );

  const renderMonitoring = () => (
    <Animated.View
      entering={FadeInDown.delay(200).springify()}
      style={styles.tabContent}
    >
      <GlassCard variant="medium" style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Services Status</Text>
        <View style={styles.servicesList}>
          {servicesStatus &&
            Object.entries(servicesStatus).map(
              ([key, service]: [string, any]) => (
                <View key={key} style={styles.serviceRow}>
                  <View style={styles.serviceInfo}>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: service.running
                            ? auroraTheme.colors.success[500]
                            : auroraTheme.colors.error[500],
                        },
                      ]}
                    />
                    <Text style={styles.serviceName}>{key.toUpperCase()}</Text>
                  </View>
                  <View style={styles.serviceDetails}>
                    <Text style={styles.serviceDetailText}>
                      Port: {service.port || "N/A"}
                    </Text>
                    <Text style={styles.serviceDetailText}>
                      PID: {service.pid || "-"}
                    </Text>
                  </View>
                  <View style={styles.serviceStatusBadge}>
                    <Text
                      style={[
                        styles.serviceStatusText,
                        {
                          color: service.running
                            ? auroraTheme.colors.success[500]
                            : auroraTheme.colors.error[500],
                        },
                      ]}
                    >
                      {service.running ? "Running" : "Stopped"}
                    </Text>
                  </View>
                </View>
              ),
            )}
        </View>
      </GlassCard>

      {/* Metrics Grid */}
      {metrics && metrics.request_metrics && (
        <View style={styles.metricsGrid}>
          <GlassCard variant="strong" style={styles.metricCard}>
            <Text style={styles.metricLabel}>Response Time</Text>
            <Text style={styles.metricValue}>
              {metrics.request_metrics.avg_response_time?.toFixed(2) || 0}ms
            </Text>
          </GlassCard>
          <GlassCard variant="strong" style={styles.metricCard}>
            <Text style={styles.metricLabel}>Request Rate</Text>
            <Text style={styles.metricValue}>
              {metrics.request_metrics.requests_per_minute?.toFixed(1) || 0}/min
            </Text>
          </GlassCard>
          <GlassCard variant="strong" style={styles.metricCard}>
            <Text style={styles.metricLabel}>Error Rate</Text>
            <Text
              style={[
                styles.metricValue,
                {
                  color:
                    (metrics.request_metrics.error_rate || 0) > 0.05
                      ? auroraTheme.colors.error[500]
                      : auroraTheme.colors.success[500],
                },
              ]}
            >
              {((metrics.request_metrics.error_rate || 0) * 100).toFixed(2)}%
            </Text>
          </GlassCard>
        </View>
      )}
    </Animated.View>
  );

  const renderReports = () => (
    <Animated.View
      entering={FadeInDown.delay(200).springify()}
      style={styles.tabContent}
    >
      <View style={styles.reportsGrid}>
        {reports.map((report, index) => (
          <GlassCard key={index} variant="medium" style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <View style={styles.reportIcon}>
                <Ionicons
                  name="document-text"
                  size={32}
                  color={auroraTheme.colors.primary[400]}
                />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportTitle}>{report.name}</Text>
                <Text style={styles.reportDesc}>{report.description}</Text>
              </View>
            </View>
            <AnimatedPressable
              style={styles.generateButton}
              onPress={() => {
                setSelectedReport(report.id);
                setShowReportModal(true);
              }}
            >
              <Text style={styles.generateButtonText}>Generate Report</Text>
              <Ionicons name="download-outline" size={18} color="#FFF" />
            </AnimatedPressable>
          </GlassCard>
        ))}
      </View>
    </Animated.View>
  );

  const renderAnalytics = () => (
    <Animated.View
      entering={FadeInDown.delay(200).springify()}
      style={styles.tabContent}
    >
      <GlassCard variant="medium" style={styles.analyticsCard}>
        <View style={styles.analyticsHeader}>
          <Text style={styles.sectionTitle}>Performance Analytics</Text>
          <DateRangePicker
            startDate={analyticsDateRange.start}
            endDate={analyticsDateRange.end}
            onStartDateChange={(d) =>
              setAnalyticsDateRange((prev) => ({ ...prev, start: d }))
            }
            onEndDateChange={(d) =>
              setAnalyticsDateRange((prev) => ({ ...prev, end: d }))
            }
          />
        </View>

        <SimpleBarChart
          data={prepareSessionChartData().map((d) => ({
            label: d.x,
            value: d.y,
          }))}
          title="Daily Sessions"
          showValues={true}
        />
      </GlassCard>
    </Animated.View>
  );

  if (loading) {
    return (
      <AuroraBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={auroraTheme.colors.primary[500]}
          />
          <Text style={styles.loadingText}>Loading Dashboard...</Text>
        </View>
      </AuroraBackground>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AuroraBackground variant="primary" intensity="medium" animated={true}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Admin Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                System Overview & Controls
              </Text>
            </View>
            <View style={styles.headerActions}>
              <AnimatedPressable
                onPress={() => loadDashboardData(true)}
                style={styles.refreshButton}
              >
                <Ionicons
                  name={refreshing ? "sync" : "refresh"}
                  size={20}
                  color={auroraTheme.colors.text.primary}
                />
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => {
                  Alert.alert(
                    "Confirm Logout",
                    "Are you sure you want to logout?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Logout",
                        style: "destructive",
                        onPress: async () => {
                          await logout();
                          router.replace("/login");
                        },
                      },
                    ],
                  );
                }}
                style={styles.logoutButton}
              >
                <Ionicons
                  name="log-out-outline"
                  size={20}
                  color={auroraTheme.colors.status.error}
                />
              </AnimatedPressable>
            </View>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabsContainer}>
            {(
              [
                "overview",
                "monitoring",
                "reports",
                "analytics",
                "diagnosis",
              ] as DashboardTab[]
            ).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content Area */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => loadDashboardData(true)}
                tintColor="#fff"
              />
            }
          >
            {activeTab === "overview" && renderOverview()}
            {activeTab === "monitoring" && renderMonitoring()}
            {activeTab === "reports" && renderReports()}
            {activeTab === "analytics" && renderAnalytics()}
            {activeTab === "diagnosis" && renderDiagnosis()}
          </ScrollView>

          {/* Report Modal */}
          <RNModal
            visible={showReportModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowReportModal(false)}
          >
            <BlurView intensity={20} style={styles.modalOverlay}>
              <GlassCard variant="strong" style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Generate Report</Text>
                  <TouchableOpacity onPress={() => setShowReportModal(false)}>
                    <Ionicons
                      name="close"
                      size={24}
                      color={auroraTheme.colors.text.secondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalBody}>
                  <Text style={styles.modalLabel}>Date Range</Text>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Text style={{ color: auroraTheme.colors.text.secondary }}>
                      Last 30 Days (Default)
                    </Text>
                  </View>

                  <Text style={styles.modalLabel}>Format</Text>
                  <View style={styles.formatOptions}>
                    <TouchableOpacity
                      style={[styles.formatOption, styles.formatOptionActive]}
                    >
                      <Ionicons name="grid-outline" size={20} color="#FFF" />
                      <Text style={styles.formatText}>Excel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.formatOption}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={auroraTheme.colors.text.secondary}
                      />
                      <Text
                        style={[
                          styles.formatText,
                          { color: auroraTheme.colors.text.secondary },
                        ]}
                      >
                        CSV
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.modalFooter}>
                  <AnimatedPressable
                    style={styles.cancelButton}
                    onPress={() => setShowReportModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </AnimatedPressable>
                  <AnimatedPressable
                    style={styles.confirmButton}
                    onPress={() =>
                      selectedReport && handleGenerateReport(selectedReport)
                    }
                    disabled={generating}
                  >
                    {generating ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.confirmButtonText}>Download</Text>
                    )}
                  </AnimatedPressable>
                </View>
              </GlassCard>
            </BlurView>
          </RNModal>
        </View>
      </AuroraBackground>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    ...typography.body,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 20,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 28,
  },
  headerSubtitle: {
    ...typography.body,
    fontSize: 14,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  refreshButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: auroraTheme.glass.medium.backgroundColor as string,
  },
  logoutButton: {
    padding: 10,
    borderRadius: 20,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
    gap: 24,
  },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: auroraTheme.colors.primary[400],
  },
  tabText: {
    ...typography.body,
    fontSize: 16,
  },
  activeTabText: {
    ...typography.bodyStrong,
    color: auroraTheme.colors.text.primary,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 24,
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  quickStatCard: {
    flex: 1,
    minWidth: 140,
    padding: 20,
    alignItems: "center",
  },
  quickStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: auroraTheme.colors.primary[500] + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickStatValue: {
    ...typography.h2,
    marginBottom: 4,
  },
  quickStatLabel: {
    ...typography.small,
  },
  chartsRow: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
  },
  chartCard: {
    flex: 1,
    minWidth: 300,
    padding: 20,
    minHeight: 300,
  },
  chartTitle: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: 24,
  },
  sectionCard: {
    padding: 0,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 20,
    padding: 20,
  },
  servicesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
  },
  serviceInfo: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serviceName: {
    ...typography.bodyStrong,
  },
  serviceDetails: {
    flex: 2,
  },
  serviceDetailText: {
    ...typography.small,
  },
  serviceStatusBadge: {
    flex: 1,
    alignItems: "flex-end",
  },
  serviceStatusText: {
    ...typography.label,
    fontSize: 12,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  metricCard: {
    flex: 1,
    padding: 20,
    minWidth: 150,
  },
  metricLabel: {
    ...typography.small,
    marginBottom: 8,
  },
  metricValue: {
    ...typography.h2,
    fontSize: 24,
  },
  diagnosisCard: {
    padding: 20,
  },
  diagnosisHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sectionSubtitle: {
    ...typography.small,
    color: auroraTheme.colors.text.secondary,
    marginTop: 4,
  },
  healthBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: auroraTheme.colors.primary[500] + "20",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: auroraTheme.colors.primary[500],
  },
  healthScoreText: {
    ...typography.h3,
    color: auroraTheme.colors.primary[400],
  },
  diagnosisStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 20,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    marginBottom: 24,
  },
  diagStatItem: {
    alignItems: "center",
  },
  diagStatValue: {
    ...typography.h2,
    fontSize: 28,
  },
  diagStatLabel: {
    ...typography.small,
    marginTop: 4,
  },
  issuesList: {
    gap: 12,
  },
  issueRow: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    alignItems: "center",
    gap: 16,
  },
  issueIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  issueInfo: {
    flex: 1,
  },
  issueTitle: {
    ...typography.bodyStrong,
    fontSize: 16,
  },
  issueDesc: {
    ...typography.small,
    color: auroraTheme.colors.text.secondary,
    marginTop: 2,
  },
  autoFixButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: auroraTheme.colors.primary[500] + "20",
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  autoFixText: {
    ...typography.label,
    color: auroraTheme.colors.primary[400],
    fontSize: 11,
  },
  issueTime: {
    alignItems: "flex-end",
  },
  timeText: {
    ...typography.small,
    fontSize: 10,
    color: auroraTheme.colors.text.secondary,
  },
  noIssues: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  noIssuesText: {
    ...typography.body,
    color: auroraTheme.colors.text.secondary,
  },
  reportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  reportCard: {
    flex: 1,
    minWidth: 300,
    padding: 20,
  },
  reportHeader: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },
  reportIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: auroraTheme.colors.primary[500] + "20",
    justifyContent: "center",
    alignItems: "center",
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    ...typography.h3,
    fontSize: 16,
    marginBottom: 4,
  },
  reportDesc: {
    ...typography.small,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: auroraTheme.colors.primary[500],
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  generateButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  analyticsCard: {
    padding: 20,
  },
  analyticsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: Math.min(SCREEN_WIDTH * 0.9, 500),
    borderRadius: 24,
    padding: 0,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: auroraTheme.colors.border.light,
  },
  modalTitle: {
    ...typography.h3,
    fontSize: 20,
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    ...typography.label,
    marginTop: 16,
    marginBottom: 8,
  },
  formatOptions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  formatOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
    backgroundColor: auroraTheme.colors.background.tertiary,
  },
  formatOptionActive: {
    backgroundColor: auroraTheme.colors.primary[500],
    borderColor: auroraTheme.colors.primary[500],
  },
  formatText: {
    color: "#FFF",
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: auroraTheme.colors.border.light,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: auroraTheme.colors.border.light,
  },
  cancelButtonText: {
    color: auroraTheme.colors.text.secondary,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: auroraTheme.colors.primary[500],
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
});
