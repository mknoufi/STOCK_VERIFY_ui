/**
 * Centralized Animation Constants
 * Standardized animation durations and spring configurations
 */

import { Easing } from "react-native-reanimated";

/**
 * Standard animation durations in milliseconds
 * Keep animations snappy for better UX
 */
export const DURATION = {
  /** Ultra fast - 100ms - for micro-interactions */
  INSTANT: 100,

  /** Fast - 150ms - for small UI changes */
  FAST: 150,

  /** Normal - 200ms - for standard transitions */
  NORMAL: 200,

  /** Medium - 250ms - for larger elements */
  MEDIUM: 250,

  /** Slow - 300ms - for complex animations */
  SLOW: 300,

  /** Very slow - 400ms - for dramatic effects */
  EMPHASIS: 400,
} as const;

/**
 * Stagger delays for list animations
 */
export const STAGGER = {
  /** Minimal stagger - 20ms between items */
  MINIMAL: 20,

  /** Fast stagger - 40ms between items */
  FAST: 40,

  /** Normal stagger - 60ms between items */
  NORMAL: 60,

  /** Slow stagger - 80ms between items */
  SLOW: 80,

  /** Maximum useful stagger - 100ms */
  MAX: 100,
} as const;

/**
 * Spring configurations for react-native-reanimated
 */
export const SPRING = {
  /** Snappy - quick and responsive */
  SNAPPY: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },

  /** Bouncy - playful with overshoot */
  BOUNCY: {
    damping: 10,
    stiffness: 150,
    mass: 1,
  },

  /** Gentle - smooth and soft */
  GENTLE: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },

  /** Default - balanced */
  DEFAULT: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },

  /** Stiff - minimal wobble */
  STIFF: {
    damping: 25,
    stiffness: 200,
    mass: 0.8,
  },
} as const;

/**
 * Common easing functions
 */
export const EASING = {
  /** Ease out - starts fast, ends slow (most common) */
  OUT: Easing.out(Easing.cubic),

  /** Ease in - starts slow, ends fast */
  IN: Easing.in(Easing.cubic),

  /** Ease in-out - slow start and end */
  IN_OUT: Easing.inOut(Easing.cubic),

  /** Linear - constant speed */
  LINEAR: Easing.linear,

  /** Bounce - bouncy effect at end */
  BOUNCE: Easing.bounce,

  /** Elastic - spring-like */
  ELASTIC: Easing.elastic(1),
} as const;

/**
 * Pre-configured animation presets for common use cases
 */
export const PRESET = {
  /** Fade in from bottom - for list items, cards */
  fadeInUp: {
    duration: DURATION.NORMAL,
    delay: 0,
  },

  /** Fade in from top - for headers, alerts */
  fadeInDown: {
    duration: DURATION.NORMAL,
    delay: 0,
  },

  /** Scale in - for modals, popups */
  scaleIn: {
    duration: DURATION.FAST,
    delay: 0,
  },

  /** Slide in from right - for navigation */
  slideInRight: {
    duration: DURATION.MEDIUM,
    delay: 0,
  },

  /** Stagger list items */
  staggeredList: (index: number) => ({
    duration: DURATION.NORMAL,
    delay: Math.min(index * STAGGER.FAST, 200), // Cap at 200ms
  }),
} as const;

/**
 * Timing function for withTiming
 */
export const timing = (duration: number = DURATION.NORMAL) => ({
  duration,
  easing: EASING.OUT,
});

/**
 * Generate staggered delay for list items
 * Caps delay to prevent long waits on large lists
 */
export const getStaggerDelay = (
  index: number,
  stagger: number = STAGGER.FAST,
  maxDelay: number = 200,
): number => {
  return Math.min(index * stagger, maxDelay);
};

export default {
  DURATION,
  STAGGER,
  SPRING,
  EASING,
  PRESET,
  timing,
  getStaggerDelay,
};
