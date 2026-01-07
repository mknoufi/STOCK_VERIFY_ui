/**
 * Reports Domain - Index
 *
 * Central export point for all reports domain functionality.
 */

// Types (canonical source)
export {
  ReportType,
  ExportFormat,
  ReportFilters,
  ReportTypeInfo,
  ReportPreviewData,
  GenerateReportParams,
  ScheduleReportParams,
  ScheduledReport,
  DiscrepancyItem,
  DiscrepancyReport,
} from "./types";

// Services
export {
  reportApi,
  getActivityLogs,
  getActivityStats,
  getErrorLogs,
  getErrorStats,
  getErrorDetail,
  resolveError,
  clearErrorLogs,
} from "./services";
