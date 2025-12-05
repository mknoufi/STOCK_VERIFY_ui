import {
  getOfflineQueue,
  removeFromOfflineQueue,
  updateQueueItemRetries,
  updateQueueItemStatus,
  getQueueStats,
} from "../offline/offlineStorage";
import {
  createSession,
  createCountLine,
  createUnknownItem,
  getSessions,
  searchItems,
  isOnline,
} from "../api/api";
import { useNetworkStore } from "../../store/networkStore";

const SYNC_BATCH_SIZE = 5;
const MAX_RETRIES = 3;

export interface SyncStatus {
  isSyncing: boolean;
  lastSync: string | null;
  pendingOperations: number;
  conflicts: number;
  errors: string[];
}

class SyncService {
  private isSyncing: boolean = false;
  private syncListeners: ((status: SyncStatus) => void)[] = [];
  private lastSync: string | null = null;
  private errors: string[] = [];

  constructor() {
    // Listen for network changes to trigger auto-sync
    useNetworkStore.subscribe((state) => {
      if (state.isOnline && !this.isSyncing) {
        this.syncAll();
      }
    });
  }

  public getStatus = async (): Promise<SyncStatus> => {
    const stats = await getQueueStats();
    return {
      isSyncing: this.isSyncing,
      lastSync: this.lastSync,
      pendingOperations: stats.pending,
      conflicts: stats.conflicts,
      errors: this.errors,
    };
  };

  public subscribe = (listener: (status: SyncStatus) => void) => {
    this.syncListeners.push(listener);
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== listener);
    };
  };

  private notifyListeners = async () => {
    const status = await this.getStatus();
    this.syncListeners.forEach((listener) => listener(status));
  };

  public syncAll = async () => {
    if (this.isSyncing || !isOnline()) return;

    this.isSyncing = true;
    this.errors = [];
    await this.notifyListeners();

    try {
      console.log("🔄 Starting full sync...");

      // 1. Upload offline changes (Priority)
      await this.processOfflineQueue();

      // 2. Download latest data
      await Promise.all([
        this.syncSessions(),
        this.syncItems(), // Sync a batch of items or recent ones
      ]);

      this.lastSync = new Date().toISOString();
      console.log("✅ Full sync completed");
    } catch (error: any) {
      console.error("❌ Sync failed:", error);
      this.errors.push(error.message || "Sync failed");
    } finally {
      this.isSyncing = false;
      await this.notifyListeners();
    }
  };

  public processOfflineQueue = async () => {
    const queue = await getOfflineQueue();
    // Filter out items that are already in conflict or failed state to avoid repeated processing of bad data
    const pendingItems = queue.filter(
      (item) => item.status !== "conflict" && item.status !== "failed",
    );

    if (pendingItems.length === 0) return;

    console.log(`📤 Processing ${pendingItems.length} offline operations...`);

    // Process in batches
    for (let i = 0; i < pendingItems.length; i += SYNC_BATCH_SIZE) {
      const batch = pendingItems.slice(i, i + SYNC_BATCH_SIZE);

      await Promise.all(
        batch.map(async (item) => {
          try {
            if (item.retries >= MAX_RETRIES) {
              console.warn(`⚠️ Skipping item ${item.id} due to max retries`);
              // Optionally mark as failed
              await updateQueueItemStatus(
                item.id,
                "failed",
                "Max retries exceeded",
              );
              return;
            }

            let success = false;

            switch (item.type) {
              case "session":
                await createSession(item.data.warehouse);
                success = true;
                break;

              case "count_line":
                // Construct clean payload matching CreateCountLinePayload
                const payload = {
                  session_id: item.data.session_id,
                  item_code: item.data.item_code,
                  counted_qty: item.data.counted_qty,
                  damaged_qty: item.data.damaged_qty,
                  non_returnable_damaged_qty:
                    item.data.non_returnable_damaged_qty,
                  sr_no: item.data.sr_no,
                  mrp_counted: item.data.mrp_counted,
                  remark: item.data.remark,
                  floor_no: item.data.floor_no,
                  rack_no: item.data.rack_no,
                  variant_id: item.data.variant_id,
                  variant_barcode: item.data.variant_barcode,
                  item_condition: item.data.item_condition,
                  manufacturing_date: item.data.manufacturing_date,
                };

                const meta = {
                  itemName: item.data.item_name || "Unknown Item",
                  username: item.data.counted_by || "Unknown User",
                };

                // Pass true to skip offline fallback (prevent infinite loop)
                await createCountLine(payload, meta, true);
                success = true;
                break;

              case "unknown_item":
                await createUnknownItem(item.data);
                success = true;
                break;

              default:
                console.warn(`Unknown queue item type: ${item.type}`);
                await removeFromOfflineQueue(item.id);
                return;
            }

            if (success) {
              console.log(`✅ Processed ${item.type} (${item.id})`);
              await removeFromOfflineQueue(item.id);
            }
          } catch (error: any) {
            console.error(
              `❌ Failed to process ${item.type} (${item.id}):`,
              error,
            );

            // Check for conflict (409) or validation error (422)
            if (
              error.response &&
              (error.response.status === 409 || error.response.status === 422)
            ) {
              const errorMessage = error.response.data?.detail || error.message;
              console.warn(
                `⛔ Conflict/Validation Error for ${item.id}: ${errorMessage}`,
              );
              await updateQueueItemStatus(item.id, "conflict", errorMessage);
            } else {
              // Network or other error -> Retry
              await updateQueueItemRetries(item.id);
            }
          }
        }),
      );
    }
  };

  public syncSessions = async () => {
    console.log("📥 Syncing sessions...");
    try {
      // Fetch first page of sessions to update cache
      await getSessions(1, 50);
    } catch (error) {
      console.error("Failed to sync sessions:", error);
      throw error;
    }
  };

  public syncItems = async () => {
    console.log("📥 Syncing items...");
    try {
      // Fetch a default batch of items to populate cache
      // Using a broad search query to get "top" items
      // In a real app, this might be "recently used" or "assigned to warehouse"
      await searchItems(".");
    } catch (error) {
      console.error("Failed to sync items:", error);
      // Don't fail the whole sync for items
    }
  };
}

export const syncService = new SyncService();
