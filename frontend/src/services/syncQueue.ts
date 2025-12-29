import {
  getPendingVerifications,
  deletePendingVerification,
  updatePendingVerificationStatus,
  saveLocalItems,
  LocalItem
} from '../db/localDb';
import { syncBatch, isOnline } from './api/api';
import api from './httpClient';

/**
 * SyncQueue service handles background synchronization of offline data.
 */
export const syncQueue = {
  /**
   * Push pending verifications to the server.
   */
  pushPendingVerifications: async () => {
    if (!isOnline()) return { success: 0, failed: 0 };

    const pending = await getPendingVerifications();
    if (pending.length === 0) return { success: 0, failed: 0 };

    console.log(`Pushing ${pending.length} pending verifications...`);

    const operations = pending.map(p => ({
      id: p.id?.toString() || Date.now().toString(),
      type: 'item_verification',
      data: {
        barcode: p.barcode,
        verified: p.verified === 1,
        username: p.username,
        variance: p.variance
      },
      timestamp: p.timestamp
    }));

    try {
      const result = await syncBatch(operations);

      // Handle successful syncs
      const successfulIds = result.ok || result.processed_ids || [];
      for (const id of successfulIds) {
        await deletePendingVerification(parseInt(id));
      }

      // Handle conflicts - T077: Use 'Temporary Lock' status
      if (result.conflicts) {
        for (const conflict of result.conflicts) {
          if (conflict.client_record_id) {
            await updatePendingVerificationStatus(parseInt(conflict.client_record_id), 'locked');
            console.log(`Marked verification ${conflict.client_record_id} as locked due to conflict: ${conflict.message}`);
          }
        }
      }

      return {
        success: successfulIds.length,
        failed: pending.length - successfulIds.length
      };
    } catch (error) {
      console.error('Failed to push pending verifications:', error);
      return { success: 0, failed: pending.length };
    }
  },

  /**
   * Pull updated items from the server.
   */
  pullUpdatedItems: async (lastSyncTimestamp?: string) => {
    if (!isOnline()) return 0;

    try {
      const response = await api.get('/api/v2/erp/items/sync', {
        params: { since: lastSyncTimestamp }
      });

      const items: LocalItem[] = response.data.items.map((item: any) => ({
        barcode: item.barcode,
        name: item.item_name,
        category: item.category,
        verified: item.verified ? 1 : 0,
        last_sync: new Date().toISOString()
      }));

      if (items.length > 0) {
        await saveLocalItems(items);
      }

      return items.length;
    } catch (error) {
      console.error('Failed to pull updated items:', error);
      return 0;
    }
  },

  /**
   * Perform a full sync (push then pull).
   */
  performFullSync: async (lastSyncTimestamp?: string) => {
    const pushResult = await syncQueue.pushPendingVerifications();
    const pullCount = await syncQueue.pullUpdatedItems(lastSyncTimestamp);

    return {
      pushed: pushResult.success,
      pulled: pullCount
    };
  }
};
