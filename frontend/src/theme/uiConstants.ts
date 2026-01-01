/**
 * UI Constants - Design System Constants
 *
 * Centralized design tokens inspired by:
 * - CIS-Team/UI-UX-Roadmap-2024 (visual hierarchy, color theory, typography)
 * - react-native-design-kit (component patterns)
 * - React-Native-UI-Templates (animation timings)
 *
 * Note: These constants complement the existing designTokens.ts
 * Using distinct names to avoid conflicts
 */

// =============================================================================
// ANIMATION TIMINGS
// =============================================================================
export const AnimationTimings = {
  /** Ultra fast micro-interactions */
  instant: 100,
  /** Fast feedback animations */
  fast: 200,
  /** Standard UI transitions */
  normal: 300,
  /** Comfortable page transitions */
  medium: 400,
  /** Deliberate, noticeable animations */
  slow: 500,
  /** Long, dramatic animations */
  slower: 800,
  /** Extended animations for emphasis */
  slowest: 1000,
  /** Stagger delay between list items */
  staggerDelay: 100,
  /** List item animation duration */
  listItemDuration: 300,
} as const;

// =============================================================================
// ANIMATION EASINGS (for react-native-reanimated)
// =============================================================================
export const AnimationEasings = {
  /** Standard easing for most animations */
  standard: { damping: 15, stiffness: 150 },
  /** Bouncy spring for playful interactions */
  bouncy: { damping: 10, stiffness: 180 },
  /** Gentle for subtle movements */
  gentle: { damping: 20, stiffness: 100 },
  /** Snappy for quick responses */
  snappy: { damping: 18, stiffness: 250 },
  /** Smooth for page transitions */
  smooth: { damping: 25, stiffness: 120 },
} as const;

// =============================================================================
// SPACING SCALE (8px base grid) - Aliased to avoid conflict with designTokens
// =============================================================================
export const Spacing = {
  /** 2px - Hair-thin spacing */
  xxs: 2,
  /** 4px - Micro spacing */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 12px - Base spacing */
  md: 12,
  /** 16px - Medium spacing */
  base: 16,
  /** 20px - Large spacing */
  lg: 20,
  /** 24px - Extra large spacing */
  xl: 24,
  /** 32px - 2x large spacing */
  xxl: 32,
  /** 40px - 3x large spacing */
  xxxl: 40,
  /** 48px - Section spacing */
  section: 48,
  /** 64px - Page spacing */
  page: 64,
} as const;

// =============================================================================
// BORDER RADIUS - Aliased to avoid conflict with designTokens
// =============================================================================
export const BorderRadius = {
  /** No radius */
  none: 0,
  /** 4px - Subtle radius */
  xs: 4,
  /** 8px - Small radius */
  sm: 8,
  /** 12px - Medium radius */
  md: 12,
  /** 16px - Large radius */
  lg: 16,
  /** 20px - Extra large radius */
  xl: 20,
  /** 24px - 2x large radius */
  xxl: 24,
  /** 9999px - Full/pill radius */
  full: 9999,
} as const;

// =============================================================================
// TYPOGRAPHY SCALE
// =============================================================================
export const FontSizes = {
  /** 10px - Caption/fine print */
  xs: 10,
  /** 12px - Small text */
  sm: 12,
  /** 14px - Body small */
  md: 14,
  /** 16px - Body default */
  base: 16,
  /** 18px - Body large */
  lg: 18,
  /** 20px - Subtitle */
  xl: 20,
  /** 24px - Title */
  xxl: 24,
  /** 28px - Large title */
  xxxl: 28,
  /** 32px - Display */
  display: 32,
  /** 40px - Hero */
  hero: 40,
} as const;

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const LineHeights = {
  /** Tight for headlines */
  tight: 1.2,
  /** Normal for body text */
  normal: 1.5,
  /** Relaxed for readability */
  relaxed: 1.75,
  /** Loose for large blocks */
  loose: 2,
} as const;

// =============================================================================
// COMPONENT SIZES
// =============================================================================
export const ComponentSizes = {
  /** Button heights */
  button: {
    sm: 32,
    md: 44,
    lg: 52,
    xl: 60,
  },
  /** Input heights */
  input: {
    sm: 36,
    md: 48,
    lg: 56,
  },
  /** Icon sizes */
  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    xxl: 40,
  },
  /** Avatar sizes */
  avatar: {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    xxl: 80,
  },
  /** Touch targets (minimum 44px for accessibility) */
  touchTarget: {
    min: 44,
    comfortable: 48,
    large: 56,
  },
  /** FAB sizes */
  fab: {
    sm: 40,
    md: 56,
    lg: 72,
  },
} as const;

// =============================================================================
// SHADOWS (iOS & Android)
// =============================================================================
export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 12,
  },
  xxl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  /** Floating/raised shadow */
  raised: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
} as const;

// =============================================================================
// Z-INDEX LAYERS - Aliased to avoid conflict with designTokens
// =============================================================================
export const ZIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
  notification: 800,
  max: 9999,
} as const;

// =============================================================================
// HIT SLOP (for small touch targets)
// =============================================================================
export const HitSlop = {
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

// =============================================================================
// OPACITY VALUES
// =============================================================================
export const Opacity = {
  transparent: 0,
  faint: 0.1,
  light: 0.3,
  medium: 0.5,
  heavy: 0.7,
  almostFull: 0.9,
  full: 1,
  disabled: 0.5,
  pressed: 0.7,
  hover: 0.8,
} as const;

// =============================================================================
// BLUR INTENSITY
// =============================================================================
export const BlurIntensity = {
  light: 10,
  medium: 20,
  heavy: 40,
  glass: 60,
} as const;

export type AnimationTiming = keyof typeof AnimationTimings;
export type SpacingKey = keyof typeof Spacing;
export type BorderRadiusKey = keyof typeof BorderRadius;
export type FontSizeKey = keyof typeof FontSizes;
export type ShadowKey = keyof typeof Shadows;
