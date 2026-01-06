// Enhanced Search Service for advanced item searching
import { searchItemsOptimized, getSearchSuggestions as getApiSuggestions } from './api/api';

export interface SearchResult {
  id: string;
  item_code: string;
  name: string;
  item_name?: string;
  barcode?: string;
  mrp?: number;
  stock_qty?: number;
  category?: string;
  subcategory?: string;
  uom_name?: string;
  item_group?: string;
  warehouse?: string;
  location?: string;
  matchType?: string;
  floor?: string;
  rack?: string;
  relevance_score?: number;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  warehouse?: string;
  hasStock?: boolean;
  minMrp?: number;
  maxMrp?: number;
}

export const EnhancedSearchService = {
  searchItems: async (
    filters: SearchFilters,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    items: SearchResult[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    try {
      const query = filters.query || '';
      if (!query || query.length < 2) {
        return {
          items: [],
          total: 0,
          page,
          totalPages: 0,
        };
      }

      // Use new optimized search endpoint
      const result = await searchItemsOptimized(query, page, limit);

      // Map to SearchResult interface
      const items: SearchResult[] = result.items.map((item: any) => ({
        id: item.id || item.item_code,
        item_code: item.item_code,
        name: item.name || item.item_name,
        item_name: item.item_name,
        barcode: item.barcode,
        mrp: item.mrp,
        stock_qty: item.stock_qty,
        category: item.category,
        subcategory: item.subcategory,
        uom_name: item.uom || item.uom_name,
        item_group: item.item_group,
        warehouse: item.warehouse,
        location: item.location,
        matchType: item.match_type || (item.relevance_score >= 500 ? 'exact' : 'partial'),
        floor: item.floor,
        rack: item.rack,
        relevance_score: item.relevance_score,
      }));

      const totalPages = Math.ceil(result.total / limit);

      return {
        items,
        total: result.total,
        page: result.page,
        totalPages,
      };
    } catch (error) {
      __DEV__ && console.error('EnhancedSearchService error:', error);
      return {
        items: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
  },

  getSearchSuggestions: async (query: string): Promise<string[]> => {
    try {
      return await getApiSuggestions(query);
    } catch (error) {
      __DEV__ && console.error('Error getting suggestions:', error);
      return [];
    }
  },

  getCategories: async (): Promise<string[]> => {
    // TODO: Add API endpoint for categories
    return ["Electronics", "Clothing", "Food", "Books"];
  },

  getWarehouses: async (): Promise<string[]> => {
    // TODO: Add API endpoint for warehouses
    return ["Main Warehouse", "Secondary Warehouse"];
  },
};

// Export individual function for direct import
export const searchItems = EnhancedSearchService.searchItems;
