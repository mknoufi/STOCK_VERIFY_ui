import { useColorScheme } from "react-native";
import { useThemeContextSafe } from "../theme/ThemeContext";

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "").trim();
  const isValid = /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized);
  if (!isValid) return hex;

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
};

const buildLegacyTheme = (isDark: boolean) => {
  const theme = {
    theme: isDark ? "dark" : "light",
    isDark,
    colors: {
      primary: "#007bff",
      secondary: "#6c757d",
      background: isDark ? "#121212" : "#ffffff",
      surface: isDark ? "#1e1e1e" : "#f8f9fa",
      text: isDark ? "#ffffff" : "#212529",
      textSecondary: isDark ? "#cccccc" : "#6c757d",
      textPrimary: isDark ? "#ffffff" : "#212529",
      textTertiary: isDark ? "#888888" : "#6c757d",
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
      caption: { fontSize: 12, fontWeight: "400" as const, lineHeight: 1.5 },
      body: { fontSize: 14, fontWeight: "400" as const, lineHeight: 1.5 },
      bodySmall: {
        fontSize: 12,
        fontWeight: "400" as const,
        lineHeight: 1.4,
      },
      h1: { fontSize: 32, fontWeight: "700" as const, lineHeight: 1.2 },
      h2: { fontSize: 28, fontWeight: "700" as const, lineHeight: 1.2 },
      h3: { fontSize: 24, fontWeight: "600" as const, lineHeight: 1.3 },
      h4: { fontSize: 20, fontWeight: "600" as const, lineHeight: 1.3 },
      h5: { fontSize: 18, fontWeight: "600" as const, lineHeight: 1.4 },
      h6: { fontSize: 16, fontWeight: "600" as const, lineHeight: 1.4 },
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
    text: theme.colors.text,
    textSecondary: theme.colors.textSecondary,
    error: theme.colors.error,
    success: theme.colors.success,

    xs: theme.spacing.xs,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl,

    theme: theme.theme,
    isDark: theme.isDark,
    colors: theme.colors,
    spacing: theme.spacing,
    typography: theme.typography,
    borderRadius: theme.borderRadius,
  };
};

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const ctx = useThemeContextSafe();

  if (!ctx) {
    return buildLegacyTheme(colorScheme === "dark");
  }

  const { theme, isDark, primaryColor, fontSize } = ctx;
  const resolvedPrimary = primaryColor || theme.colors.accent;

  const normalized = {
    theme: isDark ? "dark" : "light",
    isDark,
    colors: {
      primary: resolvedPrimary,
      secondary: theme.colors.muted,
      background: theme.colors.background,
      surface: theme.colors.surface,
      text: theme.colors.text,
      textSecondary: theme.colors.textSecondary,
      textPrimary: theme.colors.text,
      textTertiary: theme.colors.muted,
      border: theme.colors.border,
      borderLight: theme.colors.borderLight,
      error: theme.colors.danger,
      success: theme.colors.success,
      warning: theme.colors.warning,
      info: theme.colors.info,
      surfaceDark: theme.colors.surfaceElevated,
      card: theme.colors.surface,
      placeholder: theme.colors.muted,
      disabled: theme.colors.muted,
      overlayPrimary: hexToRgba(resolvedPrimary, isDark ? 0.16 : 0.12),
      overlay: theme.colors.overlay,
      accent: theme.colors.accent,
      accentLight: theme.colors.accentLight,
      accentDark: theme.colors.accentDark,
      glass: theme.colors.glass,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    typography: {
      fontSize: {
        xs: Math.max(11, Math.round(fontSize * 0.75)),
        sm: Math.max(12, Math.round(fontSize * 0.875)),
        md: fontSize,
        lg: Math.round(fontSize * 1.125),
        xl: Math.round(fontSize * 1.25),
        xxl: Math.round(fontSize * 1.5),
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
    primary: normalized.colors.primary,
    secondary: normalized.colors.secondary,
    background: normalized.colors.background,
    text: normalized.colors.text,
    textSecondary: normalized.colors.textSecondary,
    error: normalized.colors.error,
    success: normalized.colors.success,

    xs: normalized.spacing.xs,
    sm: normalized.spacing.sm,
    md: normalized.spacing.md,
    lg: normalized.spacing.lg,
    xl: normalized.spacing.xl,

    theme: normalized.theme,
    isDark: normalized.isDark,
    colors: normalized.colors,
    spacing: normalized.spacing,
    typography: normalized.typography,
    borderRadius: normalized.borderRadius,
  };
};
