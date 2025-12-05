/**
 * Enhanced Style Function Library
 * Advanced styling utilities for React Native with Emotion integration
 *
 * Features:
 * - Style composition and merging
 * - Responsive design helpers
 * - Animation utilities
 * - Theme-aware styling
 * - Performance optimizations
 * - Type-safe style generation
 */

import { ViewStyle, TextStyle, ImageStyle } from "react-native";
import {
  modernColors,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
  modernAnimations,
  breakpoints,
} from "./modernDesignSystem";
import { ThemeColors } from "../services/themeService";
import { useMemo } from "react";

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export type StyleObject = ViewStyle | TextStyle | ImageStyle;
export type StyleFunction<T = any> = (props: T) => StyleObject;
export type ResponsiveValue<T> = T | { [key: string]: T };
export type ThemeAwareStyle<T> = (theme: ThemeColors) => T;

// ==========================================
// CORE STYLE UTILITIES
// ==========================================

/**
 * Deep merge multiple style objects
 * @param styles Array of style objects to merge
 * @returns Merged style object
 */
export function mergeStyles(...styles: StyleObject[]): StyleObject {
  return styles.reduce((acc, style) => {
    if (!style) return acc;
    return { ...acc, ...style } as StyleObject;
  }, {} as StyleObject);
}

/**
 * Create a memoized style function
 * @param styleFn Style function to memoize
 * @returns Memoized style function
 */
export function memoizeStyleFunction<T extends object>(
  styleFn: StyleFunction<T>,
): StyleFunction<T> {
  const cache = new WeakMap<object, StyleObject>();

  return (props: T) => {
    if (!cache.has(props)) {
      cache.set(props, styleFn(props));
    }
    return cache.get(props) as StyleObject;
  };
}

/**
 * Create a theme-aware style function
 * @param styleFn Style function that receives theme
 * @returns Theme-aware style function
 */
export function createThemeAwareStyle<T>(
  styleFn: (theme: ThemeColors, props: T) => StyleObject,
): (theme: ThemeColors, props: T) => StyleObject {
  return (theme: ThemeColors, props: T) => styleFn(theme, props);
}

// ==========================================
// RESPONSIVE STYLE FUNCTIONS
// ==========================================

/**
 * Create responsive style values
 * @param responsiveValue Responsive value definition
 * @param currentBreakpoint Current screen width
 * @returns Appropriate style value for current breakpoint
 */
export function getResponsiveValue<T>(
  responsiveValue: ResponsiveValue<T>,
  currentBreakpoint: number,
): T {
  if (typeof responsiveValue !== "object" || responsiveValue === null) {
    return responsiveValue;
  }

  const breakpointsSorted = (
    Object.keys(breakpoints) as (keyof typeof breakpoints)[]
  )
    .map((key) => ({ key, value: breakpoints[key] }))
    .sort((a, b) => b.value - a.value);

  for (const { key, value } of breakpointsSorted) {
    if (currentBreakpoint >= value && (responsiveValue as any)[key]) {
      return (responsiveValue as any)[key];
    }
  }

  const rv = responsiveValue as any;
  return rv.xs || rv.sm || rv.md || rv.lg || rv.xl || (responsiveValue as T);
}

/**
 * Create responsive style function
 * @param styles Responsive style definitions
 * @returns Responsive style function
 */
export function createResponsiveStyle(styles: {
  [key: string]: StyleObject;
}): StyleFunction<{ width: number }> {
  return ({ width }) => {
    return getResponsiveValue(styles, width);
  };
}

// ==========================================
// ANIMATION STYLE FUNCTIONS
// ==========================================

/**
 * Create animation style function
 * @param animationType Type of animation
 * @param duration Animation duration
 * @returns Animation style function
 */
export function createAnimationStyle(
  animationType: "fade" | "scale" | "slide" | "rotate",
  duration: keyof typeof modernAnimations.duration = "normal",
): StyleFunction<{ progress: number }> {
  return ({ progress }) => {
    const animationDuration = modernAnimations.duration[duration];

    switch (animationType) {
      case "fade":
        return {
          opacity: progress,
          transition: `opacity ${animationDuration}ms ${modernAnimations.easing.easeInOut}`,
        };
      case "scale":
        return {
          transform: [{ scale: 1 + progress * 0.05 }],
          transition: `transform ${animationDuration}ms ${modernAnimations.easing.easeInOut}`,
        };
      case "slide":
        return {
          transform: [{ translateY: -20 * (1 - progress) }],
          opacity: progress,
          transition: `all ${animationDuration}ms ${modernAnimations.easing.easeInOut}`,
        };
      case "rotate":
        return {
          transform: [{ rotate: `${progress * 360}deg` }],
          transition: `transform ${animationDuration}ms ${modernAnimations.easing.easeInOut}`,
        };
      default:
        return {};
    }
  };
}

// ==========================================
// CONDITIONAL STYLE FUNCTIONS
// ==========================================

/**
 * Create conditional style function
 * @param conditions Object mapping conditions to styles
 * @returns Conditional style function
 */
export function createConditionalStyle<T>(
  conditions: Record<string, StyleObject>,
): StyleFunction<T> {
  return (props: T) => {
    for (const [condition, style] of Object.entries(conditions)) {
      if ((props as any)[condition]) {
        return style;
      }
    }
    return {};
  };
}

// ==========================================
// THEME STYLE FUNCTIONS
// ==========================================

/**
 * Create theme-aware color style function
 * @param colorKey Color key from theme
 * @returns Theme-aware color style function
 */
export function createThemeColorStyle(
  colorKey: keyof ThemeColors,
): StyleFunction<{ theme: ThemeColors }> {
  return ({ theme }) => ({
    color: theme[colorKey],
  });
}

/**
 * Create theme-aware background style function
 * @param colorKey Color key from theme
 * @returns Theme-aware background style function
 */
export function createThemeBackgroundStyle(
  colorKey: keyof ThemeColors,
): StyleFunction<{ theme: ThemeColors }> {
  return ({ theme }) => ({
    backgroundColor: theme[colorKey],
  });
}

// ==========================================
// COMPONENT-SPECIFIC STYLE FUNCTIONS
// ==========================================

/**
 * Create button style function
 * @param variant Button variant
 * @returns Button style function
 */
export function createButtonStyle(
  variant: "primary" | "secondary" | "outline" | "ghost" = "primary",
): StyleFunction<{ theme: ThemeColors; disabled?: boolean }> {
  return ({ theme, disabled = false }) => {
    const baseStyle: ViewStyle = {
      borderRadius: modernBorderRadius.button,
      paddingHorizontal: modernSpacing.buttonPadding,
      paddingVertical: modernSpacing.sm,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: modernSpacing.sm,
      opacity: disabled ? 0.6 : 1,
    };

    switch (variant) {
      case "primary":
        return {
          ...baseStyle,
          backgroundColor: theme.primary,
        };
      case "secondary":
        return {
          ...baseStyle,
          backgroundColor: theme.secondary,
        };
      case "outline":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: theme.primary,
        };
      case "ghost":
        return {
          ...baseStyle,
          backgroundColor: "transparent",
        };
      default:
        return baseStyle;
    }
  };
}

/**
 * Create card style function
 * @param variant Card variant
 * @returns Card style function
 */
export function createCardStyle(
  variant: "default" | "elevated" | "glass" = "default",
): StyleFunction<{ theme: ThemeColors }> {
  return ({ theme }) => {
    const baseStyle: ViewStyle = {
      borderRadius: modernBorderRadius.card,
      padding: modernSpacing.cardPadding,
      borderWidth: 1,
    };

    switch (variant) {
      case "default":
        return {
          ...baseStyle,
          backgroundColor: theme.surface,
          borderColor: theme.border,
          ...modernShadows.sm,
        };
      case "elevated":
        return {
          ...baseStyle,
          backgroundColor: theme.surface,
          borderColor: theme.border,
          ...modernShadows.md,
        };
      case "glass":
        return {
          ...baseStyle,
          backgroundColor: modernColors.background.glass,
          borderColor: "rgba(255, 255, 255, 0.1)",
        };
      default:
        return baseStyle;
    }
  };
}

// ==========================================
// HOOK-BASED STYLE FUNCTIONS
// ==========================================

/**
 * React hook for creating memoized style functions
 * @param styleFn Style function to memoize
 * @returns Memoized style function
 */
export function useStyleFunction<T extends object>(
  styleFn: StyleFunction<T>,
): StyleFunction<T> {
  return useMemo(() => memoizeStyleFunction(styleFn), [styleFn]);
}

/**
 * React hook for creating theme-aware style functions
 * @param styleFn Theme-aware style function
 * @returns Memoized theme-aware style function
 */
export function useThemeStyleFunction<T>(
  styleFn: (theme: ThemeColors, props: T) => StyleObject,
): (theme: ThemeColors, props: T) => StyleObject {
  return useMemo(() => createThemeAwareStyle(styleFn), [styleFn]);
}

// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================

export default {
  mergeStyles,
  memoizeStyleFunction,
  createThemeAwareStyle,
  getResponsiveValue,
  createResponsiveStyle,
  createAnimationStyle,
  createConditionalStyle,
  createThemeColorStyle,
  createThemeBackgroundStyle,
  createButtonStyle,
  createCardStyle,
  useStyleFunction,
  useThemeStyleFunction,
};
