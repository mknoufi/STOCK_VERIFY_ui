/**
 * Admin Web Dashboard - Comprehensive Monitoring, Reporting & Analytics
 *
 * Features:
 * - Real-time system monitoring
 * - Report generation and management
 * - Analytics and insights
 * - System health tracking
 * - User activity monitoring
 * - Performance metrics
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
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BlurView } from "expo-blur";
import { usePermissions } from "../../hooks/usePermissions";
import { ModernCard } from "../../components/ModernCard";
import { ModernButton } from "../../components/ModernButton";
import {
  modernColors,
  modernSpacing,
  modernTypography,
  modernBorderRadius,
  modernShadows,
} from "../../styles/modernDesignSystem";
import {
  getServicesStatus,
  getSystemStats,
  getMetricsStats,
  getMetricsHealth,
  getAvailableReports,
  generateReport,
  getSystemIssues,
  getSystemHealthScore,
  getSessions,
  getSessionsAnalytics,
  getSyncStats,
  getVarianceTrend,
  getStaffPerformance,
} from "../../services/api";
import { SimpleLineChart as LineChart } from "../../components/charts/SimpleLineChart";
import { SimpleBarChart as BarChart } from "../../components/charts/SimpleBarChart";
import { SimplePieChart as PieChart } from "../../components/charts/SimplePieChart";
import { DateRangePicker } from "../../components/forms/DateRangePicker";

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = width > 768;

type DashboardTab =
  | "overview"
  | "monitoring"
  | "reports"
  | "analytics"
  | "users";

interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: "up" | "down" | "neutral";
}

export default function AdminDashboardWeb() {
  const router = useRouter();
  const { hasRole } = usePermissions();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Data states
  const [services, setServices] = useState<any>(null);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<number | null>(null);

  // Report generation state
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [reportFilters, setReportFilters] = useState<any>({});
  const [generating, setGenerating] = useState(false);
  const [reportFormat, setReportFormat] = useState<"excel" | "csv" | "pdf">(
    "excel",
  );
  const [reportStartDate, setReportStartDate] = useState<Date>(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
  );
  const [reportEndDate, setReportEndDate] = useState<Date>(new Date());

  // Analytics data
  const [sessionsData, setSessionsData] = useState<any[]>([]);
  const [sessionsAnalytics, setSessionsAnalytics] = useState<any>(null);
  const [syncStats, setSyncStats] = useState<any>(null);
  const [varianceTrend, setVarianceTrend] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [analyticsDateRange, setAnalyticsDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    end: new Date(),
  });

  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const [
        servicesRes,
        statsRes,
        metricsRes,
        healthRes,
        reportsRes,
        issuesRes,
        healthScoreRes,
        sessionsRes,
        analyticsRes,
        syncStatsRes,
        varianceTrendRes,
        staffPerformanceRes,
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
        getSyncStats().catch(() => ({ success: false, data: null })),
        getVarianceTrend().catch(() => ({ data: [] })),
        getStaffPerformance().catch(() => ({ data: [] })),
      ]);

      if (servicesRes.status === "fulfilled" && servicesRes.value?.data) {
        setServices(servicesRes.value.data);
      }
      if (statsRes.status === "fulfilled" && statsRes.value?.data) {
        setSystemStats(statsRes.value.data);
      }
      if (metricsRes.status === "fulfilled" && metricsRes.value?.data) {
        setMetrics(metricsRes.value.data);
      }
      if (healthRes.status === "fulfilled" && healthRes.value?.data) {
        setHealth(healthRes.value.data);
      }
      if (reportsRes.status === "fulfilled" && reportsRes.value?.success) {
        setReports(reportsRes.value.data?.reports || []);
      }
      if (issuesRes.status === "fulfilled" && issuesRes.value?.data) {
        setIssues(issuesRes.value.data.issues || []);
      }
      if (healthScoreRes.status === "fulfilled" && healthScoreRes.value?.data) {
        setHealthScore(healthScoreRes.value.data.score);
      }
      if (
        sessionsRes.status === "fulfilled" &&
        sessionsRes.value &&
        "data" in sessionsRes.value &&
        sessionsRes.value.data
      ) {
        setSessionsData(sessionsRes.value.data.sessions || []);
      }
      if (analyticsRes.status === "fulfilled" && analyticsRes.value?.data) {
        setSessionsAnalytics(analyticsRes.value.data);
      }
      if (
        syncStatsRes.status === "fulfilled" &&
        syncStatsRes.value?.success &&
        syncStatsRes.value?.data
      ) {
        setSyncStats(syncStatsRes.value.data);
      }
      if (
        varianceTrendRes.status === "fulfilled" &&
        varianceTrendRes.value?.data
      ) {
        setVarianceTrend(varianceTrendRes.value.data);
      }
      if (
        staffPerformanceRes.status === "fulfilled" &&
        staffPerformanceRes.value?.data
      ) {
        setStaffPerformance(staffPerformanceRes.value.data);
      }

      setLastUpdate(new Date());
    } catch (error: any) {
      __DEV__ && console.error("Dashboard load error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!hasRole("admin")) {
      router.replace("/admin/control-panel" as any);
      return;
    }
    loadDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [hasRole, loadDashboardData, router]);

  const handleGenerateReport = async (reportId: string) => {
    try {
      setGenerating(true);
      const filters = {
        ...reportFilters,
        start_date: reportStartDate.toISOString().split("T")[0],
        end_date: reportEndDate.toISOString().split("T")[0],
        format: reportFormat,
      };
      const response = await generateReport(reportId, reportFormat, filters);
      if (response.success) {
        alert(
          `Report "${reportId}" generation started. Download will be available shortly.`,
        );
        setShowReportModal(false);
        setSelectedReport(null);
        setReportFilters({});
        setReportStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
        setReportEndDate(new Date());
        setReportFormat("excel");
      }
    } catch (error: any) {
      alert(`Error: ${error.message || "Failed to generate report"}`);
    } finally {
      setGenerating(false);
    }
  };

  // Prepare analytics data for charts
  const prepareSessionChartData = () => {
    if (!sessionsData || sessionsData.length === 0) return [];

    // Group sessions by date
    const sessionsByDate: Record<string, number> = {};
    sessionsData.forEach((session: any) => {
      const date = new Date(
        session.created_at || session.start_time,
      ).toLocaleDateString();
      sessionsByDate[date] = (sessionsByDate[date] || 0) + 1;
    });

    return Object.entries(sessionsByDate)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([date, count]) => ({
        x: date,
        y: count,
        label: date,
      }));
  };

  const prepareStatusChartData = () => {
    if (!sessionsData || sessionsData.length === 0) return [];

    const statusCounts: Record<string, number> = {};
    sessionsData.forEach((session: any) => {
      const status = session.status || "unknown";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const colors = [
      modernColors.primary[500],
      modernColors.secondary[500],
      modernColors.accent[500],
      modernColors.warning.main,
      modernColors.error.main,
    ];

    return Object.entries(statusCounts).map(([label, value], index) => ({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      value,
      color: colors[index % colors.length] || modernColors.primary[500], // Ensure color is always defined
    }));
  };

  const prepareUserActivityData = () => {
    if (!sessionsData || sessionsData.length === 0) return [];

    const userActivity: Record<string, number> = {};
    sessionsData.forEach((session: any) => {
      const user =
        session.created_by?.username || session.created_by || "Unknown";
      userActivity[user] = (userActivity[user] || 0) + 1;
    });

    return Object.entries(userActivity)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([label, value]) => ({
        label: label.length > 15 ? label.substring(0, 15) + "..." : label,
        value: value as number,
      }));
  };

  const prepareVarianceTrendData = () => {
    if (!varianceTrend || varianceTrend.length === 0) return [];
    return varianceTrend.map((item: any) => ({
      x: item.date,
      y: item.count,
      label: item.date,
    }));
  };

  const prepareStaffPerformanceData = () => {
    if (!staffPerformance || staffPerformance.length === 0) return [];
    return staffPerformance.map((item: any) => ({
      label: item.username,
      value: item.sessions_count,
    }));
  };

  // Calculate metrics for overview cards
  const getOverviewMetrics = (): MetricCard[] => {
    return [
      {
        title: "Active Users",
        value: metrics?.users?.active || 0,
        change: 12,
        icon: "people",
        color: modernColors.primary[500],
        trend: "up",
      },
      {
        title: "Total Sessions",
        value: metrics?.sessions?.total || 0,
        change: 5,
        icon: "cube",
        color: modernColors.secondary[500],
        trend: "up",
      },
      {
        title: "Items Synced",
        value: metrics?.items?.synced || 0,
        change: -2,
        icon: "sync",
        color: modernColors.accent[500],
        trend: "down",
      },
      {
        title: "System Health",
        value: healthScore ? `${healthScore}%` : "N/A",
        change: healthScore ? healthScore - 95 : 0,
        icon: "heart",
        color:
          healthScore && healthScore > 80
            ? modernColors.success.main
            : modernColors.error.main,
        trend: healthScore && healthScore > 80 ? "up" : "down",
      },
    ];
  };

  const renderOverview = () => {
    const overviewMetrics = getOverviewMetrics();

    return (
      <View style={styles.tabContent as any}>
        {/* Health Score Banner */}
        {healthScore !== null && (
          <ModernCard
            variant="gradient"
            gradientColors={
              healthScore > 80
                ? modernColors.gradients.success
                : healthScore > 60
                  ? modernColors.gradients.warning
                  : modernColors.gradients.error
            }
            style={styles.healthBanner as any}
          >
            <View style={styles.healthBannerContent as any}>
              <View>
                <Text style={styles.healthBannerTitle as any}>
                  System Health Score
                </Text>
                <Text style={styles.healthBannerValue as any}>
                  {healthScore}%
                </Text>
              </View>
              <Ionicons
                name={healthScore > 80 ? "checkmark-circle" : "warning"}
                size={64}
                color="#FFFFFF"
              />
            </View>
          </ModernCard>
        )}

        {/* Metrics Grid */}
        <View style={styles.metricsGrid}>
          {overviewMetrics.map((metric, index) => (
            <ModernCard
              key={index}
              variant="elevated"
              elevation="md"
              style={styles.metricCard}
            >
              <View style={styles.metricHeader}>
                <View
                  style={[
                    styles.metricIconContainer,
                    { backgroundColor: `${metric.color}20` },
                  ]}
                >
                  <Ionicons name={metric.icon} size={24} color={metric.color} />
                </View>
                {metric.trend && (
                  <View
                    style={[
                      styles.trendBadge,
                      {
                        backgroundColor:
                          metric.trend === "up"
                            ? modernColors.success.light
                            : metric.trend === "down"
                              ? modernColors.error.light
                              : modernColors.neutral[200],
                      },
                    ]}
                  >
                    <Ionicons
                      name={metric.trend === "up" ? "arrow-up" : "arrow-down"}
                      size={12}
                      color={
                        metric.trend === "up"
                          ? modernColors.success.main
                          : modernColors.error.main
                      }
                    />
                    <Text
                      style={[
                        styles.trendText,
                        {
                          color:
                            metric.trend === "up"
                              ? modernColors.success.main
                              : modernColors.error.main,
                        },
                      ]}
                    >
                      {Math.abs(metric.change || 0)}%
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricTitle}>{metric.title}</Text>
            </ModernCard>
          ))}
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsRow}>
          <ModernCard variant="elevated" style={styles.quickStatCard}>
            <Text style={styles.quickStatLabel}>Active Sessions</Text>
            <Text style={styles.quickStatValue}>
              {metrics?.sessions?.active || 0}
            </Text>
          </ModernCard>
          <ModernCard variant="elevated" style={styles.quickStatCard}>
            <Text style={styles.quickStatLabel}>Pending Approvals</Text>
            <Text style={styles.quickStatValue}>
              {metrics?.sessions?.pending || 0}
            </Text>
          </ModernCard>
          <ModernCard variant="elevated" style={styles.quickStatCard}>
            <Text style={styles.quickStatLabel}>Sync Errors</Text>
            <Text style={styles.quickStatValue}>
              {issues.filter((i) => i.type === "sync").length}
            </Text>
          </ModernCard>
        </View>

        {/* Recent Issues */}
        {issues.length > 0 && (
          <ModernCard variant="elevated" title="Recent Issues" icon="warning">
            <View style={styles.issuesList}>
              {issues.slice(0, 5).map((issue: any, index: number) => (
                <View key={index} style={styles.issueItem}>
                  <Ionicons
                    name={
                      issue.severity === "high"
                        ? "alert-circle"
                        : issue.severity === "medium"
                          ? "warning"
                          : "information-circle"
                    }
                    size={20}
                    color={
                      issue.severity === "high"
                        ? modernColors.error.main
                        : issue.severity === "medium"
                          ? modernColors.warning.main
                          : modernColors.info.main
                    }
                  />
                  <View style={styles.issueContent}>
                    <Text style={styles.issueTitle}>{issue.title}</Text>
                    <Text style={styles.issueDescription}>
                      {issue.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ModernCard>
        )}
      </View>
    );
  };

  const renderMonitoring = () => {
    return (
      <View style={styles.tabContent}>
        {/* Services Status */}
        <ModernCard variant="elevated" title="Services Status" icon="server">
          <View style={styles.servicesGrid}>
            {services &&
              Object.entries(services).map(([key, service]: [string, any]) => (
                <View key={key} style={styles.serviceCard}>
                  <View style={styles.serviceHeader}>
                    <Text style={styles.serviceName}>
                      {key.charAt(0).toUpperCase() +
                        key.slice(1).replace("_", " ")}
                    </Text>
                    <View
                      style={[
                        styles.serviceStatus,
                        {
                          backgroundColor: service.running
                            ? modernColors.success.main
                            : modernColors.error.main,
                        },
                      ]}
                    />
                  </View>
                  {service.uptime && (
                    <Text style={styles.serviceUptime}>
                      Uptime: {formatUptime(service.uptime)}
                    </Text>
                  )}
                  {service.url && (
                    <Text style={styles.serviceUrl} numberOfLines={1}>
                      {service.url}
                    </Text>
                  )}
                </View>
              ))}
          </View>
        </ModernCard>

        {/* System Stats */}
        {systemStats && (
          <ModernCard
            variant="elevated"
            title="System Statistics"
            icon="stats-chart"
          >
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>CPU Usage</Text>
                <Text style={styles.statValue}>
                  {systemStats.cpu || "N/A"}%
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Memory Usage</Text>
                <Text style={styles.statValue}>
                  {systemStats.memory || "N/A"}%
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Disk Usage</Text>
                <Text style={styles.statValue}>
                  {systemStats.disk || "N/A"}%
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Network I/O</Text>
                <Text style={styles.statValue}>
                  {systemStats.network || "N/A"}
                </Text>
              </View>
            </View>
          </ModernCard>
        )}

        {/* Health Metrics */}
        {health && (
          <ModernCard variant="elevated" title="Health Metrics" icon="heart">
            <View style={styles.healthMetrics}>
              <View style={styles.healthMetric}>
                <Text style={styles.healthMetricLabel}>Database</Text>
                <View style={styles.healthBar}>
                  <View
                    style={[
                      styles.healthBarFill,
                      {
                        width: `${health.database || 0}%`,
                        backgroundColor:
                          health.database > 80
                            ? modernColors.success.main
                            : health.database > 60
                              ? modernColors.warning.main
                              : modernColors.error.main,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.healthMetricValue}>
                  {health.database || 0}%
                </Text>
              </View>
              <View style={styles.healthMetric}>
                <Text style={styles.healthMetricLabel}>API Response</Text>
                <View style={styles.healthBar}>
                  <View
                    style={[
                      styles.healthBarFill,
                      {
                        width: `${health.api || 0}%`,
                        backgroundColor:
                          health.api > 80
                            ? modernColors.success.main
                            : health.api > 60
                              ? modernColors.warning.main
                              : modernColors.error.main,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.healthMetricValue}>{health.api || 0}%</Text>
              </View>
            </View>
          </ModernCard>
        )}
      </View>
    );
  };

  const renderReports = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.reportsHeader}>
          <Text style={styles.sectionTitle}>Available Reports</Text>
          <ModernButton
            title="Generate Custom Report"
            onPress={() => setShowReportModal(true)}
            variant="primary"
            icon="add-circle"
          />
        </View>

        <View style={styles.reportsGrid}>
          {reports.map((report: any, index: number) => (
            <ModernCard
              key={index}
              variant="elevated"
              title={report.name}
              subtitle={report.description}
              style={styles.reportCard}
            >
              <View style={styles.reportActions}>
                <ModernButton
                  title="Generate"
                  onPress={() => {
                    setSelectedReport(report.id);
                    setShowReportModal(true);
                  }}
                  variant="primary"
                  size="small"
                  icon="download"
                />
                <ModernButton
                  title="Preview"
                  onPress={() => {
                    setSelectedReport(report.id);
                    setShowReportModal(true);
                  }}
                  variant="outline"
                  size="small"
                  icon="eye"
                />
              </View>
            </ModernCard>
          ))}
        </View>

        {/* Report Generation Modal */}
        <Modal
          visible={showReportModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowReportModal(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={20} tint="dark" style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Generate Report</Text>
                <TouchableOpacity onPress={() => setShowReportModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={modernColors.text.primary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalLabel}>Report Type</Text>
                <Text style={styles.modalValue}>
                  {selectedReport || "Custom Report"}
                </Text>
                <Text style={styles.modalLabel}>Date Range</Text>
                <DateRangePicker
                  startDate={reportStartDate}
                  endDate={reportEndDate}
                  onStartDateChange={setReportStartDate}
                  onEndDateChange={setReportEndDate}
                />
                <Text style={styles.modalLabel}>Export Format</Text>
                <View style={styles.formatOptions}>
                  <TouchableOpacity
                    style={[
                      styles.formatOption,
                      reportFormat === "excel" && styles.formatOptionActive,
                    ]}
                    onPress={() => setReportFormat("excel")}
                  >
                    <Ionicons
                      name={
                        reportFormat === "excel" ? "checkbox" : "square-outline"
                      }
                      size={20}
                      color={
                        reportFormat === "excel"
                          ? modernColors.primary[500]
                          : modernColors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.formatOptionText,
                        reportFormat === "excel" &&
                          styles.formatOptionTextActive,
                      ]}
                    >
                      Excel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formatOption,
                      reportFormat === "csv" && styles.formatOptionActive,
                    ]}
                    onPress={() => setReportFormat("csv")}
                  >
                    <Ionicons
                      name={
                        reportFormat === "csv" ? "checkbox" : "square-outline"
                      }
                      size={20}
                      color={
                        reportFormat === "csv"
                          ? modernColors.primary[500]
                          : modernColors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.formatOptionText,
                        reportFormat === "csv" && styles.formatOptionTextActive,
                      ]}
                    >
                      CSV
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.formatOption,
                      reportFormat === "pdf" && styles.formatOptionActive,
                    ]}
                    onPress={() => setReportFormat("pdf")}
                  >
                    <Ionicons
                      name={
                        reportFormat === "pdf" ? "checkbox" : "square-outline"
                      }
                      size={20}
                      color={
                        reportFormat === "pdf"
                          ? modernColors.primary[500]
                          : modernColors.text.secondary
                      }
                    />
                    <Text
                      style={[
                        styles.formatOptionText,
                        reportFormat === "pdf" && styles.formatOptionTextActive,
                      ]}
                    >
                      PDF
                    </Text>
                  </TouchableOpacity>
                </View>
                {selectedReport && (
                  <>
                    <Text style={styles.modalLabel}>Additional Filters</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Warehouse (optional)"
                      placeholderTextColor={modernColors.text.tertiary}
                      value={reportFilters.warehouse || ""}
                      onChangeText={(text) =>
                        setReportFilters({ ...reportFilters, warehouse: text })
                      }
                    />
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Status (optional)"
                      placeholderTextColor={modernColors.text.tertiary}
                      value={reportFilters.status || ""}
                      onChangeText={(text) =>
                        setReportFilters({ ...reportFilters, status: text })
                      }
                    />
                  </>
                )}
              </ScrollView>
              <View style={styles.modalFooter}>
                <ModernButton
                  title="Cancel"
                  onPress={() => setShowReportModal(false)}
                  variant="outline"
                />
                <ModernButton
                  title={generating ? "Generating..." : "Generate Report"}
                  onPress={() =>
                    selectedReport && handleGenerateReport(selectedReport)
                  }
                  variant="primary"
                  loading={generating}
                  disabled={generating}
                />
              </View>
            </BlurView>
          </View>
        </Modal>
      </View>
    );
  };

  const renderAnalytics = () => {
    const sessionChartData = prepareSessionChartData();
    const statusChartData = prepareStatusChartData();
    const userActivityData = prepareUserActivityData();
    const varianceTrendData = prepareVarianceTrendData();
    const staffPerformanceData = prepareStaffPerformanceData();

    return (
      <View style={styles.tabContent}>
        {/* Date Range Selector */}
        <ModernCard variant="elevated" title="Analytics Period" icon="calendar">
          <DateRangePicker
            startDate={analyticsDateRange.start}
            endDate={analyticsDateRange.end}
            onStartDateChange={(date: Date) =>
              setAnalyticsDateRange({ ...analyticsDateRange, start: date })
            }
            onEndDateChange={(date: Date) =>
              setAnalyticsDateRange({ ...analyticsDateRange, end: date })
            }
          />
          <View style={styles.quickDateButtons}>
            <ModernButton
              title="Last 7 Days"
              onPress={() =>
                setAnalyticsDateRange({
                  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                  end: new Date(),
                })
              }
              variant="outline"
              size="small"
            />
            <ModernButton
              title="Last 30 Days"
              onPress={() =>
                setAnalyticsDateRange({
                  start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  end: new Date(),
                })
              }
              variant="outline"
              size="small"
            />
            <ModernButton
              title="Last 90 Days"
              onPress={() =>
                setAnalyticsDateRange({
                  start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                  end: new Date(),
                })
              }
              variant="outline"
              size="small"
            />
          </View>
        </ModernCard>

        {/* Sessions Over Time Chart */}
        <ModernCard
          variant="elevated"
          title="Sessions Over Time"
          icon="trending-up"
        >
          {sessionChartData.length > 0 ? (
            <LineChart
              data={sessionChartData}
              color={modernColors.primary[500]}
              showGrid
              showPoints
              title="Daily Session Count"
              yAxisLabel="Sessions"
              xAxisLabel="Date"
            />
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>
                No session data available
              </Text>
            </View>
          )}
        </ModernCard>

        {/* Session Status Distribution */}
        <View style={styles.chartsRow}>
          <ModernCard
            variant="elevated"
            title="Session Status Distribution"
            icon="pie-chart"
            style={styles.chartCard}
          >
            {statusChartData.length > 0 ? (
              <PieChart data={statusChartData} showLegend />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>
                  No status data available
                </Text>
              </View>
            )}
          </ModernCard>

          {/* Top Users Activity */}
          <ModernCard
            variant="elevated"
            title="Top Users by Activity"
            icon="people"
            style={styles.chartCard}
          >
            {userActivityData.length > 0 ? (
              <BarChart data={userActivityData} showValues />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No user activity data</Text>
              </View>
            )}
          </ModernCard>
        </View>

        {/* Advanced Analytics Row */}
        <View style={styles.chartsRow}>
          {/* Variance Trend Chart */}
          <ModernCard
            variant="elevated"
            title="Variance Trend"
            icon="trending-up"
            style={styles.chartCard}
          >
            {varianceTrendData.length > 0 ? (
              <LineChart
                data={varianceTrendData}
                color={modernColors.error.main}
                showGrid
                showPoints
                title="Daily Variance Count"
                yAxisLabel="Variances"
                xAxisLabel="Date"
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>
                  No variance data available
                </Text>
              </View>
            )}
          </ModernCard>

          {/* Staff Performance Chart */}
          <ModernCard
            variant="elevated"
            title="Staff Performance"
            icon="people"
            style={styles.chartCard}
          >
            {staffPerformanceData.length > 0 ? (
              <BarChart
                data={staffPerformanceData}
                showValues
                title="Sessions per Staff"
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>
                  No staff performance data
                </Text>
              </View>
            )}
          </ModernCard>
        </View>

        {/* Analytics Summary */}
        {sessionsAnalytics && (
          <ModernCard
            variant="elevated"
            title="Analytics Summary"
            icon="stats-chart"
          >
            <View style={styles.analyticsSummary}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Sessions</Text>
                <Text style={styles.summaryValue}>
                  {sessionsAnalytics.total_sessions || sessionsData.length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Completed Sessions</Text>
                <Text style={styles.summaryValue}>
                  {sessionsAnalytics.completed_sessions ||
                    sessionsData.filter((s: any) => s.status === "closed")
                      .length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Active Sessions</Text>
                <Text style={styles.summaryValue}>
                  {sessionsAnalytics.active_sessions ||
                    sessionsData.filter(
                      (s: any) =>
                        s.status === "open" || s.status === "in_progress",
                    ).length}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>
                  Average Items per Session
                </Text>
                <Text style={styles.summaryValue}>
                  {sessionsAnalytics.avg_items_per_session
                    ? Math.round(sessionsAnalytics.avg_items_per_session)
                    : "N/A"}
                </Text>
              </View>
            </View>
          </ModernCard>
        )}

        {/* Sync Statistics */}
        {syncStats && (
          <ModernCard variant="elevated" title="Sync Statistics" icon="sync">
            <View style={styles.syncStats}>
              <View style={styles.syncStatItem}>
                <Text style={styles.syncStatLabel}>Last Sync</Text>
                <Text style={styles.syncStatValue}>
                  {syncStats.last_sync
                    ? new Date(syncStats.last_sync).toLocaleString()
                    : "Never"}
                </Text>
              </View>
              <View style={styles.syncStatItem}>
                <Text style={styles.syncStatLabel}>Items Synced</Text>
                <Text style={styles.syncStatValue}>
                  {syncStats.items_synced || 0}
                </Text>
              </View>
              <View style={styles.syncStatItem}>
                <Text style={styles.syncStatLabel}>Sync Status</Text>
                <View
                  style={[
                    styles.syncStatusBadge,
                    {
                      backgroundColor:
                        syncStats.status === "success"
                          ? modernColors.success.main
                          : syncStats.status === "error"
                            ? modernColors.error.main
                            : modernColors.warning.main,
                    },
                  ]}
                >
                  <Text style={styles.syncStatusText}>
                    {syncStats.status || "Unknown"}
                  </Text>
                </View>
              </View>
            </View>
          </ModernCard>
        )}

        {/* Performance Metrics */}
        {metrics && (
          <ModernCard
            variant="elevated"
            title="Performance Metrics"
            icon="speedometer"
          >
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <Ionicons
                  name="time"
                  size={24}
                  color={modernColors.primary[500]}
                />
                <Text style={styles.performanceLabel}>Avg Response Time</Text>
                <Text style={styles.performanceValue}>
                  {metrics.avg_response_time
                    ? `${metrics.avg_response_time}ms`
                    : "N/A"}
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Ionicons
                  name="server"
                  size={24}
                  color={modernColors.secondary[500]}
                />
                <Text style={styles.performanceLabel}>API Requests</Text>
                <Text style={styles.performanceValue}>
                  {metrics.total_requests || 0}
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={modernColors.success.main}
                />
                <Text style={styles.performanceLabel}>Success Rate</Text>
                <Text style={styles.performanceValue}>
                  {metrics.success_rate
                    ? `${(metrics.success_rate * 100).toFixed(1)}%`
                    : "N/A"}
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Ionicons
                  name="alert-circle"
                  size={24}
                  color={modernColors.error.main}
                />
                <Text style={styles.performanceLabel}>Error Rate</Text>
                <Text style={styles.performanceValue}>
                  {metrics.error_rate
                    ? `${(metrics.error_rate * 100).toFixed(1)}%`
                    : "N/A"}
                </Text>
              </View>
            </View>
          </ModernCard>
        )}
      </View>
    );
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={modernColors.primary[500]} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <Text style={styles.headerSubtitle}>
            Last updated: {lastUpdate.toLocaleTimeString()}
          </Text>
        </View>
        <ModernButton
          title="Refresh"
          onPress={() => loadDashboardData(true)}
          variant="outline"
          icon="refresh"
          loading={refreshing}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(
          [
            { id: "overview", label: "Overview", icon: "grid" },
            { id: "monitoring", label: "Monitoring", icon: "pulse" },
            { id: "reports", label: "Reports", icon: "document-text" },
            { id: "analytics", label: "Analytics", icon: "stats-chart" },
          ] as {
            id: DashboardTab;
            label: string;
            icon: keyof typeof Ionicons.glyphMap;
          }[]
        ).map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={
                activeTab === tab.id
                  ? modernColors.primary[500]
                  : modernColors.text.secondary
              }
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab.id && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadDashboardData(true)}
            tintColor={modernColors.primary[500]}
          />
        }
      >
        {activeTab === "overview" && renderOverview()}
        {activeTab === "monitoring" && renderMonitoring()}
        {activeTab === "reports" && renderReports()}
        {activeTab === "analytics" && renderAnalytics()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: modernColors.background.default,
  },
  loadingText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modernSpacing.lg,
    backgroundColor: modernColors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  headerTitle: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
  },
  headerSubtitle: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.xs,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: modernColors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
    paddingHorizontal: modernSpacing.md,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: modernSpacing.md,
    paddingHorizontal: modernSpacing.lg,
    gap: modernSpacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: modernColors.primary[500],
  },
  tabLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    fontWeight: "500",
  },
  tabLabelActive: {
    color: modernColors.primary[500],
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: modernSpacing.lg,
    gap: modernSpacing.lg,
  },
  healthBanner: {
    marginBottom: modernSpacing.md,
  },
  healthBannerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  healthBannerTitle: {
    ...modernTypography.body.medium,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  healthBannerValue: {
    ...modernTypography.display.small,
    color: "#FFFFFF",
    marginTop: modernSpacing.xs,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.lg,
  },
  metricCard: {
    flex: (isWeb && isTablet
      ? "0 0 calc(25% - 12px)"
      : isWeb
        ? "0 0 calc(50% - 12px)"
        : "0 0 100%") as any,
    minWidth: 200,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.md,
  },
  metricIconContainer: {
    width: 48,
    height: 48,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.xs,
    paddingHorizontal: modernSpacing.sm,
    paddingVertical: 2,
    borderRadius: modernBorderRadius.full,
  },
  trendText: {
    ...modernTypography.label.small,
    fontWeight: "600",
  },
  metricValue: {
    ...modernTypography.h2,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.xs,
  },
  metricTitle: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  quickStatsRow: {
    flexDirection: "row",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.lg,
  },
  quickStatCard: {
    flex: 1,
  },
  quickStatLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  quickStatValue: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  issuesList: {
    gap: modernSpacing.md,
  },
  issueItem: {
    flexDirection: "row",
    gap: modernSpacing.md,
    paddingVertical: modernSpacing.sm,
  },
  issueContent: {
    flex: 1,
  },
  issueTitle: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: "600",
    marginBottom: modernSpacing.xs,
  },
  issueDescription: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  servicesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
  },
  serviceCard: {
    flex: (isWeb && isTablet
      ? "0 0 calc(25% - 12px)"
      : isWeb
        ? "0 0 calc(50% - 12px)"
        : "0 0 100%") as any,
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.sm,
  },
  serviceName: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  serviceStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  serviceUptime: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  serviceUrl: {
    ...modernTypography.body.small,
    color: modernColors.text.tertiary,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.lg,
  },
  statItem: {
    flex: (isWeb ? "0 0 calc(25% - 18px)" : "0 0 calc(50% - 12px)") as any,
  },
  statLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  statValue: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  healthMetrics: {
    gap: modernSpacing.lg,
  },
  healthMetric: {
    gap: modernSpacing.sm,
  },
  healthMetricLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  healthBar: {
    height: 8,
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.full,
    overflow: "hidden",
  },
  healthBarFill: {
    height: "100%",
    borderRadius: modernBorderRadius.full,
  },
  healthMetricValue: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  sectionTitle: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.lg,
  },
  reportsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: modernSpacing.lg,
  },
  reportsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
  },
  reportCard: {
    flex: (isWeb && isTablet
      ? "0 0 calc(33.333% - 16px)"
      : isWeb
        ? "0 0 calc(50% - 12px)"
        : "0 0 100%") as any,
    minWidth: 300,
  },
  reportActions: {
    flexDirection: "row",
    gap: modernSpacing.sm,
    marginTop: modernSpacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: isWeb ? 600 : "90%",
    maxHeight: "80%",
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.modal,
    ...modernShadows.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: modernSpacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: modernColors.border.light,
  },
  modalTitle: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  modalBody: {
    padding: modernSpacing.lg,
  },
  modalLabel: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.sm,
    marginTop: modernSpacing.md,
  },
  modalValue: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.md,
  },
  modalInput: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.input,
    padding: modernSpacing.md,
    color: modernColors.text.primary,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    marginBottom: modernSpacing.md,
  },
  formatOptions: {
    flexDirection: "row",
    gap: modernSpacing.sm,
  },
  formatOption: {
    flex: 1,
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    alignItems: "center",
  },
  formatOptionText: {
    ...modernTypography.body.medium,
    color: modernColors.text.primary,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: modernSpacing.md,
    padding: modernSpacing.lg,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  },
  chartsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
    marginBottom: modernSpacing.lg,
  },
  chartCard: {
    flex: (isWeb && isTablet ? "0 0 calc(50% - 12px)" : "0 0 100%") as any,
    minWidth: 300,
  },
  emptyChart: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
  },
  emptyChartText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  },
  quickDateButtons: {
    flexDirection: "row",
    gap: modernSpacing.sm,
    marginTop: modernSpacing.md,
  },
  analyticsSummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.lg,
  },
  summaryItem: {
    flex: (isWeb ? "0 0 calc(25% - 18px)" : "0 0 calc(50% - 12px)") as any,
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
  },
  summaryLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  summaryValue: {
    ...modernTypography.h3,
    color: modernColors.text.primary,
  },
  syncStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
  },
  syncStatItem: {
    flex: (isWeb ? "0 0 calc(33.333% - 12px)" : "0 0 100%") as any,
  },
  syncStatLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  syncStatValue: {
    ...modernTypography.body.large,
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  syncStatusBadge: {
    paddingHorizontal: modernSpacing.md,
    paddingVertical: modernSpacing.xs,
    borderRadius: modernBorderRadius.full,
    alignSelf: "flex-start",
    marginTop: modernSpacing.xs,
  },
  syncStatusText: {
    ...modernTypography.body.small,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  performanceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: modernSpacing.md,
  },
  performanceItem: {
    flex: (isWeb && isTablet
      ? "0 0 calc(25% - 12px)"
      : isWeb
        ? "0 0 calc(50% - 12px)"
        : "0 0 100%") as any,
    alignItems: "center",
    padding: modernSpacing.md,
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.md,
  },
  performanceLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginTop: modernSpacing.sm,
    textAlign: "center",
  },
  performanceValue: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginTop: modernSpacing.xs,
    fontWeight: "600",
  },
  formatOptionActive: {
    borderColor: modernColors.primary[500],
    borderWidth: 2,
    backgroundColor: `${modernColors.primary[500]}20`,
  },
  formatOptionTextActive: {
    color: modernColors.primary[500],
    fontWeight: "600",
  },
});
