/**
 * GlassCard Component - Enhanced v2.0
 *
 * Glassmorphism card with backdrop blur effect
 * Features:
 * - Translucent background with blur
 * - Gradient border option
 * - Shadow and elevation
 * - Customizable variants
 */

import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeContextSafe } from "../../context/ThemeContext";

export type GlassVariant = "light" | "medium" | "strong" | "dark" | "modal";
export type GlassElevation = "none" | "xs" | "sm" | "md" | "lg" | "xl";

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: GlassVariant;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  borderRadius?: number;
  padding?: number;
  withGradientBorder?: boolean;
  elevation?: GlassElevation;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export const GlassCard = ({
  children,
  style,
  variant = "medium",
  intensity = 20,
  tint = "dark",
  borderRadius,
  padding,
  withGradientBorder = false,
  elevation = "md",
  accessibilityLabel,
  accessibilityHint,
}: GlassCardProps) => {
  const themeContext = useThemeContextSafe();
  const theme = themeContext?.theme;

  // Defaults using theme tokens or fallback to modernDesignSystem
  const activeBorderRadius = borderRadius ?? (theme?.borderRadius?.md || 12);
  const activePadding = padding ?? (theme?.spacing?.md || 16);

  const glassStyle = theme?.glass[variant] || theme?.glass.medium || {};
  const shadowStyle =
    elevation !== "none" ? (theme?.shadows[elevation] as ViewStyle) : {};
  const useBlur = Platform.OS !== "web";

  // Resolve tint based on theme if default
  const activeTint =
    tint === "default"
      ? theme?.colors.background.default === "#000000"
        ? "dark"
        : "light"
      : tint;

  const fallbackBackground =
    theme?.colors.background.paper || "rgba(255, 255, 255, 0.8)";

  if (withGradientBorder) {
    return (
      <View
        style={[styles.container, shadowStyle, { borderRadius: activeBorderRadius }, style]}
        accessible={true}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
      >
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0.1)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientBorder,
            {
              borderRadius: activeBorderRadius,
              padding: (glassStyle as any).borderWidth || 1,
            },
          ]}
        >
          {useBlur ? (
            <BlurView
              intensity={intensity}
              tint={activeTint}
              style={[
                styles.blur,
                {
                  borderRadius: activeBorderRadius - ((glassStyle as any).borderWidth || 1),
                  backgroundColor: "transparent", // BlurView handles background
                },
              ]}
            >
              <View style={[glassStyle, styles.content, { padding: activePadding, borderWidth: 0, borderRadius: 0 }]}>{children}</View>
            </BlurView>
          ) : (
            <View
              style={[
                styles.webFallbackSurface,
                {
                  borderRadius: activeBorderRadius - ((glassStyle as any).borderWidth || 1),
                  backgroundColor: fallbackBackground,
                },
              ]}
            >
              <View style={[styles.content, { padding: activePadding }]}>{children}</View>
            </View>
          )}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        glassStyle,
        shadowStyle,
        { borderRadius: activeBorderRadius },
        style,
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {useBlur ? (
        <BlurView intensity={intensity} tint={activeTint} style={[styles.blur, { borderRadius: activeBorderRadius }]}>
          <View style={[styles.content, { padding: activePadding }]}>{children}</View>
        </BlurView>
      ) : (
        <View
          style={[
            styles.webFallbackSurface,
            {
              backgroundColor: fallbackBackground,
              borderRadius: activeBorderRadius,
            },
          ]}
        >
          <View style={[styles.content, { padding: activePadding }]}>{children}</View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    // Base styles
  },
  gradientBorder: {
    overflow: "hidden",
  },
  blur: {
    // Let blur view size itself based on content
    overflow: 'hidden',
  },
  webFallbackSurface: {
    // Web safe fallback when native blur isn't available
  },
  content: {
    // Padding applied dynamically
  },
});
