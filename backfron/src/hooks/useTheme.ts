import { useColorScheme } from "react-native";
import { useSettingsStore } from "../store/settingsStore";

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const { settings } = useSettingsStore();

  // Determine effective theme based on user preference
  let effectiveTheme: "light" | "dark";
  if (settings.theme === "auto") {
    effectiveTheme = systemColorScheme === "dark" ? "dark" : "light";
  } else {
    effectiveTheme = settings.theme === "dark" ? "dark" : "light";
  }

  const isDark = effectiveTheme === "dark";

  const theme = {
    theme: effectiveTheme,
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
      // Typography presets for common use
      caption: {
        fontSize: 12,
        fontWeight: "400" as const,
        lineHeight: 1.5,
      },
      body: {
        fontSize: 14,
        fontWeight: "400" as const,
        lineHeight: 1.5,
      },
      bodySmall: {
        fontSize: 12,
        fontWeight: "400" as const,
        lineHeight: 1.4,
      },
      h1: {
        fontSize: 32,
        fontWeight: "700" as const,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: 28,
        fontWeight: "700" as const,
        lineHeight: 1.2,
      },
      h3: {
        fontSize: 24,
        fontWeight: "600" as const,
        lineHeight: 1.3,
      },
      h4: {
        fontSize: 20,
        fontWeight: "600" as const,
        lineHeight: 1.3,
      },
      h5: {
        fontSize: 18,
        fontWeight: "600" as const,
        lineHeight: 1.4,
      },
      h6: {
        fontSize: 16,
        fontWeight: "600" as const,
        lineHeight: 1.4,
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

  // Return structured theme object without flattening
  return {
    // Direct access properties for backward compatibility
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

    // Structured theme objects
    theme: effectiveTheme,
    isDark: theme.isDark,
    colors: theme.colors,
    spacing: theme.spacing,
    typography: theme.typography,
    borderRadius: theme.borderRadius,

    // User preference
    userThemePreference: settings.theme,
  };
};
