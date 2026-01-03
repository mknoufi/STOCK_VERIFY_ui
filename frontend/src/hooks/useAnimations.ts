/**
 * Animation Hooks
 * Reusable animation patterns inspired by Aashu-Dubey/React-Native-UI-Templates
 *
 * Features:
 * - Entry animations with stagger support
 * - Press scale feedback
 * - Fade in/out
 * - Slide animations
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { duration, easing, animationPresets } from '../theme/unified';

// ==========================================
// TYPES
// ==========================================
export interface EntryAnimationConfig {
  /** Animation duration in ms */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Initial translateY offset */
  translateY?: number;
  /** Use native driver for better performance */
  useNativeDriver?: boolean;
}

export interface StaggerAnimationConfig extends EntryAnimationConfig {
  /** Index in list for stagger calculation */
  index: number;
  /** Delay between each item */
  staggerDelay?: number;
}

// ==========================================
// ENTRY ANIMATION HOOK
// ==========================================
/**
 * Hook for entry fade-in + slide-up animation
 * Based on Aashu-Dubey CategoryListView pattern
 *
 * Usage:
 * const { opacity, translateY, animatedStyle } = useEntryAnimation();
 * <Animated.View style={animatedStyle}>...</Animated.View>
 */
export function useEntryAnimation(config: EntryAnimationConfig = {}) {
  const {
    duration: animDuration = animationPresets.slideUp.duration,
    delay = 0,
    translateY: initialTranslateY = animationPresets.slideUp.translateY,
    useNativeDriver = true,
  } = config;

  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(initialTranslateY)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: animDuration,
        delay,
        easing: easing.decelerate,
        useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: animDuration,
        delay,
        easing: easing.decelerate,
        useNativeDriver,
      }),
    ]).start();
  }, [opacity, translateY, animDuration, delay, useNativeDriver]);

  const animatedStyle = {
    opacity,
    transform: [{ translateY }],
  };

  return { opacity, translateY, animatedStyle };
}

// ==========================================
// STAGGERED ENTRY ANIMATION HOOK
// ==========================================
/**
 * Hook for staggered list entry animations
 * Items animate in sequence with calculated delay
 *
 * Usage:
 * const { animatedStyle } = useStaggeredEntry({ index: itemIndex });
 */
export function useStaggeredEntry(config: StaggerAnimationConfig) {
  const {
    index,
    staggerDelay = animationPresets.staggeredEntry.staggerDelay,
    duration: animDuration = animationPresets.staggeredEntry.duration,
    translateY: initialTranslateY = 50,
    useNativeDriver = true,
  } = config;

  // Calculate delay based on index
  const calculatedDelay = index * staggerDelay;

  return useEntryAnimation({
    duration: animDuration,
    delay: calculatedDelay,
    translateY: initialTranslateY,
    useNativeDriver,
  });
}

// ==========================================
// FADE IN HOOK
// ==========================================
/**
 * Simple fade-in animation hook
 *
 * Usage:
 * const { opacity, fadeIn, fadeOut } = useFadeIn();
 */
export function useFadeIn(initialValue = 0) {
  const opacity = useRef(new Animated.Value(initialValue)).current;

  const fadeIn = useCallback(
    (toValue = 1, animDuration = duration.normal) => {
      return Animated.timing(opacity, {
        toValue,
        duration: animDuration,
        easing: easing.decelerate,
        useNativeDriver: true,
      }).start();
    },
    [opacity]
  );

  const fadeOut = useCallback(
    (animDuration = duration.normal) => {
      return Animated.timing(opacity, {
        toValue: 0,
        duration: animDuration,
        easing: easing.accelerate,
        useNativeDriver: true,
      }).start();
    },
    [opacity]
  );

  // Auto fade in on mount
  useEffect(() => {
    fadeIn();
  }, [fadeIn]);

  return { opacity, fadeIn, fadeOut };
}

// ==========================================
// SCALE PRESS HOOK
// ==========================================
/**
 * Hook for press scale feedback animation
 * Based on common mobile interaction patterns
 *
 * Usage:
 * const { scale, onPressIn, onPressOut, animatedStyle } = useScalePress();
 */
export function useScalePress(scaleValue = animationPresets.press.scalePressed) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: scaleValue,
      duration: animationPresets.press.duration,
      easing: easing.standard,
      useNativeDriver: true,
    }).start();
  }, [scale, scaleValue]);

  const onPressOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: animationPresets.press.duration,
      easing: easing.standard,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  const animatedStyle = {
    transform: [{ scale }],
  };

  return { scale, onPressIn, onPressOut, animatedStyle };
}

// ==========================================
// PULSE ANIMATION HOOK
// ==========================================
/**
 * Continuous pulse animation (for attention/loading)
 */
export function usePulse(minOpacity = 0.4, maxOpacity = 1) {
  const opacity = useRef(new Animated.Value(maxOpacity)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    animationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: minOpacity,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: maxOpacity,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animationRef.current.start();
  }, [opacity, minOpacity, maxOpacity]);

  const stopPulse = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.stop();
      opacity.setValue(maxOpacity);
    }
  }, [opacity, maxOpacity]);

  useEffect(() => {
    return () => {
      stopPulse();
    };
  }, [stopPulse]);

  return { opacity, startPulse, stopPulse };
}

// ==========================================
// SLIDE ANIMATION HOOK
// ==========================================
/**
 * Horizontal or vertical slide animation
 */
export function useSlide(
  direction: 'left' | 'right' | 'up' | 'down' = 'up',
  distance = 100
) {
  const isHorizontal = direction === 'left' || direction === 'right';
  const initialValue = direction === 'left' || direction === 'up' ? distance : -distance;

  const position = useRef(new Animated.Value(initialValue)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const slideIn = useCallback(
    (animDuration = duration.slow) => {
      Animated.parallel([
        Animated.timing(position, {
          toValue: 0,
          duration: animDuration,
          easing: easing.decelerate,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: animDuration,
          easing: easing.decelerate,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [position, opacity]
  );

  const slideOut = useCallback(
    (animDuration = duration.normal) => {
      Animated.parallel([
        Animated.timing(position, {
          toValue: initialValue,
          duration: animDuration,
          easing: easing.accelerate,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: animDuration,
          easing: easing.accelerate,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [position, opacity, initialValue]
  );

  useEffect(() => {
    slideIn();
  }, [slideIn]);

  const animatedStyle = {
    opacity,
    transform: isHorizontal
      ? [{ translateX: position }]
      : [{ translateY: position }],
  };

  return { position, opacity, slideIn, slideOut, animatedStyle };
}

// Export all hooks
export default {
  useEntryAnimation,
  useStaggeredEntry,
  useFadeIn,
  useScalePress,
  usePulse,
  useSlide,
};
