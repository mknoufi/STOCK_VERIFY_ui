/**
 * VarianceChart Component
 * Displays variance trends over time
 * Phase 0: Advanced Analytics Dashboard
 */

import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import {
  colorPalette,
  spacing,
  typography,
  borderRadius,
  shadows,
} from "@/theme/designTokens";
import type { VarianceTrend } from "@/services/analyticsService";

interface VarianceChartProps {
  data: VarianceTrend[];
  title?: string;
}

export const VarianceChart: React.FC<VarianceChartProps> = ({
  data,
  title = "Variance Trends",
}) => {
  const screenWidth = Dimensions.get("window").width;
  const chartWidth = screenWidth - spacing.base * 2;

  // Prepare chart data
  const labels = data.map((d) => {
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  const varianceData = data.map((d) => d.variance);
  const maxVariance = Math.max(...varianceData);
  const minVariance = Math.min(...varianceData);

  // Simple bar chart implementation (can be replaced with react-native-chart-kit when installed)
  const renderSimpleChart = () => {
    const barWidth =
      (chartWidth - spacing.base * (data.length + 1)) / data.length;
    const chartHeight = 200;
    const range = maxVariance - minVariance || 1;

    return (
      <View style={styles.chartContainer}>
        <View style={[styles.barsContainer, { height: chartHeight }]}>
          {data.map((item, index) => {
            const barHeight =
              ((item.variance - minVariance) / range) * (chartHeight - 40);
            const barColor =
              item.variance > 3
                ? colorPalette.error[500]
                : item.variance > 2
                  ? colorPalette.warning[500]
                  : colorPalette.success[500];

            return (
              <View key={index} style={styles.barWrapper}>
                <View style={styles.barContainer}>
                  <Text style={styles.barValue}>
                    {item.variance.toFixed(1)}%
                  </Text>
                  <View
                    style={[
                      styles.bar,
                      {
                        width: barWidth,
                        height: barHeight,
                        backgroundColor: barColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel} numberOfLines={1}>
                  {labels[index]}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.card, shadows[2]]}>
      <Text style={styles.title}>{title}</Text>
      {data.length > 0 ? (
        renderSimpleChart()
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colorPalette.neutral[0],
    borderRadius: borderRadius.lg,
    padding: spacing.base,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colorPalette.neutral[900],
    marginBottom: spacing.base,
  },
  chartContainer: {
    width: "100%",
  },
  barsContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  barWrapper: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 2,
  },
  barContainer: {
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    width: "100%",
  },
  bar: {
    borderTopLeftRadius: borderRadius.sm,
    borderTopRightRadius: borderRadius.sm,
    minHeight: 10,
  },
  barValue: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colorPalette.neutral[700],
    marginBottom: spacing.xs,
  },
  barLabel: {
    fontSize: typography.fontSize.xs,
    color: colorPalette.neutral[600],
    marginTop: spacing.xs,
    textAlign: "center",
  },
  emptyState: {
    height: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    color: colorPalette.neutral[500],
  },
});
