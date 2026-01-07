import { logger } from "../logging";
import { useAuthStore } from "../../store/authStore";

/**
 * Service for logging user actions for audit purposes.
 * This can be used to track critical actions like stock updates, deletions, or syncs.
 */
export const auditLogger = {
  /**
   * Log a user action with optional metadata
   * @param action - The name of the action being performed
   * @param metadata - Additional details about the action
   */
  logAction: (action: string, metadata: Record<string, any> = {}) => {
    const user = useAuthStore.getState().user;

    const logEntry = {
      action,
      userId: user?.id || "anonymous",
      username: user?.username || "anonymous",
      timestamp: new Date().toISOString(),
      ...metadata,
    };

    // Log to console/local logging service
    logger.info(
      `[AUDIT] User ${logEntry.username} performed ${action}`,
      logEntry,
    );

    // In a real app, this would also send to a backend endpoint
    // auditApi.postLog(logEntry);
  },

  /**
   * Specifically log a stock adjustment
   */
  logStockAdjustment: (
    itemCode: string,
    oldQty: number,
    newQty: number,
    reason: string,
  ) => {
    auditLogger.logAction("stock_adjustment", {
      itemCode,
      oldQty,
      newQty,
      reason,
    });
  },

  /**
   * Specifically log a sync operation
   */
  logSync: (
    type: "manual" | "auto",
    status: "success" | "failure",
    details?: string,
  ) => {
    auditLogger.logAction("sync_operation", {
      type,
      status,
      details,
    });
  },
};
