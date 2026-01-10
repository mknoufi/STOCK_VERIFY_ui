/**
 * ItemStatsRow Component
 * Displays key item statistics in a horizontal row
 * Used in variance, session detail, and item detail screens
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

import { theme } from "../../styles/modernDesignSystem";

// ============================================================================
// Types
// ============================================================================

export type StatVariant = "primary" | "success" | "warning" | "error" | "neutral";

export interface StatItem {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: StatVariant;
  suffix?: string;
}

export interface ItemStatsRowProps {
  stats: StatItem[];
  animationDelay?: number;
  style?: any;
}

// ============================================================================
// Helper Functions
// ============================================================================

const getVariantColors = (variant: StatVariant = "neutral") => {
  switch (variant) {
    case "primary":
      return {
        bg: theme.colors.primary[500] + "20",
        text: theme.colors.primary[500],
        border: theme.colors.primary[500] + "40",
      };
    case "success":
      return {
        bg: theme.colors.success.main + "20",
        text: theme.colors.success.main,
        border: theme.colors.success.main + "40",
      };
    case "warning":
      return {
        bg: theme.colors.warning.main + "20",
        text: theme.colors.warning.main,
        border: theme.colors.warning.main + "40",
      };
    case "error":
      return {
        bg: theme.colors.error.main + "20",
        text: theme.colors.error.main,
        border: theme.colors.error.main + "40",
      };
    case "neutral":
    default:
      return {
        bg: "rgba(255,255,255,0.05)",
        text: theme.colors.text.primary,
        border: "rgba(255,255,255,0.1)",
      };
  }
};

// ============================================================================
// Main Component
// ============================================================================

export const ItemStatsRow: React.FC<ItemStatsRowProps> = ({
  stats,
  animationDelay = 0,
  style,
}) => {
  const renderStat = (stat: StatItem, index: number) => {
    const colors = getVariantColors(stat.variant);
    const displayValue = typeof stat.value === "number" 
      ? stat.value.toString() 
      : stat.value;
    
    return (
      <View
        key={`${stat.label}-${index}`}
        style={[
          styles.statCard,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
      >
        {stat.icon && (
          <Ionicons
            name={stat.icon}
            size={20}
            color={colors.text}
            style={styles.statIcon}
          />
        )}
        <Text style={styles.statLabel}>{stat.label}</Text>
        <View style={styles.statValueContainer}>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {displayValue}
          </Text>
          {stat.suffix && (
            <Text style={styles.statSuffix}>{stat.suffix}</Text>
          )}
        </View>
      </View>
    );
  };
  
  const content = (
    <View style={[styles.container, style]}>
      {stats.map(renderStat)}
    </View>
  );
  
  if (animationDelay > 0) {
    return (
      <Animated.View entering={FadeInDown.delay(animationDelay).springify()}>
        {content}
      </Animated.View>
    );
  }
  
  return content;
};

// ============================================================================
// Prebuilt Row Configurations
// ============================================================================

export const createVarianceStats = (
  systemQty: number,
  verifiedQty: number,
  variance: number
): StatItem[] => [
  {
    label: "System Qty",
    value: systemQty,
    icon: "server-outline",
    variant: "primary",
  },
  {
    label: "Verified Qty",
    value: verifiedQty,
    icon: "checkmark-circle-outline",
    variant: "success",
  },
  {
    label: "Variance",
    value: variance > 0 ? `+${variance}` : variance.toString(),
    icon: "swap-vertical-outline",
    variant: variance === 0 ? "success" : "error",
  },
];

export const createStockStats = (
  totalItems: number,
  verifiedItems: number,
  totalQty: number
): StatItem[] => [
  {
    label: "Total Items",
    value: totalItems,
    icon: "cube-outline",
    variant: "primary",
  },
  {
    label: "Verified",
    value: verifiedItems,
    icon: "checkmark-done-circle-outline",
    variant: "success",
  },
  {
    label: "Total Qty",
    value: totalQty,
    icon: "layers-outline",
    variant: "neutral",
  },
];

export const createSessionStats = (
  totalLines: number,
  verified: number,
  pending: number,
  variance: number
): StatItem[] => [
  {
    label: "Total Lines",
    value: totalLines,
    icon: "list-outline",
    variant: "primary",
  },
  {
    label: "Verified",
    value: verified,
    icon: "checkmark-circle-outline",
    variant: "success",
  },
  {
    label: "Pending",
    value: pending,
    icon: "time-outline",
    variant: pending > 0 ? "warning" : "success",
  },
  {
    label: "Variance",
    value: variance > 0 ? `+${variance}` : variance.toString(),
    icon: "swap-vertical-outline",
    variant: variance === 0 ? "success" : "error",
  },
];

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
  },
  statIcon: {
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.text.tertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
    marginBottom: 4,
  },
  statValueContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  statSuffix: {
    fontSize: 12,
    color: theme.colors.text.tertiary,
  },
});

export default ItemStatsRow;
