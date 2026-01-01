/**
 * Unified Spacing System
 * 4px base unit for consistent spacing throughout the app
 *
 * Usage: spacing.md → 16
 * Usage in styles: { padding: spacing.md }
 */

// ==========================================
// SPACING SCALE (4px base unit)
// ==========================================
export const spacing = {
  /** 0px - No spacing */
  none: 0,
  /** 2px - Hairline spacing */
  xxs: 2,
  /** 4px - Tight spacing */
  xs: 4,
  /** 8px - Compact spacing */
  sm: 8,
  /** 12px - Medium-small spacing */
  md: 12,
  /** 16px - Default spacing */
  lg: 16,
  /** 20px - Comfortable spacing */
  xl: 20,
  /** 24px - Spacious */
  '2xl': 24,
  /** 32px - Section spacing */
  '3xl': 32,
  /** 40px - Large gaps */
  '4xl': 40,
  /** 48px - Extra large gaps */
  '5xl': 48,
  /** 64px - Maximum spacing */
  '6xl': 64,
} as const;

// ==========================================
// LAYOUT SPACING
// ==========================================
export const layout = {
  /** Screen horizontal padding */
  screenPadding: spacing.lg,       // 16px
  /** Card internal padding */
  cardPadding: spacing.lg,         // 16px
  /** Section gap */
  sectionGap: spacing['2xl'],      // 24px
  /** Item gap in lists */
  itemGap: spacing.md,             // 12px
  /** Inline element gap */
  inlineGap: spacing.sm,           // 8px
  /** Form field gap */
  fieldGap: spacing.lg,            // 16px
  /** Header height */
  headerHeight: 56,
  /** Tab bar height */
  tabBarHeight: 64,
  /** Bottom safe area */
  bottomSafeArea: spacing['3xl'],  // 32px
} as const;

// ==========================================
// TOUCH TARGETS (Accessibility)
// ==========================================
export const touchTargets = {
  /** Minimum touch target (44x44 per Apple HIG) */
  minimum: 44,
  /** Comfortable touch target */
  comfortable: 48,
  /** Large touch target */
  large: 56,
} as const;

// ==========================================
// HIT SLOP (Extends touch area without visual change)
// ==========================================
export const hitSlop = {
  small: { top: 8, bottom: 8, left: 8, right: 8 },
  medium: { top: 12, bottom: 12, left: 12, right: 12 },
  large: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

// Type exports
export type Spacing = typeof spacing;
export type SpacingKey = keyof typeof spacing;
