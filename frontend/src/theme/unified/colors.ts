/**
 * Unified Color System
 * Single source of truth for all colors in the app
 *
 * Migration: Replace hardcoded colors with these tokens
 * Example: '#0EA5E9' → colors.primary[400]
 */

// ==========================================
// COLOR PALETTE - Semantic Colors with Shades
// ==========================================
export const colors = {
  // Base colors
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",

  // Primary Brand - Electric Blue (main actions, links, focus)
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA", // Light accent
    500: "#3B82F6", // Main brand color
    600: "#2563EB", // Hover state
    700: "#1D4ED8", // Active state
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  // Secondary - Teal/Cyan (supporting actions)
  secondary: {
    50: "#ECFEFF",
    100: "#CFFAFE",
    200: "#A5F3FC",
    300: "#67E8F9",
    400: "#22D3EE", // Accent
    500: "#06B6D4", // Main
    600: "#0891B2",
    700: "#0E7490",
    800: "#155E75",
    900: "#164E63",
  },

  // Success - Green (positive states, completion, verified)
  success: {
    50: "#F0FDF4",
    100: "#DCFCE7",
    200: "#BBF7D0",
    300: "#86EFAC",
    400: "#4ADE80",
    500: "#22C55E", // Main
    600: "#16A34A",
    700: "#15803D",
    800: "#166534",
    900: "#14532D",
  },

  // Warning - Amber (caution, attention needed)
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B", // Main
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },

  // Error - Red (errors, destructive actions, alerts)
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444", // Main
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },

  // Info - Blue (informational, hints, tips)
  info: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6", // Main
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  // Neutral - Slate (text, backgrounds, borders)
  neutral: {
    0: "#FFFFFF",
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
    950: "#020617",
  },
} as const;

// ==========================================
// SEMANTIC COLOR ALIASES
// ==========================================
export const semanticColors = {
  // Text colors
  text: {
    primary: colors.neutral[900], // Main text
    secondary: colors.neutral[600], // Subtle text
    tertiary: colors.neutral[500], // Placeholder, hint
    muted: colors.neutral[400], // Muted text (alias for tertiary)
    disabled: colors.neutral[400], // Disabled state
    inverse: colors.neutral[0], // Text on dark backgrounds
    link: colors.primary[600], // Clickable text
  },

  // Background colors
  background: {
    default: colors.neutral[0], // Alias for primary
    primary: colors.neutral[0], // Main background
    secondary: colors.neutral[50], // Cards, sections
    tertiary: colors.neutral[100], // Nested sections
    elevated: colors.neutral[0], // Elevated surfaces
    paper: colors.neutral[0], // Paper/sheet background
    card: colors.neutral[0], // Card background
    overlay: "rgba(15, 23, 42, 0.5)", // Modal overlays
  },

  // Border colors
  border: {
    default: colors.neutral[200], // Default borders
    subtle: colors.neutral[100], // Subtle dividers
    strong: colors.neutral[300], // Emphasized borders
    focus: colors.primary[500], // Focus rings
  },

  // Interactive states
  interactive: {
    default: colors.primary[500],
    hover: colors.primary[600],
    active: colors.primary[700],
    disabled: colors.neutral[300],
  },

  // Status indicators
  status: {
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    info: colors.info[500],
  },
} as const;

// ==========================================
// DARK MODE COLORS (future-ready)
// ==========================================
export const darkColors = {
  text: {
    primary: colors.neutral[50],
    secondary: colors.neutral[300],
    tertiary: colors.neutral[400],
    muted: colors.neutral[500],
    disabled: colors.neutral[600],
    inverse: colors.neutral[900],
    link: colors.primary[400],
  },

  background: {
    default: colors.neutral[900],
    primary: colors.neutral[900],
    secondary: colors.neutral[800],
    tertiary: colors.neutral[700],
    elevated: colors.neutral[800],
    paper: colors.neutral[800],
    card: colors.neutral[800],
    overlay: "rgba(0, 0, 0, 0.7)",
  },

  border: {
    default: colors.neutral[700],
    subtle: colors.neutral[800],
    strong: colors.neutral[600],
    focus: colors.primary[400],
  },

  // Interactive states
  interactive: {
    default: colors.primary[400],
    hover: colors.primary[500],
    active: colors.primary[600],
    disabled: colors.neutral[600],
  },

  // Status indicators
  status: {
    success: colors.success[400],
    warning: colors.warning[400],
    error: colors.error[400],
    info: colors.info[400],
  },
} as const;

// ==========================================
// GRADIENT PRESETS
// ==========================================
export const gradients = {
  primary: [colors.primary[600], colors.primary[700]],
  secondary: [colors.secondary[500], colors.secondary[600]],
  success: [colors.success[500], colors.success[600]],
  sunset: [colors.warning[500], colors.error[500]],
  aurora: ["#0F766E", "#0891B2", "#2563EB"] as const, // Darker teal-cyan-blue gradient
  auroraLight: [
    colors.primary[400],
    colors.secondary[400],
    colors.success[400],
  ],
  glass: ["rgba(255, 255, 255, 0.15)", "rgba(255, 255, 255, 0.08)"],
} as const;

// Type exports
export type ColorPalette = typeof colors;
export type SemanticColors = typeof semanticColors;
export type ColorShade = keyof typeof colors.primary;
