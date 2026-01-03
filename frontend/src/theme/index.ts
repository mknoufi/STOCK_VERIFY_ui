/**
 * Theme System Index
 * Central export for all theme-related modules
 */

// ==========================================
// UNIFIED THEME SYSTEM (NEW - Recommended)
// ==========================================
// Import from unified for new development - selective exports to avoid conflicts
export {
  colors,
  semanticColors,
  darkColors,
  gradients,
  radius,
  componentRadius,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  textStyles,
  duration,
  easing,
  animationPresets,
  springConfigs,
  opacity,
  layout,
  hitSlop,
  coloredShadows,
  glass,
  blurIntensity,
  unifiedTheme,
} from "./unified";
export type {
  ColorPalette,
  SemanticColors,
  ColorShade,
  Radius,
  RadiusKey,
  FontSize,
  FontWeight,
  TextStyleKey,
  Duration,
  EasingKey,
  SpringConfig,
  ShadowKey,
  UnifiedTheme,
} from "./unified";

// ==========================================
// LEGACY EXPORTS (For backward compatibility)
// ==========================================

// Design Tokens
export * from "./designTokens";

// UI Constants (Animations, Component Sizes) - Export selectively to avoid conflicts
export {
  AnimationTimings,
  AnimationEasings,
  ComponentSizes,
  Shadows,
  HitSlop,
  Opacity,
  BlurIntensity,
  FontSizes,
  FontWeights,
  LineHeights,
} from "./uiConstants";
export type { AnimationTiming, FontSizeKey } from "./uiConstants";
// Note: ShadowKey already exported from ./unified

// Enhanced Colors
export { lightSemanticColors, darkSemanticColors } from "./enhancedColors";

// Typography
export * from "./typography";

// Existing theme files
export * from "./themes";
export * from "./designSystem";

// Theme Context (Provider, Hook, Types)
export * from "../context/ThemeContext";
