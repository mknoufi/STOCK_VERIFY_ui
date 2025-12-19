/**
 * useTheme Hook - React hook for theme access
 */

import { useEffect, useState } from 'react';
import { ThemeService, Theme } from '../services/themeService';

/**
 * Hook to access current theme
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(ThemeService.getTheme());

  useEffect(() => {
    // Load initial theme
    ThemeService.initialize().then(setTheme);

    // Subscribe to theme changes
    const unsubscribe = ThemeService.subscribe(setTheme);

    return unsubscribe;
  }, []);

  return theme;
}

/**
 * Hook to toggle theme
 */
export function useThemeToggle() {
  const [theme, setTheme] = useState<Theme>(ThemeService.getTheme());

  useEffect(() => {
    const unsubscribe = ThemeService.subscribe(setTheme);
    return unsubscribe;
  }, []);

  const toggleTheme = async () => {
    await ThemeService.toggleTheme();
  };

  return { theme, toggleTheme };
}
