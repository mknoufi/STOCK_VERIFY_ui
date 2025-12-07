// Enhanced Search Service for advanced item searching
import httpClient from './httpClient';

export interface SearchResult {
  id: string;
  item_code: string;
  name: string;
  item_name?: string;
  barcode?: string;
  manual_barcode?: string;
  auto_barcode?: string;
  plu_code?: string;
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
    limit: number = 50,
  ): Promise<{
    items: SearchResult[];
    total: number;
    page: number;
    totalPages: number;
  }> => {
    try {
      // Build query params
      const params = new URLSearchParams();
      if (filters.query) params.append('query', filters.query);
      if (filters.category) params.append('category', filters.category);
      if (filters.warehouse) params.append('warehouse', filters.warehouse);
      params.append('page', String(page));
      params.append('limit', String(limit));

      const response = await httpClient.get(`/api/v2/erp/items/search/advanced?${params.toString()}`);

      if (response.data.success) {
        // Map the API response to our SearchResult format
        const items: SearchResult[] = (response.data.items || []).map((item: any) => ({
          id: item.item_code || item.id,
          item_code: item.item_code,
          name: item.item_name || item.name,
          item_name: item.item_name,
          barcode: item.manual_barcode || item.auto_barcode || item.barcode,
          manual_barcode: item.manual_barcode,
          auto_barcode: item.auto_barcode,
          plu_code: item.plu_code,
          mrp: item.mrp,
          stock_qty: item.stock_qty || item.quantity,
          category: item.category || item.item_group,
          subcategory: item.subcategory,
          uom_name: item.uom_name,
          item_group: item.item_group,
          warehouse: item.warehouse,
          location: item.location,
          matchType: item.match_type,
          floor: item.floor,
          rack: item.rack,
        }));

        return {
          items,
          total: response.data.total || items.length,
          page: response.data.page || page,
          totalPages: response.data.total_pages || Math.ceil((response.data.total || items.length) / limit),
        };
      }

      return { items: [], total: 0, page, totalPages: 0 };
    } catch (error) {
      console.error('Search API error:', error);
      throw error;
    }
  },

  getSearchSuggestions: async (query: string): Promise<string[]> => {
    try {
      const response = await httpClient.get(`/api/v2/erp/items/suggestions?query=${encodeURIComponent(query)}`);
      return response.data.suggestions || [];
    } catch (error) {
      console.error('Suggestions API error:', error);
      return [];
    }
  },

  getCategories: async (): Promise<string[]> => {
    try {
      const response = await httpClient.get('/api/v2/erp/items/categories');
      return response.data.categories || [];
    } catch (error) {
      console.error('Categories API error:', error);
      return [];
    }
  },

  getWarehouses: async (): Promise<string[]> => {
    try {
      const response = await httpClient.get('/api/v2/erp/warehouses');
      return response.data.warehouses || [];
    } catch (error) {
      console.error('Warehouses API error:', error);
      return [];
    }
  },
};

// Export individual function for direct import
export const searchItems = EnhancedSearchService.searchItems;
