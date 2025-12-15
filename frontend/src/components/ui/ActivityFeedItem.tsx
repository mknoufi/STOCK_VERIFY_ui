/**
 * ActivityFeedItem Component - Aurora Design
 * 
 * Animated activity feed item with glassmorphism
 * Features:
 * - Smooth entrance animation
 * - Icon with gradient background
 * - Timestamp formatting
 * - Status indicators
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInRight } from "react-native-reanimated";
import { AnimatedPressable } from "./AnimatedPressable";
import { auroraTheme } from "@/theme/auroraTheme";

export type ActivityType = "scan" | "session" | "variance" | "user" | "system";

interface ActivityFeedItemProps {
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string | Date;
  onPress?: () => void;
  delay?: number;
  status?: "success" | "warning" | "error" | "info";
}

const activityConfig = {
  scan: {
    icon: "scan" as const,
    gradient: auroraTheme.colors.aurora.primary,
  },
  session: {
    icon: "folder-open" as const,
    gradient: auroraTheme.colors.aurora.secondary,
  },
  variance: {
    icon: "analytics" as const,
    gradient: auroraTheme.colors.aurora.warm,
  },
  user: {
    icon: "person" as const,
    gradient: auroraTheme.colors.aurora.success,
  },
  system: {
    icon: "settings" as const,
    gradient: auroraTheme.colors.aurora.dark,
  },
};

const statusColors = {
  success: auroraTheme.colors.success[500],
  warning: auroraTheme.colors.warning[500],
  error: auroraTheme.colors.error[500],
  info: auroraTheme.colors.secondary[500],
};

export const ActivityFeedItem: React.FC<ActivityFeedItemProps> = ({
  type,
  title,
  description,
  timestamp,
  onPress,
  delay = 0,
  status,
}) => {
  const config = activityConfig[type];
  
  const formatTimestamp = (ts: string | Date) => {
    const date = typeof ts === "string" ? new Date(ts) : ts;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const content = (
    <Animated.View entering={FadeInRight.delay(delay).springify()} style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <LinearGradient
          colors={config.gradient as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconContainer}
        >
          <Ionicons name={config.icon} size={20} color={auroraTheme.colors.text.primary} />
        </LinearGradient>

        {/* Text Content */}
        <View style={styles.textContent}>
          <View style={styles.header}>
            <Text
              style={[
                styles.title,
                {
                  fontFamily: auroraTheme.typography.fontFamily.label,
                  fontSize: auroraTheme.typography.fontSize.base,
                  color: auroraTheme.colors.text.primary,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
            {status && (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColors[status] },
                ]}
              />
            )}
          </View>

          <Text
            style={[
              styles.description,
              {
                fontFamily: auroraTheme.typography.fontFamily.body,
                fontSize: auroraTheme.typography.fontSize.sm,
                color: auroraTheme.colors.text.secondary,
              },
            ]}
            numberOfLines={2}
          >
            {description}
          </Text>

          <Text
            style={[
              styles.timestamp,
              {
                fontFamily: auroraTheme.typography.fontFamily.body,
                fontSize: auroraTheme.typography.fontSize.xs,
                color: auroraTheme.colors.text.tertiary,
              },
            ]}
          >
            {formatTimestamp(timestamp)}
          </Text>
        </View>

        {/* Chevron */}
        {onPress && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={auroraTheme.colors.text.tertiary}
          />
        )}
      </View>

      {/* Divider */}
      <View style={styles.divider} />
    </Animated.View>
  );

  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} hapticFeedback="light">
        {content}
      </AnimatedPressable>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    marginBottom: auroraTheme.spacing.sm,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: auroraTheme.borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    ...auroraTheme.shadows.sm,
  },
  textContent: {
    flex: 1,
    gap: auroraTheme.spacing.xs,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  title: {
    flex: 1,
    fontWeight: "600",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    ...auroraTheme.shadows.sm,
  },
  description: {
    lineHeight: 18,
  },
  timestamp: {
    marginTop: auroraTheme.spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: auroraTheme.colors.border.light,
    marginLeft: 40 + auroraTheme.spacing.md,
  },
});