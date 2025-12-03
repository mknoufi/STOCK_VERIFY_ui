/**
 * Simple Bar Chart - View-based implementation (no SVG required)
 * Fully functional bar chart using React Native Views
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
} from '../../styles/modernDesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - modernSpacing.lg * 2 - 80;
const CHART_HEIGHT = 200;
const PADDING = 40;
const BAR_SPACING = 8;

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarData[];
  title?: string;
  showValues?: boolean;
}

export const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  title,
  showValues = true,
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

  const maxValue = Math.max(...data.map((d) => d.value));
  const scale = chartHeight / (maxValue * 1.1);

  const barWidth = (chartWidth - (data.length - 1) * BAR_SPACING) / data.length;

  // Generate grid lines
  const gridLines = [];
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = (chartHeight / gridSteps) * i;
    const value = Math.round(maxValue * (1 - i / gridSteps));
    gridLines.push({ y, value });
  }

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartContainer}>
        {/* Y-axis labels */}
        <View style={styles.yAxis}>
          {gridLines.map((line, i) => (
            <View key={i} style={[styles.yAxisLabel, { top: line.y - 8 }]}>
              <Text style={styles.yAxisText}>{line.value}</Text>
            </View>
          ))}
        </View>

        {/* Chart area */}
        <View style={styles.chartArea}>
          {/* Grid lines */}
          {gridLines.map((line, i) => (
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

          {/* X-axis */}
          <View
            style={[
              styles.axisLine,
              {
                bottom: 0,
                width: chartWidth,
              },
            ]}
          />

          {/* Y-axis */}
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

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = item.value * scale;
            const x = index * (barWidth + BAR_SPACING);

            const color = item.color || modernColors.primary[500];

            return (
              <View key={index} style={styles.barContainer}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: barWidth,
                      height: barHeight,
                      backgroundColor: color,
                      bottom: 0,
                      left: x,
                    },
                  ]}
                />
                {showValues && (
                  <View
                    style={[
                      styles.valueLabel,
                      {
                        bottom: barHeight + 4,
                        left: x + barWidth / 2,
                      },
                    ]}
                  >
                    <Text style={styles.valueText}>{item.value}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.xLabel,
                    {
                      bottom: -20,
                      left: x + barWidth / 2,
                    },
                  ]}
                >
                  <Text style={styles.xLabelText} numberOfLines={1}>
                    {item.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
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
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT + 30,
  },
  yAxis: {
    width: PADDING,
    position: 'relative',
  },
  yAxisLabel: {
    position: 'absolute',
    right: modernSpacing.xs,
  },
  yAxisText: {
    ...modernTypography.body.small,
    fontSize: 10,
    color: modernColors.text.secondary,
  },
  chartArea: {
    flex: 1,
    position: 'relative',
    height: CHART_HEIGHT,
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: modernColors.border.light,
    opacity: 0.3,
  },
  axisLine: {
    position: 'absolute',
    backgroundColor: modernColors.border.medium,
  },
  barContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bar: {
    position: 'absolute',
    borderRadius: modernBorderRadius.xs,
  },
  valueLabel: {
    position: 'absolute',
    transform: [{ translateX: -20 }],
  },
  valueText: {
    ...modernTypography.body.small,
    fontSize: 10,
    color: modernColors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  xLabel: {
    position: 'absolute',
    transform: [{ translateX: -30 }],
    width: 60,
  },
  xLabelText: {
    ...modernTypography.body.small,
    fontSize: 10,
    color: modernColors.text.secondary,
    textAlign: 'center',
  },
  emptyState: {
    height: CHART_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: modernColors.background.elevated,
    borderRadius: 8,
  },
  emptyText: {
    ...modernTypography.body.medium,
    color: modernColors.text.secondary,
  },
});
