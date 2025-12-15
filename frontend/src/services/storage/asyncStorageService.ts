/**
 * Centralized AsyncStorage service to eliminate duplicate storage logic
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export interface StorageItem {
  key: string;
  value: any;
  timestamp?: number;
  expires?: number;
}

export class AsyncStorageService {
  private static instance: AsyncStorageService;
  private debugMode: boolean = __DEV__;

  private constructor() {}

  static getInstance(): AsyncStorageService {
    if (!AsyncStorageService.instance) {
      AsyncStorageService.instance = new AsyncStorageService();
    }
    return AsyncStorageService.instance;
  }

  /**
   * Unified error handling for all storage operations
   */
  private handleStorageError(operation: string, key: string, error: any): void {
    const errorMessage = `AsyncStorage ${operation} failed for key '${key}': ${error.message || error}`;

    if (this.debugMode) {
      __DEV__ && console.error(errorMessage, error);
    }

    // Prevent infinite recursion if saving the error itself fails
    if (key === "lastStorageError") return;

    // Store error for debugging
    this.setItem(
      "lastStorageError",
      {
        operation,
        key,
        error: error.message || String(error),
        timestamp: Date.now(),
      },
      { silent: true },
    ).catch(() => {
      // Ignore errors when saving error logs to prevent loops
    });
  }

  /**
   * Set item with enhanced error handling and options
   */
  async setItem(
    key: string,
    value: any,
    options: {
      expires?: number;
      silent?: boolean;
      showAlert?: boolean;
    } = {},
  ): Promise<boolean> {
    try {
      const item: StorageItem = {
        key,
        value,
        timestamp: Date.now(),
        ...(options.expires && { expires: Date.now() + options.expires }),
      };

      const serialized = JSON.stringify(item);
      await AsyncStorage.setItem(key, serialized);

      if (this.debugMode && !options.silent) {
        __DEV__ && console.log(`✅ AsyncStorage: Set '${key}'`, value);
      }

      return true;
    } catch (error) {
      this.handleStorageError("setItem", key, error);

      if (options.showAlert && !options.silent) {
        Alert.alert("Storage Error", `Failed to save ${key}. Please try again.`);
      }

      return false;
    }
  }

  /**
   * Get item with automatic expiration check
   */
  async getItem<T = any>(
    key: string,
    options: {
      defaultValue?: T;
      silent?: boolean;
      ignoreExpiration?: boolean;
    } = {},
  ): Promise<T | null> {
    try {
      const serialized = await AsyncStorage.getItem(key);

      if (serialized === null) {
        if (this.debugMode && !options.silent) {
          __DEV__ && console.log(`📭 AsyncStorage: '${key}' not found`);
        }
        return options.defaultValue ?? null;
      }

      let item: StorageItem;
      try {
        item = JSON.parse(serialized);
      } catch {
        // Fallback: If it's not JSON, treat it as a raw string value (legacy support)
        if (this.debugMode && !options.silent) {
          __DEV__ && console.log(`⚠️ AsyncStorage: '${key}' is not JSON, treating as raw string`);
        }
        // Construct a wrapper for the raw value
        item = { key, value: serialized };
      }

      // Check expiration (only if it was a valid StorageItem with expires)
      if (!options.ignoreExpiration && item.expires && Date.now() > item.expires) {
        if (this.debugMode && !options.silent) {
          __DEV__ && console.log(`⏰ AsyncStorage: '${key}' expired, removing`);
        }
        await this.removeItem(key, { silent: true });
        return options.defaultValue ?? null;
      }

      if (this.debugMode && !options.silent) {
        __DEV__ && console.log(`📦 AsyncStorage: Got '${key}'`, item.value);
      }

      return item.value;
    } catch (error) {
      this.handleStorageError("getItem", key, error);
      return options.defaultValue ?? null;
    }
  }

  /**
   * Remove item with error handling
   */
  async removeItem(key: string, options: { silent?: boolean } = {}): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);

      if (this.debugMode && !options.silent) {
        __DEV__ && console.log(`🗑️ AsyncStorage: Removed '${key}'`);
      }

      return true;
    } catch (error) {
      this.handleStorageError("removeItem", key, error);
      return false;
    }
  }

  /**
   * Check if item exists
   */
  async hasItem(key: string): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value !== null;
    } catch (error) {
      this.handleStorageError("hasItem", key, error);
      return false;
    }
  }

  /**
   * Clear all storage with confirmation
   */
  async clearAll(options: { confirm?: boolean } = { confirm: true }): Promise<boolean> {
    try {
      if (options.confirm) {
        return new Promise((resolve) => {
          Alert.alert("Clear All Data", "This will remove all stored data. Are you sure?", [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Clear All",
              style: "destructive",
              onPress: async () => {
                try {
                  await AsyncStorage.clear();
                  if (this.debugMode) {
                    __DEV__ && console.log("🧹 AsyncStorage: Cleared all data");
                  }
                  resolve(true);
                } catch (error) {
                  this.handleStorageError("clearAll", "ALL", error);
                  resolve(false);
                }
              },
            },
          ]);
        });
      } else {
        await AsyncStorage.clear();
        if (this.debugMode) {
          __DEV__ && console.log("🧹 AsyncStorage: Cleared all data");
        }
        return true;
      }
    } catch (error) {
      this.handleStorageError("clearAll", "ALL", error);
      return false;
    }
  }

  /**
   * Get all keys with optional filter
   */
  async getAllKeys(filter?: string): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();

      if (filter) {
        return keys.filter((key) => key.includes(filter));
      }

      return [...keys]; // Convert readonly array to mutable array
    } catch (error) {
      this.handleStorageError("getAllKeys", "ALL", error);
      return [];
    }
  }

  /**
   * Get multiple items efficiently
   */
  async getMultiple(keys: string[]): Promise<Record<string, any>> {
    try {
      const keyValuePairs = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};

      keyValuePairs.forEach(([key, value]) => {
        if (value !== null) {
          try {
            const item: StorageItem = JSON.parse(value);

            // Check expiration
            if (item.expires && Date.now() > item.expires) {
              this.removeItem(key, { silent: true });
              result[key] = null;
            } else {
              result[key] = item.value;
            }
          } catch {
            result[key] = value; // Fallback for non-JSON values
          }
        } else {
          result[key] = null;
        }
      });

      return result;
    } catch (error) {
      this.handleStorageError("getMultiple", keys.join(","), error);
      return {};
    }
  }

  /**
   * Set multiple items efficiently
   */
  async setMultiple(items: [string, any][]): Promise<boolean> {
    try {
      const preparedItems = items.map(([key, value]) => {
        const item: StorageItem = {
          key,
          value,
          timestamp: Date.now(),
        };
        return [key, JSON.stringify(item)] as [string, string];
      });

      await AsyncStorage.multiSet(preparedItems);

      if (this.debugMode) {
        __DEV__ && console.log(`✅ AsyncStorage: Set ${items.length} items`);
      }

      return true;
    } catch (error) {
      this.handleStorageError("setMultiple", `${items.length} items`, error);
      return false;
    }
  }

  /**
   * Clean up expired items
   */
  async cleanupExpired(): Promise<number> {
    try {
      const keys = await this.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);
      const expiredKeys: string[] = [];

      values.forEach(([key, value]) => {
        if (value) {
          try {
            const item: StorageItem = JSON.parse(value);
            if (item.expires && Date.now() > item.expires) {
              expiredKeys.push(key);
            }
          } catch {
            // Skip non-JSON items
          }
        }
      });

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);

        if (this.debugMode) {
          __DEV__ && console.log(`🧹 AsyncStorage: Cleaned up ${expiredKeys.length} expired items`);
        }
      }

      return expiredKeys.length;
    } catch (error) {
      this.handleStorageError("cleanupExpired", "ALL", error);
      return 0;
    }
  }

  /**
   * Get storage usage info (approximation)
   */
  async getStorageInfo(): Promise<{
    totalKeys: number;
    approximateSize: number;
    oldestItem?: number;
    newestItem?: number;
  }> {
    try {
      const keys = await this.getAllKeys();
      const values = await AsyncStorage.multiGet(keys);

      let totalSize = 0;
      let oldestTimestamp: number | undefined;
      let newestTimestamp: number | undefined;

      values.forEach(([, value]) => {
        if (value) {
          totalSize += value.length;

          try {
            const item: StorageItem = JSON.parse(value);
            if (item.timestamp) {
              if (!oldestTimestamp || item.timestamp < oldestTimestamp) {
                oldestTimestamp = item.timestamp;
              }
              if (!newestTimestamp || item.timestamp > newestTimestamp) {
                newestTimestamp = item.timestamp;
              }
            }
          } catch {
            // Skip non-JSON items
          }
        }
      });

      return {
        totalKeys: keys.length,
        approximateSize: totalSize,
        oldestItem: oldestTimestamp,
        newestItem: newestTimestamp,
      };
    } catch (error) {
      this.handleStorageError("getStorageInfo", "INFO", error);
      return { totalKeys: 0, approximateSize: 0 };
    }
  }
}

// Export singleton instance
export const asyncStorageService = AsyncStorageService.getInstance();

// Export convenience methods
export const storage = {
  set: (key: string, value: any, options?: any) => asyncStorageService.setItem(key, value, options),
  get: <T = any>(key: string, options?: any) => asyncStorageService.getItem<T>(key, options),
  remove: (key: string, options?: any) => asyncStorageService.removeItem(key, options),
  has: (key: string) => asyncStorageService.hasItem(key),
  clear: (options?: any) => asyncStorageService.clearAll(options),
  keys: (filter?: string) => asyncStorageService.getAllKeys(filter),
  getMultiple: (keys: string[]) => asyncStorageService.getMultiple(keys),
  setMultiple: (items: [string, any][]) => asyncStorageService.setMultiple(items),
  cleanup: () => asyncStorageService.cleanupExpired(),
  info: () => asyncStorageService.getStorageInfo(),
};
