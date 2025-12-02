/**
 * Clipboard Utilities
 * Provides copy to clipboard functionality
 */

import * as Clipboard from 'expo-clipboard';
import { Platform, Alert } from 'react-native';

/**
 * Copy text to clipboard
 * @param text Text to copy
 * @param showAlert Whether to show success alert
 * @returns Promise<boolean>
 */
export const copyToClipboard = async (text: string, showAlert: boolean = true): Promise<boolean> => {
  try {
    await Clipboard.setStringAsync(text);

    if (showAlert && Platform.OS !== 'web') {
      // On mobile, you might want to show a toast instead
      // For now, we'll use a simple feedback
      return true;
    }

    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Get text from clipboard
 * @returns Promise<string | null>
 */
export const getFromClipboard = async (): Promise<string | null> => {
  try {
    const text = await Clipboard.getStringAsync();
    return text || null;
  } catch (error) {
    console.error('Failed to get from clipboard:', error);
    return null;
  }
};
