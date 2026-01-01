/**
 * ResponsiveText Component - Modern Text Rendering
 *
 * Automatically scales text based on screen size and platform
 * Ensures consistent typography across all devices
 *
 * Usage:
 * <ResponsiveText variant="heading">Title</ResponsiveText>
 * <ResponsiveText variant="body">Content</ResponsiveText>
 */

import React from "react";
import { Text, TextProps, useWindowDimensions, Platform } from "react-native";
import { useThemeContext } from "../../context/ThemeContext";

export type TextVariant =
  | "display"
  | "heading"
  | "subheading"
  | "body"
  | "label"
  | "caption";

export interface ResponsiveTextProps extends TextProps {
  variant?: TextVariant;
  color?: "primary" | "secondary" | "tertiary" | "error" | "success" | "custom";
  weight?: "light" | "normal" | "medium" | "semibold" | "bold";
  customColor?: string;
  align?: "left" | "center" | "right";
  numberOfLines?: number;
}

const fontWeightMap = {
  light: "300" as const,
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
};

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
  variant = "body",
  color = "primary",
  weight = "normal",
  customColor,
  align = "left",
  style,
  children,
  numberOfLines,
  ...props
}) => {
  const { width } = useWindowDimensions();
  const { themeLegacy: theme } = useThemeContext();
  const isTablet = width > 768;

  // Responsive font size scaling
  const getFontSize = (): number => {
    const sizes: Record<TextVariant, { mobile: number; tablet: number }> = {
      display: { mobile: 28, tablet: 32 },
      heading: { mobile: 20, tablet: 24 },
      subheading: { mobile: 16, tablet: 18 },
      body: { mobile: 14, tablet: 16 },
      label: { mobile: 12, tablet: 13 },
      caption: { mobile: 10, tablet: 11 },
    };

    return sizes[variant][isTablet ? "tablet" : "mobile"];
  };

  // Responsive line height
  const getLineHeight = (): number => {
    const lineHeights: Record<TextVariant, number> = {
      display: 1.2,
      heading: 1.3,
      subheading: 1.4,
      body: 1.5,
      label: 1.4,
      caption: 1.3,
    };

    return getFontSize() * lineHeights[variant];
  };

  // Get color based on theme
  const getColor = (): string => {
    if (customColor) return customColor;

    const colors: Record<
      "primary" | "secondary" | "tertiary" | "error" | "success" | "custom",
      string
    > = {
      primary: theme.colors.text,
      secondary: theme.colors.textSecondary,
      tertiary: theme.colors.textSecondary, // Use textSecondary for tertiary
      error: theme.colors.danger,
      success: theme.colors.success || "#22C55E",
      custom: theme.colors.text,
    };

    return colors[color];
  };

  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: getFontSize(),
          lineHeight: getLineHeight(),
          color: getColor(),
          fontWeight: fontWeightMap[weight],
          textAlign: align,
          fontFamily: Platform.OS === "ios" ? "-apple-system" : "Roboto",
        },
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
};

export default ResponsiveText;
