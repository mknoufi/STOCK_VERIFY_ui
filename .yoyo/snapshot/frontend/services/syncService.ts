/**
 * Sync Service - Handles automatic sync when back online
 * Manages temporary memory, cache expiration, and sync queue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getOfflineQueue,
  removeFromOfflineQueue,
  updateQueueItemRetries,
  updateLastSync,
  getCacheStats,
  clearItemsCache,
  clearAllCache,
  getItemsCache,
  CachedItem,
} from './offlineStorage';
import api from './api';
import { useNetworkStore } from './networkService';

// Helper to check if online
const isOnline = (): boolean => {
  return useNetworkStore.getState().isOnline;
};

export interface SyncResult {
  success: number;
  failed: number;
  total: number;
  errors: { id: string; error: string }[];
}

export interface SyncOptions {
  maxRetries?: number;
  batchSize?: number;
  skipFailed?: boolean;
  onProgress?: (current: number, total: number) => void;
}

// Cache expiration settings (in milliseconds)
const CACHE_EXPIRY = {
  ITEMS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SESSIONS: 30 * 24 * 60 * 60 * 1000, // 30 days
  COUNT_LINES: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// Cache size limits
const CACHE_LIMITS = {
  MAX_ITEMS: 1000,
  MAX_QUEUE_ITEMS: 500,
  MAX_RETRIES: 5,
};

/**
 * Auto-sync: Automatically sync when network comes back online
 */
export const initializeAutoSync = () => {
  let syncTimeout: number | null = null;
  let isSyncing = false;
  let previousOnlineState = false;

  // Subscribe to the store changes
  const unsubscribe = useNetworkStore.subscribe((state: { isOnline: boolean; connectionType: string }) => {
    const isOnlineNow = state.isOnline;

    // Only sync when transitioning from offline to online
    if (isOnlineNow && !previousOnlineState && !isSyncing) {
      // Wait a bit before syncing to ensure connection is stable
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }

      syncTimeout = setTimeout(async () => {
        if (useNetworkStore.getState().isOnline && !isSyncing) {
          isSyncing = true;
          try {
            const stats = await getCacheStats();
            if (stats.queuedOperations > 0) {
              console.log(`Auto-syncing ${stats.queuedOperations} queued operations...`);
              await syncOfflineQueue({
                onProgress: (current, total) => {
                  console.log(`Sync progress: ${current}/${total}`);
                },
              });
            }
          } catch (error) {
            console.error('Auto-sync error:', error);
          } finally {
            isSyncing = false;
          }
        }
      }, 2000) as unknown as number; // Wait 2 seconds after connection is restored
    }

    previousOnlineState = isOnlineNow;
  });

  return unsubscribe;
};

/**
 * Sync offline queue - process all queued operations
 */
export const syncOfflineQueue = async (
  options: SyncOptions = {}
): Promise<SyncResult> => {
  const {
    maxRetries = CACHE_LIMITS.MAX_RETRIES,
    batchSize = 10,
    skipFailed = false,
    onProgress,
  } = options;

  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  const queue = await getOfflineQueue();
  const result: SyncResult = {
    success: 0,
    failed: 0,
    total: queue.length,
    errors: [],
  };

  if (queue.length === 0) {
    return result;
  }

  // Process queue in batches
  for (let i = 0; i < queue.length; i += batchSize) {
    const batch = queue.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (item) => {
        // Skip items that have failed too many times
        if (item.retries >= maxRetries) {
          if (skipFailed) {
            await removeFromOfflineQueue(item.id);
            return;
          }
          result.failed++;
          result.errors.push({
            id: item.id,
            error: 'Max retries exceeded',
          });
          return;
        }

        try {
          switch (item.type) {
            case 'session':
              await api.post('/sessions', item.data);
              break;
            case 'count_line':
              await api.post('/count-lines', item.data);
              break;
            case 'unknown_item':
              await api.post('/unknown-items', item.data);
              break;
          }

          // Remove from queue on success
          await removeFromOfflineQueue(item.id);
          result.success++;

          if (onProgress) {
            onProgress(result.success + result.failed, result.total);
          }
        } catch (error: any) {
          // Update retry count
          await updateQueueItemRetries(item.id);
          result.failed++;

          const errorMessage = error.response?.data?.detail || error.message || 'Unknown error';
          result.errors.push({
            id: item.id,
            error: errorMessage,
          });

          if (onProgress) {
            onProgress(result.success + result.failed, result.total);
          }
        }
      })
    );
  }

  // Update last sync timestamp
  if (result.success > 0) {
    await updateLastSync();
  }

  return result;
};

/**
 * Clean up expired cache items
 */
export const cleanupExpiredCache = async () => {
  try {
    const now = Date.now();
    const itemsCache = await getItemsCache();
    const cleanedCache: Record<string, CachedItem> = {};

    // Clean expired items
    for (const [key, item] of Object.entries(itemsCache)) {
      const cachedAt = new Date(item.cached_at).getTime();
      const age = now - cachedAt;

      if (age < CACHE_EXPIRY.ITEMS) {
        cleanedCache[key] = item;
      }
    }

    // If cache is still too large, keep only most recent items
    const itemCount = Object.keys(cleanedCache).length;
    if (itemCount > CACHE_LIMITS.MAX_ITEMS) {
      const sortedItems = Object.values(cleanedCache).sort(
        (a, b) => new Date(b.cached_at).getTime() - new Date(a.cached_at).getTime()
      );

      const keptItems = sortedItems.slice(0, CACHE_LIMITS.MAX_ITEMS);
      const newCache: Record<string, CachedItem> = {};
      keptItems.forEach((item) => {
        newCache[item.item_code] = item;
      });

      await clearItemsCache();
      // Restore kept items
      await AsyncStorage.setItem('items_cache', JSON.stringify(newCache));

      console.log(`Cache cleaned: ${itemCount} → ${keptItems.length} items`);
    } else if (Object.keys(itemsCache).length > Object.keys(cleanedCache).length) {
      // Save cleaned cache
      await AsyncStorage.setItem('items_cache', JSON.stringify(cleanedCache));

      const removed = Object.keys(itemsCache).length - Object.keys(cleanedCache).length;
      console.log(`Cache cleaned: removed ${removed} expired items`);
    }
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
};

/**
 * Manage queue size - remove old failed items
 */
export const manageQueueSize = async () => {
  try {
    const queue = await getOfflineQueue();

    if (queue.length > CACHE_LIMITS.MAX_QUEUE_ITEMS) {
      // Sort by timestamp (oldest first)
      const sortedQueue = queue.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Keep only most recent items
      const keptQueue = sortedQueue.slice(-CACHE_LIMITS.MAX_QUEUE_ITEMS);

      // Remove old items
      const removedIds = sortedQueue
        .slice(0, sortedQueue.length - CACHE_LIMITS.MAX_QUEUE_ITEMS)
        .map((item) => item.id);

      for (const id of removedIds) {
        await removeFromOfflineQueue(id);
      }

      console.log(`Queue managed: ${queue.length} → ${keptQueue.length} items`);
    }

    // Remove items that exceeded max retries
    const failedItems = queue.filter((item) => item.retries >= CACHE_LIMITS.MAX_RETRIES);
    for (const item of failedItems) {
      await removeFromOfflineQueue(item.id);
      console.log(`Removed failed item from queue: ${item.id}`);
    }
  } catch (error) {
    console.error('Error managing queue size:', error);
  }
};

/**
 * Initialize sync service - start auto-sync and cleanup tasks
 */
export const initializeSyncService = () => {
  // Initialize auto-sync
  const unsubscribe = initializeAutoSync();

  // Cleanup expired cache on startup
  cleanupExpiredCache().catch(console.error);

  // Manage queue size
  manageQueueSize().catch(console.error);

  // Periodic cleanup (every hour)
  const cleanupInterval = setInterval(() => {
    cleanupExpiredCache().catch(console.error);
    manageQueueSize().catch(console.error);
  }, 60 * 60 * 1000); // 1 hour

  return {
    unsubscribe,
    cleanup: () => {
      clearInterval(cleanupInterval);
      unsubscribe();
    },
  };
};

/**
 * Get sync status
 */
export const getSyncStatus = async () => {
  const stats = await getCacheStats();
  const isOnlineNow = isOnline();

  return {
    isOnline: isOnlineNow,
    queuedOperations: stats.queuedOperations,
    lastSync: stats.lastSync,
    cacheSize: stats.itemsCount,
    needsSync: stats.queuedOperations > 0 && isOnlineNow,
  };
};

/**
 * Force sync - manually trigger sync
 */
export const forceSync = async (options?: SyncOptions): Promise<SyncResult> => {
  if (!isOnline()) {
    throw new Error('Cannot sync while offline');
  }

  // Cleanup before sync
  await cleanupExpiredCache();
  await manageQueueSize();

  // Perform sync
  return await syncOfflineQueue(options);
};

/**
 * Clear all temporary data (cache + queue)
 */
export const clearAllTemporaryData = async () => {
  await clearAllCache();
  console.log('All temporary data cleared');
};
