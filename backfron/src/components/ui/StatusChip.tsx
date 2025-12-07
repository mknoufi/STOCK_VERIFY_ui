/**
 * StatusChip - Premium status indicator chip with animations
 * Features: Animated dot, color variants, size options
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  modernColors,
  modernTypography,
  modernSpacing,
} from '../../styles/modernDesignSystem';

type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'active';
type ChipSize = 'small' | 'medium' | 'large';

interface StatusChipProps {
  status: StatusType;
  label: string;
  size?: ChipSize;
  animated?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export const StatusChip: React.FC<StatusChipProps> = ({
  status,
  label,
  size = 'medium',
  animated = true,
  icon,
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (animated && (status === 'active' || status === 'success')) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [animated, status, pulseAnim]);

  const getStatusColors = () => {
    switch (status) {
      case 'success':
        return {
          background: 'rgba(16, 185, 129, 0.15)',
          dot: modernColors.success.main,
          text: modernColors.success.main,
        };
      case 'warning':
        return {
          background: 'rgba(245, 158, 11, 0.15)',
          dot: modernColors.warning.main,
          text: modernColors.warning.main,
        };
      case 'error':
        return {
          background: 'rgba(239, 68, 68, 0.15)',
          dot: modernColors.error.main,
          text: modernColors.error.main,
        };
      case 'info':
        return {
          background: 'rgba(59, 130, 246, 0.15)',
          dot: modernColors.info.main,
          text: modernColors.info.main,
        };
      case 'active':
        return {
          background: 'rgba(16, 185, 129, 0.15)',
          dot: modernColors.success.main,
          text: modernColors.success.main,
        };
      default:
        return {
          background: 'rgba(100, 116, 139, 0.15)',
          dot: modernColors.neutral[500],
          text: modernColors.neutral[400],
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 8,
          paddingVertical: 2,
          dotSize: 6,
          fontSize: 10,
          iconSize: 12,
        };
      case 'large':
        return {
          paddingHorizontal: 14,
          paddingVertical: 6,
          dotSize: 10,
          fontSize: 14,
          iconSize: 18,
        };
      default:
        return {
          paddingHorizontal: 10,
          paddingVertical: 4,
          dotSize: 8,
          fontSize: 12,
          iconSize: 14,
        };
    }
  };

  const colors = getStatusColors();
  const sizes = getSizeStyles();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingHorizontal: sizes.paddingHorizontal,
          paddingVertical: sizes.paddingVertical,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={sizes.iconSize} color={colors.text} />
      ) : (
        <Animated.View
          style={[
            styles.dot,
            {
              width: sizes.dotSize,
              height: sizes.dotSize,
              borderRadius: sizes.dotSize / 2,
              backgroundColor: colors.dot,
              opacity: animated ? pulseAnim : 1,
            },
          ]}
        />
      )}
      <Text
        style={[
          styles.label,
          {
            color: colors.text,
            fontSize: sizes.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 100,
    gap: 6,
  },
  dot: {},
  label: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

export default StatusChip;
