import { useEffect } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { useSettingsStore } from '../store/settingsStore';
import { ThemeService } from '../services/themeService';

/**
 * Hook to sync theme with system settings when 'auto' mode is enabled
 */
export function useSystemTheme() {
  const themeSetting = useSettingsStore((state) => state.settings.theme);

  useEffect(() => {
    const handleAppearanceChange = ({ colorScheme }: { colorScheme: ColorSchemeName }) => {
      if (themeSetting === 'auto') {
        ThemeService.setDarkMode(colorScheme === 'dark');
      }
    };

    // Initial check
    if (themeSetting === 'auto') {
      const colorScheme = Appearance.getColorScheme();
      ThemeService.setDarkMode(colorScheme === 'dark');
    }

    // Subscribe to changes
    const subscription = Appearance.addChangeListener(handleAppearanceChange);

    return () => {
      subscription.remove();
    };
  }, [themeSetting]);
}
