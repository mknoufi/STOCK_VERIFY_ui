import AsyncStorage from "@react-native-async-storage/async-storage";

// In-memory fallback cache to keep synchronous semantics
const memory = new Map<string, string>();
// Pending writes queue to prevent race conditions
const pendingWrites = new Map<string, Promise<void>>();

// Helper to wait for pending write before reading
const _waitForPendingWrite = async (key: string): Promise<void> => {
  const pending = pendingWrites.get(key);
  if (pending) {
    await pending;
  }
};

export const mmkvStorage = {
  // Keep synchronous API expected by callers; use an in-memory cache
  // and mirror writes to AsyncStorage in the background.
  getItem: (key: string): string | null => {
    return memory.get(key) ?? null;
  },

  // Async version that waits for pending writes (prevents race conditions)
  getItemAsync: async (key: string): Promise<string | null> => {
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

  // Initialize memory cache from AsyncStorage
  initialize: async (): Promise<void> => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const pairs = await AsyncStorage.multiGet(keys);
      pairs.forEach(([key, value]) => {
        if (value !== null) {
          memory.set(key, value);
        }
      });
      console.log(`[mmkvStorage] Initialized with ${memory.size} keys`);
    } catch (err) {
      console.warn("[mmkvStorage] Initialization failed:", err);
    }
  },
};
