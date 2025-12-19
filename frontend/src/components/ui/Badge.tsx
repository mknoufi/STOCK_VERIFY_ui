/**
 * Badge Component
 * Displays status indicators, counts, and labels
 * Phase 2: Design System - Core Components
 */

import React from "react";
import { View, Text, StyleSheet, ViewStyle, TextStyle } from "react-native";
import {
  colorPalette,
  spacing,
  typography,
  borderRadius,
} from "@/theme/designTokens";

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";
export type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  label: string | number;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: colorPalette.neutral[200], text: colorPalette.neutral[800] },
  primary: { bg: colorPalette.primary[500], text: colorPalette.neutral[0] },
  success: { bg: colorPalette.success[500], text: colorPalette.neutral[0] },
  warning: { bg: colorPalette.warning[500], text: colorPalette.neutral[0] },
  error: { bg: colorPalette.error[500], text: colorPalette.neutral[0] },
  info: { bg: colorPalette.info[500], text: colorPalette.neutral[0] },
};

const sizeStyles: Record<
  BadgeSize,
  { padding: number; fontSize: number; minWidth: number }
> = {
  sm: { padding: spacing.xs, fontSize: typography.fontSize.xs, minWidth: 16 },
  md: { padding: spacing.sm, fontSize: typography.fontSize.sm, minWidth: 20 },
  lg: { padding: spacing.md, fontSize: typography.fontSize.base, minWidth: 24 },
};

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = "default",
  size = "md",
  dot = false,
  style,
  textStyle,
}) => {
  const colors = variantColors[variant];
  const sizes = sizeStyles[size];

  if (dot) {
    return (
      <View
        style={[
          styles.dot,
          {
            backgroundColor: colors.bg,
            width: sizes.minWidth / 2,
            height: sizes.minWidth / 2,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: sizes.padding,
          paddingVertical: sizes.padding / 2,
          minWidth: sizes.minWidth,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: sizes.fontSize,
            fontWeight: typography.fontWeight.medium,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  text: {
    textAlign: "center",
  },
  dot: {
    borderRadius: borderRadius.full,
  },
});
