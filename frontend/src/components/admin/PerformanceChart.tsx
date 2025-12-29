/**
 * Performance Chart Component - Displays performance metrics with line chart visualization
 * Shows response times, request counts, and error rates over time
 */

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { modernColors, modernBorderRadius, modernShadows } from "@/styles/modernDesignSystem";

interface PerformanceDataPoint {
  timestamp: string;
  response_time_ms: number;
  request_count: number;
  error_count: number;
}

interface PerformanceStats {
  avgResponseTime: number;
  totalRequests: number;
  totalErrors: number;
  peakResponseTime: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  stats: PerformanceStats;
  title?: string;
  loading?: boolean;
}

type MetricType = "response_time" | "requests" | "errors";

const METRIC_CONFIG: Record<
  MetricType,
  {
    label: string;
    unit: string;
    color: string;
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
  }
> = {
  response_time: {
    label: "Response Time",
    unit: "ms",
    color: modernColors.primary[500],
    icon: "timer-outline",
  },
  requests: {
    label: "Requests",
    unit: "",
    color: modernColors.success.main,
    icon: "chart-line",
  },
  errors: {
    label: "Errors",
    unit: "",
    color: modernColors.error.main,
    icon: "alert-circle-outline",
  },
};

function StatCard({
  value,
  unit,
  label,
  icon,
  color,
}: {
  value: number | string;
  unit: string;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
      <Text style={styles.statValue}>
        {typeof value === "number" ? value.toLocaleString() : value}
        {unit && <Text style={styles.statUnit}> {unit}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Simple bar chart since we don't have a chart library
function SimpleBarChart({ data, color }: { data: number[]; color: string }) {
  const maxValue = Math.max(...data, 1);

  return (
    <View style={styles.barChartContainer}>
      {data.slice(-12).map((value, index) => (
        <View key={index} style={styles.barWrapper}>
          <View
            style={[
              styles.bar,
              {
                height: `${(value / maxValue) * 100}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

export function PerformanceChart({
  data,
  stats,
  title = "Performance Metrics",
  loading = false,
}: PerformanceChartProps) {
  const [activeTab, setActiveTab] = useState<MetricType>("response_time");

  const chartData = useMemo(() => {
    switch (activeTab) {
      case "response_time":
        return data.map((d) => d.response_time_ms);
      case "requests":
        return data.map((d) => d.request_count);
      case "errors":
        return data.map((d) => d.error_count);
      default:
        return [];
    }
  }, [data, activeTab]);

  const currentConfig = METRIC_CONFIG[activeTab];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="chart-areaspline"
            size={20}
            color={modernColors.primary[500]}
          />
          <Text style={styles.title}>{title}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading metrics...</Text>
        </View>
      </View>
    );
  }

  const tabs: MetricType[] = ["response_time", "requests", "errors"];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="chart-areaspline"
          size={20}
          color={modernColors.primary[500]}
        />
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          value={stats.avgResponseTime.toFixed(0)}
          unit="ms"
          label="Avg Response"
          icon="timer-outline"
          color={METRIC_CONFIG.response_time.color}
        />
        <StatCard
          value={stats.totalRequests}
          unit=""
          label="Total Requests"
          icon="chart-line"
          color={METRIC_CONFIG.requests.color}
        />
        <StatCard
          value={stats.totalErrors}
          unit=""
          label="Errors"
          icon="alert-circle-outline"
          color={
            stats.totalErrors > 0
              ? METRIC_CONFIG.errors.color
              : modernColors.success.main
          }
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <MaterialCommunityIcons
              name={METRIC_CONFIG[tab].icon}
              size={16}
              color={
                activeTab === tab
                  ? modernColors.primary[500]
                  : modernColors.text.secondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {METRIC_CONFIG[tab].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chart Area */}
      {chartData.length > 0 ? (
        <View style={styles.chartContainer}>
          <SimpleBarChart data={chartData} color={currentConfig.color} />
          <Text style={styles.chartLabel}>
            Last {Math.min(chartData.length, 12)} data points •{" "}
            {currentConfig.label}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyChart}>
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={48}
            color={modernColors.text.secondary}
          />
          <Text style={styles.emptyText}>No data available</Text>
          <Text style={styles.emptySubtext}>
            Performance data will appear here once available
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.card,
    padding: 20,
    ...modernShadows.sm,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: modernColors.text.primary,
    flex: 1,
  } as TextStyle,
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  } as ViewStyle,
  statCard: {
    flex: 1,
    backgroundColor: modernColors.background.paper, // Changed from tertiary for contrast
    borderRadius: modernBorderRadius.md, // Changed from 12 to token
    padding: 12,
    alignItems: "center",
  } as ViewStyle,
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: modernColors.text.primary,
    marginTop: 4,
  } as TextStyle,
  statUnit: {
    fontSize: 12,
    fontWeight: "400",
    color: modernColors.text.secondary,
  } as TextStyle,
  statLabel: {
    fontSize: 11,
    color: modernColors.text.secondary,
    marginTop: 2,
  } as TextStyle,
  tabs: {
    flexDirection: "row",
    backgroundColor: modernColors.background.paper, // Changed from tertiary
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  } as ViewStyle,
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    gap: 4,
  } as ViewStyle,
  activeTab: {
    backgroundColor: modernColors.background.elevated, // Changed to match container
  } as ViewStyle,
  tabText: {
    fontSize: 12,
    color: modernColors.text.secondary,
  } as TextStyle,
  activeTabText: {
    color: modernColors.primary[500],
    fontWeight: "600",
  } as TextStyle,
  chartContainer: {
    minHeight: 160,
  } as ViewStyle,
  barChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 4,
    paddingBottom: 8,
  } as ViewStyle,
  barWrapper: {
    flex: 1,
    height: "100%",
    justifyContent: "flex-end",
  } as ViewStyle,
  bar: {
    width: "100%",
    borderRadius: 4,
    minHeight: 4,
  } as ViewStyle,
  chartLabel: {
    fontSize: 11,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginTop: 8,
  } as TextStyle,
  emptyChart: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  emptyText: {
    fontSize: 14,
    color: modernColors.text.primary,
    marginTop: 12,
  } as TextStyle,
  emptySubtext: {
    fontSize: 12,
    color: modernColors.text.secondary,
    marginTop: 4,
    textAlign: "center",
  } as TextStyle,
  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  loadingText: {
    fontSize: 14,
    color: modernColors.text.secondary,
  } as TextStyle,
});

export default PerformanceChart;
