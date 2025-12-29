/**
 * SessionCard Component - Premium session display card
 * Features:
 * - Modern glass morphism design
 * - Progress indicator
 * - Status badge
 * - Animated interactions
 * - Rich session info display
 */

import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from "react-native-reanimated";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
} from "../../styles/modernDesignSystem";
import { StatusBadge } from "./StatusBadge";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

type SessionStatus = "active" | "completed" | "paused" | "pending";

interface SessionCardProps {
  id: string;
  name: string;
  location?: string;
  itemCount?: number;
  totalItems?: number;
  status?: SessionStatus;
  lastUpdated?: string;
  createdBy?: string;
  onPress?: () => void;
  onResume?: () => void;
  style?: ViewStyle;
  index?: number;
}

const statusConfig: Record<
  SessionStatus,
  {
    variant: "success" | "warning" | "error" | "info" | "neutral";
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  active: { variant: "success", label: "Active", icon: "radio-button-on" },
  completed: { variant: "info", label: "Completed", icon: "checkmark-circle" },
  paused: { variant: "warning", label: "Paused", icon: "pause-circle" },
  pending: { variant: "neutral", label: "Pending", icon: "time" },
};

export const SessionCard: React.FC<SessionCardProps> = ({
  id: _id,
  name,
  location,
  itemCount = 0,
  totalItems,
  status = "active",
  lastUpdated,
  createdBy,
  onPress,
  onResume,
  style,
  index = 0,
}) => {
  const scale = useSharedValue(1);
  const statusInfo = statusConfig[status];

  // Calculate progress percentage
  const progress = totalItems ? (itemCount / totalItems) * 100 : 0;

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderProgressBar = () => {
    if (!totalItems) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <LinearGradient
            colors={[modernColors.primary[500], modernColors.secondary[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.progressFill,
              { width: `${Math.min(progress, 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {itemCount} / {totalItems} items
        </Text>
      </View>
    );
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[animatedStyle]}
    >
      <AnimatedTouchableOpacity
        style={[styles.container, style]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Card Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <Ionicons
                name="folder-open"
                size={20}
                color={modernColors.primary[400]}
              />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.name} numberOfLines={1}>
                {name}
              </Text>
              {location && (
                <View style={styles.locationRow}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={modernColors.text.tertiary}
                  />
                  <Text style={styles.location}>{location}</Text>
                </View>
              )}
            </View>
          </View>
          <StatusBadge
            label={statusInfo.label}
            variant={statusInfo.variant}
            icon={statusInfo.icon}
            size="small"
            pulse={status === "active"}
          />
        </View>

        {/* Progress Bar */}
        {renderProgressBar()}

        {/* Card Footer */}
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            {createdBy && (
              <View style={styles.infoItem}>
                <Ionicons
                  name="person-outline"
                  size={12}
                  color={modernColors.text.tertiary}
                />
                <Text style={styles.infoText}>{createdBy}</Text>
              </View>
            )}
            {lastUpdated && (
              <View style={styles.infoItem}>
                <Ionicons
                  name="time-outline"
                  size={12}
                  color={modernColors.text.tertiary}
                />
                <Text style={styles.infoText}>{lastUpdated}</Text>
              </View>
            )}
          </View>

          {onResume && status !== "completed" && (
            <TouchableOpacity style={styles.resumeButton} onPress={onResume}>
              <Ionicons name="play" size={14} color="#FFFFFF" />
              <Text style={styles.resumeText}>Resume</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Item count badge */}
        {!totalItems && itemCount > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{itemCount}</Text>
            <Text style={styles.countLabel}>items</Text>
          </View>
        )}
      </AnimatedTouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(30, 41, 59, 0.6)",
    borderRadius: modernBorderRadius.lg,
    padding: modernSpacing.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    ...modernShadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: modernSpacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: modernSpacing.sm,
    marginRight: modernSpacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: modernBorderRadius.md,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...modernTypography.body.medium,
    fontWeight: "600",
    color: modernColors.text.primary,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  },
  progressContainer: {
    marginBottom: modernSpacing.md,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
    textAlign: "right",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: modernSpacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  footerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: modernSpacing.md,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    ...modernTypography.label.small,
    color: modernColors.text.tertiary,
  },
  resumeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: modernSpacing.sm,
    paddingVertical: 6,
    borderRadius: modernBorderRadius.sm,
    backgroundColor: modernColors.primary[500],
  },
  resumeText: {
    ...modernTypography.label.small,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  countBadge: {
    position: "absolute",
    top: -8,
    right: modernSpacing.md,
    backgroundColor: modernColors.primary[500],
    paddingHorizontal: modernSpacing.sm,
    paddingVertical: 4,
    borderRadius: modernBorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
    ...modernShadows.sm,
  },
  countText: {
    ...modernTypography.label.medium,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  countLabel: {
    ...modernTypography.label.small,
    color: "rgba(255, 255, 255, 0.8)",
  },
});

export default SessionCard;
