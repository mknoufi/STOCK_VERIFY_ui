export type Theme = "light" | "dark" | "system";
export type ThemeColors = Record<string, string>;

export const lightTheme: ThemeColors = {
  background: "#ffffff",
  surface: "#f8f9fa",
  surfaceDark: "#e9ecef",
  text: "#212529",
  textSecondary: "#6c757d",
  textTertiary: "#868e96",
  primary: "#007bff",
  secondary: "#6c757d",
  success: "#28a745",
  error: "#dc3545",
  warning: "#ffc107",
  info: "#17a2b8",
  border: "#dee2e6",
  overlayPrimary: "rgba(0, 123, 255, 0.1)",
};

export const darkTheme: ThemeColors = {
  background: "#121212",
  surface: "#1e1e1e",
  surfaceDark: "#2d2d2d",
  text: "#ffffff",
  textSecondary: "#b0b0b0",
  textTertiary: "#888888",
  primary: "#0d6efd",
  secondary: "#6c757d",
  success: "#198754",
  error: "#dc3545",
  warning: "#ffc107",
  info: "#0dcaf0",
  border: "#495057",
  overlayPrimary: "rgba(13, 110, 253, 0.1)",
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
