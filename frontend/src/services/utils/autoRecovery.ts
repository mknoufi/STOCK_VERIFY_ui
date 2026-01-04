/**
 * Auto Recovery Service (Frontend)
 * Integrates with AutoErrorFinder for comprehensive error recovery
 */

import { AutoErrorFinder, RecoveryStats } from "./autoErrorFinder";
import { ErrorHandler } from "./errorHandler";

export class AutoRecovery {
  /**
   * Recover from error with automatic retry and fallback
   */
  static async recover<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      fallback?: () => Promise<T>;
      defaultValue?: T;
      context?: string;
      showAlert?: boolean;
    } = {},
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      fallback,
      defaultValue,
      context,
      showAlert = false,
    } = options;

    const recovery = await AutoErrorFinder.autoRecover(operation, {
      maxRetries,
      retryDelay,
      fallback,
      defaultValue,
      context,
    });

    if (recovery.success && recovery.result !== null) {
      return recovery.result;
    }

    // Log error and show alert if needed
    const error = recovery.error
      ? new Error(recovery.error)
      : new Error("Operation failed");
    const issue = AutoErrorFinder.detectRuntimeError(error, context);

    if (showAlert) {
      ErrorHandler.showError(error, context || "Operation Failed");
    }

    __DEV__ &&
      console.error("Auto recovery failed:", {
        context,
        retryCount: recovery.retryCount,
        error: recovery.error,
        issue,
      });

    throw error;
  }

  /**
   * Get recovery statistics
   */
  static getStats(): RecoveryStats {
    return AutoErrorFinder.getStats();
  }

  /**
   * Get error history
   */
  static getErrorHistory(limit: number = 10) {
    return AutoErrorFinder.getErrorHistory(limit);
  }

  /**
   * Clear error history
   */
  static clearHistory() {
    AutoErrorFinder.clearHistory();
  }

  /**
   * Scan for runtime issues
   */
  static scanForIssues() {
    return AutoErrorFinder.scanForIssues();
  }

  /**
   * Auto-fix detected issues
   */
  static autoFix(issues: any[]) {
    const results = issues.map((issue) => AutoErrorFinder.autoFix(issue));
    return {
      total: issues.length,
      fixed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    };
  }
}
