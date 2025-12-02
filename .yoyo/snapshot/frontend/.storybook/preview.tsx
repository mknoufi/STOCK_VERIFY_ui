import type { Preview } from '@storybook/react';
import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { ThemeService } from '../services/themeService';
import { UnistylesThemeProvider } from '../theme/Provider';

// Initialize theme service
if (typeof window !== 'undefined') {
  ThemeService.initialize().catch(() => {
    // Silently handle initialization errors in Storybook
  });
}

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#1a1a1a',
        },
      ],
    },
    layout: 'centered',
  },
  decorators: [
    (Story) => {
      // For web, use a simple div wrapper
      if (Platform.OS === 'web') {
        return (
          <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#ffffff' }}>
            <UnistylesThemeProvider>
              <Story />
            </UnistylesThemeProvider>
          </div>
        );
      }
      
      // For native, use View
      return (
        <UnistylesThemeProvider>
          <View style={styles.container}>
            <Story />
          </View>
        </UnistylesThemeProvider>
      );
    },
  ],
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
});

export default preview;

