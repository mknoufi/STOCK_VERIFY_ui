/**
 * Enhanced Sync Manager - Batch processing with retry logic
 * Handles offline queue sync with conflict detection
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../httpClient";

export interface SyncRecord {
  client_record_id: string;
  session_id: string;
  rack_id?: string;
  floor?: string;
  item_code: string;
  verified_qty: number;
  damage_qty: number;
  serial_numbers: string[];
  mfg_date?: string;
  mrp?: number;
  uom?: string;
  category?: string;
  subcategory?: string;
  item_condition?: string;
  evidence_photos: string[];
  status: "partial" | "finalized";
  created_at: string;
  updated_at: string;
  retry_count?: number;
}

export interface SyncConflict {
  client_record_id: string;
  conflict_type: string;
  message: string;
  details: Record<string, any>;
}

export interface SyncError {
  client_record_id: string;
  error_type: string;
  message: string;
}

export interface BatchSyncResponse {
  ok: string[];
  conflicts: SyncConflict[];
  errors: SyncError[];
  batch_id?: string;
  processing_time_ms: number;
  total_records: number;
}

interface SyncManagerConfig {
  batchSize: number;
  maxParallelRequests: number;
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
}

const DEFAULT_CONFIG: SyncManagerConfig = {
  batchSize: 100,
  maxParallelRequests: 2,
  maxRetries: 5,
  retryDelayMs: 2000,
  maxRetryDelayMs: 300000, // 5 minutes
};

const QUEUE_KEY = "@offline_queue";
const CONFLICTS_KEY = "@sync_conflicts";

export class EnhancedSyncManager {
  private config: SyncManagerConfig;
  private isSyncing = false;
  private syncPromise: Promise<void> | null = null;

  constructor(config?: Partial<SyncManagerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add record to offline queue
   */
  async addToQueue(record: SyncRecord): Promise<void> {
    try {
      const queue = await this.getQueue();

      // Check if record already exists (update instead of duplicate)
      const existingIndex = queue.findIndex(
        (r) => r.client_record_id === record.client_record_id,
      );

      if (existingIndex >= 0) {
        queue[existingIndex] = {
          ...record,
          updated_at: new Date().toISOString(),
        };
      } else {
        queue.push({ ...record, retry_count: 0 });
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

      __DEV__ && console.log(`📝 Added to queue: ${record.client_record_id}`);
    } catch (error) {
      console.error("Error adding to queue:", error);
      throw error;
    }
  }

  /**
   * Get current offline queue
   */
  async getQueue(): Promise<SyncRecord[]> {
    try {
      const data = await AsyncStorage.getItem(QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting queue:", error);
      return [];
    }
  }

  /**
   * Get queue size
   */
  async getQueueSize(): Promise<number> {
    const queue = await this.getQueue();
    return queue.length;
  }

  /**
   * Clear entire queue (use with caution!)
   */
  async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(QUEUE_KEY);
  }

  /**
   * Get stored conflicts
   */
  async getConflicts(): Promise<SyncConflict[]> {
    try {
      const data = await AsyncStorage.getItem(CONFLICTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error getting conflicts:", error);
      return [];
    }
  }

  /**
   * Store conflicts
   */
  private async storeConflicts(conflicts: SyncConflict[]): Promise<void> {
    try {
      const existing = await this.getConflicts();
      const merged = [...existing, ...conflicts];
      await AsyncStorage.setItem(CONFLICTS_KEY, JSON.stringify(merged));
    } catch (error) {
      console.error("Error storing conflicts:", error);
    }
  }

  /**
   * Clear conflicts
   */
  async clearConflicts(): Promise<void> {
    await AsyncStorage.removeItem(CONFLICTS_KEY);
  }

  /**
   * Sync offline queue with exponential backoff
   */
  async syncQueue(
    onProgress?: (progress: number, total: number) => void,
  ): Promise<{
    synced: number;
    conflicts: number;
    errors: number;
  }> {
    // Prevent concurrent sync
    if (this.isSyncing) {
      __DEV__ && console.log("⏳ Sync already in progress, waiting...");
      await this.syncPromise;
      return { synced: 0, conflicts: 0, errors: 0 };
    }

    this.isSyncing = true;
    this.syncPromise = this._syncQueueInternal(onProgress);

    try {
      await this.syncPromise;
      const queue = await this.getQueue();
      const conflicts = await this.getConflicts();

      return {
        synced: 0, // Will be updated during sync
        conflicts: conflicts.length,
        errors: queue.filter(
          (r) => (r.retry_count || 0) >= this.config.maxRetries,
        ).length,
      };
    } finally {
      this.isSyncing = false;
      this.syncPromise = null;
    }
  }

  private async _syncQueueInternal(
    onProgress?: (progress: number, total: number) => void,
  ): Promise<void> {
    const queue = await this.getQueue();

    if (queue.length === 0) {
      __DEV__ && console.log("📭 Queue is empty, nothing to sync");
      return;
    }

    __DEV__ && console.log(`🔄 Starting sync: ${queue.length} records`);

    let synced = 0;
    const failedRecords: SyncRecord[] = [];

    // Process in batches
    for (let i = 0; i < queue.length; i += this.config.batchSize) {
      const batch = queue.slice(i, i + this.config.batchSize);

      try {
        const response = await this.syncBatch(batch);

        // Remove successfully synced records
        const syncedIds = new Set(response.ok);
        const remainingQueue = queue.filter(
          (r) => !syncedIds.has(r.client_record_id),
        );

        // Store conflicts
        if (response.conflicts.length > 0) {
          await this.storeConflicts(response.conflicts);
        }

        // Handle errors - increment retry count
        for (const error of response.errors) {
          const record = queue.find(
            (r) => r.client_record_id === error.client_record_id,
          );
          if (record) {
            record.retry_count = (record.retry_count || 0) + 1;

            if (record.retry_count < this.config.maxRetries) {
              failedRecords.push(record);
            } else {
              __DEV__ &&
                console.error(
                  `❌ Max retries reached for ${record.client_record_id}`,
                );
            }
          }
        }

        // Update queue
        await AsyncStorage.setItem(
          QUEUE_KEY,
          JSON.stringify([...remainingQueue, ...failedRecords]),
        );

        synced += response.ok.length;

        // Report progress
        if (onProgress) {
          onProgress(i + batch.length, queue.length);
        }

        __DEV__ &&
          console.log(
            `✅ Batch synced: ${response.ok.length} ok, ` +
              `${response.conflicts.length} conflicts, ` +
              `${response.errors.length} errors`,
          );
      } catch (error: any) {
        console.error("Batch sync error:", error);

        // On network error, add delay before next batch
        if (
          error.code === "ECONNABORTED" ||
          error.message?.includes("Network")
        ) {
          const delay = this.calculateBackoff(1);
          __DEV__ && console.log(`⏱️ Network error, waiting ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    __DEV__ && console.log(`✅ Sync complete: ${synced} records synced`);
  }

  /**
   * Sync a batch of records
   */
  private async syncBatch(records: SyncRecord[]): Promise<BatchSyncResponse> {
    const batch_id = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const response = await api.post<BatchSyncResponse>("/api/sync/batch", {
      records,
      batch_id,
    });

    return response.data;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(retryCount: number): number {
    const delay = this.config.retryDelayMs * Math.pow(2, retryCount);
    return Math.min(delay, this.config.maxRetryDelayMs);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<{
    queueSize: number;
    conflictsCount: number;
    isSyncing: boolean;
  }> {
    const queue = await this.getQueue();
    const conflicts = await this.getConflicts();

    return {
      queueSize: queue.length,
      conflictsCount: conflicts.length,
      isSyncing: this.isSyncing,
    };
  }
}

// Global instance
export const syncManager = new EnhancedSyncManager();
