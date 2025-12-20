import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// MMKV 3.x requires TurboModules (new architecture). Expo Go often runs
// without the new architecture. Safely fall back to AsyncStorage.
let storage: any = null;
// In-memory fallback cache to keep synchronous semantics when MMKV is unavailable
const memory = new Map<string, string>();
// Pending writes queue to prevent race conditions
const pendingWrites = new Map<string, Promise<void>>();

// Only try to import MMKV on native platforms
if (Platform.OS !== "web") {
  try {
    // Dynamic import wrapped in try-catch for native platforms
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { MMKV } = require("react-native-mmkv");
    storage = new MMKV();
  } catch {
    console.warn(
      "[MMKV] New architecture not enabled; falling back to AsyncStorage",
    );
    storage = null;
  }
} else {
  console.log("[MMKV] Web platform detected; using AsyncStorage fallback");
}

// Helper to wait for pending write before reading
const waitForPendingWrite = async (key: string): Promise<void> => {
  const pending = pendingWrites.get(key);
  if (pending) {
    await pending;
  }
};

export const mmkvStorage = {
  // Keep synchronous API expected by callers; when MMKV is not available,
  // use an in-memory cache and mirror writes to AsyncStorage in the background.
  getItem: (key: string): string | null => {
    if (storage) return storage.getString(key) ?? null;
    return memory.get(key) ?? null;
  },

  // Async version that waits for pending writes (prevents race conditions)
  getItemAsync: async (key: string): Promise<string | null> => {
    if (storage) return storage.getString(key) ?? null;

    // Wait for any pending write to complete
    await waitForPendingWrite(key);

    // If in memory, return it
    if (memory.has(key)) {
      return memory.get(key) ?? null;
    }

    // Otherwise, try to load from AsyncStorage
    try {
      const value = await AsyncStorage.getItem(key);
      if (value !== null) {
        memory.set(key, value);
      }
      return value;
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    if (storage) {
      storage.set(key, value);
      return;
    }
    // Fallback: write to memory and persist asynchronously with race condition prevention
    memory.set(key, value);
    const writePromise = AsyncStorage.setItem(key, value)
      .catch((err) =>
        console.warn(`[mmkvStorage] Failed to persist ${key}:`, err),
      )
      .finally(() => {
        // Clean up pending write tracking
        if (pendingWrites.get(key) === writePromise) {
          pendingWrites.delete(key);
        }
      });
    pendingWrites.set(key, writePromise);
  },

  removeItem: (key: string): void => {
    if (storage) {
      storage.delete(key);
      return;
    }
    memory.delete(key);
    const deletePromise = AsyncStorage.removeItem(key)
      .catch((err) =>
        console.warn(`[mmkvStorage] Failed to remove ${key}:`, err),
      )
      .finally(() => {
        if (pendingWrites.get(key) === deletePromise) {
          pendingWrites.delete(key);
        }
      });
    pendingWrites.set(key, deletePromise);
  },

  // Sync all pending writes - useful before app close
  flush: async (): Promise<void> => {
    const promises = Array.from(pendingWrites.values());
    if (promises.length > 0) {
      await Promise.all(promises);
    }
  },
};
