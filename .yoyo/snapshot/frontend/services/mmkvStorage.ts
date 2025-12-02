import AsyncStorage from '@react-native-async-storage/async-storage';

// MMKV removed - not compatible with Expo Go (requires react-native-nitro-modules)
// Using AsyncStorage as the storage backend

// Simple AsyncStorage wrapper for compatibility
export const mmkvStorage = {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    return AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    return AsyncStorage.removeItem(key);
  },
};
