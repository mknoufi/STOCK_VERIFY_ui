/**
 * ProgressBar Component
 * Displays loading progress with animations
 * Phase 2: Design System - Core Components
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import {
  colorPalette,
  spacing,
  typography,
  borderRadius,
} from "@/theme/designTokens";

export type ProgressBarVariant = "default" | "success" | "warning" | "error";
export type ProgressBarSize = "sm" | "md" | "lg";

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  indeterminate?: boolean;
  style?: ViewStyle;
}

const variantColors: Record<ProgressBarVariant, string> = {
  default: colorPalette.primary[500],
  success: colorPalette.success[500],
  warning: colorPalette.warning[500],
  error: colorPalette.error[500],
};

const sizeStyles: Record<
  ProgressBarSize,
  { height: number; fontSize: number }
> = {
  sm: { height: 4, fontSize: typography.fontSize.xs },
  md: { height: 8, fontSize: typography.fontSize.sm },
  lg: { height: 12, fontSize: typography.fontSize.base },
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = "default",
  size = "md",
  showLabel = false,
  label,
  animated = true,
  indeterminate = false,
  style,
}) => {
  const progressValue = useSharedValue(0);
  const sizes = sizeStyles[size];
  const color = variantColors[variant];

  useEffect(() => {
    const clampedProgress = Math.min(Math.max(progress, 0), 100);

    if (animated) {
      progressValue.value = withSpring(clampedProgress, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      progressValue.value = clampedProgress;
    }
  }, [progress, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const displayLabel = label || `${Math.round(progress)}%`;

  return (
    <View style={[styles.container, style]}>
      {showLabel && (
        <Text
          style={[
            styles.label,
            {
              fontSize: sizes.fontSize,
              color: colorPalette.neutral[700],
              fontWeight: typography.fontWeight.medium,
            },
          ]}
        >
          {displayLabel}
        </Text>
      )}

      <View
        style={[
          styles.track,
          {
            height: sizes.height,
            backgroundColor: colorPalette.neutral[200],
            borderRadius: sizes.height / 2,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              borderRadius: sizes.height / 2,
            },
            animatedStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: spacing.xs,
  },
  track: {
    width: "100%",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
  },
});
