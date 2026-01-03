/**
 * Modern Card Component for Lavanya Mart Stock Verify
 * Clean, accessible card design with modern styling
 */

import React from "react";
import { View, ViewStyle, StyleSheet, TouchableOpacity } from "react-native";

import { colors, spacing, borderRadius, shadows } from "../../theme/modernDesign";

interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  variant?: "default" | "outlined" | "filled";
  padding?: keyof typeof spacing;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  style,
  onPress,
  elevated = true,
  variant = "default",
  padding = "md",
}) => {
  const cardStyles = [
    styles.base,
    {
      padding: spacing[padding],
      backgroundColor: variant === "filled" ? colors.gray[50] : colors.white,
      borderWidth: variant === "outlined" ? 1 : 0,
      borderColor: variant === "outlined" ? colors.gray[200] : "transparent",
      ...(elevated && shadows.md),
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={cardStyles} activeOpacity={0.95}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
  },
});

export default ModernCard;
