/**
 * Toast Component
 * Displays temporary notification messages
 * Phase 2: Design System - Core Components
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { colorPalette, spacing, typography, borderRadius, shadows } from '@/theme/designTokens';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

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

const toastConfig: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: {
    icon: 'checkmark-circle',
    color: colorPalette.success[700],
    bg: colorPalette.success[50],
  },
  error: {
    icon: 'close-circle',
    color: colorPalette.error[700],
    bg: colorPalette.error[50],
  },
  warning: {
    icon: 'warning',
    color: colorPalette.warning[700],
    bg: colorPalette.warning[50],
  },
  info: {
    icon: 'information-circle',
    color: colorPalette.info[700],
    bg: colorPalette.info[50],
  },
};

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
  action,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const config = toastConfig[type];

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
  }, [duration]);

  const handleDismiss = (): void => {
    translateY.value = withTiming(-100, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 }, () => {
      if (onDismiss) {
        runOnJS(onDismiss)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <View
        style={[
          styles.toast,
          {
            backgroundColor: config.bg,
          },
          shadows[3],
        ]}
      >
        <Ionicons name={config.icon} size={24} color={config.color} />
        
        <Text
          style={[
            styles.message,
            {
              color: config.color,
              fontSize: typography.fontSize.base,
              fontWeight: typography.fontWeight.medium,
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
            style={styles.actionButton}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: config.color,
                  fontSize: typography.fontSize.sm,
                  fontWeight: typography.fontWeight.semibold,
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
    position: 'absolute',
    top: spacing.lg,
    left: spacing.base,
    right: spacing.base,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  message: {
    flex: 1,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionText: {
    textTransform: 'uppercase',
  },
});