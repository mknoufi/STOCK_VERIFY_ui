export type Theme = 'light' | 'dark' | 'system';
export type ThemeColors = Record<string, string>;

export const lightTheme: ThemeColors = {
  background: '#ffffff',
  surface: '#f8f9fa',
  text: '#212529',
  primary: '#007bff',
  secondary: '#6c757d',
};

export const darkTheme: ThemeColors = {
  background: '#121212',
  surface: '#1e1e1e',
  text: '#ffffff',
  primary: '#0d6efd',
  secondary: '#6c757d',
};

export class ThemeService {
  private static currentTheme: Theme = 'system';
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
    this.listeners.forEach(listener => listener(themeObj));
  }

  static subscribe(listener: (theme: any) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  static getThemeColors(theme: Theme): ThemeColors {
    switch (theme) {
      case 'dark':
        return darkTheme;
      case 'light':
      default:
        return lightTheme;
    }
  }
}
