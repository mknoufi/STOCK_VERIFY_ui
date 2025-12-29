/**
 * Modern Design System - Enhanced UI/UX Upgrade v3.5
 * Deep Ocean & Emerald Color Scheme
 *
 * Features:
 * - Professional Sapphire Blue primary with Emerald accents
 * - Refined typography scale for better readability
 * - Optimized spacing system for modern mobile layouts
 * - Subtle glassmorphism and depth effects
 * - High-contrast accessibility support
 */

import { StyleSheet, Platform } from "react-native";

// ==========================================
// MODERN COLOR PALETTE - DEEP OCEAN
// ==========================================

export const modernColors = {
  // Primary Brand Colors - Deep Sapphire
  primary: {
    50: "#F0F9FF",
    100: "#E0F2FE",
    200: "#BAE6FD",
    300: "#7DD3FC",
    400: "#38BDF8",
    500: "#0EA5E9", // Main primary - Sky Blue
    600: "#0284C7",
    700: "#0369A1",
    800: "#075985",
    900: "#0C4A6E",
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
  },

  error: {
    light: "#FEE2E2",
    main: "#EF4444",
    dark: "#DC2626",
    contrast: "#FFFFFF",
  },

  warning: {
    light: "#FEF9C3",
    main: "#EAB308", // Brighter yellow
    dark: "#CA8A04",
    contrast: "#18181B",
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
  },

  // Text Colors - Higher Contrast
  text: {
    primary: "#F8FAFC", // Slate 50
    secondary: "#94A3B8", // Slate 400
    tertiary: "#64748B", // Slate 500
    disabled: "#475569", // Slate 600
    inverse: "#020617", // Slate 950
    link: "#38BDF8", // Sky 400
    linkHover: "#7DD3FC", // Sky 300
  },

  // Border Colors - Subtle & Clean
  border: {
    light: "#1E293B", // Slate 800
    medium: "#334155", // Slate 700
    dark: "#475569", // Slate 600
    focus: "#0EA5E9", // Sky 500
    error: "#EF4444", // Red 500
  },

  // Semantic Colors Shorthand (for backward compatibility)
  semantic: {
    success: "#10B981",
    error: "#EF4444",
    warning: "#F59E0B",
    info: "#0EA5E9",
  },

  // Gradient Definitions - More Professional
  gradients: {
    primary: ["#0EA5E9", "#0284C7", "#0369A1"] as const, // Sky Blue spectrum
    secondary: ["#10B981", "#059669", "#047857"] as const, // Emerald spectrum
    accent: ["#6366F1", "#4F46E5", "#4338CA"] as const, // Indigo spectrum
    dark: ["#0F172A", "#020617", "#000000"] as const, // Deep background
    surface: ["#1E293B", "#0F172A", "#020617"] as const, // Surface layers
    aurora: ["#0EA5E9", "#10B981", "#6366F1"] as const, // Sky to Emerald to Indigo
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
};

// ==========================================
// ENHANCED TYPOGRAPHY
// ==========================================

export const modernTypography = {
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
  screenPadding: 20,
  cardPadding: 18,
  inputPadding: 14,
  buttonPadding: 14,
  sectionGap: 32,
  elementGap: 12,
  groupGap: 8,
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
  },

  opacity: {
    disabled: 0.5,
    hover: 0.9,
    pressed: 0.8,
  },
};

// ==========================================
// GLASSMORPHISM STYLES
// ==========================================

export const glassmorphism = {
  light: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 1,
    backdropFilter: "blur(10px)",
  },

  medium: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 1,
    backdropFilter: "blur(15px)",
  },

  dark: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    backdropFilter: "blur(20px)",
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
  glassmorphism,
  layout: modernLayout,
  accessibility,
  breakpoints,
  commonStyles: modernCommonStyles,
};

// Export all as default object
export default theme;
