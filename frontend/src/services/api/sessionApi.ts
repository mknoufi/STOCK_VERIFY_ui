/**
 * Session API Service
 *
 * Handles all session-related API calls including:
 * - Session CRUD operations
 * - Bulk status updates (close, reconcile, export)
 * - Session statistics and summaries
 *
 * @module services/api/sessionApi
 *
 * @example
 * ```typescript
 * import { sessionApi } from "./sessionApi";
 *
 * // Bulk close sessions
 * const result = await sessionApi.bulkClose(["session-1", "session-2"]);
 *
 * // Bulk reconcile
 * await sessionApi.bulkReconcile(selectedIds);
 * ```
 */
import api from "../httpClient";
import { createLogger } from "../logging";
import { isOnline } from "../../utils/network";
import { addToOfflineQueue } from "../offline/offlineStorage";

const log = createLogger("SessionApi");

// ============================================================================
// Types
// ============================================================================

export type SessionStatus = "OPEN" | "CLOSED" | "RECONCILE" | "EXPORTED" | "ARCHIVED";

export interface Session {
  id: string;
  warehouse: string;
  status: SessionStatus;
  type: string;
  staff_user: string;
  staff_name: string;
  started_at: string;
  closed_at?: string;
  reconciled_at?: string;
  total_items: number;
  total_variance: number;
  notes?: string;
}

export interface BulkOperationResult {
  success: boolean;
  updated_count: number;
  total: number;
  errors: { session_id: string; error: string }[];
}

export interface BulkExportResult {
  success: boolean;
  exported_count: number;
  total: number;
  data: Session[];
  download_url?: string;
}

export type ExportFormat = "excel" | "csv" | "pdf";

export interface SessionFilters {
  status?: SessionStatus | SessionStatus[];
  warehouse?: string;
  staff_user?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface SessionListResponse {
  sessions: Session[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// ============================================================================
// Error class for session operations
// ============================================================================

export class SessionApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public userMessage: string,
    public recoverable: boolean = true,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SessionApiError";
  }
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Session API client with offline support for bulk operations
 */
export const sessionApi = {
  // --------------------------------------------------------------------------
  // Bulk Operations
  // --------------------------------------------------------------------------

  /**
   * Bulk close multiple sessions
   * @param sessionIds - Array of session IDs to close
   * @returns Result with success count and any errors
   */
  async bulkClose(sessionIds: string[]): Promise<BulkOperationResult> {
    log.info("Bulk close sessions", { count: sessionIds.length });

    if (!(await isOnline())) {
      log.warn("Offline - queueing bulk close operation");
      await addToOfflineQueue("session", {
        operation: "bulk_close",
        sessionIds,
        timestamp: new Date().toISOString(),
      });

      // Return optimistic result
      return {
        success: true,
        updated_count: sessionIds.length,
        total: sessionIds.length,
        errors: [],
      };
    }

    try {
      const response = await api.post<BulkOperationResult>(
        "/api/sessions/bulk/close",
        sessionIds
      );

      log.info("Bulk close completed", {
        updated: response.data.updated_count,
        errors: response.data.errors.length,
      });

      return response.data;
    } catch (error) {
      log.error("Bulk close failed", { error });
      throw new SessionApiError(
        "BULK_CLOSE_FAILED",
        "Failed to close sessions",
        "Could not close the selected sessions. Please try again.",
        true,
        { sessionIds, error }
      );
    }
  },

  /**
   * Bulk reconcile multiple sessions
   * @param sessionIds - Array of session IDs to reconcile
   * @returns Result with success count and any errors
   */
  async bulkReconcile(sessionIds: string[]): Promise<BulkOperationResult> {
    log.info("Bulk reconcile sessions", { count: sessionIds.length });

    if (!(await isOnline())) {
      log.warn("Offline - queueing bulk reconcile operation");
      await addToOfflineQueue("session", {
        operation: "bulk_reconcile",
        sessionIds,
        timestamp: new Date().toISOString(),
      });

      return {
        success: true,
        updated_count: sessionIds.length,
        total: sessionIds.length,
        errors: [],
      };
    }

    try {
      const response = await api.post<BulkOperationResult>(
        "/api/sessions/bulk/reconcile",
        sessionIds
      );

      log.info("Bulk reconcile completed", {
        updated: response.data.updated_count,
        errors: response.data.errors.length,
      });

      return response.data;
    } catch (error) {
      log.error("Bulk reconcile failed", { error });
      throw new SessionApiError(
        "BULK_RECONCILE_FAILED",
        "Failed to reconcile sessions",
        "Could not reconcile the selected sessions. Please try again.",
        true,
        { sessionIds, error }
      );
    }
  },

  /**
   * Bulk export sessions to file
   * @param sessionIds - Array of session IDs to export
   * @param format - Export format (excel, csv, pdf)
   * @returns Export result with data or download URL
   */
  async bulkExport(
    sessionIds: string[],
    format: ExportFormat = "excel"
  ): Promise<BulkExportResult> {
    log.info("Bulk export sessions", { count: sessionIds.length, format });

    if (!(await isOnline())) {
      throw new SessionApiError(
        "EXPORT_REQUIRES_NETWORK",
        "Export requires network connection",
        "Please connect to the network to export sessions.",
        true
      );
    }

    try {
      const response = await api.post<BulkExportResult>(
        `/api/sessions/bulk/export?format=${format}`,
        sessionIds
      );

      log.info("Bulk export completed", {
        exported: response.data.exported_count,
      });

      return response.data;
    } catch (error) {
      log.error("Bulk export failed", { error });
      throw new SessionApiError(
        "BULK_EXPORT_FAILED",
        "Failed to export sessions",
        "Could not export the selected sessions. Please try again.",
        true,
        { sessionIds, format, error }
      );
    }
  },

  /**
   * Bulk update session status (generic)
   * @param sessionIds - Array of session IDs
   * @param status - Target status
   * @returns Result with success count and any errors
   */
  async bulkUpdateStatus(
    sessionIds: string[],
    status: SessionStatus
  ): Promise<BulkOperationResult> {
    log.info("Bulk update status", { count: sessionIds.length, status });

    // Route to appropriate endpoint based on status
    switch (status) {
      case "CLOSED":
        return this.bulkClose(sessionIds);
      case "RECONCILE":
        return this.bulkReconcile(sessionIds);
      default:
        throw new SessionApiError(
          "UNSUPPORTED_BULK_STATUS",
          `Bulk update to ${status} is not supported`,
          `Cannot bulk update sessions to "${status}" status.`,
          false
        );
    }
  },

  // --------------------------------------------------------------------------
  // Session List Operations
  // --------------------------------------------------------------------------

  /**
   * Get paginated list of sessions with optional filters
   * @param page - Page number (1-indexed)
   * @param pageSize - Items per page
   * @param filters - Optional filters
   * @returns Paginated session list
   */
  async getSessions(
    page: number = 1,
    pageSize: number = 20,
    filters?: SessionFilters
  ): Promise<SessionListResponse> {
    log.debug("Get sessions", { page, pageSize, filters });

    const params = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    });

    if (filters?.status) {
      const statuses = Array.isArray(filters.status)
        ? filters.status.join(",")
        : filters.status;
      params.append("status", statuses);
    }
    if (filters?.warehouse) params.append("warehouse", filters.warehouse);
    if (filters?.staff_user) params.append("staff_user", filters.staff_user);
    if (filters?.date_from) params.append("date_from", filters.date_from);
    if (filters?.date_to) params.append("date_to", filters.date_to);
    if (filters?.search) params.append("search", filters.search);

    try {
      const response = await api.get<SessionListResponse>(
        `/api/sessions?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      log.error("Get sessions failed", { error });
      throw new SessionApiError(
        "GET_SESSIONS_FAILED",
        "Failed to fetch sessions",
        "Could not load sessions. Please try again.",
        true,
        { page, pageSize, filters, error }
      );
    }
  },

  /**
   * Get a single session by ID
   * @param sessionId - Session ID
   * @returns Session details
   */
  async getSession(sessionId: string): Promise<Session> {
    log.debug("Get session", { sessionId });

    try {
      const response = await api.get<Session>(`/api/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      log.error("Get session failed", { sessionId, error });
      throw new SessionApiError(
        "GET_SESSION_FAILED",
        "Failed to fetch session",
        "Could not load session details. Please try again.",
        true,
        { sessionId, error }
      );
    }
  },

  // --------------------------------------------------------------------------
  // Session Actions
  // --------------------------------------------------------------------------

  /**
   * Close a single session
   * @param sessionId - Session ID to close
   * @returns Updated session
   */
  async closeSession(sessionId: string): Promise<Session> {
    log.info("Close session", { sessionId });

    if (!(await isOnline())) {
      await addToOfflineQueue("session", {
        operation: "close",
        sessionId,
        timestamp: new Date().toISOString(),
      });

      // Return optimistic result
      return {
        id: sessionId,
        status: "CLOSED",
        closed_at: new Date().toISOString(),
      } as Session;
    }

    try {
      const response = await api.post<Session>(
        `/api/sessions/${sessionId}/close`
      );
      return response.data;
    } catch (error) {
      log.error("Close session failed", { sessionId, error });
      throw new SessionApiError(
        "CLOSE_SESSION_FAILED",
        "Failed to close session",
        "Could not close the session. Please try again.",
        true,
        { sessionId, error }
      );
    }
  },

  /**
   * Reconcile a single session
   * @param sessionId - Session ID to reconcile
   * @returns Updated session
   */
  async reconcileSession(sessionId: string): Promise<Session> {
    log.info("Reconcile session", { sessionId });

    if (!(await isOnline())) {
      await addToOfflineQueue("session", {
        operation: "reconcile",
        sessionId,
        timestamp: new Date().toISOString(),
      });

      return {
        id: sessionId,
        status: "RECONCILE",
        reconciled_at: new Date().toISOString(),
      } as Session;
    }

    try {
      const response = await api.post<Session>(
        `/api/sessions/${sessionId}/reconcile`
      );
      return response.data;
    } catch (error) {
      log.error("Reconcile session failed", { sessionId, error });
      throw new SessionApiError(
        "RECONCILE_SESSION_FAILED",
        "Failed to reconcile session",
        "Could not reconcile the session. Please try again.",
        true,
        { sessionId, error }
      );
    }
  },
};

// Default export for convenience
export default sessionApi;
