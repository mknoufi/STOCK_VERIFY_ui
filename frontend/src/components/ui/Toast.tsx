/**
 * Toast Component
 * Displays temporary notification messages
 * Phase 2: Design System - Core Components
 */

import * as React from "react";
import { useCallback, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "../../hooks/useTheme";

export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  onDismiss,
  action,
}) => {
  const theme = useTheme();
  const { colors, spacing, typography, borderRadius, shadows } = theme;
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  const config = useMemo(() => {
    const appColors = (theme.themeObject as any)?.colors;
    const statusByType: Partial<Record<ToastType, any>> = {
      success: appColors?.success,
      error: appColors?.error,
      warning: appColors?.warning,
      info: appColors?.info,
    };

    const status = statusByType[type];
    const statusFg: string | undefined = status?.[700];
    const statusBg: string | undefined = status?.[50];

    const configs: Record<
      ToastType,
      { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
    > = {
      success: {
        icon: "checkmark-circle",
        color: statusFg || colors.success,
        bg: statusBg || colors.surface,
      },
      error: {
        icon: "close-circle",
        color: statusFg || colors.error,
        bg: statusBg || colors.surface,
      },
      warning: {
        icon: "warning",
        color: statusFg || colors.warning,
        bg: statusBg || colors.surface,
      },
      info: {
        icon: "information-circle",
        color: statusFg || colors.info,
        bg: statusBg || colors.surface,
      },
    };
    return configs[type];
  }, [type, colors, theme.themeObject]);

  const handleDismiss = useCallback((): void => {
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      if (onDismiss) {
        runOnJS(onDismiss)();
      }
    });
  }, [translateY, opacity, onDismiss]);

  useEffect(() => {
    // Slide in
    translateY.value = withSpring(0, { damping: 15 });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }

    return undefined;
  }, [duration, handleDismiss, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: spacing.lg,
          left: spacing.base,
          right: spacing.base,
        },
        animatedStyle,
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: config.bg,
            padding: spacing.base,
            borderRadius: borderRadius.lg,
            gap: spacing.sm,
            ...shadows[3],
          },
        ]}
      >
        <Ionicons name={config.icon} size={24} color={config.color} />

        <Text
          style={[
            styles.message,
            {
              color: config.color,
              fontSize: typography.body.medium.fontSize,
              fontWeight: typography.body.medium.fontWeight as any,
            },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>

        {action && (
          <TouchableOpacity
            onPress={() => {
              action.onPress();
              handleDismiss();
            }}
            style={[
              styles.actionButton,
              {
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.xs,
              },
            ]}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: config.color,
                  fontSize: typography.button.medium.fontSize,
                  fontWeight: typography.button.medium.fontWeight as any,
                },
              ]}
            >
              {action.label}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={20} color={config.color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 9999,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
  },
  message: {
    flex: 1,
  },
  actionButton: {},
  actionText: {
    textTransform: "uppercase",
  },
});
