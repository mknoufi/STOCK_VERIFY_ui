import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage } from "../storage/asyncStorageService";
import { levenshteinDistance } from "../../utils/algorithms";
import { createLogger } from "../logging";

const log = createLogger("OfflineStorage");

const STORAGE_KEYS = {
  ITEMS_CACHE: "items_cache",
  OFFLINE_QUEUE: "offline_queue",
  SESSIONS_CACHE: "sessions_cache",
  COUNT_LINES_CACHE: "count_lines_cache",
  LAST_SYNC: "last_sync",
  USER_DATA: "user_data",
};

/**
 * Data source metadata for cached items
 */
export type DataSource = "api" | "cache" | "offline";

/**
 * Extended result with source metadata
 */
export interface CacheResult<T> {
  data: T;
  _source: DataSource;
  _cachedAt: string | null;
  _stale: boolean;
}

/**
 * Check if cached data is stale (older than threshold)
 * Default: 1 hour
 */
export function isCacheStale(
  cachedAt: string | null,
  maxAgeMs: number = 60 * 60 * 1000,
): boolean {
  if (!cachedAt) return true;
  const cacheTime = new Date(cachedAt).getTime();
  return Date.now() - cacheTime > maxAgeMs;
}

export interface CachedItem {
  item_code: string;
  barcode?: string;
  item_name: string;
  description?: string;
  uom?: string;
  uom_name?: string;
  mrp?: number;
  sales_price?: number;
  sale_price?: number;
  category?: string;
  subcategory?: string;
  current_stock?: number;
  warehouse?: string;
  manual_barcode?: string;
  unit2_barcode?: string;
  unit_m_barcode?: string;
  batch_id?: string;
  is_serialized?: boolean;
  cached_at: string;
}

export interface OfflineQueueItem {
  id: string;
  type: "count_line" | "session" | "unknown_item";
  data: Record<string, unknown>;
  timestamp: string;
  retries: number;
}

export interface CachedSession {
  id: string;
  warehouse: string;
  staff_user: string;
  staff_name: string;
  status: string;
  type: string;
  started_at: string;
  closed_at?: string;
  reconciled_at?: string;
  total_items?: number;
  total_variance?: number;
  notes?: string;
  cached_at: string;
  // Legacy fields fallback
  session_id?: string;
  created_by?: string;
  created_at?: string;
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
  rack_no?: string;
  rack?: string;
  rack_id?: string;
  verified?: boolean;
  // Allow any additional audit fields
  [key: string]: unknown;
}

/**
 * Validation result for cache operations
 */
export interface CacheValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate that an item has the minimum required fields for caching.
 * Prevents corrupt cache entries.
 */
export function assertValidCachedItem(
  item: Partial<CachedItem>,
): CacheValidationResult {
  const errors: string[] = [];

  if (!item.item_code || typeof item.item_code !== "string") {
    errors.push("item_code is required and must be a string");
  }
  if (!item.item_name || typeof item.item_name !== "string") {
    errors.push("item_name is required and must be a string");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that a count line has the minimum required fields for caching.
 */
export function assertValidCachedCountLine(
  line: Partial<CachedCountLine>,
): CacheValidationResult {
  const errors: string[] = [];

  if (!line._id || typeof line._id !== "string") {
    errors.push("_id is required and must be a string");
  }
  if (!line.session_id || typeof line.session_id !== "string") {
    errors.push("session_id is required and must be a string");
  }
  if (!line.item_code || typeof line.item_code !== "string") {
    errors.push("item_code is required and must be a string");
  }
  if (typeof line.counted_qty !== "number") {
    errors.push("counted_qty is required and must be a number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Item Cache Operations
export const cacheItem = async (item: Omit<CachedItem, "cached_at">) => {
  try {
    // Validate before caching
    const validation = assertValidCachedItem(item);
    if (!validation.valid) {
      log.warn("Attempted to cache invalid item", {
        errors: validation.errors,
        itemCode: item.item_code,
      });
      // Don't throw - just log and skip to avoid breaking main flow
      return null;
    }

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
    log.error("Error caching item", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

export const cacheItems = async (items: Omit<CachedItem, "cached_at">[]) => {
  try {
    const validItems: CachedItem[] = [];
    const errors: string[] = [];

    // Validate all items first
    for (const item of items) {
      const validation = assertValidCachedItem(item);
      if (validation.valid) {
        validItems.push({
          ...item,
          cached_at: new Date().toISOString(),
        });
      } else {
        errors.push(
          `Invalid item ${item.item_code}: ${validation.errors.join(", ")}`,
        );
      }
    }

    if (errors.length > 0) {
      log.warn("Some items failed validation during bulk cache", {
        count: errors.length,
        firstError: errors[0],
      });
    }

    if (validItems.length === 0) return;

    const existingCache = await getItemsCache();
    const updatedCache = { ...existingCache };

    for (const item of validItems) {
      updatedCache[item.item_code] = item;
    }

    await storage.set(STORAGE_KEYS.ITEMS_CACHE, updatedCache);
    log.info("Bulk cached items", { count: validItems.length });
  } catch (error) {
    log.error("Error bulk caching items", {
      error: error instanceof Error ? error.message : String(error),
    });
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
      const code = (item.item_code || "").toLowerCase();
      const name = (item.item_name || "").toLowerCase();
      const barcode = (item.barcode || "").toLowerCase();

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
  data: Record<string, unknown>,
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

export const removeManyFromOfflineQueue = async (ids: string[]) => {
  try {
    const queue = await getOfflineQueue();
    const updatedQueue = queue.filter((item) => !ids.includes(item.id));

    // T079: Log deletion for verification
    if (queue.length !== updatedQueue.length) {
      log.debug("Removed confirmed items from offline queue", {
        removed: queue.length - updatedQueue.length,
        remaining: updatedQueue.length,
      });
    }

    await storage.set(STORAGE_KEYS.OFFLINE_QUEUE, updatedQueue);
  } catch (error) {
    __DEV__ && console.error("Error removing many from offline queue:", error);
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
  session: Omit<CachedSession, "cached_at"> | any, // Use any to allow backend objects to be passed in
) => {
  try {
    // Normalization logic
    const normalizedSession: CachedSession = {
      id: session.id || session.session_id || `temp_${Date.now()}`,
      warehouse: session.warehouse,
      status: session.status,
      type: session.type || "STANDARD",
      staff_user: session.staff_user || session.created_by || "unknown",
      staff_name: session.staff_name || "Staff",
      started_at:
        session.started_at || session.created_at || new Date().toISOString(),
      closed_at: session.closed_at,
      reconciled_at: session.reconciled_at,
      total_items: session.total_items,
      total_variance: session.total_variance,
      notes: session.notes,
      cached_at: new Date().toISOString(),
    };

    if (!normalizedSession.id || normalizedSession.id === "undefined") {
      log.warn("Attempted to cache session with invalid ID", {
        session_id: session?.session_id,
        id: session?.id,
        warehouse: session?.warehouse,
        status: session?.status,
      });
      return normalizedSession;
    }

    const existingCache = await getSessionsCache();
    const updatedCache = {
      ...existingCache,
      [normalizedSession.id]: normalizedSession,
    };

    // Remove any undefined keys if present
    delete (updatedCache as any)["undefined"];

    await storage.set(STORAGE_KEYS.SESSIONS_CACHE, updatedCache);
    return normalizedSession;
  } catch (error) {
    __DEV__ && console.error("Error caching session:", error);
    throw error;
  }
};

export const removeSessionFromCache = async (sessionId: string) => {
  try {
    const cache = await getSessionsCache();
    if (cache[sessionId]) {
      const { [sessionId]: _removed, ...rest } = cache;
      await storage.set(STORAGE_KEYS.SESSIONS_CACHE, rest);
      log.debug("Removed session from cache", { sessionId });
    }
  } catch (error) {
    log.error("Error removing session from cache", {
      error: error instanceof Error ? error.message : String(error),
    });
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

    // Self-healing: remove undefined keys
    if (cache && (cache as any)["undefined"]) {
      __DEV__ &&
        console.log("🧹 Cleaning up invalid 'undefined' session cache entry");
      const cleanCache = { ...cache };
      delete (cleanCache as any)["undefined"];
      await storage.set(STORAGE_KEYS.SESSIONS_CACHE, cleanCache);
      return cleanCache;
    }

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
    // Validate before caching
    const validation = assertValidCachedCountLine(countLine);
    if (!validation.valid) {
      log.warn("Attempted to cache invalid count line", {
        errors: validation.errors,
        lineId: countLine._id,
      });
      // Don't throw - just log and skip to avoid breaking main flow
      return null;
    }

    const sessionId = String(countLine.session_id);
    const cachedCountLine: CachedCountLine = {
      ...(countLine as any),
      cached_at: new Date().toISOString(),
    };

    const existingCache = await getCountLinesCache();
    const sessionLines: CachedCountLine[] = existingCache[sessionId] || [];

    // Update or add the count line
    const existingIndex = sessionLines.findIndex(
      (line: CachedCountLine) => line._id === countLine._id,
    );
    if (existingIndex >= 0) {
      sessionLines[existingIndex] = cachedCountLine;
    } else {
      sessionLines.push(cachedCountLine);
    }

    const updatedCache: Record<string, CachedCountLine[]> = {
      ...existingCache,
      [sessionId]: sessionLines,
    };

    await storage.set(STORAGE_KEYS.COUNT_LINES_CACHE, updatedCache);
    return cachedCountLine;
  } catch (error) {
    log.error("Error caching count line", {
      error: error instanceof Error ? error.message : String(error),
    });
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
