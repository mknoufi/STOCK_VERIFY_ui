/**
 * KPI Card Component - Enterprise Grade
 * Displays a single KPI metric with strict semantics, accessibility, and drill-down capability.
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  modernColors,
  modernShadows,
  modernBorderRadius,
} from "@/styles/modernDesignSystem";

export type KPIStatus = "normal" | "warning" | "critical" | "success";
export type TrendIntent = "good" | "bad" | "neutral";

interface KPICardProps {
  /** Title of the KPI (e.g., "Total Revenue") */
  title: string;
  /** Value to display. If number, formatted via formatOptions. If string, displayed as-is. */
  value: string | number;
  /** Icon to display from MaterialCommunityIcons */
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Optional subtitle for context */
  subtitle?: string;
  /** Trend percentage value (e.g., 5.4 for +5.4%) */
  trend?: number;
  /** Label for the trend (e.g., "vs last month") */
  trendLabel?: string;
  /** Semantic meaning of the trend. Decouples math sign from color. */
  trendIntent?: TrendIntent;
  /** Visual status of the KPI. Maps to border/icon colors. */
  status?: KPIStatus;
  /** Intl.NumberFormat options for numeric values. Replaces hardcoded currency logic. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Locale for formatting. Defaults to system or 'en-US'. */
  locale?: string;
  /** Controls loading state with shimmer/skeleton */
  loading?: boolean;
  /** Callback for drill-down action */
  onPress?: () => void;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
  /** Test ID for automated testing */
  testID?: string;
}

const STATUS_COLORS: Record<KPIStatus, string> = {
  normal: modernColors.primary[500],
  warning: modernColors.warning.main,
  critical: modernColors.error.main,
  success: modernColors.success.main,
};

const INTENT_COLORS: Record<TrendIntent, string> = {
  good: modernColors.success.main,
  bad: modernColors.error.main,
  neutral: modernColors.text.secondary,
};

export function KPICard({
  title,
  value,
  icon,
  subtitle,
  trend,
  trendLabel,
  trendIntent = "neutral",
  status = "normal",
  formatOptions,
  locale = "en-US",
  loading = false,
  onPress,
  accessibilityLabel,
  testID,
}: KPICardProps) {
  const statusColor = STATUS_COLORS[status];

  const formatValue = (val: string | number): string => {
    if (typeof val === "number") {
      try {
        return new Intl.NumberFormat(locale, formatOptions).format(val);
      } catch (e) {
        console.warn("KPICard: Formatting failed", e);
        return val.toString();
      }
    }
    return val;
  };

  const getTrendIcon = (): keyof typeof MaterialCommunityIcons.glyphMap => {
    if (trend === undefined || trend === 0) return "minus";
    return trend > 0 ? "trending-up" : "trending-down";
  };

  const trendColor = INTENT_COLORS[trendIntent];

  if (loading) {
    return (
      <View style={styles.card} testID={`${testID}-loading`}>
        <View style={styles.skeletonRow}>
          <View style={styles.skeletonIcon} />
          <View style={{ flex: 1 }}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonValue} />
          </View>
        </View>
      </View>
    );
  }

  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      style={styles.card}
      onPress={onPress}
      accessibilityRole={onPress ? "button" : "summary"}
      accessibilityLabel={
        accessibilityLabel || `${title}: ${formatValue(value)}`
      }
      testID={testID}
      activeOpacity={0.7}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: statusColor + "15" }]}
      >
        <MaterialCommunityIcons name={icon} size={24} color={statusColor} />
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
          {formatValue(value)}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {trend !== undefined && (
          <View style={styles.trendContainer}>
            <MaterialCommunityIcons
              name={getTrendIcon()}
              size={16}
              color={trendColor}
            />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {Math.abs(trend).toFixed(1)}%
            </Text>
            {trendLabel && (
              <Text style={styles.trendLabel} numberOfLines={1}>
                {trendLabel}
              </Text>
            )}
          </View>
        )}
      </View>
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: modernColors.background.elevated,
    borderRadius: modernBorderRadius.card,
    padding: 16,
    minWidth: 160,
    flex: 1,
    ...modernShadows.sm,
    // Ensure content doesn't overflow
    overflow: "hidden",
  } as ViewStyle,
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: modernBorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  } as ViewStyle,
  contentContainer: {
    flex: 1,
    justifyContent: "flex-end",
  } as ViewStyle,
  value: {
    fontSize: 24,
    fontWeight: "700",
    color: modernColors.text.primary,
    marginBottom: 4,
    includeFontPadding: false,
  } as TextStyle,
  title: {
    fontSize: 14,
    color: modernColors.text.secondary,
    fontWeight: "500",
    marginBottom: 2,
  } as TextStyle,
  subtitle: {
    fontSize: 12,
    color: modernColors.text.tertiary,
    marginTop: 2,
  } as TextStyle,
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: modernColors.border.light,
  } as ViewStyle,
  trendText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  } as TextStyle,
  trendLabel: {
    fontSize: 12,
    color: modernColors.text.secondary,
    marginLeft: 8,
    flex: 1,
  } as TextStyle,
  // Skeleton Styles
  skeletonRow: {
    flexDirection: "column",
    gap: 12,
  } as ViewStyle,
  skeletonIcon: {
    width: 48,
    height: 48,
    borderRadius: modernBorderRadius.md,
    backgroundColor: modernColors.background.paper,
    opacity: 0.5,
  } as ViewStyle,
  skeletonValue: {
    width: "60%",
    height: 24,
    borderRadius: modernBorderRadius.sm,
    backgroundColor: modernColors.background.paper,
    opacity: 0.5,
    marginBottom: 8,
  } as ViewStyle,
  skeletonTitle: {
    width: "40%",
    height: 14,
    borderRadius: modernBorderRadius.sm,
    backgroundColor: modernColors.background.paper,
    opacity: 0.5,
    marginBottom: 12,
  } as ViewStyle,
});

export default KPICard;
