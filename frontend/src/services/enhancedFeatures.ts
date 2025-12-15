import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENT_ITEMS_KEY = "stock_verify_recent_items";

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
    try {
      const existingItems = await RecentItemsService.getRecent();

      // Remove duplicate if exists
      const filtered = existingItems.filter((i: any) => (i.item_code || i.barcode) !== itemCode);

      // Add new item to beginning
      const newItem = {
        ...item,
        scanned_at: new Date().toISOString(),
        item_code: itemCode, // Ensure item_code is set
      };

      const updated = [newItem, ...filtered].slice(0, 10); // Keep last 10

      await AsyncStorage.setItem(RECENT_ITEMS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Error adding recent item:", error);
    }
  },

  getRecent: async (): Promise<any[]> => {
    try {
      const items = await AsyncStorage.getItem(RECENT_ITEMS_KEY);
      return items ? JSON.parse(items) : [];
    } catch (error) {
      console.error("Error getting recent items:", error);
      return [];
    }
  },

  getRecentItems: async (_itemCode: string): Promise<any[]> => {
    // This seems to be an alias or specific query that mimics getRecent for now
    // Based on usage in scan-v2, it likely just needs the general list
    return RecentItemsService.getRecent();
  },

  clearRecent: async () => {
    try {
      await AsyncStorage.removeItem(RECENT_ITEMS_KEY);
    } catch (error) {
      console.error("Error clearing recent items:", error);
    }
  },
};
