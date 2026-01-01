/**
 * Theme System Index
 * Central export for all theme-related modules
 */

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
export type { AnimationTiming, FontSizeKey, ShadowKey } from "./uiConstants";

// Enhanced Colors
export * from "./enhancedColors";

// Typography
export * from "./typography";

// Existing theme files
export * from "./themes";
export * from "./designSystem";

// Theme Context (Provider, Hook, Types)
export * from "../context/ThemeContext";
