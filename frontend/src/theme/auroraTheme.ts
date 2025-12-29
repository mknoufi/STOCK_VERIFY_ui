/**
 * Aurora Theme - Enhanced Design System v2.0
 *
 * Features:
 * - Aurora gradient backgrounds (Blue-Purple blend)
 * - Glassmorphism effects with backdrop blur
 * - Modern color palette from Kombai API
 * - Professional typography (Manrope + Source Sans 3)
 * - Comprehensive design tokens
 */

import { ViewStyle } from "react-native";

// ==========================================
// AURORA COLOR PALETTE
// ==========================================

export const auroraColors = {
  // Primary - Tech Blue (from Kombai API)
  primary: {
    50: "#D2E4FA",
    100: "#A5C9F5",
    200: "#78AEF0",
    300: "#4A93EB",
    400: "#1D78E6",
    500: "#1560BD", // Main - Tech Blue
    600: "#11509D",
    700: "#0E407D",
    800: "#0A305E",
    900: "#07203F",
  },

  // Secondary - Smart Blue
  secondary: {
    50: "#DAE5F7",
    100: "#B6CBEE",
    200: "#91B1E6",
    300: "#6C98DE",
    400: "#477ED5",
    500: "#2D68C4", // Main - Smart Blue
    600: "#2555A3",
    700: "#1E4482",
    800: "#163362",
    900: "#0F2241",
  },

  // Accent - Purple (for aurora blend)
  accent: {
    50: "#F5F3FF",
    100: "#EDE9FE",
    200: "#DDD6FE",
    300: "#C4B5FD",
    400: "#A78BFA",
    500: "#8B5CF6",
    600: "#7C3AED",
    700: "#6D28D9",
    800: "#5B21B6",
    900: "#4C1D95",
  },

  // Success - Emerald
  success: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981",
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },

  // Warning - Amber
  warning: {
    50: "#FFFBEB",
    100: "#FEF3C7",
    200: "#FDE68A",
    300: "#FCD34D",
    400: "#FBBF24",
    500: "#F59E0B",
    600: "#D97706",
    700: "#B45309",
    800: "#92400E",
    900: "#78350F",
  },

  // Error - Red
  error: {
    50: "#FEF2F2",
    100: "#FEE2E2",
    200: "#FECACA",
    300: "#FCA5A5",
    400: "#F87171",
    500: "#EF4444",
    600: "#DC2626",
    700: "#B91C1C",
    800: "#991B1B",
    900: "#7F1D1D",
  },

  // Neutral - Slate (Dark Mode Optimized)
  neutral: {
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

  // Aurora Gradients (for backgrounds and effects)
  aurora: {
    // Primary aurora blend (Blue to Purple)
    primary: ["#1560BD", "#2D68C4", "#8B5CF6"] as const,
    // Secondary aurora blend (Blue to Teal)
    secondary: ["#2D68C4", "#0EA5E9", "#06B6D4"] as const,
    // Success aurora blend
    success: ["#10B981", "#14B8A6", "#06B6D4"] as const,
    // Warm aurora blend
    warm: ["#F59E0B", "#EC4899", "#8B5CF6"] as const,
    // Dark aurora blend (for backgrounds)
    dark: ["#0F172A", "#1E293B", "#334155"] as const,
    // Glass overlay
    glass: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"] as const,
  },

  // Background Colors (Dark Theme)
  background: {
    primary: "#0F172A", // Slate 900
    secondary: "#1E293B", // Slate 800
    tertiary: "#334155", // Slate 700
    elevated: "#475569", // Slate 600
    overlay: "rgba(15, 23, 42, 0.95)",
    glass: "rgba(30, 41, 59, 0.7)",
    blur: "rgba(30, 41, 59, 0.5)",
  },

  // Surface Colors (alias for background - for compatibility)
  surface: {
    base: "#0F172A", // Slate 900
    primary: "#0F172A", // Slate 900
    secondary: "#1E293B", // Slate 800
    tertiary: "#334155", // Slate 700
    elevated: "#475569", // Slate 600
    card: "#1E293B", // Slate 800
    overlay: "rgba(15, 23, 42, 0.95)",
    glass: "rgba(30, 41, 59, 0.7)",
  },

  // Text Colors
  text: {
    primary: "#F8FAFC", // Slate 50
    secondary: "#CBD5E1", // Slate 300
    tertiary: "#94A3B8", // Slate 400
    muted: "#94A3B8", // Slate 400 (alias for tertiary)
    disabled: "#64748B", // Slate 500
    inverse: "#0F172A", // Slate 900
    link: "#60A5FA",
    linkHover: "#93C5FD",
  },

  // Border Colors
  border: {
    light: "rgba(255, 255, 255, 0.1)",
    subtle: "rgba(255, 255, 255, 0.1)", // alias for light
    medium: "rgba(255, 255, 255, 0.2)",
    strong: "rgba(255, 255, 255, 0.3)",
    focus: "#1560BD",
    error: "#EF4444",
    success: "#10B981",
  },

  // Status Colors
  status: {
    active: "#10B981",
    pending: "#F59E0B",
    error: "#EF4444",
    inactive: "#64748B",
    verified: "#06B6D4",
    warning: "#FBBF24",
  },
  // Shimmer effect colors
  shimmer: ["#1E293B", "#334155", "#1E293B"] as const,
};

// ==========================================
// TYPOGRAPHY SYSTEM
// ==========================================

export const auroraTypography = {
  // Font Families (Manrope + Source Sans 3)
  fontFamily: {
    display: "Manrope-Bold",
    heading: "Manrope-SemiBold",
    body: "SourceSans3-Regular",
    label: "SourceSans3-SemiBold",
    mono: "Courier New",
  },

  // Font Sizes
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 28,
    "4xl": 32,
    "5xl": 36,
    "6xl": 48,
    "7xl": 60,
  },

  // Font Weights
  fontWeight: {
    light: "300" as const,
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
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
};

// ==========================================
// SPACING SYSTEM
// ==========================================

export const auroraSpacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,

  // Semantic spacing
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
};

// ==========================================
// BORDER RADIUS
// ==========================================

export const auroraBorderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,

  // Component-specific
  button: 12,
  card: 16,
  input: 12,
  modal: 24,
  badge: 9999,
};

// ==========================================
// SHADOWS
// ==========================================

export const auroraShadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },

  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },

  // Colored shadows for aurora effects
  aurora: {
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },

  glow: {
    shadowColor: "#1560BD",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
};

// ==========================================
// GLASSMORPHISM STYLES
// ==========================================

export const auroraGlass = {
  light: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
  } as ViewStyle,

  medium: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
  } as ViewStyle,

  strong: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.3)",
    borderWidth: 1.5,
  } as ViewStyle,

  dark: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
  } as ViewStyle,

  modal: {
    backgroundColor: "rgba(30, 41, 59, 0.8)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
  } as ViewStyle,
};

// ==========================================
// ANIMATION TOKENS
// ==========================================

export const auroraAnimations = {
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
  },

  spring: {
    damping: 15,
    stiffness: 300,
    mass: 1,
  },

  scale: {
    pressed: 0.95,
    hover: 1.02,
    active: 1.05,
  },

  opacity: {
    disabled: 0.5,
    hover: 0.9,
    pressed: 0.8,
  },
};

// ==========================================
// COMPONENT SIZES
// ==========================================

export const auroraComponentSizes = {
  button: {
    small: 36,
    medium: 44,
    large: 56,
    xl: 72, // For floating scan button
  },

  input: {
    small: 40,
    medium: 48,
    large: 56,
  },

  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
    "2xl": 48,
  },

  avatar: {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  },
};

// ==========================================
// EXPORT THEME
// ==========================================

export const auroraTheme = {
  colors: auroraColors,
  typography: auroraTypography,
  spacing: auroraSpacing,
  borderRadius: auroraBorderRadius,
  shadows: auroraShadows,
  glass: auroraGlass,
  animations: auroraAnimations,
  componentSizes: auroraComponentSizes,
};

export type AuroraTheme = typeof auroraTheme;

export default auroraTheme;
