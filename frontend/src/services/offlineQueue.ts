// Compatibility facade: re-export the real offline queue implementation.
// This keeps existing import paths working while enabling full offline support.

export {
  startOfflineQueue,
  stopOfflineQueue,
  attachOfflineQueueInterceptors,
  enqueueMutation,
  flushOfflineQueue,
  getQueueCount,
  listQueue,
  getConflicts,
  getConflictsCount,
  resolveConflict,
} from "./offline/offlineQueue";
