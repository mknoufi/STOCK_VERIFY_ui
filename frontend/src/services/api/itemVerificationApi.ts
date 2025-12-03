/**
 * Item Verification API Service
 * Handles verification, filtering, CSV export, and variance tracking
 */
import api from '../httpClient';

export interface VerificationRequest {
  verified: boolean;
  verified_qty?: number;
  damaged_qty?: number;
  non_returnable_damaged_qty?: number;
  item_condition?: string;
  serial_number?: string;
  notes?: string;
  floor?: string;
  rack?: string;
  session_id?: string;
  count_line_id?: string;
}

export interface ItemUpdateRequest {
  mrp?: number;
  sales_price?: number;
  category?: string;
  subcategory?: string;
  uom?: string;
}

export interface Item {
  id: string;
  item_code: string;
  item_name: string;
  barcode: string;
  stock_qty: number;
  mrp: number;
  category?: string;
  subcategory?: string;
  warehouse?: string;
  floor?: string;
  rack?: string;
  verified?: boolean;
  verified_at?: string;
  verified_by?: string;
  [key: string]: unknown;
}

export interface VerificationResponse {
  success: boolean;
  item: Item;
  variance?: number;
  message: string;
}

export interface FilteredItemsParams {
  category?: string;
  subcategory?: string;
  floor?: string;
  rack?: string;
  warehouse?: string;
  uom_code?: string;
  verified?: boolean;
  search?: string;
  limit?: number;
  skip?: number;
}

export interface FilteredItemsResponse {
  success: boolean;
  items: Item[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    returned: number;
  };
  statistics: {
    total_items: number;
    verified_items: number;
    unverified_items: number;
    total_qty: number;
  };
}

export interface VarianceItem {
  item_code: string;
  item_name: string;
  system_qty: number;
  verified_qty: number;
  variance: number;
  verified_by: string;
  verified_at: string;
  category?: string;
  subcategory?: string;
  floor?: string;
  rack?: string;
  warehouse?: string;
  session_id?: string;
  count_line_id?: string;
}

export interface LiveUser {
  username: string;
  last_activity: string;
  items_verified: number;
}

export interface LiveVerification {
  item_code: string;
  item_name: string;
  verified_by: string;
  verified_at: string;
  floor?: string;
  rack?: string;
  category?: string;
  variance?: number;
}

export class ItemVerificationAPI {
  /**
   * Verify an item
   */
  static async verifyItem(
    itemCode: string,
    request: VerificationRequest
  ): Promise<VerificationResponse> {
    try {
      const response = await api.patch(
        `/v2/erp/items/${encodeURIComponent(itemCode)}/verify`,
        request
      );
      return response.data;
    } catch (error: unknown) {
      __DEV__ && console.error('Verification failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      throw new Error(errorMessage);
    }
  }

  /**
   * Get filtered items
   */
  static async getFilteredItems(params: FilteredItemsParams): Promise<FilteredItemsResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.category) queryParams.append('category', params.category);
      if (params.subcategory) queryParams.append('subcategory', params.subcategory);
      if (params.floor) queryParams.append('floor', params.floor);
      if (params.rack) queryParams.append('rack', params.rack);
      if (params.warehouse) queryParams.append('warehouse', params.warehouse);
      if (params.uom_code) queryParams.append('uom_code', params.uom_code);
      if (params.verified !== undefined) queryParams.append('verified', params.verified.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.skip) queryParams.append('skip', params.skip.toString());

      const response = await api.get(`/v2/erp/items/filtered?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Get filtered items failed:', error);
      throw new Error(
        error.response?.data?.detail?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Failed to get filtered items'
      );
    }
  }

  /**
   * Export items to CSV
   */
  static async exportItemsToCSV(params: FilteredItemsParams): Promise<Blob> {
    try {
      const queryParams = new URLSearchParams();

      if (params.category) queryParams.append('category', params.category);
      if (params.subcategory) queryParams.append('subcategory', params.subcategory);
      if (params.floor) queryParams.append('floor', params.floor);
      if (params.rack) queryParams.append('rack', params.rack);
      if (params.warehouse) queryParams.append('warehouse', params.warehouse);
      if (params.verified !== undefined) queryParams.append('verified', params.verified.toString());
      if (params.search) queryParams.append('search', params.search);

      const response = await api.get(`/v2/erp/items/export/csv?${queryParams.toString()}`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('CSV export failed:', error);
      throw new Error(
        error.response?.data?.detail?.message ||
          error.response?.data?.detail ||
          error.message ||
          'CSV export failed'
      );
    }
  }

  /**
   * Get variances
   */
  static async getVariances(params: {
    category?: string;
    floor?: string;
    rack?: string;
    warehouse?: string;
    search?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ success: boolean; variances: VarianceItem[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.category) queryParams.append('category', params.category);
      if (params.floor) queryParams.append('floor', params.floor);
      if (params.rack) queryParams.append('rack', params.rack);
      if (params.warehouse) queryParams.append('warehouse', params.warehouse);
      if (params.search) queryParams.append('search', params.search);
      if (params.limit) queryParams.append('limit', params.limit.toString());
      if (params.skip) queryParams.append('skip', params.skip.toString());

      const response = await api.get(`/v2/erp/items/variances?${queryParams.toString()}`);
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Get variances failed:', error);
      throw new Error(
        error.response?.data?.detail?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Failed to get variances'
      );
    }
  }

  /**
   * Get live users
   */
  static async getLiveUsers(): Promise<{
    success: boolean;
    users: LiveUser[];
    count: number;
  }> {
    try {
      const response = await api.get('/v2/erp/items/live/users');
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Get live users failed:', error);
      throw new Error(
        error.response?.data?.detail?.message ||
          error.response?.data?.detail ||
          error.message ||
          'Failed to get live users'
      );
    }
  }

  /**
   * Get live verifications
   */
  static async getLiveVerifications(limit: number = 10): Promise<LiveVerification[]> {
    const response = await api.get(`/api/verification/live-feed?limit=${limit}`);
    return response.data;
  }

  /**
   * Approve a variance (Supervisor)
   */
  static async approveVariance(countLineId: string, notes?: string): Promise<any> {
    const response = await api.put(`/api/count-lines/${countLineId}/approve`, { notes });
    return response.data;
  }

  /**
   * Request a recount / Reject a count (Supervisor)
   */
  static async requestRecount(countLineId: string, notes?: string): Promise<any> {
    const response = await api.put(`/api/count-lines/${countLineId}/reject`, { notes });
    return response.data;
  }

  /**
   * Update item master details
   */
  static async updateItemMaster(
    itemCode: string,
    request: ItemUpdateRequest
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.patch(
        `/v2/erp/items/${encodeURIComponent(itemCode)}/update-master`,
        request
      );
      return response.data;
    } catch (error: any) {
      __DEV__ && console.error('Master update failed:', error);
      throw new Error(
        error.response?.data?.detail?.message ||
          error.response?.data?.detail ||
          'Failed to update item details'
      );
    }
  }

  /**
   * Get variance details for a specific item in a session
   */
  static async getVarianceDetails(itemCode: string, sessionId: string): Promise<any> {
    try {
      // First try to find the count line
      const response = await api.get(`/count-lines`, {
        params: {
          item_code: itemCode,
          session_id: sessionId,
          limit: 1,
        },
      });

      if (response.data && response.data.items && response.data.items.length > 0) {
        const countLine = response.data.items[0];
        // Map to expected format if needed, or return as is
        // The UI expects: item_code, item_name, system_qty, verified_qty, variance, etc.
        // CountLine has: item_code, item_name, counted_qty, variance (if calculated)

        // We might need to fetch item details for system_qty if not in count line
        // But let's assume count line has enough info or we fetch item separately

        return {
          ...countLine,
          verified_qty: countLine.counted_qty,
          verified_by: countLine.username,
          verified_at: countLine.counted_at,
          count_line_id: countLine.id,
        };
      }

      // Fallback: fetch from verification logs or item master
      // This is less ideal for "approval" workflow which is based on CountLine
      return null;
    } catch (error) {
      __DEV__ && console.error('Failed to get variance details:', error);
      throw error;
    }
  }
}
