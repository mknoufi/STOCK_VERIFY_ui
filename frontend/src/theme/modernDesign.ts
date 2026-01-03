/**
 * Modern Design System for Lavanya Mart Stock Verify App
 * Production-ready design tokens following modern UI/UX principles
 */

export const modernBranding = {
  name: "Lavanya Mart",
  tagline: "Stock Verification System",
  colors: {
    primary: "#3B82F6", // Modern blue
    primaryDark: "#1D4ED8", // Darker blue for gradients
    secondary: "#8B5CF6", // Purple accent
    accent: "#06B6D4", // Cyan accent
  },
} as const;

// Modern Color Palette - Accessible and Vibrant
export const colors = {
  // Primary Brand Colors
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6", // Main brand color
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  // Neutral Grays - Modern and Clean
  gray: {
    50: "#F9FAFB",
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },

  // Semantic Colors
  success: {
    50: "#ECFDF5",
    500: "#10B981",
    600: "#059669",
  },

  warning: {
    50: "#FFFBEB",
    500: "#F59E0B",
    600: "#D97706",
  },

  error: {
    50: "#FEF2F2",
    500: "#EF4444",
    600: "#DC2626",
  },

  // Special UI Colors
  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",

  // Overlay colors for modals/sheets
  overlay: "rgba(0, 0, 0, 0.6)",
  glassBg: "rgba(255, 255, 255, 0.1)",
} as const;

// Dark Theme Colors
export const darkColors = {
  ...colors,
  gray: {
    50: "#1F2937",
    100: "#374151",
    200: "#4B5563",
    300: "#6B7280",
    400: "#9CA3AF",
    500: "#D1D5DB",
    600: "#E5E7EB",
    700: "#F3F4F6",
    800: "#F9FAFB",
    900: "#FFFFFF",
  },
} as const;

// Spacing System - 8px base grid
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
  "3xl": 64,
  "4xl": 80,
  "5xl": 96,
} as const;

// Typography Scale
export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    "2xl": 24,
    "3xl": 30,
    "4xl": 36,
    "5xl": 48,
    "6xl": 60,
  },

  fontWeight: {
    light: "300" as const,
    normal: "400" as const,
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    black: "900" as const,
  },

  lineHeight: {
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
    "2xl": 36,
    "3xl": 40,
    "4xl": 44,
    "5xl": 56,
    "6xl": 72,
  },
} as const;

// Border Radius - Modern rounded corners
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  full: 999,
} as const;

// Modern Shadows - Subtle depth
export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },

  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },

  xl: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 8,
  },
} as const;

// Animation Constants
export const animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
    slower: 500,
  },

  easing: {
    out: "ease-out",
    in: "ease-in",
    inOut: "ease-in-out",
    spring: "spring(1, 0.8, 0.2)",
  },
} as const;

// Component Sizes
export const componentSizes = {
  button: {
    sm: { height: 36, paddingHorizontal: 16 },
    md: { height: 44, paddingHorizontal: 20 },
    lg: { height: 52, paddingHorizontal: 24 },
  },

  input: {
    sm: { height: 36 },
    md: { height: 44 },
    lg: { height: 52 },
  },

  icon: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
  },
} as const;

// Modern Gradients
export const gradients = {
  primary: ["#3B82F6", "#1D4ED8"],
  secondary: ["#8B5CF6", "#7C3AED"],
  accent: ["#06B6D4", "#0891B2"],
  success: ["#10B981", "#059669"],
  warning: ["#F59E0B", "#D97706"],
  error: ["#EF4444", "#DC2626"],
  glass: ["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.05)"],
  darkGlass: ["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.05)"],
} as const;

// Layout Constants
export const layout = {
  screen: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },

  container: {
    maxWidth: 600,
    paddingHorizontal: spacing.md,
  },

  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
  },

  button: {
    borderRadius: borderRadius.md,
    minHeight: componentSizes.button.md.height,
  },

  input: {
    borderRadius: borderRadius.md,
    height: componentSizes.input.md.height,
    paddingHorizontal: spacing.md,
  },
} as const;

export type ColorKey = keyof typeof colors;
export type SpacingKey = keyof typeof spacing;
export type TypographySize = keyof typeof typography.fontSize;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
