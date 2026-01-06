/**
 * Reports Domain - Services
 *
 * Re-exports report-related services from the main API layer.
 * Types are defined in ./types.ts to avoid conflicts.
 */

export { reportApi } from '../../services/api/reportApi';

// Activity and error logs (from main api.ts)
export {
  getActivityLogs,
  getActivityStats,
  getErrorLogs,
  getErrorStats,
  getErrorDetail,
  resolveError,
  clearErrorLogs,
} from '../../services/api/api';
