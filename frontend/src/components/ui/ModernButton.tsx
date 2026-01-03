/**
 * Modern Button Component for Lavanya Mart Stock Verify
 * Clean, accessible button with modern styling
 */

import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  componentSizes,
} from "../../theme/modernDesign";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "success"
  | "warning"
  | "error";
type ButtonSize = "sm" | "md" | "lg";

interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  fullWidth?: boolean;
  hapticFeedback?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconPosition = "left",
  fullWidth = false,
  hapticFeedback = true,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;

    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onPress();
  };

  const getButtonStyles = (): ViewStyle => {
    const baseStyles: ViewStyle = {
      ...componentSizes.button[size],
      borderRadius: borderRadius.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      ...shadows.sm,
    };

    if (fullWidth) {
      baseStyles.width = "100%";
    }

    // Background colors
    const backgroundColors: Record<ButtonVariant, string> = {
      primary: colors.primary[500],
      secondary: colors.gray[100],
      outline: colors.transparent,
      ghost: colors.transparent,
      success: colors.success[500],
      warning: colors.warning[500],
      error: colors.error[500],
    };

    baseStyles.backgroundColor = backgroundColors[variant];

    // Border styles
    if (variant === "outline") {
      baseStyles.borderWidth = 1.5;
      baseStyles.borderColor = colors.primary[500];
    }

    // Disabled styles
    if (disabled || loading) {
      baseStyles.opacity = 0.6;
    }

    return baseStyles;
  };

  const getTextStyles = (): TextStyle => {
    const baseTextStyles: TextStyle = {
      fontSize: typography.fontSize[size === "sm" ? "sm" : size === "lg" ? "lg" : "base"],
      fontWeight: typography.fontWeight.semibold,
      textAlign: "center",
    };

    // Text colors
    const textColors: Record<ButtonVariant, string> = {
      primary: colors.white,
      secondary: colors.gray[700],
      outline: colors.primary[500],
      ghost: colors.primary[500],
      success: colors.white,
      warning: colors.white,
      error: colors.white,
    };

    baseTextStyles.color = textColors[variant];

    return baseTextStyles;
  };

  const renderIcon = () => {
    if (!icon) return null;

    const iconSize = componentSizes.icon[size === "sm" ? "sm" : size === "lg" ? "lg" : "md"];
    const iconColor = getTextStyles().color;

    return (
      <Ionicons
        name={icon}
        size={iconSize}
        color={iconColor}
        style={[iconPosition === "left" ? { marginRight: spacing.xs } : { marginLeft: spacing.xs }]}
      />
    );
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={getTextStyles().color} />;
    }

    const showLeftIcon = icon && iconPosition === "left";
    const showRightIcon = icon && iconPosition === "right";

    return (
      <>
        {showLeftIcon && renderIcon()}
        <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        {showRightIcon && renderIcon()}
      </>
    );
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[getButtonStyles(), style]}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

export default ModernButton;
