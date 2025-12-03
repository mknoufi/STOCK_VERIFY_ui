/**
 * Line Chart Component - SVG-based for React Native
 * Fully functional chart component for analytics
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { modernColors, modernTypography, modernSpacing } from '../../styles/modernDesignSystem';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - modernSpacing.lg * 2 - 80;
const CHART_HEIGHT = 200;
const PADDING = 20;

interface DataPoint {
  x: number | string;
  y: number;
  label?: string;
}

interface LineChartProps {
  data: DataPoint[];
  color?: string;
  showGrid?: boolean;
  showPoints?: boolean;
  title?: string;
  yAxisLabel?: string;
  xAxisLabel?: string;
}

export const LineChart: React.FC<LineChartProps> = ({
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

  // Calculate chart dimensions
  const chartWidth = CHART_WIDTH - PADDING * 2;
  const chartHeight = CHART_HEIGHT - PADDING * 2;

  // Find min/max values
  const yValues = data.map((d) => d.y);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const yRange = maxY - minY || 1;
  const yPadding = yRange * 0.1; // 10% padding

  // Calculate scale
  const scaleX = chartWidth / (data.length - 1 || 1);
  const scaleY = chartHeight / (yRange + yPadding * 2);

  // Generate points
  const points = data.map((point, index) => {
    const x = PADDING + index * scaleX;
    const y = PADDING + chartHeight - (point.y - minY + yPadding) * scaleY;
    return { x, y, value: point.y, label: point.label || point.x };
  });

  // Generate polyline path


  // Generate grid lines
  const gridLines = [];
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = PADDING + (chartHeight / gridSteps) * i;
    const value = maxY - (yRange / gridSteps) * i;
    gridLines.push({ y, value });
  }

  // Generate x-axis labels
  const xLabels = data
    .filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1)
    .map((point, i) => ({
      x: PADDING + (data.indexOf(point) * scaleX),
      label: String(point.x),
    }));

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      {yAxisLabel && <Text style={styles.yAxisLabel}>{yAxisLabel}</Text>}
      <View style={styles.chartContainer}>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {showGrid &&
            gridLines.map((line, i) => (
              <G key={i}>
                <Line
                  x1={PADDING}
                  y1={line.y}
                  x2={PADDING + chartWidth}
                  y2={line.y}
                  stroke={modernColors.border.light}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.3}
                />
                <SvgText
                  x={PADDING - 10}
                  y={line.y + 4}
                  fontSize="10"
                  fill={modernColors.text.secondary}
                  textAnchor="end"
                >
                  {Math.round(line.value)}
                </SvgText>
              </G>
            ))}

          {/* X-axis line */}
          <Line
            x1={PADDING}
            y1={PADDING + chartHeight}
            x2={PADDING + chartWidth}
            y2={PADDING + chartHeight}
            stroke={modernColors.border.medium}
            strokeWidth="2"
          />

          {/* Y-axis line */}
          <Line
            x1={PADDING}
            y1={PADDING}
            x2={PADDING}
            y2={PADDING + chartHeight}
            stroke={modernColors.border.medium}
            strokeWidth="2"
          />

          {/* Chart line */}
          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {showPoints &&
            points.map((point, index) => (
              <G key={index}>
                <Circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                {/* Tooltip on hover (web only) */}
                {Platform.OS === 'web' && (
                  <SvgText
                    x={point.x}
                    y={point.y - 10}
                    fontSize="10"
                    fill={modernColors.text.primary}
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {point.value}
                  </SvgText>
                )}
              </G>
            ))}

          {/* X-axis labels */}
          {xLabels.map((label, i) => (
            <SvgText
              key={i}
              x={label.x}
              y={CHART_HEIGHT - 5}
              fontSize="10"
              fill={modernColors.text.secondary}
              textAnchor="middle"
            >
              {label.label}
            </SvgText>
          ))}
        </Svg>
      </View>
      {xAxisLabel && <Text style={styles.xAxisLabel}>{xAxisLabel}</Text>}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  xAxisLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
    textAlign: 'center',
    marginTop: modernSpacing.xs,
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
