/**
 * SuccessFeedback Component
 * Provides visual and haptic feedback for successful actions
 * Used for scan success, form submissions, etc.
 */

import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { modernColors } from "../../styles/modernDesignSystem";

interface SuccessFeedbackProps {
  visible: boolean;
  message?: string;
  duration?: number;
  onComplete?: () => void;
  variant?: "success" | "warning" | "error" | "info";
  haptic?: boolean;
}

export const SuccessFeedback: React.FC<SuccessFeedbackProps> = ({
  visible,
  message = "Success!",
  duration = 2000,
  onComplete,
  variant = "success",
  haptic = true,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const iconScale = useRef(new Animated.Value(0)).current;

  const getVariantConfig = () => {
    switch (variant) {
      case "warning":
        return {
          color: modernColors.warning.main,
          bgColor: modernColors.warning.light,
          icon: "warning" as const,
          hapticType: Haptics.NotificationFeedbackType.Warning,
        };
      case "error":
        return {
          color: modernColors.error.main,
          bgColor: modernColors.error.light,
          icon: "close-circle" as const,
          hapticType: Haptics.NotificationFeedbackType.Error,
        };
      case "info":
        return {
          color: modernColors.primary[500],
          bgColor: modernColors.primary[50],
          icon: "information-circle" as const,
          hapticType: Haptics.NotificationFeedbackType.Success,
        };
      case "success":
      default:
        return {
          color: modernColors.success.main,
          bgColor: modernColors.success.light,
          icon: "checkmark-circle" as const,
          hapticType: Haptics.NotificationFeedbackType.Success,
        };
    }
  };

  const config = getVariantConfig();

  useEffect(() => {
    if (visible) {
      // Trigger haptic feedback
      if (haptic) {
        Haptics.notificationAsync(config.hapticType);
      }

      // Animate in
      Animated.parallel([
        Animated.spring(opacity, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 12,
        }),
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(iconScale, {
            toValue: 1,
            useNativeDriver: true,
            speed: 15,
            bounciness: 15,
          }),
        ]),
      ]).start();

      // Auto-hide after duration
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          iconScale.setValue(0);
          onComplete?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [
    visible,
    opacity,
    scale,
    iconScale,
    duration,
    haptic,
    config.hapticType,
    onComplete,
  ]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ scale }],
          backgroundColor: config.bgColor,
          borderColor: config.color,
        },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons name={config.icon} size={32} color={config.color} />
      </Animated.View>
      <Text style={[styles.message, { color: config.color }]}>{message}</Text>
    </Animated.View>
  );
};

/**
 * Quick toast-style feedback
 */
interface ToastFeedbackProps {
  visible: boolean;
  message: string;
  variant?: "success" | "warning" | "error" | "info";
  position?: "top" | "bottom";
  onHide?: () => void;
}

export const ToastFeedback: React.FC<ToastFeedbackProps> = ({
  visible,
  message,
  variant = "info",
  position = "bottom",
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const getVariantColors = () => {
    switch (variant) {
      case "success":
        return { bg: modernColors.success.main, text: "#fff" };
      case "warning":
        return { bg: modernColors.warning.main, text: "#000" };
      case "error":
        return { bg: modernColors.error.main, text: "#fff" };
      default:
        return { bg: modernColors.primary[600], text: "#fff" };
    }
  };

  const colors = getVariantColors();

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 20,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: position === "top" ? -100 : 100,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(onHide);
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      translateY.setValue(position === "top" ? -100 : 100);
    }
    return undefined;
  }, [visible, translateY, opacity, position, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          [position]: 40,
          opacity,
          transform: [{ translateY }],
          backgroundColor: colors.bg,
        },
      ]}
    >
      <Text style={[styles.toastText, { color: colors.text }]}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    fontSize: 16,
    fontWeight: "600",
  },
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default SuccessFeedback;
