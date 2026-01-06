/**
 * ThemedScreen Component
 *
 * A wrapper component that provides consistent theming, pattern backgrounds,
 * and layout arrangements across screens
 */

import React from "react";
import {
  View,
  StyleSheet,
  ViewStyle,
  Text,
  TextStyle,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeContext } from "../../context/ThemeContext";
import { PatternBackground } from "./PatternBackground";
import { colors as unifiedColors } from "../../theme/unified";

interface ThemedScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  showPattern?: boolean;
  patternOpacity?: number;
  useSafeArea?: boolean;
  variant?: "default" | "glass" | "solid";
}

export const ThemedScreen: React.FC<ThemedScreenProps> = ({
  children,
  style,
  showPattern = true,
  patternOpacity = 0.04,
  useSafeArea = true,
  variant = "default",
}) => {
  const { themeLegacy: theme, pattern, layout } = useThemeContext();
  const insets = useSafeAreaInsets();

  // Get spacing based on layout arrangement
  const getLayoutSpacing = () => {
    switch (layout) {
      case "compact":
        return { horizontal: 12, vertical: 8 };
      case "spacious":
        return { horizontal: 24, vertical: 20 };
      case "cards":
        return { horizontal: 16, vertical: 16 };
      case "list":
        return { horizontal: 16, vertical: 12 };
      case "grid":
        return { horizontal: 12, vertical: 12 };
      default:
        return { horizontal: 16, vertical: 16 };
    }
  };

  const spacing = getLayoutSpacing();

  const containerStyle: ViewStyle = {
    flex: 1,
    backgroundColor:
      variant === "solid" ? theme.colors.surface : theme.colors.background,
  };

  const contentStyle: ViewStyle = {
    flex: 1,
    paddingTop: useSafeArea ? insets.top : 0,
    paddingBottom: useSafeArea ? insets.bottom : 0,
    paddingHorizontal: spacing.horizontal,
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[containerStyle, style]}>
        {/* Pattern Background */}
        {showPattern && pattern !== "none" && (
          <PatternBackground
            pattern={pattern}
            color={theme.colors.accent}
            secondaryColor={theme.colors.textSecondary}
            opacity={patternOpacity}
          />
        )}

        {/* Gradient Overlay for glass variant */}
        {variant === "glass" && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: `${theme.colors.background}E6` },
            ]}
          />
        )}

        {/* Content */}
        <View style={contentStyle}>{children}</View>
      </View>
    </TouchableWithoutFeedback>
  );
};

/**
 * ThemedCard Component
 *
 * A themed card that adapts to current theme and layout settings
 */
interface ThemedCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "glass" | "elevated" | "outlined";
  padding?: "none" | "small" | "medium" | "large";
}

export const ThemedCard: React.FC<ThemedCardProps> = ({
  children,
  style,
  variant = "default",
  padding = "medium",
}) => {
  const { themeLegacy: theme, layout, isDark } = useThemeContext();

  // Get padding based on layout and padding prop
  const getPadding = () => {
    const baseMultiplier =
      layout === "compact" ? 0.75 : layout === "spacious" ? 1.25 : 1;
    const sizes = { none: 0, small: 8, medium: 16, large: 24 };
    return sizes[padding] * baseMultiplier;
  };

  // Get card styles based on variant
  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      borderRadius: theme.borderRadius.lg,
      padding: getPadding(),
      overflow: "hidden",
    };

    switch (variant) {
      case "glass":
        return {
          ...base,
          backgroundColor: `${theme.colors.surface}${isDark ? "80" : "A0"}`,
          borderWidth: 1,
          borderColor: `${theme.colors.border}40`,
        };
      case "elevated":
        return {
          ...base,
          backgroundColor: theme.colors.surface,
          shadowColor: isDark
            ? unifiedColors.black
            : unifiedColors.neutral[500],
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.3 : 0.1,
          shadowRadius: 12,
          elevation: 8,
        };
      case "outlined":
        return {
          ...base,
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      default:
        return {
          ...base,
          backgroundColor: theme.colors.surface,
        };
    }
  };

  return <View style={[getCardStyle(), style]}>{children}</View>;
};

/**
 * ThemedText Component
 *
 * A text component that adapts to current theme
 */

interface ThemedTextProps {
  children: React.ReactNode;
  style?: TextStyle;
  variant?: "body" | "heading" | "caption" | "label";
  color?: "primary" | "secondary" | "accent" | "success" | "warning" | "error";
  weight?: "normal" | "medium" | "semibold" | "bold";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

export const ThemedText: React.FC<ThemedTextProps> = ({
  children,
  style,
  variant = "body",
  color = "primary",
  weight = "normal",
  size = "md",
}) => {
  const { themeLegacy: theme } = useThemeContext();

  const getColor = () => {
    switch (color) {
      case "secondary":
        return theme.colors.textSecondary;
      case "accent":
        return theme.colors.accent;
      case "success":
        return theme.colors.success;
      case "warning":
        return theme.colors.warning;
      case "error":
        return theme.colors.danger;
      default:
        return theme.colors.text;
    }
  };

  const getSize = () => {
    const sizes = {
      xs: 10,
      sm: 12,
      md: 14,
      lg: 16,
      xl: 20,
      "2xl": 24,
      "3xl": 32,
    };
    return sizes[size];
  };

  const getWeight = (): TextStyle["fontWeight"] => {
    const weights = {
      normal: "400" as const,
      medium: "500" as const,
      semibold: "600" as const,
      bold: "700" as const,
    };
    return weights[weight];
  };

  const textStyle: TextStyle = {
    color: getColor(),
    fontSize: getSize(),
    fontWeight: getWeight(),
    ...(variant === "heading" && { letterSpacing: -0.5 }),
    ...(variant === "caption" && { opacity: 0.7 }),
    ...(variant === "label" && {
      textTransform: "uppercase",
      letterSpacing: 0.5,
    }),
  };

  return <Text style={[textStyle, style]}>{children}</Text>;
};

export default ThemedScreen;
