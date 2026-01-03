/**
 * Unified Theme System - Main Export
 * Single import for all design tokens and utilities
 *
 * Usage:
 * import { colors, spacing, radius, textStyles, shadows, duration } from '@/theme/unified';
 */

// Internal imports for unified theme object
import { colors as c, semanticColors as sc, gradients as g } from './colors';
import { spacing as sp, layout as l, touchTargets as tt, hitSlop as hs } from './spacing';
import { radius as r, componentRadius as cr } from './radius';
import { fontSize as fs, fontWeight as fw, fontFamily as ff, textStyles as ts } from './typography';
import { shadows as sh, coloredShadows as csh, blurIntensity as bi } from './shadows';
import { duration as d, easing as e, animationPresets as ap, springConfigs as spc, opacity as o, zIndex as z } from './animations';

// Core design tokens - export everything from each module
export {
  colors,
  semanticColors,
  darkColors,
  gradients,
  type ColorPalette,
  type SemanticColors,
  type ColorShade,
} from './colors';

export {
  spacing,
  layout,
  touchTargets,
  hitSlop,
  type Spacing,
  type SpacingKey,
} from './spacing';

export {
  radius,
  componentRadius,
  type Radius,
  type RadiusKey,
} from './radius';

export {
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  type FontSize,
  type FontWeight,
  type TextStyleKey,
} from './typography';

export {
  shadows,
  coloredShadows,
  glass,
  blurIntensity,
  type ShadowKey,
  type Shadows,
} from './shadows';

export {
  duration,
  easing,
  animationPresets,
  springConfigs,
  opacity,
  zIndex,
  type Duration,
  type EasingKey,
  type SpringConfig,
} from './animations';

/**
 * Complete unified theme object
 * For passing to ThemeProvider or accessing all tokens at once
 */

export const unifiedTheme = {
  colors: c,
  semanticColors: sc,
  gradients: g,
  spacing: sp,
  layout: l,
  touchTargets: tt,
  hitSlop: hs,
  radius: r,
  componentRadius: cr,
  fontSize: fs,
  fontWeight: fw,
  fontFamily: ff,
  textStyles: ts,
  shadows: sh,
  coloredShadows: csh,
  blurIntensity: bi,
  duration: d,
  easing: e,
  animationPresets: ap,
  springConfigs: spc,
  opacity: o,
  zIndex: z,
} as const;

export type UnifiedTheme = typeof unifiedTheme;
