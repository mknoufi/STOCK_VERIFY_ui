import { modernColors } from "../styles/modernDesignSystem";

export type Theme = "light" | "dark" | "system";
export type ThemeColors = Record<string, string>;

export const lightTheme: ThemeColors = {
  background: modernColors.neutral[50],
  surface: "#ffffff",
  surfaceDark: modernColors.neutral[100],
  text: modernColors.neutral[900],
  textSecondary: modernColors.neutral[500],
  textTertiary: modernColors.neutral[400],
  primary: modernColors.primary[500],
  secondary: modernColors.secondary[500],
  success: modernColors.success.main,
  error: modernColors.error.main,
  warning: modernColors.warning.main,
  info: modernColors.info.main,
  border: modernColors.neutral[200],
  overlayPrimary: "rgba(59, 130, 246, 0.1)",
};

export const darkTheme: ThemeColors = {
  background: modernColors.background.default,
  surface: modernColors.background.paper,
  surfaceDark: modernColors.background.elevated,
  text: modernColors.text.primary,
  textSecondary: modernColors.text.secondary,
  textTertiary: modernColors.text.tertiary,
  primary: modernColors.primary[500],
  secondary: modernColors.secondary[500],
  success: modernColors.success.main,
  error: modernColors.error.main,
  warning: modernColors.warning.main,
  info: modernColors.info.main,
  border: modernColors.border.light,
  overlayPrimary: "rgba(59, 130, 246, 0.1)",
};

export class ThemeService {
  private static currentTheme: Theme = "system";
  private static listeners: ((theme: any) => void)[] = [];

  static async initialize(): Promise<void> {
    // Initialize theme settings if needed
    return Promise.resolve();
  }

  static getTheme(): any {
    // Return full theme object (colors + utils)
    // For now returning colors structure to match ErrorBoundary expectation
    // In a real app this would return the Unistyles theme object
    const colors = this.getThemeColors(this.currentTheme);
    return { colors };
  }

  static setTheme(theme: Theme) {
    this.currentTheme = theme;
    const themeObj = this.getTheme();
    this.listeners.forEach((listener) => listener(themeObj));
  }

  static subscribe(listener: (theme: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  static getThemeColors(theme: Theme): ThemeColors {
    switch (theme) {
      case "dark":
        return darkTheme;
      case "light":
      default:
        return lightTheme;
    }
  }
}
