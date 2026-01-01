/**
 * Modern Design System - Enhanced UI/UX Upgrade v4.0
 * Unified Design System (formerly Aurora + Modern)
 *
 * Features:
 * - Professional Sapphire Blue primary with Emerald accents
 * - Refined typography scale for better readability
 * - Optimized spacing system for modern mobile layouts
 * - Subtle glassmorphism and depth effects
 * - High-contrast accessibility support
 * - Consolidated Aurora Theme tokens
 */

import { Platform, StyleSheet } from "react-native";

// ==========================================
// MODERN COLOR PALETTE - DEEP OCEAN
// ==========================================

export const auroraColors = {
  primary: {
    50: "#D2E4FA",
    100: "#A5C9F5",
    200: "#78AEF0",
    300: "#4A93EB",
    400: "#1D78E6",
    500: "#1560BD",
    600: "#11509D",
    700: "#0E407D",
    800: "#0A305E",
    900: "#07203F",
  },
  secondary: {
    50: "#DAE5F7",
    100: "#B6CBEE",
    200: "#91B1E6",
    300: "#6C98DE",
    400: "#477ED5",
    500: "#2D68C4",
    600: "#2555A3",
    700: "#1E4482",
    800: "#163362",
    900: "#0F2241",
  },
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
};

export const modernColors = {
  // Primary Brand Colors - Premium Electric Blue
  primary: {
    50: "#EFF6FF",
    100: "#DBEAFE",
    200: "#BFDBFE",
    300: "#93C5FD",
    400: "#60A5FA",
    500: "#3B82F6", // Main primary - Electric Blue
    600: "#2563EB",
    700: "#1D4ED8",
    800: "#1E40AF",
    900: "#1E3A8A",
  },

  // Secondary - Emerald Green (Success/Verification)
  secondary: {
    50: "#ECFDF5",
    100: "#D1FAE5",
    200: "#A7F3D0",
    300: "#6EE7B7",
    400: "#34D399",
    500: "#10B981", // Main secondary - Emerald
    600: "#059669",
    700: "#047857",
    800: "#065F46",
    900: "#064E3B",
  },

  // Accent - Royal Blue / Indigo
  accent: {
    50: "#EEF2FF",
    100: "#E0E7FF",
    200: "#C7D2FE",
    300: "#A5B4FC",
    400: "#818CF8",
    500: "#6366F1", // Main accent - Indigo
    600: "#4F46E5",
    700: "#4338CA",
    800: "#3730A3",
    900: "#312E81",
  },

  // Neutral Grays - Slate (Professional & Clean)
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

  // Semantic Colors - More Vibrant
  success: {
    light: "#DCFCE7",
    main: "#22C55E", // Brighter green
    dark: "#16A34A",
    contrast: "#FFFFFF",
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

  error: {
    light: "#FEE2E2",
    main: "#EF4444",
    dark: "#DC2626",
    contrast: "#FFFFFF",
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

  warning: {
    light: "#FEF9C3",
    main: "#EAB308", // Brighter yellow
    dark: "#CA8A04",
    contrast: "#18181B",
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

  info: {
    light: "#E0F2FE",
    main: "#0EA5E9", // Sky blue
    dark: "#0284C7",
    contrast: "#FFFFFF",
  },

  // Background Colors (Dark Mode) - Deeper & Richer
  background: {
    default: "#020617", // Slate 950
    paper: "#0F172A", // Slate 900
    elevated: "#1E293B", // Slate 800
    overlay: "rgba(2, 6, 23, 0.9)",
    glass: "rgba(15, 23, 42, 0.75)", // Glassmorphism
    // Alias for legacy Aurora support
    primary: "#0F172A",
    secondary: "#1E293B",
    tertiary: "#334155",
    elevatedLegacy: "#475569",
    blur: "rgba(30, 41, 59, 0.5)",
  },

  // Surface Colors for legacy Aurora support
  surface: {
    base: "#0F172A",
    primary: "#0F172A",
    secondary: "#1E293B",
    tertiary: "#334155",
    elevated: "#475569",
    card: "#1E293B",
    overlay: "rgba(15, 23, 42, 0.95)",
    glass: "rgba(30, 41, 59, 0.7)",
  },

  // Text Colors - Higher Contrast
  text: {
    primary: "#F8FAFC", // Slate 50
    secondary: "#94A3B8", // Slate 400
    tertiary: "#64748B", // Slate 500
    muted: "#94A3B8", // Alias
    disabled: "#475569", // Slate 600
    inverse: "#020617", // Slate 950
    link: "#38BDF8", // Sky 400
    linkHover: "#7DD3FC", // Sky 300
  },

  // Border Colors - Subtle & Clean
  border: {
    light: "#1E293B", // Slate 800
    medium: "#334155", // Slate 700
    strong: "#475569", // Slate 600
    dark: "#475569", // Slate 600
    focus: "#0EA5E9", // Sky 500
    error: "#EF4444", // Red 500
    subtle: "#1E293B", // Alias
    success: "#10B981", // Alias
  },

  // Semantic Colors Shorthand (for backward compatibility)
  semantic: {
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#0EA5E9",
  },

  // Status Colors for legacy Aurora support
  status: {
    active: "#10B981",
    pending: "#F59E0B",
    error: "#EF4444",
    inactive: "#64748B",
    verified: "#06B6D4",
    warning: "#FBBF24",
  },

  // Gradient Definitions - More Professional
  gradients: {
    primary: ["#0EA5E9", "#0284C7", "#0369A1"] as const, // Sky Blue spectrum
    secondary: ["#10B981", "#059669", "#047857"] as const, // Emerald spectrum
    accent: ["#6366F1", "#4F46E5", "#4338CA"] as const, // Indigo spectrum
    dark: ["#0F172A", "#020617", "#000000"] as const, // Deep background
    surface: ["#1E293B", "#0F172A", "#020617"] as const, // Surface layers
    aurora: ["#0EA5E9", "#10B981", "#6366F1"] as const, // Sky to Emerald to Indigo

    // Aurora Legacy Gradients
    auroraPrimary: ["#1560BD", "#2D68C4", "#8B5CF6"] as const,
    auroraSecondary: ["#2D68C4", "#0EA5E9", "#06B6D4"] as const,
    auroraSuccess: ["#10B981", "#14B8A6", "#06B6D4"] as const,
    auroraWarm: ["#F59E0B", "#EC4899", "#8B5CF6"] as const,
    auroraDark: ["#0F172A", "#1E293B", "#334155"] as const,

    // Specific UI Gradients
    button: ["#0EA5E9", "#0284C7"] as const,
    card: ["rgba(30, 41, 59, 0.7)", "rgba(15, 23, 42, 0.8)"] as const,
    input: ["rgba(15, 23, 42, 0.6)", "rgba(2, 6, 23, 0.7)"] as const,

    success: ["#10B981", "#059669"] as const,
    warning: ["#F59E0B", "#D97706"] as const,
    error: ["#EF4444", "#DC2626"] as const,
    glass: ["rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.02)"] as const,
    shimmer: [
      "rgba(14, 165, 233, 0.1)",
      "rgba(16, 185, 129, 0.15)",
      "rgba(14, 165, 233, 0.1)",
    ] as const,
  },

  // Shimmer effect colors
  shimmer: ["#1E293B", "#334155", "#1E293B"] as const,
};

export const modernGradients = modernColors.gradients;

// ==========================================
// ENHANCED TYPOGRAPHY
// ==========================================

export const modernTypography = {
  // Typography System - Inter
  fontFamily: {
    display: "Inter_700Bold",
    heading: "Inter_600SemiBold",
    body: "Inter_400Regular",
    label: "Inter_500Medium",
    mono: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  // Display Styles (Hero, Large Headings)
  display: {
    large: {
      fontSize: 57,
      fontWeight: "700" as const,
      lineHeight: 64,
      letterSpacing: -0.5,
    },
    medium: {
      fontSize: 45,
      fontWeight: "700" as const,
      lineHeight: 52,
      letterSpacing: -0.5,
    },
    small: {
      fontSize: 36,
      fontWeight: "700" as const,
      lineHeight: 44,
      letterSpacing: -0.5,
    },
  },

  // Headings
  h1: {
    fontSize: 32,
    fontWeight: "700" as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: "600" as const,
    lineHeight: 36,
    letterSpacing: 0,
  },
  h3: {
    fontSize: 24,
    fontWeight: "600" as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  h4: {
    fontSize: 20,
    fontWeight: "600" as const,
    lineHeight: 28,
    letterSpacing: 0.15,
  },
  h5: {
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  h6: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 24,
    letterSpacing: 0.15,
  },

  // Body Text
  body: {
    large: {
      fontSize: 18,
      fontWeight: "400" as const,
      lineHeight: 28,
      letterSpacing: 0.15,
    },
    medium: {
      fontSize: 16,
      fontWeight: "400" as const,
      lineHeight: 24,
      letterSpacing: 0.15,
    },
    small: {
      fontSize: 14,
      fontWeight: "400" as const,
      lineHeight: 20,
      letterSpacing: 0.25,
    },
  },

  // Labels & Captions
  label: {
    large: {
      fontSize: 14,
      fontWeight: "500" as const,
      lineHeight: 20,
      letterSpacing: 0.1,
    },
    medium: {
      fontSize: 12,
      fontWeight: "500" as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
    small: {
      fontSize: 11,
      fontWeight: "500" as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
  },

  // Button Text
  button: {
    large: {
      fontSize: 16,
      fontWeight: "600" as const,
      lineHeight: 24,
      letterSpacing: 0.5,
    },
    medium: {
      fontSize: 14,
      fontWeight: "600" as const,
      lineHeight: 20,
      letterSpacing: 0.5,
    },
    small: {
      fontSize: 12,
      fontWeight: "600" as const,
      lineHeight: 16,
      letterSpacing: 0.5,
    },
  },

  // Overline (Uppercase Labels)
  overline: {
    fontSize: 10,
    fontWeight: "600" as const,
    lineHeight: 16,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },

  // Font Sizes Legacy map
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
    "2xl": 30,
    "3xl": 36,
    "4xl": 48,
    "5xl": 60,
    "6xl": 72,
    "7xl": 96,
  },

  // Font Weights Legacy map
  fontWeight: {
    light: "300" as const,
    normal: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
    extrabold: "800" as const,
  },

  // Line Heights Legacy map
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },

  // Letter Spacing Legacy
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
// ENHANCED SPACING SYSTEM
// ==========================================

export const modernSpacing = {
  // Base spacing scale (4px base)
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
  "4xl": 80,

  // Component-specific spacing
  screenPadding: 24, // Increased from 20
  cardPadding: 20, // Increased from 18
  inputPadding: 16, // Increased from 14
  buttonPadding: 16, // Increased from 14
  sectionGap: 40, // More breathing room (was 32)
  elementGap: 16, // More breathing room (was 12)
  groupGap: 10, // Was 8
};

// ==========================================
// BORDER RADIUS SYSTEM
// ==========================================

export const modernBorderRadius = {
  none: 0,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  full: 9999,

  // Component-specific
  button: 14,
  card: 20,
  input: 14,
  modal: 28,
  badge: 9999,
};

// ==========================================
// SHADOW SYSTEM (Enhanced)
// ==========================================

export const modernShadows = {
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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

  // Colored shadows for brand elements
  primary: {
    shadowColor: modernColors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  success: {
    shadowColor: modernColors.success.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },

  // Aurora Glows
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
// ANIMATION SYSTEM
// ==========================================

export const modernAnimations = {
  // Durations (ms)
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
    slower: 700,
  },

  // Easing functions
  easing: {
    linear: "linear",
    easeIn: "ease-in",
    easeOut: "ease-out",
    easeInOut: "ease-in-out",
    // React Native Reanimated easings
    spring: {
      damping: 15,
      stiffness: 300,
      mass: 1,
    },
  },

  // Common animation values
  scale: {
    pressed: 0.95,
    hover: 1.02,
    focus: 1.05,
    active: 1.05,
  },

  opacity: {
    disabled: 0.5,
    hover: 0.9,
    pressed: 0.8,
  },

  // Aurora spring config
  spring: {
    damping: 15,
    stiffness: 300,
    mass: 1,
  },
};

// ==========================================
// GLASSMORPHISM STYLES
// ==========================================

export const glassmorphism = {
  light: {
    backgroundColor: "rgba(255, 255, 255, 0.08)", // Lower opacity
    borderColor: "rgba(255, 255, 255, 0.15)", // Subtle border
    borderWidth: 1,
    backdropFilter: "blur(12px)",
  },

  medium: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    backdropFilter: "blur(16px)",
  },

  strong: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1.5,
    backdropFilter: "blur(24px)",
  },

  dark: {
    backgroundColor: "rgba(2, 6, 23, 0.4)", // Darker tint for depth
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    backdropFilter: "blur(20px)",
  },

  modal: {
    backgroundColor: "rgba(11, 17, 33, 0.85)", // Matches new premium bg
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    backdropFilter: "blur(30px)",
  },
};

// ==========================================
// LAYOUT TOKENS
// ==========================================

export const modernLayout = {
  // Safe areas
  safeArea: {
    top: Platform.OS === "ios" ? 44 : 24,
    bottom: Platform.OS === "ios" ? 34 : 0,
  },

  // Component heights
  headerHeight: 64,
  tabBarHeight: 72,
  inputHeight: 56,
  buttonHeight: {
    small: 36,
    medium: 44,
    large: 56,
  },

  // Sidebar
  sidebarWidth: 280,
  sidebarCollapsedWidth: 80,

  // Container widths
  containerMaxWidth: {
    mobile: "100%",
    tablet: 768,
    desktop: 1200,
    wide: 1440,
  },

  // Z-index scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    toast: 1080,
  },

  // Component Sizes (Merged from Aurora)
  componentSizes: {
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
  },
};

// ==========================================
// ACCESSIBILITY TOKENS
// ==========================================

export const accessibility = {
  minTouchTarget: 44, // iOS/Android minimum
  minTextSize: 14,
  maxTextSize: 24,
  focusRingWidth: 2,
  focusRingOffset: 2,
  focusRingColor: modernColors.primary[500],
  highContrast: {
    text: "#FFFFFF",
    background: "#000000",
  },
};

// ==========================================
// BREAKPOINTS (Responsive Design)
// ==========================================

export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

// ==========================================
// COMMON STYLES
// ==========================================

export const modernCommonStyles = StyleSheet.create({
  // Containers
  container: {
    flex: 1,
    backgroundColor: modernColors.background.default,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: modernColors.background.default,
  },

  scrollContent: {
    flexGrow: 1,
    padding: modernSpacing.screenPadding,
  },

  // Cards
  card: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.card,
    padding: modernSpacing.cardPadding,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    ...modernShadows.sm,
  },

  cardElevated: {
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.card,
    padding: modernSpacing.cardPadding,
    ...modernShadows.md,
  },

  cardGlass: {
    backgroundColor: modernColors.background.glass,
    borderRadius: modernBorderRadius.card,
    padding: modernSpacing.cardPadding,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },

  // Buttons
  button: {
    borderRadius: modernBorderRadius.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: modernSpacing.sm,
    minHeight: modernLayout.buttonHeight.medium,
    paddingHorizontal: modernSpacing.buttonPadding,
  },

  buttonPrimary: {
    backgroundColor: modernColors.primary[500],
  },

  buttonSecondary: {
    backgroundColor: modernColors.secondary[500],
  },

  buttonOutline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: modernColors.primary[500],
  },

  buttonGhost: {
    backgroundColor: "transparent",
  },

  // Inputs
  input: {
    height: modernLayout.inputHeight,
    backgroundColor: modernColors.background.paper,
    borderRadius: modernBorderRadius.input,
    paddingHorizontal: modernSpacing.inputPadding,
    borderWidth: 1,
    borderColor: modernColors.border.light,
    color: modernColors.text.primary,
    fontSize: modernTypography.body.medium.fontSize,
  },

  inputFocused: {
    borderColor: modernColors.border.focus,
    borderWidth: 2,
  },

  inputError: {
    borderColor: modernColors.border.error,
  },

  // Text styles
  textPrimary: {
    color: modernColors.text.primary,
    ...modernTypography.body.medium,
  },

  textSecondary: {
    color: modernColors.text.secondary,
    ...modernTypography.body.small,
  },

  textTertiary: {
    color: modernColors.text.tertiary,
    ...modernTypography.body.small,
  },

  // Spacing helpers
  gapXs: { gap: modernSpacing.xs },
  gapSm: { gap: modernSpacing.sm },
  gapMd: { gap: modernSpacing.md },
  gapLg: { gap: modernSpacing.lg },
  gapXl: { gap: modernSpacing.xl },

  // Flex helpers
  row: { flexDirection: "row" },
  column: { flexDirection: "column" },
  center: { justifyContent: "center", alignItems: "center" },
  spaceBetween: { justifyContent: "space-between" },
  spaceAround: { justifyContent: "space-around" },
  flex1: { flex: 1 },
});

// Export all as named theme object
export const theme = {
  colors: modernColors,
  typography: modernTypography,
  spacing: modernSpacing,
  borderRadius: modernBorderRadius,
  shadows: modernShadows,
  animations: modernAnimations,
  glass: glassmorphism,
  glassmorphism,
  layout: modernLayout,
  componentSizes: modernLayout.componentSizes,
  accessibility,
  breakpoints,
  commonStyles: modernCommonStyles,
};

// Aliases for theme consistency
export const modernGlass = glassmorphism;
export const modernComponentSizes = modernLayout.componentSizes;

export default theme;

