/**
 * AnimatedListItem - Staggered Animation Wrapper for List Items
 *
 * Features:
 * - Fade + slide-up entrance animation
 * - Staggered delay based on index
 * - Spring-based smooth animations
 * - Configurable animation properties
 *
 * Inspired by React-Native-UI-Templates staggered list patterns
 */

import React, { useEffect } from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import {
  AnimationTimings,
  AnimationEasings,
  Spacing,
} from '@/theme/uiConstants';

export interface AnimatedListItemProps {
  /** Index of the item in the list (used for stagger delay) */
  index: number;
  /** Children to animate */
  children: React.ReactNode;
  /** Container style */
  style?: StyleProp<ViewStyle>;
  /** Delay multiplier per item (ms) */
  delayPerItem?: number;
  /** Animation duration (ms) */
  duration?: number;
  /** Vertical offset for slide animation */
  translateY?: number;
  /** Whether to use spring physics */
  useSpring?: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Whether to animate (can be used to delay animation) */
  animate?: boolean;
  /** Animation type */
  animationType?: 'fade' | 'slide' | 'scale' | 'fadeSlide' | 'fadeScale';
}

/**
 * AnimatedListItem - Wrapper for smooth list item animations
 *
 * @example
 * // Basic usage in FlatList
 * <FlatList
 *   data={items}
 *   renderItem={({ item, index }) => (
 *     <AnimatedListItem index={index}>
 *       <ItemCard item={item} />
 *     </AnimatedListItem>
 *   )}
 * />
 *
 * @example
 * // Custom animation settings
 * <AnimatedListItem
 *   index={0}
 *   animationType="fadeScale"
 *   delayPerItem={50}
 *   duration={400}
 * >
 *   <Card>...</Card>
 * </AnimatedListItem>
 */
export const AnimatedListItem: React.FC<AnimatedListItemProps> = ({
  index,
  children,
  style,
  delayPerItem = AnimationTimings.staggerDelay,
  duration = AnimationTimings.listItemDuration,
  translateY = Spacing.xl,
  useSpring: useSpringPhysics = true,
  onAnimationComplete,
  animate = true,
  animationType = 'fadeSlide',
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!animate) return;

    const delay = index * delayPerItem;

    if (useSpringPhysics) {
      progress.value = withDelay(
        delay,
        withSpring(1, AnimationEasings.standard, (finished) => {
          if (finished && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        })
      );
    } else {
      progress.value = withDelay(
        delay,
        withTiming(
          1,
          {
            duration,
            easing: Easing.out(Easing.cubic),
          },
          (finished) => {
            if (finished && onAnimationComplete) {
              runOnJS(onAnimationComplete)();
            }
          }
        )
      );
    }
  }, [
    animate,
    index,
    delayPerItem,
    useSpringPhysics,
    duration,
    progress,
    onAnimationComplete,
  ]);

  const animatedStyle = useAnimatedStyle(() => {
    switch (animationType) {
      case 'fade':
        return {
          opacity: progress.value,
        };

      case 'slide':
        return {
          transform: [
            {
              translateY: interpolate(progress.value, [0, 1], [translateY, 0]),
            },
          ],
        };

      case 'scale':
        return {
          transform: [
            { scale: interpolate(progress.value, [0, 1], [0.8, 1]) },
          ],
        };

      case 'fadeScale':
        return {
          opacity: progress.value,
          transform: [
            { scale: interpolate(progress.value, [0, 1], [0.9, 1]) },
          ],
        };

      case 'fadeSlide':
      default:
        return {
          opacity: progress.value,
          transform: [
            {
              translateY: interpolate(progress.value, [0, 1], [translateY, 0]),
            },
          ],
        };
    }
  });

  return (
    <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>
  );
};

/**
 * Preset configurations for common list animation patterns
 */
export const ListAnimationPresets = {
  /** Default fade + slide (most common) */
  default: {
    animationType: 'fadeSlide' as const,
    delayPerItem: 80,
    translateY: 20,
  },
  /** Quick stagger for long lists */
  quick: {
    animationType: 'fadeSlide' as const,
    delayPerItem: 40,
    translateY: 15,
    useSpring: false,
    duration: 200,
  },
  /** Dramatic entrance for hero items */
  dramatic: {
    animationType: 'fadeScale' as const,
    delayPerItem: 120,
  },
  /** Subtle fade only */
  subtle: {
    animationType: 'fade' as const,
    delayPerItem: 60,
    useSpring: false,
    duration: 250,
  },
  /** Cards popping in */
  cards: {
    animationType: 'fadeScale' as const,
    delayPerItem: 100,
  },
};

export default AnimatedListItem;
