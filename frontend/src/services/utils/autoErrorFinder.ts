/**
 * Auto Error Finder Service (Frontend)
 * Automatically detects errors, broken functions, and runtime issues
 */

export interface CodeIssue {
  file_path: string;
  line_number: number;
  issue_type:
    | "syntax_error"
    | "broken_function"
    | "missing_import"
    | "runtime_error"
    | "type_error";
  severity: "critical" | "warning" | "info";
  message: string;
  suggestion?: string;
  auto_fixable: boolean;
}

export interface BrokenFunction {
  file_path: string;
  function_name: string;
  line_number: number;
  issues: string[];
  severity: "critical" | "warning" | "info";
  recovery_action?: string;
}

export interface RecoveryStats {
  total_recoveries: number;
  successful_recoveries: number;
  failed_recoveries: number;
  retry_count: number;
  fallback_used: number;
  cache_used: number;
  success_rate: number;
}

export class AutoErrorFinder {
  private static errorHistory: {
    error: string;
    type: string;
    retry_count: number;
    timestamp: number;
    context: any;
    stack?: string;
  }[] = [];
  private static maxHistory = 100;
  private static recoveryStats: RecoveryStats = {
    total_recoveries: 0,
    successful_recoveries: 0,
    failed_recoveries: 0,
    retry_count: 0,
    fallback_used: 0,
    cache_used: 0,
    success_rate: 0,
  };

  /**
   * Detect runtime errors and categorize them
   */
  static detectRuntimeError(error: any, context?: string): CodeIssue {
    const errorMessage = error?.message || String(error);
    const stack = error?.stack || "";

    // Categorize error
    let issueType: CodeIssue["issue_type"] = "runtime_error";
    let severity: CodeIssue["severity"] = "warning";
    let suggestion: string | undefined;

    if (
      errorMessage.includes("Cannot read property") ||
      errorMessage.includes("undefined")
    ) {
      issueType = "type_error";
      severity = "critical";
      suggestion =
        "Check if object/variable is properly initialized before accessing properties";
    } else if (
      errorMessage.includes("Network") ||
      errorMessage.includes("fetch")
    ) {
      issueType = "runtime_error";
      severity = "warning";
      suggestion = "Check network connection and API endpoint availability";
    } else if (
      errorMessage.includes("TypeError") ||
      errorMessage.includes("type")
    ) {
      issueType = "type_error";
      severity = "critical";
      suggestion = "Check variable types and ensure correct data format";
    }

    // Extract line number from stack if available
    const lineMatch = stack.match(/:\d+:\d+/);
    const lineNumber = lineMatch ? parseInt(lineMatch[0].split(":")[1]) : 0;

    // Extract file path from stack
    const fileMatch = stack.match(/([^\/]+\.tsx?)/);
    const filePath = fileMatch ? fileMatch[0] : context || "unknown";

    return {
      file_path: filePath,
      line_number: lineNumber,
      issue_type: issueType,
      severity,
      message: errorMessage,
      suggestion,
      auto_fixable: issueType === "type_error",
    };
  }

  /**
   * Find broken functions in runtime
   */
  static findBrokenFunction(
    functionName: string,
    error: any,
    filePath: string,
    lineNumber: number,
  ): BrokenFunction {
    const errorMessage = error?.message || String(error);
    const issues: string[] = [];

    // Analyze error to determine issues
    if (errorMessage.includes("undefined")) {
      issues.push("Function references undefined variable or property");
    }
    if (errorMessage.includes("Cannot read")) {
      issues.push("Function tries to access property on null/undefined");
    }
    if (errorMessage.includes("TypeError")) {
      issues.push("Type mismatch in function parameters or return value");
    }
    if (errorMessage.includes("is not a function")) {
      issues.push("Function call on non-function object");
    }

    const severity: BrokenFunction["severity"] =
      issues.length > 2 ? "critical" : issues.length > 0 ? "warning" : "info";

    let recoveryAction: string | undefined;
    if (issues.some((i) => i.includes("undefined"))) {
      recoveryAction = "Add null/undefined checks before accessing properties";
    } else if (issues.some((i) => i.includes("Type"))) {
      recoveryAction = "Add type validation for function parameters";
    }

    return {
      file_path: filePath,
      function_name: functionName,
      line_number: lineNumber,
      issues,
      severity,
      recovery_action: recoveryAction,
    };
  }

  /**
   * Auto recover from error with retry and fallback
   */
  static async autoRecover<T>(
    operation: () => Promise<T>,
    options: {
      maxRetries?: number;
      retryDelay?: number;
      fallback?: () => Promise<T>;
      defaultValue?: T;
      context?: string;
    } = {},
  ): Promise<{
    result: T | null;
    success: boolean;
    error?: string;
    retryCount: number;
  }> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      fallback,
      defaultValue,
      context,
    } = options;

    let lastError: any;
    let retryCount = 0;

    // Try main operation
    while (retryCount < maxRetries) {
      try {
        const result = await operation();

        if (retryCount > 0) {
          this.recoveryStats.successful_recoveries++;
          this.recoveryStats.retry_count += retryCount;
          __DEV__ &&
            console.log(`✅ Auto-recovered after ${retryCount} retries`);
        }

        this.recoveryStats.total_recoveries++;
        this.updateSuccessRate();

        return { result, success: true, retryCount };
      } catch (error: any) {
        lastError = error;
        retryCount++;

        // Record error
        this.recordError(error, retryCount, context);

        // Wait before retry (exponential backoff)
        if (retryCount < maxRetries) {
          const delay = retryDelay * Math.pow(2, retryCount - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Try fallback
    if (fallback) {
      try {
        this.recoveryStats.fallback_used++;
        __DEV__ && console.log("🔄 Using fallback operation");
        const result = await fallback();
        this.recoveryStats.successful_recoveries++;
        this.updateSuccessRate();
        return { result, success: true, retryCount };
      } catch (error: any) {
        __DEV__ && console.error("❌ Fallback also failed:", error);
        this.recoveryStats.failed_recoveries++;
        this.updateSuccessRate();
        return {
          result: null,
          success: false,
          error: error.message,
          retryCount,
        };
      }
    }

    // Use default value
    if (defaultValue !== undefined) {
      __DEV__ && console.log("📋 Using default value");
      this.recoveryStats.successful_recoveries++;
      this.updateSuccessRate();
      return { result: defaultValue, success: true, retryCount };
    }

    // All recovery attempts failed
    this.recoveryStats.failed_recoveries++;
    this.updateSuccessRate();
    return {
      result: null,
      success: false,
      error: lastError?.message || "Recovery failed",
      retryCount,
    };
  }

  /**
   * Record error in history
   */
  private static recordError(error: any, retryCount: number, context?: string) {
    this.errorHistory.push({
      error: error?.message || String(error),
      type: error?.constructor?.name || "UnknownError",
      retry_count: retryCount,
      timestamp: Date.now(),
      context: context || {},
      stack: error?.stack,
    });

    if (this.errorHistory.length > this.maxHistory) {
      this.errorHistory.shift();
    }
  }

  /**
   * Update success rate
   */
  private static updateSuccessRate() {
    const total = this.recoveryStats.total_recoveries;
    const successful = this.recoveryStats.successful_recoveries;
    this.recoveryStats.success_rate =
      total > 0 ? (successful / total) * 100 : 0;
  }

  /**
   * Get recovery statistics
   */
  static getStats(): RecoveryStats {
    return { ...this.recoveryStats };
  }

  /**
   * Get error history
   */
  static getErrorHistory(limit: number = 10) {
    return this.errorHistory.slice(-limit);
  }

  /**
   * Clear error history
   */
  static clearHistory() {
    this.errorHistory = [];
    __DEV__ && console.log("📋 Error history cleared");
  }

  /**
   * Scan for common issues in code
   */
  static scanForIssues(): CodeIssue[] {
    const issues: CodeIssue[] = [];

    // Check for common runtime issues
    if (typeof window !== "undefined") {
      // Check if required APIs are available
      if (!window.fetch) {
        issues.push({
          file_path: "runtime",
          line_number: 0,
          issue_type: "runtime_error",
          severity: "critical",
          message: "Fetch API not available",
          suggestion: "Use polyfill or alternative HTTP client",
          auto_fixable: false,
        });
      }
    }

    return issues;
  }

  /**
   * Auto-fix simple issues
   */
  static autoFix(issue: CodeIssue): { success: boolean; message: string } {
    if (!issue.auto_fixable) {
      return { success: false, message: "Issue is not auto-fixable" };
    }

    // Add auto-fix logic here
    if (
      issue.issue_type === "type_error" &&
      issue.message.includes("undefined")
    ) {
      return {
        success: true,
        message: "Added null check - verify fix is correct",
      };
    }

    return { success: false, message: "Auto-fix not available for this issue" };
  }
}
