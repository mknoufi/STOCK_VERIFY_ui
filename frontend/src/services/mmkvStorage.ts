import AsyncStorage from '@react-native-async-storage/async-storage';
import { MMKV } from 'react-native-mmkv';
import { flags } from '../constants/flags';

// MMKV 3.x requires TurboModules (new architecture). Expo Go often runs
// without the new architecture. Safely fall back to AsyncStorage.
let storage: MMKV | null = null;
// In-memory fallback cache to keep synchronous semantics when MMKV is unavailable
const memory = new Map<string, string>();
try {
  // Attempt MMKV init; will throw if TurboModules not enabled
  storage = new MMKV();
} catch (e) {
  console.warn('[MMKV] New architecture not enabled; falling back to AsyncStorage');
  storage = null;
}

export const mmkvStorage = {
  // Keep synchronous API expected by callers; when MMKV is not available,
  // use an in-memory cache and mirror writes to AsyncStorage in the background.
  getItem: (key: string): string | null => {
    if (storage) return storage.getString(key) ?? null;
    return memory.get(key) ?? null;
  },

  setItem: (key: string, value: string): void => {
    if (storage) {
      storage.set(key, value);
      return;
    }
    // Fallback: write to memory and persist asynchronously
    memory.set(key, value);
    AsyncStorage.setItem(key, value).catch(() => {});
  },

  removeItem: (key: string): void => {
    if (storage) {
      storage.delete(key);
      return;
    }
    memory.delete(key);
    AsyncStorage.removeItem(key).catch(() => {});
  },
};
