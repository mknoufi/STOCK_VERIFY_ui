import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Item } from "../types/scan";

const RECENT_ITEMS_KEY = "stock_verify_recent_items";

/** Recent item with scan timestamp */
export interface RecentItem extends Item {
  scanned_at: string;
  floor_no?: string;
  rack_no?: string;
  counted_qty?: number;
}

/** Generic analytics data payload */
type AnalyticsData = Record<string, string | number | boolean | undefined>;

export const AnalyticsService = {
  trackCount: async (itemCode: string, quantity: number) => {
    // Stub implementation
    console.log("Tracking count:", itemCode, quantity);
  },
  trackItemScan: async (itemCode: string, itemName: string) => {
    // Stub implementation
    console.log("Tracking item scan:", itemCode, itemName);
  },
  getRecentActivity: async (_sessionId: string): Promise<RecentItem[]> => {
    // Stub implementation - returns recent activity for a session
    return [];
  },
  trackEvent: async (eventName: string, data: AnalyticsData) => {
    // Stub implementation
    console.log("Tracking event:", eventName, data);
  },
};

export const RecentItemsService = {
  addRecent: async (itemCode: string, item: Item) => {
    try {
      const existingItems = await RecentItemsService.getRecent();

      // Remove duplicate if exists
      const filtered = existingItems.filter(
        (i) => (i.item_code || i.barcode) !== itemCode,
      );

      // Add new item to beginning
      const newItem: RecentItem = {
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

  getRecent: async (): Promise<RecentItem[]> => {
    try {
      const items = await AsyncStorage.getItem(RECENT_ITEMS_KEY);
      return items ? JSON.parse(items) : [];
    } catch (error) {
      console.error("Error getting recent items:", error);
      return [];
    }
  },

  getRecentItems: async (_itemCode: string): Promise<RecentItem[]> => {
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
