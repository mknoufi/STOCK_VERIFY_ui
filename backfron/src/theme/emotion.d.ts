import "@emotion/react";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
  modernAnimations,
  modernLayout,
} from "../styles/modernDesignSystem";

declare module "@emotion/react" {
  export interface Theme {
    colors: typeof modernColors;
    typography: typeof modernTypography;
    spacing: typeof modernSpacing;
    borderRadius: typeof modernBorderRadius;
    shadows: typeof modernShadows;
    animations: typeof modernAnimations;
    layout: typeof modernLayout;
  }
}
