/**
 * Bar Chart Component - SVG-based for React Native
 * Fully functional bar chart for analytics
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { modernColors, modernTypography, modernSpacing } from '../../styles/modernDesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - modernSpacing.lg * 2 - 80;
const CHART_HEIGHT = 200;
const PADDING = 20;
const BAR_SPACING = 8;

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: BarData[];
  title?: string;
  showValues?: boolean;
  horizontal?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  title,
  showValues = true,
  horizontal = false,
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
  const scale = chartHeight / (maxValue * 1.1); // 10% padding

  const barWidth = (chartWidth - (data.length - 1) * BAR_SPACING) / data.length;

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = PADDING + chartHeight - chartHeight * ratio;
            const value = Math.round(maxValue * ratio);
            return (
              <G key={i}>
                <Line
                  x1={PADDING}
                  y1={y}
                  x2={PADDING + chartWidth}
                  y2={y}
                  stroke={modernColors.border.light}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.3}
                />
                <SvgText
                  x={PADDING - 10}
                  y={y + 4}
                  fontSize="10"
                  fill={modernColors.text.secondary}
                  textAnchor="end"
                >
                  {value}
                </SvgText>
              </G>
            );
          })}

          {/* X-axis */}
          <Line
            x1={PADDING}
            y1={PADDING + chartHeight}
            x2={PADDING + chartWidth}
            y2={PADDING + chartHeight}
            stroke={modernColors.border.medium}
            strokeWidth="2"
          />

          {/* Y-axis */}
          <Line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING}
            y2={PADDING + chartHeight}
            stroke={modernColors.border.medium}
            strokeWidth="2"
          />

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = item.value * scale;
            const x = PADDING + index * (barWidth + BAR_SPACING);
            const y = PADDING + chartHeight - barHeight;
            const color = item.color || modernColors.primary[500];

            return (
              <G key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={4}
                />
                {showValues && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 5}
                    fontSize="10"
                    fill={modernColors.text.primary}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {item.value}
                  </SvgText>
                )}
                <SvgText
                  x={x + barWidth / 2}
                  y={CHART_HEIGHT - 5}
                  fontSize="10"
                  fill={modernColors.text.secondary}
                  textAnchor="middle"
                >
                  {item.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
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
    alignItems: 'center',
    justifyContent: 'center',
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
