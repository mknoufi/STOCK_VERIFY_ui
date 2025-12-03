/**
 * Enhanced Color System
 * WCAG AA/AAA compliant color system with semantic tokens
 * Based on Material Design 3 color system
 */

import { lightTheme, darkTheme, ThemeColors } from '../services/themeService';

// ==========================================
// SEMANTIC COLOR TOKENS
// ==========================================

export interface SemanticColors {
  // Primary actions
  primary: string;
  primaryHover: string;
  primaryActive: string;
  primaryDisabled: string;

  // Secondary actions
  secondary: string;
  secondaryHover: string;
  secondaryActive: string;

  // Status colors
  success: string;
  successLight: string;
  successDark: string;

  error: string;
  errorLight: string;
  errorDark: string;

  warning: string;
  warningLight: string;
  warningDark: string;

  info: string;
  infoLight: string;
  infoDark: string;

  // Neutral colors
  background: string;
  surface: string;
  surfaceVariant: string;

  // Text colors
  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string;
  textInverse: string;

  // Border colors
  border: string;
  borderLight: string;
  borderDark: string;

  // Overlay colors
  overlay: string;
  overlayLight: string;
  overlayDark: string;
}

// ==========================================
// COLOR UTILITIES
// ==========================================

/**
 * Calculate contrast ratio between two colors
 * WCAG AA: 4.5:1 for normal text, 3:1 for large text
 * WCAG AAA: 7:1 for normal text, 4.5:1 for large text
 */
export const getContrastRatio = (color1: string, color2: string): number => {
  // Simplified contrast calculation
  // For production, use a proper color contrast library
  const luminance1 = getLuminance(color1);
  const luminance2 = getLuminance(color2);

  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * Get relative luminance of a color (0-1)
 */
const getLuminance = (color: string): number => {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const [rLinear = 0, gLinear = 0, bLinear = 0] = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
};

/**
 * Check if color meets WCAG AA contrast requirements
 */
export const meetsWCAGAA = (
  foreground: string,
  background: string,
  isLargeText = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Check if color meets WCAG AAA contrast requirements
 */
export const meetsWCAGAAA = (
  foreground: string,
  background: string,
  isLargeText = false
): boolean => {
  const ratio = getContrastRatio(foreground, background);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
};

/**
 * Generate semantic colors from base theme
 */
export const generateSemanticColors = (baseColors: ThemeColors): SemanticColors => {
  // Helper to safely get color with fallback
  const getColor = (key: string, fallback: string): string => baseColors[key] ?? fallback;

  const primary = getColor('primary', '#007bff');
  const secondary = getColor('secondary', '#6c757d');
  const success = getColor('success', '#28a745');
  const error = getColor('error', '#dc3545');
  const warning = getColor('warning', '#ffc107');
  const info = getColor('info', '#17a2b8');
  const background = getColor('background', '#ffffff');
  const surface = getColor('surface', '#f8f9fa');
  const text = getColor('text', '#212529');
  const textSecondary = getColor('textSecondary', '#6c757d');
  const border = getColor('border', '#dee2e6');

  return {
    // Primary
    primary: primary,
    primaryHover: adjustBrightness(primary, -10),
    primaryActive: adjustBrightness(primary, -20),
    primaryDisabled: adjustOpacity(primary, 0.5),

    // Secondary
    secondary: secondary,
    secondaryHover: adjustBrightness(secondary, -10),
    secondaryActive: adjustBrightness(secondary, -20),

    // Success
    success: success,
    successLight: adjustBrightness(success, 20),
    successDark: adjustBrightness(success, -20),

    // Error
    error: error,
    errorLight: adjustBrightness(error, 20),
    errorDark: adjustBrightness(error, -20),

    // Warning
    warning: warning,
    warningLight: adjustBrightness(warning, 20),
    warningDark: adjustBrightness(warning, -20),

    // Info
    info: info,
    infoLight: adjustBrightness(info, 20),
    infoDark: adjustBrightness(info, -20),

    // Background & Surface
    background: background,
    surface: surface,
    surfaceVariant: getColor('surfaceDark', surface),

    // Text
    text: text,
    textSecondary: textSecondary,
    textTertiary: getColor('textTertiary', textSecondary),
    textDisabled: adjustOpacity(text, 0.38),
    textInverse: background,

    // Border
    border: border,
    borderLight: adjustOpacity(border, 0.5),
    borderDark: adjustBrightness(border, -20),

    // Overlay
    overlay: getColor('overlayPrimary', adjustOpacity(primary, 0.1)),
    overlayLight: adjustOpacity(primary, 0.05),
    overlayDark: adjustOpacity(primary, 0.2),
  };
};

/**
 * Adjust brightness of a color
 */
const adjustBrightness = (color: string, percent: number): string => {
  const hex = color.replace('#', '');
  const num = parseInt(hex, 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

/**
 * Adjust opacity of a color (returns rgba)
 */
const adjustOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// ==========================================
// EXPORT ENHANCED COLORS
// ==========================================

export const lightSemanticColors = generateSemanticColors(lightTheme);
export const darkSemanticColors = generateSemanticColors(darkTheme);
