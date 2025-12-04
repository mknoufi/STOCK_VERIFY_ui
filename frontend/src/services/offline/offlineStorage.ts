import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "../storage/asyncStorageService";
import { levenshteinDistance } from "../../utils/algorithms";

const STORAGE_KEYS = {
  ITEMS_CACHE: "items_cache",
  OFFLINE_QUEUE: "offline_queue",
  SESSIONS_CACHE: "sessions_cache",
  COUNT_LINES_CACHE: "count_lines_cache",
  LAST_SYNC: "last_sync",
  USER_DATA: "user_data",
};

export interface CachedItem {
  item_code: string;
  barcode: string;
  item_name: string;
  description?: string;
  uom?: string;
  current_stock?: number;
  cached_at: string;
}

export interface OfflineQueueItem {
  id: string;
  type: "count_line" | "session" | "unknown_item";
  data: any;
  timestamp: string;
  retries: number;
}

export interface CachedSession {
  session_id: string;
  warehouse: string;
  status: string;
  created_by: string;
  created_at: string;
  cached_at: string;
}

export interface CachedCountLine {
  _id: string;
  session_id: string;
  item_code: string;
  item_name: string;
  counted_qty: number;
  system_qty?: number;
  variance?: number;
  counted_by: string;
  counted_at: string;
  cached_at: string;
}

// Item Cache Operations
export const cacheItem = async (item: Omit<CachedItem, "cached_at">) => {
  try {
    const cachedItem: CachedItem = {
      ...item,
      cached_at: new Date().toISOString(),
    };

    const existingCache = await getItemsCache();
    const updatedCache = {
      ...existingCache,
      [item.item_code]: cachedItem,
    };

    await storage.set(STORAGE_KEYS.ITEMS_CACHE, updatedCache);
    return cachedItem;
  } catch (error) {
    __DEV__ && console.error("Error caching item:", error);
    throw error;
  }
};

export const getItemsCache = async (): Promise<Record<string, CachedItem>> => {
  const cache = await storage.get<Record<string, CachedItem>>(
    STORAGE_KEYS.ITEMS_CACHE,
    {
      defaultValue: {},
    },
  );
  return cache ?? {};
};

export const getItemFromCache = async (
  itemCode: string,
): Promise<CachedItem | null> => {
  try {
    const cache = await getItemsCache();
    return cache[itemCode] || null;
  } catch (error) {
    __DEV__ && console.error("Error getting item from cache:", error);
    return null;
  }
};

export const searchItemsInCache = async (
  query: string,
): Promise<CachedItem[]> => {
  try {
    const cache = await getItemsCache();
    const items = Object.values(cache);

    const lowerQuery = query.toLowerCase();

    return items.filter((item) => {
      const code = item.item_code.toLowerCase();
      const name = item.item_name.toLowerCase();
      const barcode = item.barcode.toLowerCase();

      // Direct includes check (fast path)
      if (
        code.includes(lowerQuery) ||
        name.includes(lowerQuery) ||
        barcode.includes(lowerQuery)
      ) {
        return true;
      }

      // Levenshtein distance check (slower path for typos)
      // Only check if query is long enough to matter
      if (lowerQuery.length > 3) {
        const distName = levenshteinDistance(name, lowerQuery);
        // Allow 2 edits for name
        if (distName <= 2) return true;
      }

      return false;
    });
  } catch (error) {
    __DEV__ && console.error("Error searching items in cache:", error);
    return [];
  }
};

export const clearItemsCache = async () => {
  try {
    await storage.remove(STORAGE_KEYS.ITEMS_CACHE);
  } catch (error) {
    __DEV__ && console.error("Error clearing items cache:", error);
  }
};

// Offline Queue Operations
export const addToOfflineQueue = async (
  type: OfflineQueueItem["type"],
  data: any,
) => {
  try {
    const queue = await getOfflineQueue();
    const queueItem: OfflineQueueItem = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: new Date().toISOString(),
      retries: 0,
    };

    queue.push(queueItem);
    await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, queue);
    return queueItem;
  } catch (error) {
    __DEV__ && console.error("Error adding to offline queue:", error);
    throw error;
  }
};

export const getOfflineQueue = async (): Promise<OfflineQueueItem[]> => {
  try {
    const queue = await storage.get<OfflineQueueItem[]>(
      STORAGE_KEYS.OFFLINE_QUEUE,
      {
        defaultValue: [],
      },
    );
    return queue ?? [];
  } catch (error) {
    __DEV__ && console.error("Error getting offline queue:", error);
    return [];
  }
};

export const removeFromOfflineQueue = async (id: string) => {
  try {
    const queue = await getOfflineQueue();
    const updatedQueue = queue.filter((item) => item.id !== id);
    await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, updatedQueue);
  } catch (error) {
    __DEV__ && console.error("Error removing from offline queue:", error);
  }
};

export const updateQueueItemRetries = async (id: string) => {
  try {
    const queue = await getOfflineQueue();
    const updatedQueue = queue.map((item) =>
      item.id === id ? { ...item, retries: item.retries + 1 } : item,
    );
    await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, updatedQueue);
  } catch (error) {
    __DEV__ && console.error("Error updating queue item retries:", error);
  }
};

export const clearOfflineQueue = async () => {
  try {
    await storage.remove(STORAGE_KEYS.OFFLINE_QUEUE);
  } catch (error) {
    __DEV__ && console.error("Error clearing offline queue:", error);
  }
};

// Session Cache Operations
export const cacheSession = async (
  session: Omit<CachedSession, "cached_at">,
) => {
  try {
    const cachedSession: CachedSession = {
      ...session,
      cached_at: new Date().toISOString(),
    };

    const existingCache = await getSessionsCache();
    const updatedCache = {
      ...existingCache,
      [session.session_id]: cachedSession,
    };

    await storage.set(STORAGE_KEYS.SESSIONS_CACHE, updatedCache);
    return cachedSession;
  } catch (error) {
    __DEV__ && console.error("Error caching session:", error);
    throw error;
  }
};

export const getSessionsCache = async (): Promise<
  Record<string, CachedSession>
> => {
  try {
    const cache = await storage.get<Record<string, CachedSession>>(
      STORAGE_KEYS.SESSIONS_CACHE,
      {
        defaultValue: {},
      },
    );
    return cache ?? {};
  } catch (error) {
    __DEV__ && console.error("Error getting sessions cache:", error);
    return {};
  }
};

export const getSessionFromCache = async (
  sessionId: string,
): Promise<CachedSession | null> => {
  try {
    const cache = await getSessionsCache();
    return cache[sessionId] || null;
  } catch (error) {
    __DEV__ && console.error("Error getting session from cache:", error);
    return null;
  }
};

// Count Lines Cache Operations
export const cacheCountLine = async (
  countLine: Omit<CachedCountLine, "cached_at">,
) => {
  try {
    const cachedCountLine: CachedCountLine = {
      ...countLine,
      cached_at: new Date().toISOString(),
    };

    const existingCache = await getCountLinesCache();
    const sessionLines = existingCache[countLine.session_id] || [];

    // Update or add the count line
    const existingIndex = sessionLines.findIndex(
      (line) => line._id === countLine._id,
    );
    if (existingIndex >= 0) {
      sessionLines[existingIndex] = cachedCountLine;
    } else {
      sessionLines.push(cachedCountLine);
    }

    const updatedCache = {
      ...existingCache,
      [countLine.session_id]: sessionLines,
    };

    await storage.set(STORAGE_KEYS.COUNT_LINES_CACHE, updatedCache);
    return cachedCountLine;
  } catch (error) {
    __DEV__ && console.error("Error caching count line:", error);
    throw error;
  }
};

export const getCountLinesCache = async (): Promise<
  Record<string, CachedCountLine[]>
> => {
  try {
    const cache = await storage.get<Record<string, CachedCountLine[]>>(
      STORAGE_KEYS.COUNT_LINES_CACHE,
      { defaultValue: {} },
    );
    return cache ?? {};
  } catch (error) {
    __DEV__ && console.error("Error getting count lines cache:", error);
    return {};
  }
};

export const getCountLinesBySessionFromCache = async (
  sessionId: string,
): Promise<CachedCountLine[]> => {
  try {
    const cache = await getCountLinesCache();
    return cache[sessionId] || [];
  } catch (error) {
    __DEV__ &&
      console.error("Error getting count lines by session from cache:", error);
    return [];
  }
};

// Last Sync Operations
export const updateLastSync = async () => {
  try {
    await storage.set(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
  } catch (error) {
    __DEV__ && console.error("Error updating last sync:", error);
  }
};

export const getLastSync = async (): Promise<string | null> => {
  try {
    return await storage.get(STORAGE_KEYS.LAST_SYNC);
  } catch (error) {
    __DEV__ && console.error("Error getting last sync:", error);
    return null;
  }
};

// Clear all cache
export const clearAllCache = async () => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.ITEMS_CACHE,
      STORAGE_KEYS.OFFLINE_QUEUE,
      STORAGE_KEYS.SESSIONS_CACHE,
      STORAGE_KEYS.COUNT_LINES_CACHE,
      STORAGE_KEYS.LAST_SYNC,
    ]);
  } catch (error) {
    __DEV__ && console.error("Error clearing all cache:", error);
  }
};

// Get cache statistics
export const getCacheStats = async () => {
  try {
    const itemsCache = await getItemsCache();
    const offlineQueue = await getOfflineQueue();
    const sessionsCache = await getSessionsCache();
    const countLinesCache = await getCountLinesCache();
    const lastSync = await getLastSync();

    return {
      itemsCount: Object.keys(itemsCache).length,
      queuedOperations: offlineQueue.length,
      sessionsCount: Object.keys(sessionsCache).length,
      countLinesCount: Object.values(countLinesCache).reduce(
        (total, lines) => total + lines.length,
        0,
      ),
      lastSync,
      cacheSizeKB: Math.round(
        (JSON.stringify(itemsCache).length +
          JSON.stringify(offlineQueue).length +
          JSON.stringify(sessionsCache).length +
          JSON.stringify(countLinesCache).length) /
          1024,
      ),
    };
  } catch (error) {
    __DEV__ && console.error("Error getting cache stats:", error);
    return {
      itemsCount: 0,
      queuedOperations: 0,
      sessionsCount: 0,
      countLinesCount: 0,
      lastSync: null,
      cacheSizeKB: 0,
    };
  }
};
