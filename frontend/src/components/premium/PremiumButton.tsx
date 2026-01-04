/**
 * PremiumButton Component
 * Re-exports ModernButton with consistent naming for premium UI components
 */

import React from "react";
import { ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ModernButton, ButtonVariant, ButtonSize } from "../ui/ModernButton";

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: string[];
  testID?: string;
  accessibilityLabel?: string;
}

export const PremiumButton: React.FC<PremiumButtonProps> = (props) => {
  return <ModernButton {...props} />;
};

export type { PremiumButtonProps, ButtonVariant, ButtonSize };
