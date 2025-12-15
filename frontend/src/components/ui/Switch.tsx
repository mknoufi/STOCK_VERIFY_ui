/**
 * Switch Component
 * Toggle control with smooth animations
 * Phase 2: Design System - Core Components
 */

import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';
import { colorPalette, spacing } from '@/theme/designTokens';

export type SwitchSize = 'sm' | 'md' | 'lg';

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  size?: SwitchSize;
  disabled?: boolean;
  activeColor?: string;
  inactiveColor?: string;
  style?: ViewStyle;
}

const sizeStyles: Record<SwitchSize, { width: number; height: number; thumbSize: number }> = {
  sm: { width: 36, height: 20, thumbSize: 16 },
  md: { width: 44, height: 24, thumbSize: 20 },
  lg: { width: 52, height: 28, thumbSize: 24 },
};

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  size = 'md',
  disabled = false,
  activeColor = colorPalette.primary[500],
  inactiveColor = colorPalette.neutral[400],
  style,
}) => {
  const sizes = sizeStyles[size];
  const progress = useSharedValue(value ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(value ? 1 : 0, {
      damping: 15,
      stiffness: 150,
    });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, activeColor]
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: progress.value * (sizes.width - sizes.thumbSize - 4),
      },
    ],
  }));

  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, style]}
    >
      <Animated.View
        style={[
          styles.track,
          {
            width: sizes.width,
            height: sizes.height,
            borderRadius: sizes.height / 2,
            opacity: disabled ? 0.5 : 1,
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              width: sizes.thumbSize,
              height: sizes.thumbSize,
              borderRadius: sizes.thumbSize / 2,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
  },
  track: {
    justifyContent: 'center',
    padding: 2,
  },
  thumb: {
    backgroundColor: colorPalette.neutral[0],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});