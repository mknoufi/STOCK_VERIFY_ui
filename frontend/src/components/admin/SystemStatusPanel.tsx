/**
 * System Status Panel - Displays real-time system health metrics
 * Shows API status, database connections, response times, and resource usage
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auroraTheme } from "@/theme/auroraTheme";

interface SystemStatus {
  api_health: string;
  mongodb_status: string;
  sqlserver_status: string;
  avg_response_time_ms: number;
  error_rate_percent: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  uptime_seconds: number;
  timestamp: string;
}

interface SystemStatusPanelProps {
  status: SystemStatus | null;
  loading?: boolean;
}

type StatusType = "healthy" | "degraded" | "down" | "unknown";

const STATUS_CONFIG: Record<
  StatusType,
  { color: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  healthy: { color: auroraTheme.colors.success[500], icon: "check-circle" },
  degraded: { color: auroraTheme.colors.warning[500], icon: "alert-circle" },
  down: { color: auroraTheme.colors.error[500], icon: "close-circle" },
  unknown: { color: auroraTheme.colors.text.secondary, icon: "help-circle" },
};

function getStatusType(status: string): StatusType {
  if (status === "connected" || status === "healthy") return "healthy";
  if (status === "degraded" || status === "slow") return "degraded";
  if (status === "disconnected" || status === "down") return "down";
  return "unknown";
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function StatusIndicator({ label, status }: { label: string; status: string }) {
  const statusType = getStatusType(status);
  const config = STATUS_CONFIG[statusType];

  return (
    <View style={styles.statusRow}>
      <MaterialCommunityIcons
        name={config.icon}
        size={18}
        color={config.color}
      />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, { color: config.color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

function MetricRow({
  label,
  value,
  unit,
  warning,
}: {
  label: string;
  value: number | string;
  unit?: string;
  warning?: boolean;
}) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, warning && styles.metricWarning]}>
        {value}
        {unit && <Text style={styles.metricUnit}> {unit}</Text>}
      </Text>
    </View>
  );
}

export function SystemStatusPanel({
  status,
  loading = false,
}: SystemStatusPanelProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="server"
            size={20}
            color={auroraTheme.colors.primary[500]}
          />
          <Text style={styles.title}>System Status</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (!status) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="server"
            size={20}
            color={auroraTheme.colors.primary[500]}
          />
          <Text style={styles.title}>System Status</Text>
        </View>
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={24}
            color={auroraTheme.colors.error[500]}
          />
          <Text style={styles.errorText}>Unable to load system status</Text>
        </View>
      </View>
    );
  }

  const isHighLatency = status.avg_response_time_ms > 500;
  const isHighErrorRate = status.error_rate_percent > 5;
  const isHighMemory = status.memory_usage_mb > 1024;
  const isHighCPU = status.cpu_usage_percent > 80;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons
          name="server"
          size={20}
          color={auroraTheme.colors.primary[500]}
        />
        <Text style={styles.title}>System Status</Text>
        <View style={styles.uptimeBadge}>
          <Text style={styles.uptimeText}>
            Uptime: {formatUptime(status.uptime_seconds)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        <StatusIndicator label="API" status={status.api_health} />
        <StatusIndicator label="MongoDB" status={status.mongodb_status} />
        <StatusIndicator label="SQL Server" status={status.sqlserver_status} />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance</Text>
        <MetricRow
          label="Avg Response Time"
          value={status.avg_response_time_ms.toFixed(0)}
          unit="ms"
          warning={isHighLatency}
        />
        <MetricRow
          label="Error Rate"
          value={status.error_rate_percent.toFixed(2)}
          unit="%"
          warning={isHighErrorRate}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Resources</Text>
        <MetricRow
          label="Memory Usage"
          value={status.memory_usage_mb.toFixed(0)}
          unit="MB"
          warning={isHighMemory}
        />
        <MetricRow
          label="CPU Usage"
          value={status.cpu_usage_percent.toFixed(1)}
          unit="%"
          warning={isHighCPU}
        />
      </View>

      {(isHighLatency || isHighErrorRate || isHighMemory || isHighCPU) && (
        <View style={styles.warningBanner}>
          <MaterialCommunityIcons
            name="alert"
            size={16}
            color={auroraTheme.colors.warning[500]}
          />
          <Text style={styles.warningText}>
            Performance degradation detected
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  } as ViewStyle,
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
    marginLeft: 8,
    flex: 1,
  } as TextStyle,
  uptimeBadge: {
    backgroundColor: auroraTheme.colors.success[500] + "20",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  } as ViewStyle,
  uptimeText: {
    fontSize: 12,
    color: auroraTheme.colors.success[500],
    fontWeight: "500",
  } as TextStyle,
  section: {
    marginVertical: 8,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: auroraTheme.colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  } as TextStyle,
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  } as ViewStyle,
  statusLabel: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
    marginLeft: 10,
    flex: 1,
  } as TextStyle,
  statusValue: {
    fontSize: 14,
    fontWeight: "500",
  } as TextStyle,
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  } as ViewStyle,
  metricLabel: {
    fontSize: 14,
    color: auroraTheme.colors.text.primary,
  } as TextStyle,
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: auroraTheme.colors.text.primary,
  } as TextStyle,
  metricUnit: {
    fontSize: 12,
    fontWeight: "400",
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
  metricWarning: {
    color: auroraTheme.colors.warning[500],
  } as TextStyle,
  divider: {
    height: 1,
    backgroundColor: auroraTheme.colors.border.light,
    marginVertical: 12,
  } as ViewStyle,
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  } as ViewStyle,
  loadingText: {
    color: auroraTheme.colors.text.secondary,
  } as TextStyle,
  errorContainer: {
    padding: 20,
    alignItems: "center",
  } as ViewStyle,
  errorText: {
    color: auroraTheme.colors.error[500],
    marginTop: 8,
  } as TextStyle,
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: auroraTheme.colors.warning[500] + "20",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  } as ViewStyle,
  warningText: {
    fontSize: 13,
    color: auroraTheme.colors.warning[500],
    marginLeft: 8,
    fontWeight: "500",
  } as TextStyle,
});

export default SystemStatusPanel;
