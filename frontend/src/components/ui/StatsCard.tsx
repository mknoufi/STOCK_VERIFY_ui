/**
 * StatsCard Component - Aurora Design v2.1
 *
 * Glassmorphic stats card with gradient accents
 * Features:
 * - Glass morphism effect
 * - Gradient border option
 * - Icon with gradient background
 * - Smooth entrance animations
 * - Animated counter values
 * - Haptic feedback
 * - Memoized for performance
 */

import React, { memo } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { GlassCard } from "./GlassCard";
import { AnimatedPressable } from "./AnimatedPressable";
import { AnimatedCounter } from "./AnimatedCounter";
import { auroraTheme } from "@/theme/auroraTheme";

export type StatVariant = "primary" | "success" | "warning" | "error" | "info";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  variant?: StatVariant;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
  style?: ViewStyle;
  delay?: number;
  animated?: boolean; // Enable animated counter
  prefix?: string; // Prefix for value (e.g., "$")
  suffix?: string; // Suffix for value (e.g., "%")
}

const variantColors = {
  primary: {
    gradient: auroraTheme.colors.aurora.primary,
    color: auroraTheme.colors.primary[500],
  },
  success: {
    gradient: auroraTheme.colors.aurora.success,
    color: auroraTheme.colors.success[500],
  },
  warning: {
    gradient: auroraTheme.colors.aurora.warm,
    color: auroraTheme.colors.warning[500],
  },
  error: {
    gradient: [auroraTheme.colors.error[500], auroraTheme.colors.error[700]],
    color: auroraTheme.colors.error[500],
  },
  info: {
    gradient: auroraTheme.colors.aurora.secondary,
    color: auroraTheme.colors.secondary[500],
  },
};

export const StatsCard: React.FC<StatsCardProps> = memo(
  ({
    title,
    value,
    icon,
    variant = "primary",
    subtitle,
    trend,
    onPress,
    style,
    delay = 0,
    animated = false,
    prefix = "",
    suffix = "",
  }) => {
    const { gradient } = variantColors[variant];
    const numericValue =
      typeof value === "number" ? value : parseFloat(value) || 0;

    const content = (
      <View style={styles.content}>
        {/* Icon with gradient background */}
        <LinearGradient
          colors={gradient as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <Ionicons
            name={icon}
            size={28}
            color={auroraTheme.colors.text.primary}
          />
        </LinearGradient>

        {/* Stats */}
        <View style={styles.stats}>
          {animated && typeof value === "number" ? (
            <AnimatedCounter
              value={numericValue}
              prefix={prefix}
              suffix={suffix}
              style={[
                styles.value,
                {
                  fontFamily: auroraTheme.typography.fontFamily.heading,
                  fontSize: auroraTheme.typography.fontSize["3xl"],
                  color: auroraTheme.colors.text.primary,
                },
              ]}
            />
          ) : (
            <Text
              style={[
                styles.value,
                {
                  fontFamily: auroraTheme.typography.fontFamily.heading,
                  fontSize: auroraTheme.typography.fontSize["3xl"],
                  color: auroraTheme.colors.text.primary,
                },
              ]}
            >
              {prefix}
              {value}
              {suffix}
            </Text>
          )}

          <Text
            style={[
              styles.title,
              {
                fontFamily: auroraTheme.typography.fontFamily.body,
                fontSize: auroraTheme.typography.fontSize.sm,
                color: auroraTheme.colors.text.secondary,
              },
            ]}
          >
            {title}
          </Text>

          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  fontFamily: auroraTheme.typography.fontFamily.body,
                  fontSize: auroraTheme.typography.fontSize.xs,
                  color: auroraTheme.colors.text.tertiary,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}

          {trend && (
            <View style={styles.trendContainer}>
              <Ionicons
                name={trend.isPositive ? "trending-up" : "trending-down"}
                size={14}
                color={
                  trend.isPositive
                    ? auroraTheme.colors.success[500]
                    : auroraTheme.colors.error[500]
                }
              />
              <Text
                style={[
                  styles.trendText,
                  {
                    color: trend.isPositive
                      ? auroraTheme.colors.success[500]
                      : auroraTheme.colors.error[500],
                    fontFamily: auroraTheme.typography.fontFamily.label,
                    fontSize: auroraTheme.typography.fontSize.xs,
                  },
                ]}
              >
                {Math.abs(trend.value)}%
              </Text>
            </View>
          )}
        </View>
      </View>
    );

    const cardContent = (
      <Animated.View entering={FadeInDown.delay(delay).springify()}>
        <GlassCard
          variant="medium"
          intensity={25}
          borderRadius={auroraTheme.borderRadius.xl}
          padding={auroraTheme.spacing.lg}
          withGradientBorder={true}
          elevation="lg"
          style={style}
        >
          {content}
        </GlassCard>
      </Animated.View>
    );

    if (onPress) {
      return (
        <AnimatedPressable onPress={onPress} hapticFeedback="light">
          {cardContent}
        </AnimatedPressable>
      );
    }

    return cardContent;
  },
);

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: auroraTheme.borderRadius.xl,
    justifyContent: "center",
    alignItems: "center",
    ...auroraTheme.shadows.md,
  },
  stats: {
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
  },
  value: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  title: {
    textAlign: "center",
    fontWeight: "500",
  },
  subtitle: {
    textAlign: "center",
    marginTop: auroraTheme.spacing.xs,
  },
  trendContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.xs,
    marginTop: auroraTheme.spacing.xs,
  },
  trendText: {
    fontWeight: "600",
  },
});

StatsCard.displayName = "StatsCard";
