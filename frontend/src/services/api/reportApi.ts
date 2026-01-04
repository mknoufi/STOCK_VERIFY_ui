/**
 * Report Generation API Service - Endpoints for generating and exporting reports
 */

import api from "../httpClient";

// Types
export type ReportType =
  | "stock_summary"
  | "variance_report"
  | "user_activity"
  | "session_history"
  | "audit_trail";

export type ExportFormat = "csv" | "xlsx" | "pdf";

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
    frequency: "daily" | "weekly" | "monthly";
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
  schedule: ScheduleReportParams["schedule"];
  filters?: ReportFilters;
  recipients: string[];
  enabled: boolean;
  last_run?: string;
  next_run?: string;
  created_at: string;
  created_by: string;
}

// API Client
export const reportApi = {
  /**
   * Get available report types
   */
  getReportTypes: async (): Promise<ReportTypeInfo[]> => {
    const response = await api.get<{ report_types: ReportTypeInfo[] }>(
      "/api/reports/types",
    );
    return response.data.report_types;
  },

  /**
   * Preview report data before exporting
   */
  previewReport: async (
    reportType: ReportType,
    filters?: ReportFilters,
  ): Promise<ReportPreviewData> => {
    const response = await api.post<ReportPreviewData>("/api/reports/preview", {
      report_type: reportType,
      filters,
    });
    return response.data;
  },

  /**
   * Generate and download report
   */
  generateReport: async (params: GenerateReportParams): Promise<Blob> => {
    const response = await api.post("/api/reports/generate", params, {
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Generate report and get download URL
   */
  generateReportUrl: async (params: GenerateReportParams): Promise<string> => {
    const response = await api.post<{
      download_url: string;
      expires_in: number;
    }>("/api/reports/generate-url", params);
    return response.data.download_url;
  },

  /**
   * Get list of scheduled reports
   */
  getScheduledReports: async (): Promise<ScheduledReport[]> => {
    const response = await api.get<ScheduledReport[]>("/api/reports/schedules");
    return response.data;
  },

  /**
   * Create a scheduled report
   */
  createScheduledReport: async (
    params: ScheduleReportParams,
  ): Promise<ScheduledReport> => {
    const response = await api.post<ScheduledReport>(
      "/api/reports/schedules",
      params,
    );
    return response.data;
  },

  /**
   * Update a scheduled report
   */
  updateScheduledReport: async (
    id: string,
    params: Partial<ScheduleReportParams>,
  ): Promise<ScheduledReport> => {
    const response = await api.patch<ScheduledReport>(
      `/api/reports/schedules/${id}`,
      params,
    );
    return response.data;
  },

  /**
   * Delete a scheduled report
   */
  deleteScheduledReport: async (id: string): Promise<void> => {
    await api.delete(`/api/reports/schedules/${id}`);
  },

  /**
   * Run a scheduled report immediately
   */
  runScheduledReport: async (id: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(
      `/api/reports/schedules/${id}/run`,
    );
    return response.data;
  },

  /**
   * Get report execution history
   */
  getReportHistory: async (params?: {
    limit?: number;
    report_type?: ReportType;
  }): Promise<
    {
      id: string;
      report_type: ReportType;
      format: ExportFormat;
      status: "completed" | "failed" | "pending";
      created_at: string;
      completed_at?: string;
      file_size?: number;
      error_message?: string;
    }[]
  > => {
    const response = await api.get("/api/reports/history", { params });
    return response.data;
  },
};

// Helper function to trigger download
export async function downloadReport(
  params: GenerateReportParams,
  filename?: string,
): Promise<void> {
  const blob = await reportApi.generateReport(params);

  const defaultFilename = `${params.report_type}_${new Date().toISOString().split("T")[0]}.${params.format}`;
  const finalFilename = filename || defaultFilename;

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default reportApi;
