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
import { auroraTheme } from "../../theme/auroraTheme";

export type GlassVariant = "light" | "medium" | "strong" | "dark" | "modal"; // Added modal
export type GlassElevation = "none" | "sm" | "md" | "lg" | "xl";

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
  borderRadius = auroraTheme.borderRadius.card,
  padding = auroraTheme.spacing.md,
  withGradientBorder = false,
  elevation = "md",
  accessibilityLabel,
  accessibilityHint,
}: GlassCardProps) => {
  const glassStyle = variant ? auroraTheme.glass[variant] : {};
  const shadowStyle =
    elevation !== "none" ? auroraTheme.shadows[elevation] : {};
  const useBlur = Platform.OS !== "web";
  const fallbackBackground =
    (glassStyle as ViewStyle).backgroundColor || "rgba(30, 41, 59, 0.4)";

  if (withGradientBorder) {
    return (
      <View
        style={[styles.container, shadowStyle, { borderRadius }, style]}
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
              borderRadius,
              padding: glassStyle.borderWidth || 1,
            },
          ]}
        >
          {useBlur ? (
            <BlurView
              intensity={intensity}
              tint={tint}
              style={[
                styles.blur,
                {
                  borderRadius: borderRadius - (glassStyle.borderWidth || 1),
                },
              ]}
            >
              <View style={[styles.content, { padding }]}>{children}</View>
            </BlurView>
          ) : (
            <View
              style={[
                styles.webFallbackSurface,
                {
                  borderRadius: borderRadius - (glassStyle.borderWidth || 1),
                  backgroundColor: fallbackBackground,
                },
              ]}
            >
              <View style={[styles.content, { padding }]}>{children}</View>
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
        { borderRadius },
        style,
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      {useBlur ? (
        <BlurView intensity={intensity} tint={tint} style={styles.blur}>
          <View style={[styles.content, { padding }]}>{children}</View>
        </BlurView>
      ) : (
        <View
          style={[
            styles.webFallbackSurface,
            {
              backgroundColor: fallbackBackground,
            },
          ]}
        >
          <View style={[styles.content, { padding }]}>{children}</View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  gradientBorder: {
    overflow: "hidden",
  },
  blur: {
    // Let blur view size itself based on content
  },
  webFallbackSurface: {
    // Web safe fallback when native blur isn't available
    backgroundColor: "rgba(30, 41, 59, 0.4)",
  },
  content: {
    // Padding applied dynamically
  },
});
