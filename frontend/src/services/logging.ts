/**
 * Structured Logging Service
 *
 * Provides environment-aware logging with proper sinks.
 * Replaces scattered __DEV__ && console.log patterns.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  module?: string;
}

type LogSink = (entry: LogEntry) => void;

// Check if we're in development mode
const isDev =
  typeof __DEV__ !== "undefined"
    ? __DEV__
    : process.env.NODE_ENV === "development";

// Console sink for development
const consoleSink: LogSink = (entry) => {
  const prefix = `[${entry.timestamp.slice(11, 23)}]`;
  const moduleTag = entry.module ? `[${entry.module}]` : "";
  const fullMessage = `${prefix}${moduleTag} ${entry.message}`;

  switch (entry.level) {
    case "debug":
      console.log(`🔍 ${fullMessage}`, entry.context ?? "");
      break;
    case "info":
      console.info(`ℹ️ ${fullMessage}`, entry.context ?? "");
      break;
    case "warn":
      console.warn(`⚠️ ${fullMessage}`, entry.context ?? "");
      break;
    case "error":
      console.error(`❌ ${fullMessage}`, entry.context ?? "");
      break;
  }
};

// Production sink - can be extended to send to remote logging service
const productionSink: LogSink = (entry) => {
  // In production, only log warnings and errors
  if (entry.level === "error" || entry.level === "warn") {
    // Could integrate with Sentry, LogRocket, etc.
    // For now, just use console but could be extended
    console[entry.level](entry.message, entry.context ?? "");
  }
};

// Active sinks based on environment
const activeSinks: LogSink[] = isDev ? [consoleSink] : [productionSink];

/**
 * Internal log function
 */
function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  module?: string,
): void {
  const entry: LogEntry = {
    level,
    message,
    context,
    timestamp: new Date().toISOString(),
    module,
  };

  activeSinks.forEach((sink) => {
    try {
      sink(entry);
    } catch {
      // Silently fail - don't let logging break the app
    }
  });
}

/**
 * Logger instance - use this for structured logging
 *
 * Usage:
 * ```ts
 * import { logger } from '@/services/logging';
 *
 * logger.debug('Looking up barcode', { barcode: '123456' });
 * logger.error('API call failed', { error: err.message });
 * ```
 */
export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    log("error", message, context),
};

/**
 * Create a scoped logger with module name prefix
 *
 * Usage:
 * ```ts
 * const log = createLogger('BarcodeService');
 * log.debug('Found item', { itemCode: '12345' });
 * // Outputs: [BarcodeService] Found item { itemCode: '12345' }
 * ```
 */
export function createLogger(module: string) {
  return {
    debug: (message: string, context?: Record<string, unknown>) =>
      log("debug", message, context, module),
    info: (message: string, context?: Record<string, unknown>) =>
      log("info", message, context, module),
    warn: (message: string, context?: Record<string, unknown>) =>
      log("warn", message, context, module),
    error: (message: string, context?: Record<string, unknown>) =>
      log("error", message, context, module),
  };
}

/**
 * Add a custom log sink (e.g., for remote logging)
 */
export function addLogSink(sink: LogSink): void {
  activeSinks.push(sink);
}

/**
 * Remove a log sink
 */
export function removeLogSink(sink: LogSink): void {
  const index = activeSinks.indexOf(sink);
  if (index > -1) {
    activeSinks.splice(index, 1);
  }
}

export type { LogLevel, LogEntry, LogSink };
