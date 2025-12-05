/**
 * Design Tokens System
 * Comprehensive design tokens for consistent styling across the app
 * Based on Material Design 3 and modern design system best practices
 */

// ==========================================
// SPACING SCALE (4px base unit)
// ==========================================
export const spacing = {
  xs: 4, // 0.25rem - Tight spacing
  sm: 8, // 0.5rem  - Small spacing
  md: 12, // 0.75rem - Medium spacing
  base: 16, // 1rem    - Base spacing
  lg: 24, // 1.5rem  - Large spacing
  xl: 32, // 2rem    - Extra large spacing
  "2xl": 48, // 3rem    - 2x extra large
  "3xl": 64, // 4rem    - 3x extra large
} as const;

export type Spacing = (typeof spacing)[keyof typeof spacing];

// ==========================================
// TYPOGRAPHY SCALE
// ==========================================
export const typography = {
  // Font Sizes
  fontSize: {
    xs: 10, // Caption, labels
    sm: 12, // Small text
    base: 14, // Body text
    md: 16, // Default body
    lg: 18, // Large body
    xl: 20, // Subheading
    "2xl": 24, // Heading 3
    "3xl": 32, // Heading 2
    "4xl": 48, // Heading 1
  },

  // Font Weights
  fontWeight: {
    light: "300" as const,
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
    veryLoose: 1.8,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1,
  },
} as const;

// ==========================================
// BORDER RADIUS SCALE
// ==========================================
export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 24,
  full: 9999,
} as const;

export type BorderRadius = (typeof borderRadius)[keyof typeof borderRadius];

// ==========================================
// SHADOW/ELEVATION SYSTEM
// ==========================================
export const shadows = {
  0: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  1: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  2: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  3: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    elevation: 3,
  },
  4: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 4,
  },
  5: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 5,
  },
  6: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.29,
    shadowRadius: 5.46,
    elevation: 6,
  },
  7: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.31,
    shadowRadius: 6.27,
    elevation: 7,
  },
  8: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.33,
    shadowRadius: 7.08,
    elevation: 8,
  },
} as const;

export type ShadowLevel = keyof typeof shadows;

// ==========================================
// Z-INDEX SCALE
// ==========================================
export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
  max: 9999,
} as const;

export type ZIndex = (typeof zIndex)[keyof typeof zIndex];

// ==========================================
// BREAKPOINTS (for responsive design)
// ==========================================
export const breakpoints = {
  xs: 0, // Extra small devices (phones)
  sm: 576, // Small devices (phones, landscape)
  md: 768, // Medium devices (tablets)
  lg: 992, // Large devices (desktops)
  xl: 1200, // Extra large devices
  "2xl": 1400, // 2x extra large devices
} as const;

export type Breakpoint = keyof typeof breakpoints;

// ==========================================
// ANIMATION DURATIONS
// ==========================================
export const animation = {
  duration: {
    fast: 150, // Quick interactions
    normal: 300, // Standard animations
    slow: 500, // Slow animations
    slower: 700, // Very slow animations
  },
  easing: {
    linear: "linear",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
  },
} as const;

// ==========================================
// TOUCH TARGET SIZES (Accessibility)
// ==========================================
export const touchTargets = {
  minimum: 44, // WCAG minimum (iOS HIG: 44x44pt)
  comfortable: 48, // More comfortable size
  large: 56, // Large touch target
} as const;

export type TouchTarget = (typeof touchTargets)[keyof typeof touchTargets];

// ==========================================
// EXPORT ALL TOKENS
// ==========================================
export const designTokens = {
  spacing,
  typography,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  animation,
  touchTargets,
} as const;

export default designTokens;
