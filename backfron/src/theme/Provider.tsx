import React from "react";
import { ThemeProvider as EmotionThemeProvider } from "@emotion/react";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
  modernAnimations,
  modernLayout,
} from "../styles/modernDesignSystem";

const theme = {
  colors: modernColors,
  typography: modernTypography,
  spacing: modernSpacing,
  borderRadius: modernBorderRadius,
  shadows: modernShadows,
  animations: modernAnimations,
  layout: modernLayout,
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <EmotionThemeProvider theme={theme}>{children}</EmotionThemeProvider>;
};
