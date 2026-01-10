/**
 * Inventory API Service
 * Provides access to inventory management endpoints:
 * - Expiry alerts
 * - Stock summary (aggregated across batches)
 * - Batch priority (FIFO/LIFO)
 * - Low stock alerts
 * - Category summary
 */

import api from "../../../services/httpClient";

// Types
export interface ExpiryAlertItem {
  _id: string;
  barcode: string;
  item_code: string;
  item_name: string;
  brand_name?: string;
  category?: string;
  batch_no?: string;
  expiry_date: string;
  days_until_expiry: number;
  stock_qty: number;
  uom_name?: string;
}

export interface StockSummaryItem {
  item_code: string;
  item_name: string;
  brand_name?: string;
  category?: string;
  total_stock: number;
  batch_count: number;
  earliest_expiry?: string;
  latest_expiry?: string;
  barcodes: string[];
}

export interface BatchItem {
  barcode: string;
  batch_no?: string;
  expiry_date?: string;
  stock_qty: number;
  mrp?: number;
  cost_price?: number;
}

export interface BatchPriorityResponse {
  item_code: string;
  item_name: string;
  strategy: "fifo" | "lifo";
  recommended_batch: BatchItem | null;
  all_batches: BatchItem[];
  total_stock: number;
}

export interface LowStockItem {
  _id: string;
  barcode: string;
  item_code: string;
  item_name: string;
  brand_name?: string;
  category?: string;
  stock_qty: number;
  uom_name?: string;
}

export interface CategorySummary {
  category: string;
  total_items: number;
  total_stock: number;
  avg_stock: number;
}

export interface SearchResult {
  _id: string;
  barcode: string;
  item_code: string;
  item_name: string;
  brand_name?: string;
  category?: string;
  stock_qty: number;
  expiry_date?: string;
  uom_name?: string;
  score?: number;
}

export interface ReconciliationReport {
  last_sync: string | null;
  sync_source: string | null;
  mongo_stats: {
    total_records: number;
    unique_item_codes: number;
    unique_barcodes: number;
    missing_expiry_date: number;
    zero_stock_items: number;
  };
  health_checks: {
    has_data: boolean;
    expiry_coverage: number;
    active_stock_pct: number;
  };
}

export interface SyncResult {
  success: boolean;
  message?: string;
  error?: string;
  result?: {
    inserted: number;
    updated: number;
    deleted: number;
  };
}

// API Functions
export class InventoryAPI {
  /**
   * Get items expiring within specified days
   */
  static async getExpiryAlerts(days: number = 30): Promise<{
    items: ExpiryAlertItem[];
    total: number;
    days_threshold: number;
  }> {
    const response = await api.get(`/api/inventory/expiry-alerts`, {
      params: { days },
    });
    return response.data;
  }

  /**
   * Get aggregated stock summary per item (across all batches)
   */
  static async getStockSummary(params?: {
    category?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<{
    items: StockSummaryItem[];
    total: number;
  }> {
    const response = await api.get(`/api/inventory/stock-summary`, { params });
    return response.data;
  }

  /**
   * Get batch priority recommendation for an item
   */
  static async getBatchPriority(
    barcode: string,
    strategy: "fifo" | "lifo" = "fifo"
  ): Promise<BatchPriorityResponse> {
    const response = await api.get(
      `/api/inventory/batch-priority/${barcode}`,
      { params: { strategy } }
    );
    return response.data;
  }

  /**
   * Get items with stock below threshold
   */
  static async getLowStock(threshold: number = 10): Promise<{
    items: LowStockItem[];
    total: number;
    threshold: number;
  }> {
    const response = await api.get(`/api/inventory/low-stock`, {
      params: { threshold },
    });
    return response.data;
  }

  /**
   * Get stock summary grouped by category
   */
  static async getCategorySummary(): Promise<{
    categories: CategorySummary[];
    total_categories: number;
  }> {
    const response = await api.get(`/api/inventory/category-summary`);
    return response.data;
  }

  /**
   * Full-text search across item names, brands, categories, and barcodes
   */
  static async textSearch(
    query: string,
    limit: number = 50
  ): Promise<{
    results: SearchResult[];
    total: number;
    query: string;
  }> {
    const response = await api.get(`/api/inventory/search`, {
      params: { q: query, limit },
    });
    return response.data;
  }

  /**
   * Export expiring items as CSV (returns blob URL)
   */
  static async exportExpiryCsv(days: number = 30): Promise<Blob> {
    const response = await api.get(`/api/inventory/export/expiry`, {
      params: { days },
      responseType: "blob",
    });
    return response.data;
  }

  /**
   * Export low stock items as CSV (returns blob URL)
   */
  static async exportLowStockCsv(threshold: number = 10): Promise<Blob> {
    const response = await api.get(`/api/inventory/export/low-stock`, {
      params: { threshold },
      responseType: "blob",
    });
    return response.data;
  }

  /**
   * Get reconciliation/health report
   */
  static async getReconciliation(): Promise<ReconciliationReport> {
    const response = await api.get(`/api/inventory/reconcile`);
    return response.data;
  }

  /**
   * Manually trigger an ERP sync
   */
  static async triggerSync(): Promise<SyncResult> {
    const response = await api.post(`/api/inventory/trigger-sync`);
    return response.data;
  }

  /**
   * Download helper - creates and triggers download from blob
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = globalThis.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  }
}

export default InventoryAPI;
