/**
 * Shimmer Component - Aurora Design v2.0
 *
 * Elegant shimmer loading effect
 * Features:
 * - Smooth gradient animation
 * - Customizable colors and speed
 * - Multiple variants
 */

import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  useWindowDimensions,
  DimensionValue,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

interface ShimmerProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: "light" | "dark";
  duration?: number;
}

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export const Shimmer: React.FC<ShimmerProps> = ({
  width = "100%",
  height = 20,
  borderRadius = auroraTheme.borderRadius.md,
  style,
  variant = "dark",
  duration = 1500,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useSharedValue(-screenWidth);

  useEffect(() => {
    translateX.value = -screenWidth;
    translateX.value = withRepeat(
      withTiming(screenWidth, {
        duration,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [duration, translateX, screenWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const colors: readonly [string, string, string] =
    variant === "dark"
      ? ([
          auroraTheme.colors.neutral[800],
          auroraTheme.colors.neutral[700],
          auroraTheme.colors.neutral[800],
        ] as const)
      : ([
          auroraTheme.colors.neutral[200],
          auroraTheme.colors.neutral[100],
          auroraTheme.colors.neutral[200],
        ] as const);

  return (
    <View
      style={[
        styles.container,
        {
          width,
          height,
          borderRadius,
          backgroundColor:
            variant === "dark"
              ? auroraTheme.colors.neutral[800]
              : auroraTheme.colors.neutral[200],
        },
        style,
      ]}
    >
      <AnimatedGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.gradient, { width: screenWidth * 2 }, animatedStyle]}
      />
    </View>
  );
};

/**
 * ShimmerPlaceholder - Pre-built shimmer placeholders
 */
export const ShimmerPlaceholder = {
  Text: ({
    lines = 3,
    variant = "dark",
  }: {
    lines?: number;
    variant?: "light" | "dark";
  }) => (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <Shimmer
          key={index}
          height={16}
          width={index === lines - 1 ? "60%" : "100%"}
          variant={variant}
          style={{ marginBottom: auroraTheme.spacing.sm }}
        />
      ))}
    </View>
  ),

  Card: ({ variant = "dark" }: { variant?: "light" | "dark" }) => (
    <View style={styles.cardContainer}>
      <Shimmer
        height={56}
        width={56}
        borderRadius={auroraTheme.borderRadius.xl}
        variant={variant}
      />
      <View style={styles.cardContent}>
        <Shimmer height={24} width="40%" variant={variant} />
        <Shimmer
          height={14}
          width="70%"
          variant={variant}
          style={{ marginTop: 8 }}
        />
      </View>
    </View>
  ),

  Avatar: ({
    size = 48,
    variant = "dark",
  }: {
    size?: number;
    variant?: "light" | "dark";
  }) => (
    <Shimmer
      height={size}
      width={size}
      borderRadius={size / 2}
      variant={variant}
    />
  ),

  StatsCard: ({ variant = "dark" }: { variant?: "light" | "dark" }) => (
    <View style={styles.statsCardContainer}>
      <Shimmer
        height={56}
        width={56}
        borderRadius={auroraTheme.borderRadius.xl}
        variant={variant}
      />
      <Shimmer
        height={36}
        width="50%"
        variant={variant}
        style={{ marginTop: 12 }}
      />
      <Shimmer
        height={14}
        width="70%"
        variant={variant}
        style={{ marginTop: 8 }}
      />
    </View>
  ),

  ListItem: ({ variant = "dark" }: { variant?: "light" | "dark" }) => (
    <View style={styles.listItemContainer}>
      <Shimmer height={40} width={40} borderRadius={20} variant={variant} />
      <View style={styles.listItemContent}>
        <Shimmer height={16} width="60%" variant={variant} />
        <Shimmer
          height={12}
          width="40%"
          variant={variant}
          style={{ marginTop: 6 }}
        />
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  textContainer: {
    gap: auroraTheme.spacing.sm,
  },
  cardContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
    padding: auroraTheme.spacing.md,
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.xl,
  },
  cardContent: {
    flex: 1,
  },
  statsCardContainer: {
    alignItems: "center",
    padding: auroraTheme.spacing.lg,
    backgroundColor: auroraTheme.colors.background.glass,
    borderRadius: auroraTheme.borderRadius.xl,
  },
  listItemContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.sm,
  },
  listItemContent: {
    flex: 1,
  },
});

export default Shimmer;
