export const startOfflineQueue = (_client?: unknown) => {
  // Stub implementation - accepts optional client parameter
  console.log('Offline queue started');
};

export const stopOfflineQueue = () => {
  // Stub implementation
  console.log('Offline queue stopped');
};

export const getQueueCount = (): number => {
  return 0;
};

export const getConflictsCount = (): number => {
  return 0;
};

export const flushOfflineQueue = async (): Promise<void> => {
  console.log('Flushing offline queue');
};
