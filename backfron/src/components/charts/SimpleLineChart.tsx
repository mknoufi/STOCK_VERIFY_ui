/**
 * Simple Line Chart - View-based implementation (no SVG required)
 * Fully functional line chart using React Native Views
 */

import React from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from "../../styles/modernDesignSystem";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - modernSpacing.lg * 2 - 80;
const CHART_HEIGHT = 200;
const PADDING = 40;

interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
}

interface SimpleLineChartProps {
  data: DataPoint[];
  color?: string;
  showGrid?: boolean;
  showPoints?: boolean;
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  color = modernColors.primary[500],
  showGrid = true,
  showPoints = true,
  title,
  yAxisLabel,
  xAxisLabel,
}) => {
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {title && <Text style={styles.title}>{title}</Text>}
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </View>
    );
  }

  const chartWidth = CHART_WIDTH - PADDING * 2;
  const chartHeight = CHART_HEIGHT - PADDING * 2;

  const yValues = data.map((d) => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const yRange = maxY - minY || 1;
  const yPadding = yRange * 0.1;

  const scaleX = chartWidth / (data.length - 1 || 1);
  const scaleY = chartHeight / (yRange + yPadding * 2);

  const points = data.map((point, index) => {
    const x = index * scaleX;
    const y = chartHeight - (point.y - minY + yPadding) * scaleY;
    return { x, y, value: point.y, label: point.label || String(point.x) };
  });

  // Generate grid lines
  const gridLines = [];
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = (chartHeight / gridSteps) * i;
    const value = maxY - (yRange / gridSteps) * i;
    gridLines.push({ y, value });
  }

  // Generate x-axis labels
  const xLabels = data
    .filter(
      (_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1,
    )
    .map((point) => ({
      x: data.indexOf(point) * scaleX,
      label: String(point.x),
    }));

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {yAxisLabel && <Text style={styles.yAxisLabel}>{yAxisLabel}</Text>}
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {gridLines.map((line, i) => (
            <View key={i} style={[styles.yAxisLabelContainer, { top: line.y }]}>
              <Text style={styles.yAxisText}>{Math.round(line.value)}</Text>
            </View>
          ))}
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {showGrid &&
            gridLines.map((line, i) => (
              <View
                key={i}
                style={[
                  styles.gridLine,
                  {
                    top: line.y,
                    width: chartWidth,
                  },
                ]}
              />
            ))}

          {/* X-axis line */}
          <View
            style={[
              styles.axisLine,
              {
                bottom: 0,
                width: chartWidth,
              },
            ]}
          />

          {/* Y-axis line */}
          <View
            style={[
              styles.axisLine,
              {
                left: 0,
                height: chartHeight,
                width: 2,
              },
            ]}
          />

          {/* Line segments */}
          {points.map((point, index) => {
            if (index === 0) return null;
            const prevPoint = points[index - 1];
            if (!prevPoint) return null;
            const dx = point.x - prevPoint.x;
            const dy = point.y - prevPoint.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            return (
              <View
                key={`line-${index}`}
                style={[
                  styles.lineSegment,
                  {
                    left: prevPoint.x,
                    top: prevPoint.y,
                    width: length,
                    transform: [{ rotate: `${angle}deg` }],
                    backgroundColor: color,
                  },
                ]}
              />
            );
          })}

          {/* Data points */}
          {showPoints &&
            points.map((point, index) => (
              <View
                key={`point-${index}`}
                style={[
                  styles.point,
                  {
                    left: point.x - 4,
                    top: point.y - 4,
                    backgroundColor: color,
                  },
                ]}
              >
                {Platform.OS === "web" && (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>{point.value}</Text>
                  </View>
                )}
              </View>
            ))}

          {/* X-axis labels */}
          <View style={styles.xAxis}>
            {xLabels.map((label, i) => (
              <View key={i} style={[styles.xAxisLabel, { left: label.x }]}>
                <Text style={styles.xAxisText}>{label.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
      {xAxisLabel && <Text style={styles.xAxisLabelText}>{xAxisLabel}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: modernSpacing.md,
  },
  title: {
    ...modernTypography.h5,
    color: modernColors.text.primary,
    marginBottom: modernSpacing.sm,
  },
  yAxisLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    marginBottom: modernSpacing.xs,
  },
  chartContainer: {
    flexDirection: "row",
    height: CHART_HEIGHT,
  },
  yAxis: {
    width: PADDING,
    position: "relative",
  },
  yAxisLabelContainer: {
    position: "absolute",
    right: modernSpacing.xs,
    transform: [{ translateY: -8 }],
  },
  yAxisText: {
    ...modernTypography.body.small,
    fontSize: 10,
    color: modernColors.text.secondary,
  },
  chartArea: {
    flex: 1,
    position: "relative",
    height: CHART_HEIGHT,
  },
  gridLine: {
    position: "absolute",
    height: 1,
    backgroundColor: modernColors.border.light,
    opacity: 0.3,
    borderStyle: "dashed",
    ...(Platform.OS === "web" && {
      borderTopWidth: 1,
      borderTopColor: modernColors.border.light,
      borderStyle: "dashed",
    }),
  },
  axisLine: {
    position: "absolute",
    backgroundColor: modernColors.border.medium,
  },
  lineSegment: {
    position: "absolute",
    height: 3,
    borderRadius: 1.5,
  },
  point: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  tooltip: {
    position: "absolute",
    bottom: 12,
    left: -20,
    backgroundColor: modernColors.background.paper,
    paddingHorizontal: modernSpacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    minWidth: 40,
    alignItems: "center",
  },
  tooltipText: {
    ...modernTypography.body.small,
    fontSize: 10,
    color: modernColors.text.primary,
    fontWeight: "600",
  },
  xAxis: {
    position: "absolute",
    bottom: -20,
    width: "100%",
    height: 20,
  },
  xAxisLabel: {
    position: "absolute",
    transform: [{ translateX: -20 }],
  },
  xAxisText: {
    ...modernTypography.body.small,
    fontSize: 10,
    color: modernColors.text.secondary,
    textAlign: "center",
  },
  xAxisLabelText: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    textAlign: "center",
    marginTop: modernSpacing.md,
  },
  emptyState: {
    height: CHART_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: modernColors.background.elevated,
    borderRadius: 8,
  },
  emptyText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  },
});
