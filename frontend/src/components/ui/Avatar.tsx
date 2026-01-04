/**
 * Avatar Component
 * Displays user profile images or initials
 * Phase 2: Design System - Core Components
 */

import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colorPalette, typography } from "@/theme/designTokens";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  source?: { uri: string } | number;
  name?: string;
  size?: AvatarSize;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  badge?: boolean;
  badgeColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const sizeStyles: Record<
  AvatarSize,
  { size: number; fontSize: number; iconSize: number }
> = {
  xs: { size: 24, fontSize: typography.fontSize.xs, iconSize: 12 },
  sm: { size: 32, fontSize: typography.fontSize.sm, iconSize: 16 },
  md: { size: 40, fontSize: typography.fontSize.base, iconSize: 20 },
  lg: { size: 56, fontSize: typography.fontSize.lg, iconSize: 28 },
  xl: { size: 72, fontSize: typography.fontSize["2xl"], iconSize: 36 },
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(" ").filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0]?.[0] || "";
    const last = parts[parts.length - 1]?.[0] || "";
    return `${first}${last}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getBackgroundColor = (name?: string): string => {
  if (!name) return colorPalette.neutral[400];

  const colors = [
    colorPalette.primary[500],
    colorPalette.success[500],
    colorPalette.info[500],
    colorPalette.warning[500],
    colorPalette.error[500],
  ];

  const charCode = name.charCodeAt(0);
  return colors[charCode % colors.length] || colorPalette.primary[500];
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = "md",
  fallbackIcon = "person",
  badge = false,
  badgeColor = colorPalette.success[500],
  style,
  textStyle,
}) => {
  const sizes = sizeStyles[size];
  const backgroundColor = name
    ? getBackgroundColor(name)
    : colorPalette.neutral[400];

  const renderContent = () => {
    if (source) {
      return (
        <Image
          source={source}
          style={[styles.image, { width: sizes.size, height: sizes.size }]}
        />
      );
    }

    if (name) {
      return (
        <Text
          style={[
            styles.initials,
            {
              fontSize: sizes.fontSize,
              fontWeight: typography.fontWeight.semibold,
              color: colorPalette.neutral[0],
            },
            textStyle,
          ]}
        >
          {getInitials(name)}
        </Text>
      );
    }

    return (
      <Ionicons
        name={fallbackIcon}
        size={sizes.iconSize}
        color={colorPalette.neutral[0]}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.avatar,
          {
            width: sizes.size,
            height: sizes.size,
            borderRadius: sizes.size / 2,
            backgroundColor: source ? "transparent" : backgroundColor,
          },
          style,
        ]}
      >
        {renderContent()}
      </View>

      {badge && (
        <View
          style={[
            styles.badge,
            {
              width: sizes.size * 0.3,
              height: sizes.size * 0.3,
              borderRadius: (sizes.size * 0.3) / 2,
              backgroundColor: badgeColor,
              borderWidth: 2,
              borderColor: colorPalette.neutral[0],
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  initials: {
    textAlign: "center",
  },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
});
