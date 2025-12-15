/**
 * Storage Type Definitions
 * Types for offline storage and caching
 */

/**
 * Storage Options
 */
export interface StorageOptions {
  defaultValue?: unknown;
  ttl?: number; // Time to live in milliseconds
  encrypt?: boolean;
}

/**
 * Cached Data Wrapper
 */
export interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl?: number;
  version?: string;
}

/**
 * Offline Queue Item
 */
export interface OfflineQueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  endpoint: string;
  data?: unknown;
  params?: Record<string, unknown>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'processing' | 'failed' | 'success';
  error?: string;
}

/**
 * Sync Conflict
 */
export interface SyncConflict {
  id: string;
  queueItem: OfflineQueueItem;
  serverData?: unknown;
  localData?: unknown;
  conflictType: 'version' | 'data' | 'deleted';
  timestamp: number;
  resolved: boolean;
}

/**
 * Storage Stats
 */
export interface StorageStats {
  totalItems: number;
  totalSize: number; // in bytes
  oldestItem?: number; // timestamp
  newestItem?: number; // timestamp
  cacheHitRate?: number; // percentage
}