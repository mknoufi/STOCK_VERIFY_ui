/**
 * Unified Animation System
 * Consistent animation timings and easing curves
 *
 * Patterns inspired by Aashu-Dubey/React-Native-UI-Templates
 * - Entry animations with staggered delays
 * - Press scale feedback
 * - Smooth transitions
 */

import { Easing } from 'react-native';

// ==========================================
// ANIMATION DURATIONS (ms)
// ==========================================
export const duration = {
  /** 100ms - Instant feedback */
  instant: 100,
  /** 150ms - Quick micro-interactions */
  fast: 150,
  /** 200ms - Standard transitions */
  normal: 200,
  /** 300ms - Smooth animations */
  slow: 300,
  /** 500ms - Emphasis animations */
  slower: 500,
  /** 1000ms - Entry/exit animations */
  slowest: 1000,
} as const;

// ==========================================
// EASING CURVES
// ==========================================
export const easing = {
  /** Standard ease-in-out for most animations */
  standard: Easing.bezier(0.4, 0.0, 0.2, 1.0),
  /** Ease-out for enter animations */
  decelerate: Easing.out(Easing.cubic),
  /** Ease-in for exit animations */
  accelerate: Easing.in(Easing.cubic),
  /** Overshoot for playful animations */
  overshoot: Easing.bezier(0.34, 1.56, 0.64, 1),
  /** Bounce effect */
  bounce: Easing.bounce,
  /** Linear for continuous animations */
  linear: Easing.linear,
  /** Sharp for quick transitions */
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1.0),
} as const;

// ==========================================
// ANIMATION PRESETS
// ==========================================
export const animationPresets = {
  /** Press feedback - quick scale down and up */
  press: {
    duration: duration.fast,
    easing: easing.standard,
    scalePressed: 0.97,
    scaleDefault: 1,
  },

  /** Entry fade-in */
  fadeIn: {
    duration: duration.normal,
    easing: easing.decelerate,
    from: 0,
    to: 1,
  },

  /** Entry slide-up */
  slideUp: {
    duration: duration.slow,
    easing: easing.decelerate,
    translateY: 50,
  },

  /** Staggered list entry */
  staggeredEntry: {
    duration: duration.slowest,
    staggerDelay: 100, // Delay between each item (ms)
    easing: easing.decelerate,
  },

  /** Modal enter */
  modalEnter: {
    duration: duration.slow,
    easing: easing.decelerate,
    scale: { from: 0.95, to: 1 },
    opacity: { from: 0, to: 1 },
  },

  /** Modal exit */
  modalExit: {
    duration: duration.normal,
    easing: easing.accelerate,
    scale: { from: 1, to: 0.95 },
    opacity: { from: 1, to: 0 },
  },

  /** Bottom sheet slide */
  bottomSheet: {
    duration: duration.slow,
    easing: easing.decelerate,
  },

  /** Skeleton shimmer */
  shimmer: {
    duration: 1500,
    easing: easing.linear,
  },
} as const;

// ==========================================
// SPRING CONFIGS (for react-native-reanimated)
// ==========================================
export const springConfigs = {
  /** Gentle spring - cards, modals */
  gentle: {
    damping: 15,
    stiffness: 100,
    mass: 1,
  },

  /** Bouncy spring - buttons, toggles */
  bouncy: {
    damping: 10,
    stiffness: 150,
    mass: 0.5,
  },

  /** Stiff spring - quick responses */
  stiff: {
    damping: 20,
    stiffness: 200,
    mass: 0.5,
  },

  /** Smooth spring - slow, elegant */
  smooth: {
    damping: 20,
    stiffness: 80,
    mass: 1,
  },
} as const;

// ==========================================
// OPACITY STATES
// ==========================================
export const opacity = {
  disabled: 0.4,
  pressed: 0.7,
  hover: 0.9,
  active: 1,
} as const;

// ==========================================
// Z-INDEX SCALE
// ==========================================
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modalBackdrop: 40,
  modal: 50,
  popover: 60,
  tooltip: 70,
  toast: 80,
} as const;

// Type exports
export type Duration = keyof typeof duration;
export type EasingKey = keyof typeof easing;
export type SpringConfig = keyof typeof springConfigs;
