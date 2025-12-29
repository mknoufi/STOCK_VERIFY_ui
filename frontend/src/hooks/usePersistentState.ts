/**
 * usePersistentState Hook
 *
 * A useState replacement that persists values to AsyncStorage.
 * Useful for UI preferences like sidebar collapse state, theme, etc.
 */

import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_PREFIX = "@app_state:";

/**
 * Hook that behaves like useState but persists the value to AsyncStorage.
 *
 * @param key - Unique storage key (will be prefixed with @app_state:)
 * @param defaultValue - Default value if nothing is stored
 * @returns [value, setValue, isLoading] - Similar to useState but with loading state
 *
 * @example
 * const [collapsed, setCollapsed, isLoading] = usePersistentState('sidebar_collapsed', false);
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  const storageKey = `${STORAGE_PREFIX}${key}`;

  // Load persisted value on mount
  useEffect(() => {
    let isMounted = true;

    const loadValue = async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored !== null && isMounted) {
          setValue(JSON.parse(stored) as T);
        }
      } catch (error) {
        if (__DEV__) {
          console.warn(`Failed to load persistent state for key "${key}":`, error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadValue();

    return () => {
      isMounted = false;
    };
  }, [storageKey, key]);

  // Persist value whenever it changes
  const setPersistedValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolvedValue =
          typeof newValue === "function"
            ? (newValue as (prev: T) => T)(prev)
            : newValue;

        // Persist asynchronously (fire and forget)
        AsyncStorage.setItem(storageKey, JSON.stringify(resolvedValue)).catch(
          (error) => {
            if (__DEV__) {
              console.warn(`Failed to persist state for key "${key}":`, error);
            }
          }
        );

        return resolvedValue;
      });
    },
    [storageKey, key]
  );

  return [value, setPersistedValue, isLoading];
}

/**
 * Clear a specific persisted state key.
 */
export async function clearPersistentState(key: string): Promise<void> {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  await AsyncStorage.removeItem(storageKey);
}

/**
 * Clear all persisted state keys.
 */
export async function clearAllPersistentState(): Promise<void> {
  const allKeys = await AsyncStorage.getAllKeys();
  const stateKeys = allKeys.filter((k) => k.startsWith(STORAGE_PREFIX));
  await AsyncStorage.multiRemove(stateKeys);
}

export default usePersistentState;
