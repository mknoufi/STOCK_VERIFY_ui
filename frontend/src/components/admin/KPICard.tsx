/**
 * KPI Card Component - Displays a single KPI metric with icon, value, and optional trend
 * Used in Admin Dashboard for displaying key performance indicators
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { auroraTheme } from "@/theme/auroraTheme";

export type KPIStatus = "normal" | "warning" | "critical" | "success";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  status?: KPIStatus;
  formatAsCurrency?: boolean;
  loading?: boolean;
}

const STATUS_COLORS: Record<KPIStatus, string> = {
  normal: auroraTheme.colors.primary[500],
  warning: auroraTheme.colors.warning[500],
  critical: auroraTheme.colors.error[500],
  success: auroraTheme.colors.success[500],
};

export function KPICard({
  title,
  value,
  icon,
  subtitle,
  trend,
  trendLabel,
  status = "normal",
  formatAsCurrency = false,
  loading = false,
}: KPICardProps) {
  const statusColor = STATUS_COLORS[status];

  const formatValue = (val: string | number): string => {
    if (typeof val === "number") {
      if (formatAsCurrency) {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      }
      return new Intl.NumberFormat("en-US").format(val);
    }
    return val;
  };

  const getTrendIcon = (): keyof typeof MaterialCommunityIcons.glyphMap => {
    if (trend === undefined || trend === 0) return "minus";
    return trend > 0 ? "trending-up" : "trending-down";
  };

  const getTrendColor = (): string => {
    if (trend === undefined || trend === 0) return auroraTheme.colors.text.secondary;
    return trend > 0 ? auroraTheme.colors.success[500] : auroraTheme.colors.error[500];
  };

  if (loading) {
    return (
      <View style={styles.card}>
        <View style={styles.skeletonIcon} />
        <View style={styles.skeletonValue} />
        <View style={styles.skeletonTitle} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={[styles.iconContainer, { backgroundColor: statusColor + "20" }]}>
        <MaterialCommunityIcons name={icon} size={24} color={statusColor} />
      </View>

      <Text style={styles.value}>{formatValue(value)}</Text>
      <Text style={styles.title}>{title}</Text>

      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {trend !== undefined && (
        <View style={styles.trendContainer}>
          <MaterialCommunityIcons name={getTrendIcon()} size={16} color={getTrendColor()} />
          <Text style={[styles.trendText, { color: getTrendColor() }]}>
            {Math.abs(trend).toFixed(1)}%
          </Text>
          {trendLabel && <Text style={styles.trendLabel}>{trendLabel}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: auroraTheme.colors.background.secondary,
    borderRadius: 16,
    padding: 20,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  } as ViewStyle,
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  } as ViewStyle,
  value: {
    fontSize: 28,
    fontWeight: "700",
    color: auroraTheme.colors.text.primary,
    marginBottom: 4,
  } as TextStyle,
  title: {
    fontSize: 14,
    color: auroraTheme.colors.text.secondary,
    fontWeight: "500",
  } as TextStyle,
  subtitle: {
    fontSize: 12,
    color: auroraTheme.colors.text.tertiary,
    marginTop: 4,
  } as TextStyle,
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: auroraTheme.colors.border.light,
  } as ViewStyle,
  trendText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  } as TextStyle,
  trendLabel: {
    fontSize: 12,
    color: auroraTheme.colors.text.secondary,
    marginLeft: 8,
  } as TextStyle,
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: auroraTheme.colors.border.light,
    marginBottom: 12,
  } as ViewStyle,
  skeletonValue: {
    width: 80,
    height: 28,
    borderRadius: 4,
    backgroundColor: auroraTheme.colors.border.light,
    marginBottom: 8,
  } as ViewStyle,
  skeletonTitle: {
    width: 100,
    height: 14,
    borderRadius: 4,
    backgroundColor: auroraTheme.colors.border.light,
  } as ViewStyle,
});

export default KPICard;
