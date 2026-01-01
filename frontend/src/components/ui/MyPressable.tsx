/**
 * MyPressable - Enhanced Pressable with Platform-Specific Feedback
 *
 * Provides:
 * - Ripple effect on Android
 * - Opacity/scale feedback on iOS
 * - Consistent touch feedback across platforms
 *
 * Inspired by React-Native-UI-Templates patterns
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { AnimationEasings, AnimationTimings, Opacity } from '@/theme/uiConstants';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface MyPressableProps extends Omit<PressableProps, 'style'> {
  /** Container style */
  style?: StyleProp<ViewStyle>;
  /** Type of feedback animation */
  feedbackType?: 'opacity' | 'scale' | 'both' | 'none';
  /** Scale amount when pressed (0-1, default 0.97) */
  scaleValue?: number;
  /** Opacity when pressed (0-1, default 0.7) */
  pressedOpacity?: number;
  /** Android ripple color */
  rippleColor?: string;
  /** Whether to show ripple on Android */
  showRipple?: boolean;
  /** Disable all feedback */
  noFeedback?: boolean;
  /** Children elements */
  children: React.ReactNode;
}

/**
 * MyPressable - Cross-platform pressable with beautiful feedback
 *
 * @example
 * // Basic usage
 * <MyPressable onPress={() => console.log('Pressed!')}>
 *   <Text>Press me</Text>
 * </MyPressable>
 *
 * @example
 * // With scale effect
 * <MyPressable feedbackType="scale" scaleValue={0.95}>
 *   <Card>...</Card>
 * </MyPressable>
 *
 * @example
 * // Combined effects
 * <MyPressable feedbackType="both" scaleValue={0.98} pressedOpacity={0.8}>
 *   <ListItem>...</ListItem>
 * </MyPressable>
 */
export const MyPressable: React.FC<MyPressableProps> = ({
  style,
  feedbackType = 'both',
  scaleValue = 0.97,
  pressedOpacity = Opacity.pressed,
  rippleColor = 'rgba(0, 0, 0, 0.1)',
  showRipple = true,
  noFeedback = false,
  disabled,
  children,
  onPressIn,
  onPressOut,
  ...rest
}) => {
  const pressed = useSharedValue(0);

  const handlePressIn = useCallback(
    (event: any) => {
      if (!noFeedback && !disabled) {
        pressed.value = withSpring(1, AnimationEasings.snappy);
      }
      onPressIn?.(event);
    },
    [noFeedback, disabled, onPressIn, pressed]
  );

  const handlePressOut = useCallback(
    (event: any) => {
      pressed.value = withTiming(0, { duration: AnimationTimings.fast });
      onPressOut?.(event);
    },
    [onPressOut, pressed]
  );

  const animatedStyle = useAnimatedStyle(() => {
    if (noFeedback || disabled) {
      return { opacity: disabled ? Opacity.disabled : 1 };
    }

    const shouldScale = feedbackType === 'scale' || feedbackType === 'both';
    const shouldFade = feedbackType === 'opacity' || feedbackType === 'both';

    return {
      opacity: shouldFade
        ? interpolate(pressed.value, [0, 1], [1, pressedOpacity])
        : 1,
      transform: shouldScale
        ? [{ scale: interpolate(pressed.value, [0, 1], [1, scaleValue]) }]
        : [],
    };
  });

  // Android ripple configuration
  const androidRipple =
    Platform.OS === 'android' && showRipple && !noFeedback
      ? {
          color: rippleColor,
          borderless: false,
          foreground: true,
        }
      : undefined;

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      android_ripple={androidRipple}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
};

/**
 * Preset configurations for common use cases
 */
export const PressablePresets = {
  /** Subtle feedback for list items */
  listItem: {
    feedbackType: 'both' as const,
    scaleValue: 0.98,
    pressedOpacity: 0.85,
  },
  /** Card press feedback */
  card: {
    feedbackType: 'scale' as const,
    scaleValue: 0.96,
  },
  /** Button-like feedback */
  button: {
    feedbackType: 'both' as const,
    scaleValue: 0.95,
    pressedOpacity: 0.8,
  },
  /** Icon button feedback */
  iconButton: {
    feedbackType: 'opacity' as const,
    pressedOpacity: 0.6,
  },
  /** Tab/navigation item */
  tab: {
    feedbackType: 'opacity' as const,
    pressedOpacity: 0.7,
  },
};

export default MyPressable;
