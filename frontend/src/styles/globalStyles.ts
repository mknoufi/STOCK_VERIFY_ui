/**
 * Global Styles - Shared styles and design tokens
 * Use these constants for consistent styling across the app
 * Enhanced with dual-theme support and semantic color system
 */

import { StyleSheet, Platform } from "react-native";
import { themes } from "../theme/themes";

const defaultTheme = (themes.premium ||
  Object.values(themes)[0] ||
  themes.dark) as import("../theme/themes").AppTheme;

// Color palette - Enhanced with semantic roles
export const colors = {
  // Primary colors
  primary: defaultTheme.colors.accent || "#3B82F6",
  primaryDark: defaultTheme.colors.accentDark || "#2563EB",
  primaryLight: defaultTheme.colors.accentLight || "#60A5FA",
  primaryHover: defaultTheme.colors.accent,
  primaryPressed: defaultTheme.colors.accentDark,

  // Secondary colors
  secondary: defaultTheme.colors.info?.main || defaultTheme.colors.accent,
  secondaryDark: defaultTheme.colors.accentDark,
  secondaryLight:
    defaultTheme.colors.info?.light || defaultTheme.colors.accentLight,

  // Background colors
  backgroundDark: defaultTheme.colors.background.default,
  backgroundLight: "#F8FAFC",
  surfaceDark: defaultTheme.colors.background.paper,
  surfaceLight: "#FFFFFF",
  surfaceElevated: defaultTheme.colors.background.elevated,

  // Text colors
  textPrimary: defaultTheme.colors.text.primary,
  textSecondary: defaultTheme.colors.text.secondary,
  textTertiary: defaultTheme.colors.text.muted,
  textDisabled: defaultTheme.colors.text.disabled,
  textInverse: defaultTheme.colors.text.inverse,

  // Border colors
  borderLight: defaultTheme.colors.border.light,
  borderMedium: defaultTheme.colors.border.medium,
  borderDark: defaultTheme.colors.border.strong,
  borderFocus: defaultTheme.colors.accent,

  // Status colors with variants
  success: defaultTheme.colors.success.main,
  successLight: defaultTheme.colors.success.light,
  successDark: defaultTheme.colors.success.dark,
  error: defaultTheme.colors.error.main,
  errorLight: defaultTheme.colors.error.light,
  errorDark: defaultTheme.colors.error.dark,
  warning: defaultTheme.colors.warning.main,
  warningLight: defaultTheme.colors.warning.light,
  warningDark: defaultTheme.colors.warning.dark,
  info: defaultTheme.colors.info.main,
  infoLight: defaultTheme.colors.info.light,
  infoDark: defaultTheme.colors.info.light,

  // Transparent overlays
  overlay: defaultTheme.colors.background.overlay,
  overlayLight: "rgba(15, 23, 42, 0.5)",
  overlayDark: "rgba(3, 7, 18, 0.9)",
  overlayPrimary: "rgba(99, 102, 241, 0.1)",
};

// Gradients
export const gradients = {
  primary: ["#0EA5E9", "#0284C7"] as const,
  secondary: ["#10B981", "#059669"] as const,
  accent: ["#6366F1", "#4F46E5"] as const,
  dark: ["#0F172A", "#020617"] as const,
  surface: ["#1E293B", "#0F172A"] as const,
};

// Glassmorphism styles (helper for non-BlurView components)
export const glassStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderColor: "rgba(255, 255, 255, 0.1)",
  borderWidth: 1,
};

// Spacing - Enhanced scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  // Specific use-case spacing
  sectionGap: 40, // For consistent section spacing (xxl - 8)
  actionGap: 12, // For action button gaps (sm + 4)
  screenPadding: 24, // Default screen padding
  cardPadding: 16, // Default card padding
  inputPadding: 12, // Default input padding
};

// Typography - Enhanced with weights and line heights
export const typography = {
  hero: {
    fontSize: 36,
    fontWeight: "bold" as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  h1: {
    fontSize: 32,
    fontWeight: "bold" as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: "bold" as const,
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
  body: {
    fontSize: 16,
    fontWeight: "normal" as const,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: "normal" as const,
    lineHeight: 22,
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: "normal" as const,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
  caption: {
    fontSize: 12,
    fontWeight: "normal" as const,
    lineHeight: 16,
    letterSpacing: 0.4,
  },
  overline: {
    fontSize: 10,
    fontWeight: "600" as const,
    lineHeight: 14,
    letterSpacing: 1.5,
    textTransform: "uppercase" as const,
  },
  button: {
    fontSize: 16,
    fontWeight: "600" as const,
    lineHeight: 20,
    letterSpacing: 0.5,
  },
  buttonLarge: {
    fontSize: 18,
    fontWeight: "bold" as const,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
};

// Border radius
export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  round: 999,
};

// Shadows (for iOS)
export const shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Common component styles
export const commonStyles = StyleSheet.create({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.backgroundDark,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },

  // Card styles
  card: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardElevated: {
    backgroundColor: colors.surfaceDark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.medium,
  },

  // Input styles
  input: {
    height: 56,
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // Button styles
  button: {
    height: 56,
    borderRadius: borderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  buttonTextSecondary: {
    ...typography.button,
    color: colors.primary,
  },

  // Text styles
  textPrimary: {
    color: colors.textPrimary,
  },
  textSecondary: {
    color: colors.textSecondary,
  },
  textTertiary: {
    color: colors.textTertiary,
  },

  // Icon styles
  icon: {
    marginRight: spacing.sm,
  },

  // Spacing helpers
  mt8: { marginTop: spacing.sm },
  mt16: { marginTop: spacing.md },
  mt24: { marginTop: spacing.lg },
  mb8: { marginBottom: spacing.sm },
  mb16: { marginBottom: spacing.md },
  mb24: { marginBottom: spacing.lg },
  mx16: { marginHorizontal: spacing.md },
  my16: { marginVertical: spacing.md },
  p16: { padding: spacing.md },
  p24: { padding: spacing.lg },
});

// Animation durations
export const animations = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Breakpoints (for responsive design)
export const breakpoints = {
  mobile: 375,
  tablet: 768,
  desktop: 1024,
  wide: 1440,
};

// Elevation levels (for depth/shadow)
export const elevation = {
  none: 0,
  low: 2,
  medium: 4,
  high: 8,
  highest: 16,
};

// Layout tokens
export const layout = {
  safeAreaTop: Platform.OS === "ios" ? 44 : 24,
  safeAreaBottom: Platform.OS === "ios" ? 34 : 0,
  tabBarHeight: 60,
  sidebarWidth: 280,
  sidebarCollapsedWidth: 64,
  headerHeight: 56,
  containerMaxWidth: {
    mobile: "100%",
    tablet: 768,
    desktop: 1200,
  },
  sectionGap: spacing.xxl, // 48px
  screenPadding: spacing.lg, // 24px
};

// Accessibility tokens
export const accessibility = {
  focusRingWidth: 2,
  focusRingOffset: 2,
  minTouchTarget: 44, // iOS/Android minimum
  minTextSize: 14, // Minimum readable text
  maxTextSize: 24, // Maximum before layout breaks
};

// Scanner tokens
export const scanner = {
  frameColor: colors.primary,
  frameWidth: 2,
  cornerSize: 20,
  overlayOpacity: 0.7,
  feedbackDuration: 2000, // ms
  scanDebounceMs: 500,
};

// Offline/Queue tokens
export const offline = {
  queueBarHeight: 48,
  drawerMaxHeight: "60%",
  statusColors: {
    pending: colors.warning,
    syncing: colors.info,
    success: colors.success,
    failed: colors.error,
  },
};

// Onboarding tokens
export const onboarding = {
  overlayOpacity: 0.9,
  spotlightRadius: 8,
  tooltipMaxWidth: 280,
  animationDuration: 300,
};
