/**
 * Unified Shadow System
 * Consistent elevation and depth across components
 *
 * Uses both React Native shadows and Android elevation
 */

import { Platform, ViewStyle } from "react-native";
import { colors } from "./colors";

// ==========================================
// SHADOW DEFINITIONS
// ==========================================
export const shadows = {
  /** No shadow */
  none: {
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,

  /** Subtle shadow - borders, dividers */
  xs: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,

  /** Small shadow - cards, buttons */
  sm: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  } as ViewStyle,

  /** Medium shadow - floating elements */
  md: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  /** Large shadow - modals, dropdowns */
  lg: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,

  /** Extra large shadow - popovers, tooltips */
  xl: {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  } as ViewStyle,

  /** Maximum shadow - full-screen overlays */
  "2xl": {
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  } as ViewStyle,
} as const;

// ==========================================
// COLORED SHADOWS (for accent elements)
// ==========================================
export const coloredShadows = {
  primary: {
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  success: {
    shadowColor: colors.success[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,

  error: {
    shadowColor: colors.error[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
} as const;

// ==========================================
// GLASSMORPHISM STYLES
// ==========================================
export const glass = {
  /** Light glass effect */
  light: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    ...Platform.select({
      ios: {
        // Use BlurView for actual blur on iOS
      },
      android: {
        // Android doesn't support blur well, use solid fallback
        backgroundColor: "rgba(255, 255, 255, 0.9)",
      },
    }),
  } as ViewStyle,

  /** Dark glass effect */
  dark: {
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    ...Platform.select({
      ios: {},
      android: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
      },
    }),
  } as ViewStyle,
} as const;

// ==========================================
// BLUR INTENSITY PRESETS
// ==========================================
export const blurIntensity = {
  light: 20,
  medium: 50,
  heavy: 80,
} as const;

// Type exports
export type ShadowKey = keyof typeof shadows;
export type Shadows = typeof shadows;
