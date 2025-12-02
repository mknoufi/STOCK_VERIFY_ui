/**
 * Theme Service - Theme management and customization
 * Handles light/dark mode, colors, fonts, and styling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  // Primary colors
  primary: string;
  primaryLight?: string;
  primaryDark?: string;
  secondary: string;
  secondaryLight?: string;
  secondaryDark?: string;
  
  // Background colors
  background: string;
  surface: string;
  surfaceDark?: string;
  surfaceLight?: string;
  card: string;
  
  // Text colors
  text: string;
  textSecondary: string;
  textTertiary?: string;
  textInverse?: string;
  
  // Border & divider
  border: string;
  divider?: string;
  
  // Semantic colors
  error: string;
  errorLight?: string;
  errorDark?: string;
  warning: string;
  warningLight?: string;
  warningDark?: string;
  success: string;
  successLight?: string;
  successDark?: string;
  info: string;
  infoLight?: string;
  infoDark?: string;
  
  // Accent & special
  accent: string;
  disabled: string;
  placeholder: string;
  overlayPrimary?: string; // Primary color with 10% opacity for active states
  overlay?: string; // General overlay color
}

export interface Theme {
  name: string;
  colors: ThemeColors;
  dark: boolean;
}

export const lightTheme: Theme = {
  name: 'light',
  dark: false,
  colors: {
    // Primary colors
    primary: '#2196F3',
    primaryLight: '#64B5F6',
    primaryDark: '#1976D2',
    secondary: '#03DAC6',
    secondaryLight: '#4DD0E1',
    secondaryDark: '#00ACC1',
    
    // Background colors
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceDark: '#E0E0E0',
    surfaceLight: '#FAFAFA',
    card: '#FFFFFF',
    
    // Text colors
    text: '#212121',
    textSecondary: '#757575',
    textTertiary: '#9E9E9E',
    textInverse: '#FFFFFF',
    
    // Border & divider
    border: '#E0E0E0',
    divider: '#BDBDBD',
    
    // Semantic colors
    error: '#F44336',
    errorLight: '#EF5350',
    errorDark: '#D32F2F',
    warning: '#FF9800',
    warningLight: '#FFB74D',
    warningDark: '#F57C00',
    success: '#4CAF50',
    successLight: '#66BB6A',
    successDark: '#388E3C',
    info: '#2196F3',
    infoLight: '#42A5F5',
    infoDark: '#1976D2',
    
    // Accent & special
    accent: '#FF4081',
    disabled: '#BDBDBD',
    placeholder: '#9E9E9E',
    overlayPrimary: 'rgba(33, 150, 243, 0.1)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
};

export const darkTheme: Theme = {
  name: 'dark',
  dark: true,
  colors: {
    // Primary colors
    primary: '#3B82F6',    // Blue 500
    primaryLight: '#60A5FA', // Blue 400
    primaryDark: '#2563EB', // Blue 600
    secondary: '#10B981',  // Emerald 500
    secondaryLight: '#34D399', // Emerald 400
    secondaryDark: '#059669', // Emerald 600
    
    // Background colors
    background: '#0F172A', // Slate 900
    surface: '#1E293B',    // Slate 800
    surfaceDark: '#020617', // Slate 950
    surfaceLight: '#334155', // Slate 700
    card: '#1E293B',       // Slate 800
    
    // Text colors
    text: '#F8FAFC',       // Slate 50
    textSecondary: '#94A3B8', // Slate 400
    textTertiary: '#64748B',  // Slate 500
    textInverse: '#0F172A', // Slate 900
    
    // Border & divider
    border: '#334155',     // Slate 700
    divider: '#475569',     // Slate 600
    
    // Semantic colors
    error: '#EF4444',      // Red 500
    errorLight: '#F87171', // Red 400
    errorDark: '#DC2626',  // Red 600
    warning: '#F59E0B',    // Amber 500
    warningLight: '#FBBF24', // Amber 400
    warningDark: '#D97706', // Amber 600
    success: '#10B981',    // Emerald 500
    successLight: '#34D399', // Emerald 400
    successDark: '#059669', // Emerald 600
    info: '#3B82F6',       // Blue 500
    infoLight: '#60A5FA',  // Blue 400
    infoDark: '#2563EB',   // Blue 600
    
    // Accent & special
    accent: '#8B5CF6',     // Violet 500
    disabled: '#475569',   // Slate 600
    placeholder: '#64748B', // Slate 500
    overlayPrimary: 'rgba(59, 130, 246, 0.1)',
    overlay: 'rgba(15, 23, 42, 0.8)', // Slate 900 with opacity
  },
};

// Note: ThemeService defaults to darkTheme in class initialization
// This line is removed as currentTheme is private

const THEME_STORAGE_KEY = 'app_theme';

/**
 * Theme Service
 */
export class ThemeService {
  // Default to dark theme for backward compatibility with existing app
  private static currentTheme: Theme = darkTheme;
  private static listeners: Set<(theme: Theme) => void> = new Set();

  /**
   * Initialize theme from storage
   */
  static async initialize(): Promise<Theme> {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const themeData = JSON.parse(savedTheme);
        this.currentTheme = themeData.dark ? darkTheme : lightTheme;
      } else {
        // Default to dark theme for backward compatibility
        this.currentTheme = darkTheme;
      }
    } catch (error) {
      console.error('Error loading theme:', error);
      // Fallback to dark theme on error
      this.currentTheme = darkTheme;
    }

    return this.currentTheme;
  }

  /**
   * Get current theme
   */
  static getTheme(): Theme {
    return this.currentTheme;
  }

  /**
   * Set theme
   */
  static async setTheme(theme: Theme): Promise<void> {
    try {
      this.currentTheme = theme;
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ dark: theme.dark }));
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }

  /**
   * Toggle dark/light mode
   */
  static async toggleTheme(): Promise<void> {
    const newTheme = this.currentTheme.dark ? lightTheme : darkTheme;
    await this.setTheme(newTheme);
  }

  /**
   * Set dark mode
   */
  static async setDarkMode(enabled: boolean): Promise<void> {
    const newTheme = enabled ? darkTheme : lightTheme;
    await this.setTheme(newTheme);
  }

  /**
   * Subscribe to theme changes
   */
  static subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify listeners of theme change
   */
  private static notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  /**
   * Create custom theme from base
   */
  static createCustomTheme(
    base: Theme,
    overrides: Partial<ThemeColors>
  ): Theme {
    return {
      ...base,
      colors: {
        ...base.colors,
        ...overrides,
      },
    };
  }

  /**
   * Get color with opacity
   */
  static getColorWithOpacity(color: string, opacity: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}
