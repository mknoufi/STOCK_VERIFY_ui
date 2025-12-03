/**
 * Batch Operations Service - Bulk operations
 * Handles batch counting, bulk updates, and mass operations
 */

import { createCountLine } from './api/api';
import { BatchProcessor } from './monitoring/performanceService';
import { handleErrorWithRecovery } from './utils/errorRecovery';

export interface BatchCountOperation {
  session_id: string;
  items: Array<{
    item_code: string;
    counted_qty: number;
    variance_reason?: string;
    variance_note?: string;
    remark?: string;
  }>;
}

export interface BatchOperationResult {
  success: number;
  failed: number;
  total: number;
  errors: Array<{ item_code: string; error: string }>;
}

/**
 * Batch Operations Service
 */
export class BatchOperationsService {
  /**
   * Batch count items
   */
  static async batchCount(
    operation: BatchCountOperation,
    options: {
      onProgress?: (current: number, total: number) => void;
      onItemComplete?: (itemCode: string, success: boolean) => void;
    } = {}
  ): Promise<BatchOperationResult> {
    const { onProgress, onItemComplete } = options;
    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      total: operation.items.length,
      errors: [],
    };

    const processor = new BatchProcessor<BatchItem>(10, 100); // Batch size 10, 100ms delay

    type BatchItem = {
      item_code: string;
      counted_qty: number;
      variance_reason?: string;
      variance_note?: string;
      remark?: string;
    };

    await processor.process(
      operation.items,
      async (batch: BatchItem[]) => {
        const typedBatch = batch;
        await Promise.allSettled(
          typedBatch.map(async (item) => {
            try {
              await handleErrorWithRecovery(
                () => createCountLine({
                  session_id: operation.session_id,
                  item_code: item.item_code,
                  counted_qty: item.counted_qty,
                  variance_reason: item.variance_reason || null,
                  variance_note: item.variance_note || null,
                  remark: item.remark || null,
                }),
                {
                  context: 'Batch Count',
                  recovery: { maxRetries: 2 },
                  showAlert: false,
                }
              );

              result.success++;
              if (onItemComplete) {
                onItemComplete(item.item_code, true);
              }
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                item_code: item.item_code,
                error: error.message || 'Unknown error',
              });
              if (onItemComplete) {
                onItemComplete(item.item_code, false);
              }
            }
          })
        );

        if (onProgress) {
          onProgress(result.success + result.failed, result.total);
        }
      },
      onProgress
    );

    return result;
  }

  /**
   * Quick count - count multiple items with same quantity
   */
  static async quickCount(
    sessionId: string,
    itemCodes: string[],
    quantity: number,
    options: {
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<BatchOperationResult> {
    const items = itemCodes.map(itemCode => ({
      item_code: itemCode,
      counted_qty: quantity,
    }));

    return await this.batchCount(
      {
        session_id: sessionId,
        items,
      },
      options
    );
  }

  /**
   * Bulk update count lines
   */
  static async bulkUpdateCountLines(
    updates: Array<{
      line_id: string;
      counted_qty: number;
    }>,
    options: {
      onProgress?: (current: number, total: number) => void;
    } = {}
  ): Promise<BatchOperationResult> {
    const result: BatchOperationResult = {
      success: 0,
      failed: 0,
      total: updates.length,
      errors: [],
    };

    const processor = new BatchProcessor<{ line_id: string; counted_qty: number }>(10, 100);

    await processor.process(
      updates,
      async (batch: Array<{ line_id: string; counted_qty: number }>) => {
        await Promise.allSettled(
          batch.map(async (update) => {
            try {
              const api = require('./api/api').default;
              await handleErrorWithRecovery(
                () => api.put(`/count-lines/${update.line_id}`, {
                  counted_qty: update.counted_qty,
                }),
                {
                  context: 'Bulk Update',
                  recovery: { maxRetries: 2 },
                  showAlert: false,
                }
              );

              result.success++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                item_code: update.line_id,
                error: error.message || 'Unknown error',
              });
            }
          })
        );

        if (options.onProgress) {
          options.onProgress(result.success + result.failed, result.total);
        }
      },
      options.onProgress
    );

    return result;
  }
}
