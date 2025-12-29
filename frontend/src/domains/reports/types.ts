/**
 * Reports Domain - Types
 */

export type ReportType =
  | 'stock_summary'
  | 'variance_report'
  | 'user_activity'
  | 'session_history'
  | 'audit_trail';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ReportFilters {
  date_from?: string;
  date_to?: string;
  warehouse?: string;
  user_id?: string;
  status?: string;
  min_variance?: number;
  include_zero_variance?: boolean;
}

export interface ReportTypeInfo {
  id: ReportType;
  name: string;
  description: string;
  available_filters: string[];
  supported_formats: ExportFormat[];
}

export interface ReportPreviewData {
  columns: string[];
  rows: Record<string, unknown>[];
  total_rows: number;
  preview_rows: number;
  generated_at: string;
}

export interface GenerateReportParams {
  report_type: ReportType;
  format: ExportFormat;
  filters?: ReportFilters;
}

export interface ScheduleReportParams {
  name: string;
  report_type: ReportType;
  format: ExportFormat;
  filters?: ReportFilters;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time?: string;
    day_of_week?: number;
    day_of_month?: number;
  };
  recipients?: string[];
  enabled?: boolean;
}

export interface ScheduledReport {
  id: string;
  name: string;
  report_type: ReportType;
  format: ExportFormat;
  schedule: ScheduleReportParams['schedule'];
  filters?: ReportFilters;
  recipients: string[];
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
  created_by: string;
}

export interface DiscrepancyItem {
  item_code: string;
  item_name: string;
  expected_qty: number;
  counted_qty: number;
  variance: number;
  variance_percent: number;
  variance_reason?: string;
  warehouse: string;
  session_id: string;
}

export interface DiscrepancyReport {
  session_id: string;
  warehouse: string;
  generated_at: string;
  total_items: number;
  items_with_variance: number;
  total_positive_variance: number;
  total_negative_variance: number;
  items: DiscrepancyItem[];
}
