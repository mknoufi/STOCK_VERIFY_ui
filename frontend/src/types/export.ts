/**
 * Export Type Definitions
 * Types for data export functionality
 */

/**
 * Export Format
 */
export type ExportFormat = 'CSV' | 'XLSX' | 'JSON' | 'PDF';

/**
 * Export Request
 */
export interface ExportRequest {
  format: ExportFormat;
  data: unknown[];
  filename?: string;
  headers?: string[];
  options?: ExportOptions;
}

/**
 * Export Options
 */
export interface ExportOptions {
  includeHeaders?: boolean;
  dateFormat?: string;
  numberFormat?: string;
  encoding?: 'UTF-8' | 'ASCII';
  compression?: boolean;
}

/**
 * Export Result
 */
export interface ExportResult {
  success: boolean;
  filename: string;
  fileSize?: number;
  rowCount?: number;
  error?: string;
}

/**
 * Session Export Data
 */
export interface SessionExportData {
  session_id: string;
  warehouse: string;
  status: string;
  created_by: string;
  created_at: string;
  closed_at?: string;
  total_items: number;
  total_variance: number;
  notes?: string;
}

/**
 * Count Line Export Data
 */
export interface CountLineExportData {
  item_code: string;
  item_name: string;
  barcode?: string;
  counted_qty: number;
  system_qty?: number;
  variance?: number;
  variance_percentage?: number;
  mrp?: number;
  verified: boolean;
  location?: string;
  notes?: string;
}

/**
 * Variance Report Data
 */
export interface VarianceReportData {
  session_id: string;
  warehouse: string;
  item_code: string;
  item_name: string;
  counted_qty: number;
  system_qty: number;
  variance: number;
  variance_percentage: number;
  variance_value?: number;
  category?: string;
}