/**
 * MetricCard Component
 * Displays a single metric with trend indicator
 * Phase 0: Advanced Analytics Dashboard
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colorPalette,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "@/theme/designTokens";
import type { AnalyticsMetric } from "@/services/analyticsService";

interface MetricCardProps {
  metric: AnalyticsMetric;
  compact?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  compact = false,
}) => {
  const formatValue = (value: number, format?: string): string => {
    switch (format) {
      case "currency":
        return `$${value.toLocaleString()}`;
      case "percentage":
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  };

  const getTrendColor = (trend?: string): string => {
    switch (trend) {
      case "up":
        return colorPalette.success[500];
      case "down":
        return colorPalette.error[500];
      default:
        return colorPalette.neutral[500];
    }
  };

  const getTrendIcon = (trend?: string): keyof typeof Ionicons.glyphMap => {
    switch (trend) {
      case "up":
        return "trending-up";
      case "down":
        return "trending-down";
      default:
        return "remove";
    }
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact, shadows[2]]}>
      <Text style={styles.label} numberOfLines={1}>
        {metric.label}
      </Text>

      <View style={styles.valueContainer}>
        <Text style={[styles.value, compact && styles.valueCompact]}>
          {formatValue(metric.value, metric.format)}
        </Text>

        {metric.change !== undefined && (
          <View
            style={[
              styles.changeContainer,
              { backgroundColor: getTrendColor(metric.trend) + "20" },
            ]}
          >
            <Ionicons
              name={getTrendIcon(metric.trend)}
              size={compact ? 12 : 14}
              color={getTrendColor(metric.trend)}
            />
            <Text
              style={[
                styles.changeText,
                { color: getTrendColor(metric.trend) },
              ]}
            >
              {Math.abs(metric.change).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorPalette.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    minWidth: 150,
  },
  cardCompact: {
    padding: spacing.sm,
    minWidth: 120,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colorPalette.neutral[600],
    marginBottom: spacing.xs,
  },
  valueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  value: {
    fontSize: typography.fontSize["2xl"],
    fontWeight: typography.fontWeight.bold,
    color: colorPalette.neutral[900],
  },
  valueCompact: {
    fontSize: typography.fontSize.xl,
  },
  changeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  changeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
});
