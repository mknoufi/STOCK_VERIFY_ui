/**
 * Typography System
 * Comprehensive typography styles and text components
 * Based on Material Design 3 typography scale
 */

import { TextStyle } from 'react-native';
import { typography } from './designTokens';

// ==========================================
// TEXT STYLES
// ==========================================

export interface TextStyles {
  // Headings
  h1: TextStyle;
  h2: TextStyle;
  h3: TextStyle;
  h4: TextStyle;
  h5: TextStyle;
  h6: TextStyle;

  // Body text
  body: TextStyle;
  bodyLarge: TextStyle;
  bodySmall: TextStyle;

  // Labels & Captions
  label: TextStyle;
  labelLarge: TextStyle;
  labelSmall: TextStyle;
  caption: TextStyle;

  // Special
  button: TextStyle;
  overline: TextStyle;
}

/**
 * Generate text styles for a theme
 */
export const createTextStyles = (
  textColor: string,
  textSecondary: string,
  textTertiary: string
): TextStyles => {
  return {
    // Headings
    h1: {
      fontSize: typography.fontSize['4xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
      color: textColor,
    },
    h2: {
      fontSize: typography.fontSize['3xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight,
      letterSpacing: typography.letterSpacing.tight,
      color: textColor,
    },
    h3: {
      fontSize: typography.fontSize['2xl'],
      fontWeight: typography.fontWeight.bold,
      lineHeight: typography.fontSize['2xl'] * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
      color: textColor,
    },
    h4: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.xl * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
      color: textColor,
    },
    h5: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
      color: textColor,
    },
    h6: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.md * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
      color: textColor,
    },

    // Body text
    body: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
      letterSpacing: typography.letterSpacing.normal,
      color: textColor,
    },
    bodyLarge: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.fontSize.md * typography.lineHeight.relaxed,
      letterSpacing: typography.letterSpacing.normal,
      color: textColor,
    },
    bodySmall: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
      letterSpacing: typography.letterSpacing.normal,
      color: textColor,
    },

    // Labels
    label: {
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
      color: textSecondary,
    },
    labelLarge: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.base * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
      color: textSecondary,
    },
    labelSmall: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wider,
      color: textSecondary,
    },

    // Caption
    caption: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.normal,
      lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.normal,
      color: textTertiary,
    },

    // Button text
    button: {
      fontSize: typography.fontSize.base,
      fontWeight: typography.fontWeight.semibold,
      lineHeight: typography.fontSize.base * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'uppercase' as const,
    },

    // Overline (small uppercase text)
    overline: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
      lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
      letterSpacing: typography.letterSpacing.widest,
      textTransform: 'uppercase' as const,
      color: textSecondary,
    },
  };
};

// ==========================================
// TEXT UTILITIES
// ==========================================

/**
 * Get font size from typography scale
 */
export const getFontSize = (size: keyof typeof typography.fontSize): number => {
  return typography.fontSize[size];
};

/**
 * Get font weight from typography scale
 */
export const getFontWeight = (weight: keyof typeof typography.fontWeight): string => {
  return typography.fontWeight[weight];
};

/**
 * Get line height multiplier
 */
export const getLineHeight = (multiplier: keyof typeof typography.lineHeight): number => {
  return typography.lineHeight[multiplier];
};

/**
 * Get letter spacing
 */
export const getLetterSpacing = (spacing: keyof typeof typography.letterSpacing): number => {
  return typography.letterSpacing[spacing];
};

// ==========================================
// EXPORT
// ==========================================

export default {
  createTextStyles,
  getFontSize,
  getFontWeight,
  getLineHeight,
  getLetterSpacing,
};
