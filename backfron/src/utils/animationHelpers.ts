/**
 * Animation Helpers - Reusable animation utilities
 * Provides common animation patterns using React Native Reanimated
 */

import {
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  SharedValue,
} from "react-native-reanimated";
import { modernAnimations } from "../styles/modernDesignSystem";

// Spring animation presets
export const springPresets = {
  default: {
    damping: modernAnimations.easing.spring.damping,
    stiffness: modernAnimations.easing.spring.stiffness,
    mass: modernAnimations.easing.spring.mass,
  },
  bouncy: {
    damping: modernAnimations.easing.springBouncy.damping,
    stiffness: modernAnimations.easing.springBouncy.stiffness,
    mass: modernAnimations.easing.springBouncy.mass,
  },
  gentle: {
    damping: modernAnimations.easing.springGentle.damping,
    stiffness: modernAnimations.easing.springGentle.stiffness,
    mass: modernAnimations.easing.springGentle.mass,
  },
};

// Timing animation presets
export const timingPresets = {
  fast: {
    duration: modernAnimations.duration.fast,
    easing: Easing.out(Easing.cubic),
  },
  normal: {
    duration: modernAnimations.duration.normal,
    easing: Easing.inOut(Easing.cubic),
  },
  slow: {
    duration: modernAnimations.duration.slow,
    easing: Easing.inOut(Easing.ease),
  },
};

// Press animation
export const animatePress = (scale: SharedValue<number>, opacity: SharedValue<number>) => {
  "worklet";
  scale.value = withSpring(modernAnimations.scale.pressed, springPresets.default);
  opacity.value = withTiming(modernAnimations.opacity.pressed, timingPresets.fast);
};

export const animateRelease = (scale: SharedValue<number>, opacity: SharedValue<number>) => {
  "worklet";
  scale.value = withSpring(1, springPresets.default);
  opacity.value = withTiming(1, timingPresets.fast);
};

// Ripple effect animation
export const animateRipple = (
  scale: SharedValue<number>,
  opacity: SharedValue<number>,
  callback?: () => void
) => {
  "worklet";
  scale.value = 0;
  opacity.value = 0.5;

  scale.value = withTiming(2, { duration: 600, easing: Easing.out(Easing.ease) });
  opacity.value = withTiming(
    0,
    { duration: 600, easing: Easing.out(Easing.ease) },
    (finished) => {
      if (finished && callback) {
        callback();
      }
    }
  );
};

// Shake animation (for errors)
export const animateShake = (translateX: SharedValue<number>) => {
  "worklet";
  translateX.value = withSequence(
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(-10, { duration: 50 }),
    withTiming(10, { duration: 50 }),
    withTiming(0, { duration: 50 })
  );
};

// Bounce animation (for success)
export const animateBounce = (scale: SharedValue<number>) => {
  "worklet";
  scale.value = withSequence(
    withSpring(1.2, springPresets.bouncy),
    withSpring(0.95, springPresets.bouncy),
    withSpring(1, springPresets.default)
  );
};

// Fade in animation
export const animateFadeIn = (
  opacity: SharedValue<number>,
  delay: number = 0,
  callback?: () => void
) => {
  "worklet";
  opacity.value = 0;
  opacity.value = withDelay(
    delay,
    withTiming(1, timingPresets.normal, (finished) => {
      if (finished && callback) {
        callback();
      }
    })
  );
};

// Slide in animation
export const animateSlideIn = (
  translateY: SharedValue<number>,
  from: number = 20,
  delay: number = 0
) => {
  "worklet";
  translateY.value = from;
  translateY.value = withDelay(delay, withSpring(0, springPresets.default));
};

// Scale in animation
export const animateScaleIn = (scale: SharedValue<number>, delay: number = 0) => {
  "worklet";
  scale.value = 0.8;
  scale.value = withDelay(delay, withSpring(1, springPresets.bouncy));
};

// Pulse animation (continuous)
export const animatePulse = (scale: SharedValue<number>) => {
  "worklet";
  scale.value = withSequence(
    withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
    withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
  );
};

// Rotation animation
export const animateRotate = (rotation: SharedValue<number>, degrees: number = 360) => {
  "worklet";
  rotation.value = withTiming(degrees, {
    duration: modernAnimations.duration.slow,
    easing: Easing.linear,
  });
};

// Success checkmark animation
export const animateSuccess = (
  scale: SharedValue<number>,
  opacity: SharedValue<number>,
  callback?: () => void
) => {
  "worklet";
  scale.value = 0;
  opacity.value = 0;

  scale.value = withSpring(1, springPresets.bouncy);
  opacity.value = withTiming(1, timingPresets.fast, (finished) => {
    if (finished && callback) {
      callback();
    }
  });
};

// Loading spinner animation
export const animateSpinner = (rotation: SharedValue<number>) => {
  "worklet";
  rotation.value = withSequence(
    withTiming(360, { duration: 1000, easing: Easing.linear }),
    withTiming(0, { duration: 0 })
  );
};

// Stagger animation helper
export const getStaggerDelay = (index: number, baseDelay: number = 50): number => {
  return index * baseDelay;
};