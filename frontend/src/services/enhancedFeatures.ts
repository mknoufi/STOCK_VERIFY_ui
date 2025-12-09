export const AnalyticsService = {
  trackCount: async (itemCode: string, quantity: number) => {
    // Stub implementation
    console.log("Tracking count:", itemCode, quantity);
  },
  trackItemScan: async (itemCode: string, itemName: string) => {
    // Stub implementation
    console.log("Tracking item scan:", itemCode, itemName);
  },
  getRecentActivity: async (_sessionId: string): Promise<any[]> => {
    // Stub implementation - returns recent activity for a session
    return [];
  },
  trackEvent: async (eventName: string, data: Record<string, any>) => {
    // Stub implementation
    console.log("Tracking event:", eventName, data);
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
  getRecentItems: async (_itemCode: string): Promise<any[]> => {
    // Stub implementation - returns recent items for a specific item code
    return [];
  },
  clearRecent: async () => {
    // Stub implementation
    console.log("Clearing recent items");
  },
};
