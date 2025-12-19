import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Platform-independent secure storage wrapper
 * Uses expo-secure-store on native platforms
 * Note: On web, SecureStore is not available, so this would need a fallback
 * if we supported web for secure features. Ideally, we shouldn't store sensitive
 * tokens on web local storage without careful consideration, but for now
 * we'll focus on native mobile security.
 */

// Configure SecureStore options
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK, // iOS: Allow access when device is unlocked
};

class SecureStorage {
  /**
   * Safe set item
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        // Fallback for web (NOT SECURE, but functional for dev)
        // In production web, HttpOnly cookies are preferred
        localStorage.setItem(key, value);
        return;
      }
      await SecureStore.setItemAsync(key, value, OPTIONS);
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
      throw error;
    }
  }

  /**
   * Safe get item
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      }
      return await SecureStore.getItemAsync(key, OPTIONS);
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }

  /**
   * Safe remove item
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
        return;
      }
      await SecureStore.deleteItemAsync(key, OPTIONS);
    } catch (error) {
      console.error('SecureStorage removeItem error:', error);
      // Don't throw on delete failure, just log
    }
  }
}

export const secureStorage = new SecureStorage();
