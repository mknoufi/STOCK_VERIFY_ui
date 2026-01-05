import {
  getOfflineQueue,
  removeManyFromOfflineQueue,
  updateQueueItemRetries,
  getCacheStats,
} from "./offline/offlineStorage";
import { syncBatch, isOnline } from "./api/api";
import { useNetworkStore } from "../store/networkStore";
import { SyncRecord } from "../types/sync";

export interface SyncResult {
  success: number;
  failed: number;
  total: number;
  errors: { id: string; error: string }[];
}

export interface SyncOptions {
  onProgress?: (current: number, total: number) => void;
  background?: boolean;
}

// Simple in-memory lock to prevent concurrent syncs
let isSyncing = false;

export const initializeSyncService = () => {
  // Setup auto-sync when network comes online
  const unsubscribe = useNetworkStore.subscribe((state) => {
    if (state.isOnline) {
      // Debounce slightly to allow connection to stabilize
      setTimeout(() => {
        syncOfflineQueue({ background: true });
      }, 2000);
    }
  });

  return {
    cleanup: () => {
      unsubscribe();
    },
  };
};

export const getSyncStatus = async () => {
  const stats = await getCacheStats();
  const online = useNetworkStore.getState().isOnline;

  return {
    isOnline: online,
    queuedOperations: stats.queuedOperations,
    lastSync: stats.lastSync,
    cacheSize: stats.cacheSizeKB,
    needsSync: stats.queuedOperations > 0,
  };
};

export const syncOfflineQueue = async (
  options?: SyncOptions,
): Promise<SyncResult> => {
  if (isSyncing) {
    console.log("Sync already in progress, skipping");
    return { success: 0, failed: 0, total: 0, errors: [] };
  }

  if (!isOnline()) {
    console.log("Offline, skipping sync");
    return { success: 0, failed: 0, total: 0, errors: [] };
  }

  isSyncing = true;

  try {
    const queue = await getOfflineQueue();
    if (queue.length === 0) {
      isSyncing = false;
      return { success: 0, failed: 0, total: 0, errors: [] };
    }

    const total = queue.length;
    console.log(`Syncing ${total} items...`);

    // Process in batches of 50 to avoid payload size issues
    const BATCH_SIZE = 50;
    let processed = 0;
    let successCount = 0;
    let failedCount = 0;
    let errors: { id: string; error: string }[] = [];

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = queue.slice(i, i + BATCH_SIZE);

      try {
        const records: SyncRecord[] = [];
        const operations: Record<string, unknown>[] = [];

        // Split batch into records and legacy operations
        batch.forEach((item) => {
          if (item.type === "count_line") {
            const data = item.data as any;
            // Map to strict SyncRecord structure
            records.push({
              client_record_id: data._id,
              session_id: data.session_id,
              item_code: data.item_code,
              verified_qty: data.counted_qty,
              damage_qty: (data.damaged_qty as number) || 0,
              serial_numbers: (data.serial_numbers as string[]) || [],
              status: data.verified ? "finalized" : "partial",
              created_at: (data.created_at as string) || item.timestamp,
              updated_at: new Date().toISOString(),
              // Optional fields mapping
              rack_id: (data.rack_id as string) || undefined,
              floor: (data.floor_no as string) || undefined,
              evidence_photos: [], // TODO: Add photo support if needed
            });
          } else {
            // Legacy/Generic operations
            operations.push({
              id: item.id,
              type: item.type,
              data: item.data,
              timestamp: item.timestamp,
            });
          }
        });

        const response = await syncBatch(records, operations);

        // Handle response
        const results = response.results || [];
        const successIds: string[] = [];

        for (const res of results) {
          if (res.success) {
            successIds.push(res.id);
            successCount++;
          } else {
            failedCount++;
            errors.push({ id: res.id, error: res.message || "Unknown error" });
            // Update retry count for failed items
            await updateQueueItemRetries(res.id);
          }
        }

        // Remove successful items locally
        if (successIds.length > 0) {
          await removeManyFromOfflineQueue(successIds);
        }
      } catch (batchError: unknown) {
        console.error("Batch sync failed:", batchError);
        // If the entire batch fails (e.g. network error), mark all as failed
        failedCount += batch.length;
        // Maybe increment retries for all?
      }

      processed += batch.length;
      options?.onProgress?.(processed, total);
    }

    return {
      success: successCount,
      failed: failedCount,
      total,
      errors,
    };
  } catch (error: unknown) {
    console.error("Sync process error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown sync error";
    return {
      success: 0,
      failed: 0,
      total: 0,
      errors: [{ id: "general", error: errorMessage }],
    };
  } finally {
    isSyncing = false;
  }
};

export const forceSync = async (options?: SyncOptions): Promise<SyncResult> => {
  return syncOfflineQueue(options);
};
