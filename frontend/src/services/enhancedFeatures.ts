export const AnalyticsService = {
  trackCount: async (itemCode: string, quantity: number) => {
    // Stub implementation
    console.log("Tracking count:", itemCode, quantity);
  },
  trackItemScan: async (itemCode: string, itemName: string) => {
    // Stub implementation
    console.log("Tracking item scan:", itemCode, itemName);
  },
};

export const RecentItemsService = {
  addRecent: async (itemCode: string, item: any) => {
    // Stub implementation - stores recent items in memory
    console.log("Adding to recent items:", itemCode);
  },
  getRecent: async (): Promise<any[]> => {
    // Stub implementation
    return [];
  },
  clearRecent: async () => {
    // Stub implementation
    console.log("Clearing recent items");
  },
};
