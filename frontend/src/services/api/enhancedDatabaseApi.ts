/**
 * Enhanced Database API - Frontend service for advanced database operations
 */
import api from '../httpClient';

export interface DatabaseHealth {
  overall_status: 'healthy' | 'degraded' | 'critical';
  mongodb: {
    status: string;
    response_time_ms: number;
    collections: Record<string, number>;
  };
  sql_server: {
    status: string;
    response_time_ms: number;
    active_products: number;
  };
  data_consistency: {
    status: string;
    mongodb_items: number;
    sql_server_items: number;
    consistency_percent: number;
  };
}

export interface EnhancedItem {
  item: any;
  metadata: {
    source: 'sql_server' | 'mongodb' | 'cache';
    response_time_ms: number;
    timestamp: string;
  };
}

export interface SearchFilters {
  category?: string;
  warehouse?: string;
  stock_level?: 'zero' | 'low' | 'medium' | 'high';
}

export interface AdvancedSearchParams {
  query: string;
  search_fields?: string[];
  limit?: number;
  offset?: number;
  sort_by?: 'relevance' | 'name' | 'code' | 'stock';
  filters?: SearchFilters;
}

export class EnhancedDatabaseAPI {
  /**
   * Enhanced barcode lookup with source selection and metadata
   */
  static async getItemByBarcodeEnhanced(
    barcode: string,
    options: {
      force_source?: 'sql_server' | 'mongodb' | 'cache';
      include_metadata?: boolean;
    } = {}
  ): Promise<EnhancedItem> {
    try {
      const params = new URLSearchParams();

      if (options.force_source) {
        params.append('force_source', options.force_source);
      }

      if (options.include_metadata !== undefined) {
        params.append('include_metadata', options.include_metadata.toString());
      }

      const response = await api.get(
        `/v2/erp/items/barcode/${encodeURIComponent(barcode)}/enhanced?${params}`
      );
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Enhanced barcode lookup failed:', error);
      throw new Error(`Enhanced lookup failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Advanced search with multiple criteria and filters
   */
  static async searchItemsAdvanced(params: AdvancedSearchParams): Promise<any> {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('query', params.query);

      if (params.search_fields) {
        params.search_fields.forEach((field) => queryParams.append('search_fields', field));
      }

      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.offset) queryParams.append('offset', params.offset.toString());
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);

      // Add filters
      if (params.filters?.category) queryParams.append('category', params.filters.category);
      if (params.filters?.warehouse) queryParams.append('warehouse', params.filters.warehouse);
      if (params.filters?.stock_level)
        queryParams.append('stock_level', params.filters.stock_level);

      const response = await api.get(`/v2/erp/items/search/advanced?${queryParams}`);
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Advanced search failed:', error);
      throw new Error(`Advanced search failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get comprehensive database health information
   */
  static async getDatabaseHealth(): Promise<DatabaseHealth> {
    try {
      const response = await api.get('/v2/erp/items/database/status');
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Database health check failed:', error);
      throw new Error(`Health check failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Get item API performance statistics
   */
  static async getPerformanceStats(): Promise<any> {
    try {
      const response = await api.get('/v2/erp/items/performance/stats');
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Performance stats failed:', error);
      throw new Error(`Performance stats failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Trigger real-time sync for specific items
   */
  static async syncItemsRealtime(itemCodes?: string[]): Promise<any> {
    try {
      const response = await api.post('/v2/erp/items/sync/realtime', {
        item_codes: itemCodes,
      });
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Realtime sync failed:', error);
      throw new Error(`Realtime sync failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Optimize database performance
   */
  static async optimizeDatabase(): Promise<any> {
    try {
      const response = await api.post('/v2/erp/items/database/optimize');
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Database optimization failed:', error);
      throw new Error(
        `Database optimization failed: ${error.response?.data?.detail || error.message}`
      );
    }
  }

  /**
   * Test data flow from SQL Server to Frontend
   */
  static async testDataFlow(): Promise<{
    sql_to_api: boolean;
    api_to_frontend: boolean;
    full_flow: boolean;
    response_times: {
      sql_lookup_ms: number;
      mongo_lookup_ms: number;
      total_ms: number;
    };
  }> {
    const start_time = performance.now();

    try {
      // Test 1: Direct SQL Server lookup
      const sql_start = performance.now();
      const sql_result = await this.getItemByBarcodeEnhanced('528120', {
        force_source: 'sql_server',
      });
      const sql_time = performance.now() - sql_start;

      // Test 2: MongoDB lookup
      const mongo_start = performance.now();
      const mongo_result = await this.getItemByBarcodeEnhanced('528120', {
        force_source: 'mongodb',
      });
      const mongo_time = performance.now() - mongo_start;

      const total_time = performance.now() - start_time;

      // Compare results
      const sql_found = sql_result?.item != null;
      const mongo_found = mongo_result?.item != null;
      const data_consistent =
        sql_found && mongo_found && sql_result.item.item_code === mongo_result.item.item_code;

      return {
        sql_to_api: sql_found,
        api_to_frontend: mongo_found,
        full_flow: data_consistent,
        response_times: {
          sql_lookup_ms: sql_time,
          mongo_lookup_ms: mongo_time,
          total_ms: total_time,
        },
      };
    } catch (error: any) {
      __DEV__ && console.error('Data flow test failed:', error);
      throw new Error(`Data flow test failed: ${error.message}`);
    }
  }
}
