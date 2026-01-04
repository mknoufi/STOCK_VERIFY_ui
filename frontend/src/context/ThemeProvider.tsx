/**
 * ThemeProvider Context
 * Provides theme context for the entire app with dark mode support
 *
 * Features:
 * - Automatic dark mode detection via useColorScheme
 * - Manual theme override
 * - Theme toggle
 * - Unified design tokens
 */

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
} from "react";
import { useColorScheme, ColorSchemeName } from "react-native";
import {
  colors,
  darkColors,
  semanticColors,
  gradients,
  spacing,
  radius,
  shadows,
  fontFamily,
  fontSize,
  textStyles,
  duration,
  easing,
} from "../theme/unified";

// ==========================================
// TYPES
// ==========================================
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
  primary: typeof colors.primary;
  secondary: typeof colors.secondary;
  success: typeof colors.success;
  warning: typeof colors.warning;
  error: typeof colors.error;
  info: typeof colors.info;
  neutral: typeof colors.neutral;
  background: {
    readonly default: string;
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly elevated: string;
    readonly paper: string;
    readonly card: string;
    readonly overlay: string;
  };
  text: {
    readonly primary: string;
    readonly secondary: string;
    readonly tertiary: string;
    readonly muted: string;
    readonly disabled: string;
    readonly inverse: string;
    readonly link: string;
  };
  border: {
    readonly default: string;
    readonly subtle: string;
    readonly strong: string;
    readonly focus: string;
  };
  status: typeof semanticColors.status;
}

export interface Theme {
  mode: "light" | "dark";
  colors: ThemeColors;
  gradients: typeof gradients;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  typography: {
    fontFamily: typeof fontFamily;
    fontSize: typeof fontSize;
    textStyles: typeof textStyles;
  };
  animation: {
    duration: typeof duration;
    easing: typeof easing;
  };
}

export interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

// ==========================================
// CONTEXT
// ==========================================
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ==========================================
// LIGHT THEME
// ==========================================
const lightTheme: Theme = {
  mode: "light",
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    neutral: colors.neutral,
    background: semanticColors.background,
    text: semanticColors.text,
    border: semanticColors.border,
    status: semanticColors.status,
  },
  gradients,
  spacing,
  radius,
  shadows,
  typography: {
    fontFamily,
    fontSize,
    textStyles,
  },
  animation: {
    duration,
    easing,
  },
};

// ==========================================
// DARK THEME
// ==========================================
const darkTheme: Theme = {
  mode: "dark",
  colors: {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    warning: colors.warning,
    error: colors.error,
    info: colors.info,
    neutral: colors.neutral,
    background: darkColors.background,
    text: darkColors.text,
    border: darkColors.border,
    status: semanticColors.status,
  },
  gradients,
  spacing,
  radius,
  shadows,
  typography: {
    fontFamily,
    fontSize,
    textStyles,
  },
  animation: {
    duration,
    easing,
  },
};

// ==========================================
// PROVIDER COMPONENT
// ==========================================
export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Initial theme mode (default: 'system') */
  initialMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  initialMode = "system",
}) => {
  const systemColorScheme = useColorScheme() as ColorSchemeName;
  const [themeMode, setThemeMode] = useState<ThemeMode>(initialMode);

  // Determine if dark mode is active
  const isDark = useMemo(() => {
    if (themeMode === "system") {
      return systemColorScheme === "dark";
    }
    return themeMode === "dark";
  }, [themeMode, systemColorScheme]);

  // Get the active theme
  const theme = useMemo(() => (isDark ? darkTheme : lightTheme), [isDark]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      if (prev === "system") {
        return isDark ? "light" : "dark";
      }
      return prev === "dark" ? "light" : "dark";
    });
  }, [isDark]);

  const value = useMemo(
    () => ({
      theme,
      themeMode,
      isDark,
      setThemeMode,
      toggleTheme,
    }),
    [theme, themeMode, isDark, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

// ==========================================
// HOOK
// ==========================================
export function useThemeContext(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}

// ==========================================
// LEGACY EXPORT (for backward compatibility)
// ==========================================
export const UnistylesThemeProvider = ThemeProvider;

export default ThemeProvider;
