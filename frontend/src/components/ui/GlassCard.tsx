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
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";
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
  const shadowStyle = elevation !== "none" ? auroraTheme.shadows[elevation] : {};

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
      <BlurView intensity={intensity} tint={tint} style={styles.blur}>
        <View style={[styles.content, { padding }]}>{children}</View>
      </BlurView>
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
    width: "100%",
    height: "100%",
  },
  content: {
    // Padding applied dynamically
  },
});
