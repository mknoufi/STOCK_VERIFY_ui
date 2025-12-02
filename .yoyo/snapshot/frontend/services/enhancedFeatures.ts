/**
 * Enhanced Features Service
 * Provides advanced features like search, filters, analytics, and more
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCacheStats } from './offlineStorage';

export interface SearchFilters {
  warehouse?: string;
  category?: string;
  minStock?: number;
  maxStock?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface SearchOptions {
  query: string;
  filters?: SearchFilters;
  limit?: number;
  offset?: number;
}

export interface ItemAnalytics {
  item_code: string;
  item_name: string;
  scanCount: number;
  lastScanned: string;
  totalCounted: number;
  avgCounted: number;
}

export interface SessionAnalytics {
  session_id: string;
  warehouse: string;
  totalItems: number;
  totalCounted: number;
  varianceCount: number;
  completedAt?: string;
  duration?: number;
}

/**
 * Advanced Search with Filters
 */
export class AdvancedSearch {
  /**
   * Search items with filters
   */
  static async searchItems(
    items: any[],
    options: SearchOptions
  ): Promise<any[]> {
    const { query = '', filters, limit = 50, offset = 0 } = options;

    let results = items;

    // Text search
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      results = results.filter(
        (item) =>
          item.item_code?.toLowerCase().includes(lowerQuery) ||
          item.item_name?.toLowerCase().includes(lowerQuery) ||
          item.barcode?.toLowerCase().includes(lowerQuery) ||
          item.category?.toLowerCase().includes(lowerQuery)
      );
    }

    // Apply filters
    if (filters) {
      if (filters.warehouse) {
        results = results.filter((item) => item.warehouse === filters.warehouse);
      }

      if (filters.category) {
        results = results.filter((item) => item.category === filters.category);
      }

      if (filters.minStock !== undefined) {
        results = results.filter((item) => item.stock_qty >= filters.minStock!);
      }

      if (filters.maxStock !== undefined) {
        results = results.filter((item) => item.stock_qty <= filters.maxStock!);
      }
    }

    // Sort by relevance (items matching query first)
    if (query.trim()) {
      results.sort((a, b) => {
        const aRelevance = this.calculateRelevance(a, query);
        const bRelevance = this.calculateRelevance(b, query);
        return bRelevance - aRelevance;
      });
    }

    // Apply pagination
    return results.slice(offset, offset + limit);
  }

  /**
   * Calculate search relevance score
   */
  private static calculateRelevance(item: any, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    // Exact match in code (highest score)
    if (item.item_code?.toLowerCase() === lowerQuery) {
      score += 100;
    } else if (item.item_code?.toLowerCase().startsWith(lowerQuery)) {
      score += 50;
    } else if (item.item_code?.toLowerCase().includes(lowerQuery)) {
      score += 25;
    }

    // Name match
    if (item.item_name?.toLowerCase().includes(lowerQuery)) {
      score += 30;
    }

    // Barcode match
    if (item.barcode?.toLowerCase().includes(lowerQuery)) {
      score += 20;
    }

    // Category match
    if (item.category?.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    return score;
  }

  /**
   * Get search suggestions
   */
  static getSearchSuggestions(items: any[], query: string, limit: number = 5): string[] {
    if (!query.trim()) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const suggestions = new Set<string>();

    // Find matching item codes
    items.forEach((item) => {
      if (item.item_code?.toLowerCase().includes(lowerQuery)) {
        suggestions.add(item.item_code);
      }
      if (item.item_name?.toLowerCase().includes(lowerQuery)) {
        suggestions.add(item.item_name);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }
}

/**
 * Analytics Service
 */
export class AnalyticsService {
  private static readonly STORAGE_KEY = 'analytics_data';

  /**
   * Track item scan
   */
  static async trackItemScan(itemCode: string, itemName: string) {
    try {
      const analytics = await this.getAnalytics();

      if (!analytics.items[itemCode]) {
        analytics.items[itemCode] = {
          item_code: itemCode,
          item_name: itemName,
          scanCount: 0,
          lastScanned: '',
          totalCounted: 0,
          avgCounted: 0,
        };
      }

      const itemAnalytics = analytics.items[itemCode];
      itemAnalytics.scanCount += 1;
      itemAnalytics.lastScanned = new Date().toISOString();

      await this.saveAnalytics(analytics);
    } catch (error) {
      console.error('Error tracking item scan:', error);
    }
  }

  /**
   * Track count operation
   */
  static async trackCount(itemCode: string, countedQty: number) {
    try {
      const analytics = await this.getAnalytics();

      if (!analytics.items[itemCode]) {
        analytics.items[itemCode] = {
          item_code: itemCode,
          item_name: '',
          scanCount: 0,
          lastScanned: '',
          totalCounted: 0,
          avgCounted: 0,
        };
      }

      const itemAnalytics = analytics.items[itemCode];
      itemAnalytics.totalCounted += countedQty;
      itemAnalytics.avgCounted = itemAnalytics.totalCounted / itemAnalytics.scanCount;

      await this.saveAnalytics(analytics);
    } catch (error) {
      console.error('Error tracking count:', error);
    }
  }

  /**
   * Get item analytics
   */
  static async getItemAnalytics(itemCode: string): Promise<ItemAnalytics | null> {
    try {
      const analytics = await this.getAnalytics();
      return analytics.items[itemCode] || null;
    } catch (error) {
      console.error('Error getting item analytics:', error);
      return null;
    }
  }

  /**
   * Get top scanned items
   */
  static async getTopScannedItems(limit: number = 10): Promise<ItemAnalytics[]> {
    try {
      const analytics = await this.getAnalytics();
      const items = Object.values(analytics.items) as ItemAnalytics[];

      return items
        .sort((a, b) => b.scanCount - a.scanCount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting top scanned items:', error);
      return [];
    }
  }

  /**
   * Get analytics data
   */
  private static async getAnalytics(): Promise<{
    items: Record<string, ItemAnalytics>;
  }> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : { items: {} };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return { items: {} };
    }
  }

  /**
   * Save analytics data
   */
  private static async saveAnalytics(analytics: { items: Record<string, ItemAnalytics> }) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(analytics));
    } catch (error) {
      console.error('Error saving analytics:', error);
    }
  }

  /**
   * Clear analytics
   */
  static async clearAnalytics() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing analytics:', error);
    }
  }
}

/**
 * Favorite Items Service
 */
export class FavoriteItemsService {
  private static readonly STORAGE_KEY = 'favorite_items';

  /**
   * Add item to favorites
   */
  static async addFavorite(itemCode: string, itemData: any) {
    try {
      const favorites = await this.getFavorites();
      favorites[itemCode] = {
        ...itemData,
        addedAt: new Date().toISOString(),
      };
      await this.saveFavorites(favorites);
    } catch (error) {
      console.error('Error adding favorite:', error);
    }
  }

  /**
   * Remove item from favorites
   */
  static async removeFavorite(itemCode: string) {
    try {
      const favorites = await this.getFavorites();
      delete favorites[itemCode];
      await this.saveFavorites(favorites);
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  }

  /**
   * Check if item is favorite
   */
  static async isFavorite(itemCode: string): Promise<boolean> {
    try {
      const favorites = await this.getFavorites();
      return !!favorites[itemCode];
    } catch (error) {
      console.error('Error checking favorite:', error);
      return false;
    }
  }

  /**
   * Get all favorites
   */
  static async getFavorites(): Promise<Record<string, any>> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error getting favorites:', error);
      return {};
    }
  }

  /**
   * Save favorites
   */
  private static async saveFavorites(favorites: Record<string, any>) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites:', error);
    }
  }
}

/**
 * Recent Items Service
 */
export class RecentItemsService {
  private static readonly STORAGE_KEY = 'recent_items';
  private static readonly MAX_RECENT = 20;

  /**
   * Add item to recent
   */
  static async addRecent(itemCode: string, itemData: any) {
    try {
      const recent = await this.getAllRecent();

      // Remove if already exists
      const filtered = recent.filter((item: any) => item.item_code !== itemCode);

      // Add to front
      filtered.unshift({
        ...itemData,
        accessedAt: new Date().toISOString(),
      });

      // Keep only max recent
      const limited = filtered.slice(0, this.MAX_RECENT);

      await this.saveRecent(limited);
    } catch (error) {
      console.error('Error adding recent:', error);
    }
  }

  /**
   * Get recent items with limit
   */
  static async getRecentWithLimit(limit: number = 10): Promise<any[]> {
    try {
      const recent = await this.getAllRecent();
      return recent.slice(0, limit);
    } catch (error) {
      console.error('Error getting recent:', error);
      return [];
    }
  }

  /**
   * Clear recent items
   */
  static async clearRecent() {
    try {
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing recent:', error);
    }
  }

  /**
   * Get all recent items
   */
  private static async getAllRecent(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting recent:', error);
      return [];
    }
  }

  /**
   * Save recent items
   */
  private static async saveRecent(recent: any[]) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(recent));
    } catch (error) {
      console.error('Error saving recent:', error);
    }
  }
}

/**
 * System Statistics Service
 */
export class SystemStatsService {
  /**
   * Get system statistics
   */
  static async getSystemStats() {
    try {
      const cacheStats = await getCacheStats();
      const analytics = await AnalyticsService.getTopScannedItems(5);
      const favorites = await FavoriteItemsService.getFavorites();
      const recent = await RecentItemsService.getRecentWithLimit(5);

      return {
        cache: {
          items: cacheStats.itemsCount,
          queued: cacheStats.queuedOperations,
          sessions: cacheStats.sessionsCount,
          countLines: cacheStats.countLinesCount,
          sizeKB: cacheStats.cacheSizeKB,
          lastSync: cacheStats.lastSync,
        },
        analytics: {
          topScanned: analytics,
          totalScans: analytics.reduce((sum, item) => sum + item.scanCount, 0),
        },
        favorites: {
          count: Object.keys(favorites).length,
          items: Object.values(favorites),
        },
        recent: {
          count: recent.length,
          items: recent,
        },
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return null;
    }
  }
}
