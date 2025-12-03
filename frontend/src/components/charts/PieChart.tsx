/**
 * Pie Chart Component - SVG-based for React Native
 * Fully functional pie chart for analytics
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { G, Path, Text as SvgText } from 'react-native-svg';
import { modernColors, modernTypography, modernSpacing } from '../../styles/modernDesignSystem';

const CHART_SIZE = 200;
const RADIUS = 80;
const CENTER_X = CHART_SIZE / 2;
const CENTER_Y = CHART_SIZE / 2;

interface PieData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieData[];
  title?: string;
  showLegend?: boolean;
}

export const PieChart: React.FC<PieChartProps> = ({ data, title, showLegend = true }) => {
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

  const total = data.reduce((sum, item) => sum + item.value, 0);
  let currentAngle = -90; // Start from top

  const paths = data.map((item, index) => {
    const percentage = item.value / total;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = CENTER_X + RADIUS * Math.cos(startAngleRad);
    const y1 = CENTER_Y + RADIUS * Math.sin(startAngleRad);
    const x2 = CENTER_X + RADIUS * Math.cos(endAngleRad);
    const y2 = CENTER_Y + RADIUS * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${CENTER_X} ${CENTER_Y}`,
      `L ${x1} ${y1}`,
      `A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    // Label position
    const labelAngle = (startAngle + angle / 2) * (Math.PI / 180);
    const labelRadius = RADIUS * 0.7;
    const labelX = CENTER_X + labelRadius * Math.cos(labelAngle);
    const labelY = CENTER_Y + labelRadius * Math.sin(labelAngle);

    return {
      pathData,
      color: item.color,
      label: item.label,
      percentage: percentage * 100, // Keep as number for comparison
      percentageFormatted: (percentage * 100).toFixed(1), // Formatted for display
      value: item.value,
      labelX,
      labelY,
    };
  });

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.chartWrapper}>
        <Svg width={CHART_SIZE} height={CHART_SIZE}>
          <G>
            {paths.map((path, index) => (
              <G key={index}>
                <Path d={path.pathData} fill={path.color} />
                {path.percentage > 5 && (
                  <SvgText
                    x={path.labelX}
                    y={path.labelY}
                    fontSize="12"
                    fill="#FFFFFF"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {path.percentageFormatted}%
                  </SvgText>
                )}
              </G>
            ))}
          </G>
        </Svg>
        {showLegend && (
          <View style={styles.legend}>
            {data.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendLabel}>{item.label}</Text>
                <Text style={styles.legendValue}>
                  {item.value} ({((item.value / total) * 100).toFixed(1)}%)
                </Text>
              </View>
            ))}
          </View>
        )}
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
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  legend: {
    marginLeft: modernSpacing.lg,
    gap: modernSpacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: modernSpacing.sm,
    marginBottom: modernSpacing.xs,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendLabel: {
    ...modernTypography.body.small,
    color: modernColors.text.primary,
    minWidth: 100,
  },
  legendValue: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
  emptyState: {
    height: CHART_SIZE,
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
