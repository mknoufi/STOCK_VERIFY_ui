import { useColorScheme } from "react-native";
import { useThemeContextSafe } from "../context/ThemeContext";

type LegacyThemeColors = {
  primary: string;
  secondary: string;
  muted: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textTokens: Record<string, string>;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  borderLight: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  surfaceDark: string;
  card: string;
  placeholder: string;
  disabled: string;
  overlayPrimary: string;
  overlay?: string;
  accent?: string;
  accentLight?: string;
  accentDark?: string;
  glass?: string;
};

export type LegacyTheme = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  textSecondary: string;
  error: string;
  success: string;
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  theme: "dark" | "light";
  isDark: boolean;
  colors: LegacyThemeColors;
  gradients: Record<string, readonly string[]>;
  spacing: Record<string, number>;
  typography: any;
  borderRadius: Record<string, number>;
  shadows: any;
  animations: any;
  componentSizes: any;
  layout: any;
  themeObject: any;
  themeMode: "dark" | "light" | "system";
  themeKey: string;
  availableThemes: any[];
  updateTheme: (value: string) => void;
  updateMode: (value: string) => void;
};

const buildLegacyTheme = (isDark: boolean): LegacyTheme => {
  const theme = {
    theme: isDark ? "dark" : "light",
    isDark,
    colors: {
      primary: "#007bff",
      secondary: "#6c757d",
      background: isDark ? "#121212" : "#ffffff",
      surface: isDark ? "#1e1e1e" : "#f8f9fa",
      surfaceElevated: isDark ? "#2a2a2a" : "#ffffff",
      text: {
        primary: isDark ? "#ffffff" : "#212529",
        secondary: isDark ? "#cccccc" : "#6c757d",
      },
      border: isDark ? "#333333" : "#dee2e6",
      borderLight: isDark ? "#444444" : "#e9ecef",
      error: "#dc3545",
      success: "#28a745",
      warning: "#ffc107",
      info: "#17a2b8",
      surfaceDark: isDark ? "#1e1e1e" : "#343a40",
      card: isDark ? "#1e1e1e" : "#ffffff",
      placeholder: isDark ? "#666666" : "#999999",
      disabled: isDark ? "#555555" : "#cccccc",
      overlayPrimary: isDark
        ? "rgba(13, 110, 253, 0.1)"
        : "rgba(0, 123, 255, 0.1)",
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      base: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    typography: {
      fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 20,
        xxl: 24,
      },
      fontWeight: {
        normal: "normal" as const,
        medium: "500" as const,
        semibold: "600" as const,
        bold: "bold" as const,
      },
      lineHeight: {
        tight: 1.2,
        normal: 1.5,
        relaxed: 1.8,
      },
      body: {
        large: { fontSize: 16, fontWeight: "400" as const, lineHeight: 1.5 },
        medium: { fontSize: 14, fontWeight: "400" as const, lineHeight: 1.5 },
        small: { fontSize: 12, fontWeight: "400" as const, lineHeight: 1.4 },
      },
      button: {
        large: { fontSize: 16, fontWeight: "600" as const, lineHeight: 1.2 },
        medium: { fontSize: 14, fontWeight: "600" as const, lineHeight: 1.2 },
        small: { fontSize: 12, fontWeight: "600" as const, lineHeight: 1.2 },
      },
      caption: {
        large: { fontSize: 14, fontWeight: "400" as const, lineHeight: 1.4 },
        medium: { fontSize: 12, fontWeight: "400" as const, lineHeight: 1.4 },
        small: { fontSize: 11, fontWeight: "400" as const, lineHeight: 1.4 },
      },
    },
    borderRadius: {
      sm: 4,
      md: 8,
      lg: 12,
      xl: 16,
      round: 50,
    },
  };

  return {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    background: theme.colors.background,
    text: theme.colors.text.primary,
    textSecondary: theme.colors.text.secondary,
    error: theme.colors.error,
    success: theme.colors.success,

    xs: theme.spacing.xs,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,

    theme: isDark ? "dark" : "light",
    isDark: theme.isDark,
    colors: {
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      muted: theme.colors.text.secondary,
      background: theme.colors.background,
      surface: theme.colors.surface,
      surfaceElevated: theme.colors.surfaceElevated,
      text: theme.colors.text.primary,
      textTokens: {
        primary: theme.colors.text.primary,
        secondary: theme.colors.text.secondary,
        tertiary: theme.colors.text.secondary,
        muted: theme.colors.text.secondary,
        disabled: theme.colors.disabled,
        inverse: theme.colors.background,
        link: theme.colors.primary,
        linkHover: theme.colors.primary,
      },
      textPrimary: theme.colors.text.primary,
      textSecondary: theme.colors.text.secondary,
      textTertiary: theme.colors.text.secondary,
      border: theme.colors.border,
      borderLight: theme.colors.borderLight,
      error: theme.colors.error,
      success: theme.colors.success,
      warning: theme.colors.warning,
      info: theme.colors.info,
      surfaceDark: theme.colors.surfaceDark,
      card: theme.colors.card,
      placeholder: theme.colors.placeholder,
      disabled: theme.colors.disabled,
      overlayPrimary: theme.colors.overlayPrimary,
    },
    gradients: {
      primary: [
        theme.colors.primary,
        theme.colors.primary,
        theme.colors.primary,
      ],
      accent: [theme.colors.primary, theme.colors.primary],
      surface: [theme.colors.surface, theme.colors.background],
      success: [theme.colors.success, theme.colors.success],
      danger: [theme.colors.error, theme.colors.error],
      aurora: [
        theme.colors.primary,
        theme.colors.secondary,
        theme.colors.primary,
      ],
      auroraPrimary: [
        theme.colors.primary,
        theme.colors.secondary,
        theme.colors.primary,
      ],
      auroraSecondary: [
        theme.colors.secondary,
        theme.colors.primary,
        theme.colors.secondary,
      ],
      auroraSuccess: [
        theme.colors.success,
        theme.colors.success,
        theme.colors.success,
      ],
      auroraWarm: [
        theme.colors.warning,
        theme.colors.error,
        theme.colors.primary,
      ],
      auroraDark: [
        theme.colors.surfaceDark,
        theme.colors.surface,
        theme.colors.background,
      ],
    },
    spacing: theme.spacing,
    typography: theme.typography,
    borderRadius: theme.borderRadius,
    shadows: {} as any,
    animations: {} as any,
    componentSizes: {} as any,
    layout: {} as any,
    themeObject: {} as any,
    themeMode: isDark ? "dark" : "light",
    themeKey: (theme.theme === "dark" ? "dark" : "light") as any,
    availableThemes: [] as any,
    updateTheme: (_value: string) => {},
    updateMode: (_value: string) => {},
  };
};

export const useTheme = (): LegacyTheme => {
  const colorScheme = useColorScheme();
  const ctx = useThemeContextSafe();

  if (!ctx) {
    return buildLegacyTheme(colorScheme === "dark");
  }

  const legacy = ctx.themeLegacy;

  return {
    primary: legacy.colors.primary,
    secondary: legacy.colors.secondary,
    background: legacy.colors.background,
    text: legacy.colors.text,
    textSecondary: legacy.colors.textSecondary,
    error: legacy.colors.error,
    success: legacy.colors.success,

    xs: legacy.spacing.xs,
    sm: legacy.spacing.sm,
    md: legacy.spacing.md,
    lg: legacy.spacing.lg,
    xl: legacy.spacing.xl,

    theme: legacy.theme,
    isDark: legacy.isDark,
    colors: legacy.colors,
    gradients: legacy.gradients,
    spacing: legacy.spacing,
    typography: legacy.typography,
    borderRadius: legacy.borderRadius,
    shadows: legacy.shadows,
    animations: legacy.animations,
    componentSizes: legacy.componentSizes,
    layout: legacy.layout,
    themeObject: ctx.theme,
    themeMode: ctx.themeMode,
    themeKey: ctx.themeKey,
    availableThemes: ctx.availableThemes,
    updateTheme: (value: string) => ctx.setThemeKey(value as any),
    updateMode: (value: string) => ctx.setThemeMode(value as any),
  };
};
