/**
 * Unified Border Radius System
 * Consistent corner rounding across all components
 *
 * Usage: radius.md → 12
 * Migration: Replace borderRadius: 14 → radius.md
 */

// ==========================================
// BORDER RADIUS SCALE
// ==========================================
export const radius = {
  /** 0px - No rounding (sharp corners) */
  none: 0,
  /** 4px - Subtle rounding */
  xs: 4,
  /** 8px - Small rounding */
  sm: 8,
  /** 12px - Medium rounding (default for cards) */
  md: 12,
  /** 16px - Large rounding */
  lg: 16,
  /** 20px - Extra large rounding */
  xl: 20,
  /** 24px - Very large rounding */
  "2xl": 24,
  /** 32px - Pill-like for smaller elements */
  "3xl": 32,
  /** 9999px - Full circle/pill */
  full: 9999,
} as const;

// ==========================================
// COMPONENT-SPECIFIC RADIUS
// ==========================================
export const componentRadius = {
  /** Cards, modals, sheets */
  card: radius.md, // 12px
  /** Buttons */
  button: radius.sm, // 8px
  /** Input fields */
  input: radius.sm, // 8px
  /** Chips, tags, badges */
  chip: radius.full, // Pill shape
  /** Avatar, icons */
  avatar: radius.full, // Circle
  /** Bottom sheets */
  bottomSheet: radius.xl, // 20px top corners
  /** Tooltips */
  tooltip: radius.sm, // 8px
  /** Modals */
  modal: radius.lg, // 16px
} as const;

// Type exports
export type Radius = typeof radius;
export type RadiusKey = keyof typeof radius;
