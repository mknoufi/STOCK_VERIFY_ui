export const initializeSyncService = () => {
  // Stub implementation
  console.log('Sync service initialized');
};

export const getSyncStatus = async () => {
  return {
    isOnline: true,
    queuedOperations: 0,
    lastSync: new Date().toISOString(),
    cacheSize: 0,
    needsSync: false,
  };
};

export const syncOfflineQueue = async (options?: any) => {
  console.log('Syncing offline queue...', options);
  return { processed: 0, remaining: 0 };
};
