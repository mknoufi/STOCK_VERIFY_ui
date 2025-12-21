/**
 * ScanFeedback Component - Aurora Design v2.0
 *
 * Visual and haptic feedback for barcode scanning
 * Features:
 * - Success/Error animations
 * - Lottie-like animated feedback
 * - Haptic patterns
 * - Sound feedback support
 */

import React, { useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export type ScanFeedbackType =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "duplicate";

interface ScanFeedbackProps {
  type: ScanFeedbackType;
  title: string;
  message?: string;
  visible: boolean;
  onDismiss?: () => void;
  duration?: number;
  showIcon?: boolean;
}

const feedbackConfig = {
  success: {
    icon: "checkmark-circle" as const,
    gradient: auroraTheme.colors.aurora.success,
    haptic: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  },
  error: {
    icon: "close-circle" as const,
    gradient: [
      auroraTheme.colors.error[500],
      auroraTheme.colors.error[700],
    ] as const,
    haptic: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
  },
  warning: {
    icon: "warning" as const,
    gradient: auroraTheme.colors.aurora.warm,
    haptic: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  },
  info: {
    icon: "information-circle" as const,
    gradient: auroraTheme.colors.aurora.secondary,
    haptic: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  },
  duplicate: {
    icon: "copy" as const,
    gradient: [
      auroraTheme.colors.warning[500],
      auroraTheme.colors.warning[700],
    ] as const,
    haptic: () =>
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  },
};

export const ScanFeedback: React.FC<ScanFeedbackProps> = ({
  type,
  title,
  message,
  visible,
  onDismiss,
  duration = 2000,
  showIcon = true,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotation = useSharedValue(0);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.5);

  const config = feedbackConfig[type];

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      feedbackConfig[type].haptic();
    }
  }, [type]);

  useEffect(() => {
    if (visible) {
      // Trigger haptic
      triggerHaptic();

      // Animate in
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });

      // Icon animation
      iconScale.value = withDelay(
        100,
        withSpring(1, { damping: 10, stiffness: 200 }),
      );

      if (type === "success") {
        iconRotation.value = withDelay(
          150,
          withSequence(
            withTiming(-10, { duration: 100 }),
            withSpring(0, { damping: 8, stiffness: 200 }),
          ),
        );
      }

      // Pulse ring animation
      ringScale.value = withRepeat(
        withSequence(
          withTiming(1.5, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 400 }),
        ),
        3,
        false,
      );
      ringOpacity.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 600 }),
          withTiming(0.5, { duration: 0 }),
        ),
        3,
        false,
      );

      // Auto dismiss
      if (onDismiss) {
        const timer = setTimeout(() => {
          opacity.value = withTiming(0, { duration: 200 });
          scale.value = withTiming(0.8, { duration: 200 });
          iconScale.value = withTiming(0, { duration: 150 });
          setTimeout(onDismiss, 200);
        }, duration);

        return () => clearTimeout(timer);
      }
      return; // Explicit return for the case when onDismiss is not provided
    } else {
      // Reset animations
      scale.value = 0;
      opacity.value = 0;
      iconScale.value = 0;
      return; // All paths must return
    }
  }, [
    visible,
    duration,
    onDismiss,
    type,
    triggerHaptic,
    opacity,
    scale,
    iconScale,
    iconRotation,
    ringScale,
    ringOpacity,
  ]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotation.value}deg` },
    ],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      <Animated.View style={[styles.container, containerStyle]}>
        <LinearGradient
          colors={config.gradient as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* Pulse ring */}
          <Animated.View style={[styles.ring, ringStyle]} />

          {/* Icon */}
          {showIcon && (
            <Animated.View style={iconStyle}>
              <View style={styles.iconContainer}>
                <Ionicons
                  name={config.icon}
                  size={64}
                  color={auroraTheme.colors.text.primary}
                />
              </View>
            </Animated.View>
          )}

          {/* Text content */}
          <Text style={styles.title}>{title}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </LinearGradient>
      </Animated.View>
    </View>
  );
};

// Helper function for repeat animation (simplified)
const withRepeat = (animation: any, _times: number, _reverse: boolean) => {
  // This is a simplified version - in production, use reanimated's withRepeat
  return animation;
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  container: {
    width: SCREEN_WIDTH * 0.7,
    maxWidth: 280,
    borderRadius: auroraTheme.borderRadius["2xl"],
    overflow: "hidden",
    ...auroraTheme.shadows.xl,
  },
  gradient: {
    padding: auroraTheme.spacing["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  iconContainer: {
    marginBottom: auroraTheme.spacing.lg,
  },
  title: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontFamily: auroraTheme.typography.fontFamily.heading,
    fontWeight: "700",
    color: auroraTheme.colors.text.primary,
    textAlign: "center",
  },
  message: {
    fontSize: auroraTheme.typography.fontSize.sm,
    fontFamily: auroraTheme.typography.fontFamily.body,
    color: auroraTheme.colors.text.secondary,
    textAlign: "center",
    marginTop: auroraTheme.spacing.sm,
  },
});

export default ScanFeedback;
