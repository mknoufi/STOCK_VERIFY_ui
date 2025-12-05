import React from "react";
import { View, StyleSheet, ViewStyle, Text, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  modernColors,
  modernBorderRadius,
  modernSpacing,
  modernShadows,
  glassmorphism,
  modernTypography,
} from "../../styles/modernDesignSystem";

export type CardVariant =
  | "default"
  | "elevated"
  | "glass"
  | "outlined"
  | "gradient";

interface PremiumCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>;
  title?: string;
  subtitle?: string;
  padding?: keyof typeof modernSpacing | number;
}

export const PremiumCard: React.FC<PremiumCardProps> = ({
  children,
  variant = "default",
  style,
  title,
  subtitle,
  padding = "cardPadding",
}) => {
  const getPadding = () => {
    if (typeof padding === "number") return padding;
    return (
      modernSpacing[padding as keyof typeof modernSpacing] ||
      modernSpacing.cardPadding
    );
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: modernColors.background.paper,
          borderWidth: 0,
          ...modernShadows.md,
        };
      case "glass":
        return {
          backgroundColor: glassmorphism.dark.backgroundColor,
          borderColor: glassmorphism.dark.borderColor,
          borderWidth: 1,
        };
      case "outlined":
        return {
          backgroundColor: "transparent",
          borderWidth: 1,
          borderColor: modernColors.border.light,
        };
      case "gradient":
        return {
          borderWidth: 0,
        };
      default:
        return {
          backgroundColor: modernColors.background.paper,
          borderWidth: 1,
          borderColor: modernColors.border.light,
          ...modernShadows.sm,
        };
    }
  };

  const cardContent = (
    <View style={{ padding: getPadding() }}>
      {(title || subtitle) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
      {children}
    </View>
  );

  if (variant === "gradient") {
    return (
      <LinearGradient
        colors={[
          modernColors.background.paper,
          modernColors.background.elevated,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.container, style]}
      >
        {cardContent}
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.container, getVariantStyle(), style]}>
      {cardContent}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: modernBorderRadius.card,
    overflow: "hidden",
    marginBottom: modernSpacing.md,
  },
  header: {
    marginBottom: modernSpacing.md,
  },
  title: {
    ...modernTypography.h4,
    color: modernColors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...modernTypography.body.small,
    color: modernColors.text.secondary,
  },
});
