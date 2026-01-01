/**
 * Unified Theme System - Main Export
 * Single import for all design tokens and utilities
 *
 * Usage:
 * import { colors, spacing, radius, textStyles, shadows, duration } from '@/theme/unified';
 */

import { colors, gradients, semanticColors } from "./colors";
import { spacing, layout, touchTargets, hitSlop } from "./spacing";
import { radius, componentRadius } from "./radius";
import { fontSize, fontWeight, textStyles, fontFamily } from "./typography";
import { shadows, coloredShadows, blurIntensity } from "./shadows";
import {
  duration,
  easing,
  animationPresets,
  springConfigs,
  opacity,
  zIndex,
} from "./animations";

// Core design tokens
export * from "./colors";
export * from "./spacing";
export * from "./radius";
export * from "./typography";
export * from "./shadows";
export * from "./animations";

/**
 * Complete unified theme object
 * For passing to ThemeProvider or accessing all tokens at once
 */
export const unifiedTheme = {
  colors,
  semanticColors,
  gradients,
  spacing,
  layout,
  touchTargets,
  hitSlop,
  radius,
  componentRadius,
  fontSize,
  fontWeight,
  fontFamily,
  textStyles,
  shadows,
  coloredShadows,
  blurIntensity,
  duration,
  easing,
  animationPresets,
  springConfigs,
  opacity,
  zIndex,
} as const;

export type UnifiedTheme = typeof unifiedTheme;
