/**
 * StatusBadge Component - Modern status indicator
 * Features:
 * - Semantic color variants (success, warning, error, info, neutral)
 * - Pill design with glow effects
 * - Optional icon
 * - Pulse animation for active states
 * - Size variants
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  modernColors,
  modernBorderRadius,
} from '../../styles/modernDesignSystem';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';
type BadgeSize = 'small' | 'medium' | 'large';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: keyof typeof Ionicons.glyphMap;
  pulse?: boolean;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; glow: string; border: string }> = {
  success: {
    bg: 'rgba(16, 185, 129, 0.15)',
    text: modernColors.success.light,
    glow: 'rgba(16, 185, 129, 0.25)',
    border: 'rgba(16, 185, 129, 0.35)',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.15)',
    text: modernColors.warning.light,
    glow: 'rgba(245, 158, 11, 0.25)',
    border: 'rgba(245, 158, 11, 0.35)',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.15)',
    text: modernColors.error.light,
    glow: 'rgba(239, 68, 68, 0.25)',
    border: 'rgba(239, 68, 68, 0.35)',
  },
  info: {
    bg: 'rgba(59, 130, 246, 0.15)',
    text: modernColors.info.light,
    glow: 'rgba(59, 130, 246, 0.25)',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  neutral: {
    bg: 'rgba(148, 163, 184, 0.15)',
    text: modernColors.text.secondary,
    glow: 'rgba(148, 163, 184, 0.25)',
    border: 'rgba(148, 163, 184, 0.35)',
  },
  primary: {
    bg: 'rgba(99, 102, 241, 0.15)',
    text: modernColors.primary[400],
    glow: 'rgba(99, 102, 241, 0.25)',
    border: 'rgba(99, 102, 241, 0.35)',
  },
};

const sizeStyles: Record<BadgeSize, { paddingH: number; paddingV: number; fontSize: number; iconSize: number }> = {
  small: { paddingH: 8, paddingV: 3, fontSize: 10, iconSize: 10 },
  medium: { paddingH: 10, paddingV: 4, fontSize: 11, iconSize: 12 },
  large: { paddingH: 14, paddingV: 6, fontSize: 12, iconSize: 14 },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  size = 'medium',
  icon,
  pulse = false,
  style,
}) => {
  const colors = variantColors[variant];
  const sizeConfig = sizeStyles[size];

  // Pulse animation
  const pulseOpacity = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    if (pulse) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 800 }),
          withTiming(1, { duration: 800 }),
        ),
        -1,
        true,
      );
    }
  }, [pulse, pulseOpacity, pulseScale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    transform: [{ scale: pulseScale.value }],
  }));

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sizeConfig.paddingH / 2,
    paddingHorizontal: sizeConfig.paddingH,
    paddingVertical: sizeConfig.paddingV,
    borderRadius: modernBorderRadius.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  };

  const content = (
    <>
      {icon && (
        <Ionicons name={icon} size={sizeConfig.iconSize} color={colors.text} />
      )}
      <Text
        style={[
          styles.label,
          {
            fontSize: sizeConfig.fontSize,
            color: colors.text,
          },
        ]}
      >
        {label}
      </Text>
    </>
  );

  if (pulse) {
    return (
      <Animated.View style={[containerStyle, animatedStyle, style]}>
        {content}
      </Animated.View>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});

export default StatusBadge;
