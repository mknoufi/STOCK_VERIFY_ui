/**
 * Item Verification API service
 * Connects to backend endpoints for item verification, variance tracking, and approval workflows.
 */

import axios from "axios";
import { getBackendURL } from "./backendUrl";
import { storage } from "./asyncStorageService";

// Get the dynamic backend URL
const baseURL = getBackendURL();

// Create axios instance for verification API
const verificationClient = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
verificationClient.interceptors.request.use(async (config) => {
  const token = await storage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types for verification requests
export interface VerifyItemRequest {
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

export interface VarianceFilters {
  category?: string;
  floor?: string;
  rack?: string;
  warehouse?: string;
  limit?: number;
  skip?: number;
}

export interface VarianceItem {
  _id: string;
  item_code: string;
  item_name: string;
  system_qty: number;
  verified_qty: number | null;
  damaged_qty: number | null;
  variance: number | null;
  verified_by: string;
  verified_at: string;
  category: string;
  subcategory: string;
  floor: string;
  rack: string;
  warehouse: string;
  session_id: string | null;
  item_condition: string | null;
}

export interface VerificationStatusResponse {
  verified: boolean;
  verified_by?: string;
  verified_at?: string;
  verified_qty?: number;
  variance?: number;
}

export const ItemVerificationAPI = {
  /**
   * Verify an item with quantity and condition data
   * Endpoint: PATCH /api/v2/erp/items/{item_code}/verify
   */
  verifyItem: async (itemCode: string, data: VerifyItemRequest) => {
    try {
      const response = await verificationClient.patch(
        `/api/v2/erp/items/${encodeURIComponent(itemCode)}/verify`,
        data
      );
      return response.data;
    } catch (error) {
      console.error("Error verifying item:", itemCode, error);
      throw error;
    }
  },

  /**
   * Get verification status for an item
   * Endpoint: GET /api/v2/erp/items/{item_code}
   */
  getVerificationStatus: async (itemCode: string): Promise<VerificationStatusResponse> => {
    try {
      const response = await verificationClient.get(
        `/api/v2/erp/items/${encodeURIComponent(itemCode)}`
      );
      const item = response.data?.item || response.data;
      return {
        verified: item.verified || false,
        verified_by: item.verified_by,
        verified_at: item.verified_at,
        verified_qty: item.verified_qty,
        variance: item.variance,
      };
    } catch (error) {
      console.error("Error getting verification status:", itemCode, error);
      throw error;
    }
  },

  /**
   * Get list of variances with optional filters
   * Endpoint: GET /api/v2/erp/items/variances
   */
  getVariances: async (filters?: VarianceFilters) => {
    try {
      const params = new URLSearchParams();
      if (filters?.category) params.append("category", filters.category);
      if (filters?.floor) params.append("floor", filters.floor);
      if (filters?.rack) params.append("rack", filters.rack);
      if (filters?.warehouse) params.append("warehouse", filters.warehouse);
      if (filters?.limit) params.append("limit", filters.limit.toString());
      if (filters?.skip) params.append("skip", filters.skip.toString());

      const response = await verificationClient.get(
        `/api/v2/erp/items/variances?${params.toString()}`
      );
      return {
        variances: response.data.variances || [],
        total: response.data.pagination?.total || 0,
        pagination: response.data.pagination,
      };
    } catch (error) {
      console.error("Error getting variances:", error);
      throw error;
    }
  },

  /**
   * Approve a count line variance (supervisor/admin only)
   * Endpoint: PUT /api/count-lines/{line_id}/approve
   */
  approveVariance: async (varianceId: string) => {
    try {
      const response = await verificationClient.put(
        `/api/count-lines/${varianceId}/approve`
      );
      return response.data;
    } catch (error) {
      console.error("Error approving variance:", varianceId, error);
      throw error;
    }
  },

  /**
   * Reject a count line variance (supervisor/admin only)
   * Endpoint: PUT /api/count-lines/{line_id}/reject
   */
  rejectVariance: async (varianceId: string, reason?: string) => {
    try {
      const response = await verificationClient.put(
        `/api/count-lines/${varianceId}/reject`,
        { reason }
      );
      return response.data;
    } catch (error) {
      console.error("Error rejecting variance:", varianceId, error);
      throw error;
    }
  },

  /**
   * Request a recount for a variance (alias for reject with recount reason)
   * Endpoint: PUT /api/count-lines/{line_id}/reject
   */
  requestRecount: async (varianceId: string) => {
    try {
      const response = await verificationClient.put(
        `/api/count-lines/${varianceId}/reject`,
        { reason: "Recount requested" }
      );
      return response.data;
    } catch (error) {
      console.error("Error requesting recount:", varianceId, error);
      throw error;
    }
  },

  /**
   * Get variance reasons list
   * Endpoint: GET /api/variance-reasons
   */
  getVarianceReasons: async () => {
    try {
      const response = await verificationClient.get("/api/variance-reasons");
      return response.data.reasons || [];
    } catch (error) {
      console.error("Error getting variance reasons:", error);
      throw error;
    }
  },

  /**
   * Get variance trend data
   * Endpoint: GET /api/variance/trend
   */
  getVarianceTrend: async (days: number = 7) => {
    try {
      const response = await verificationClient.get(
        `/api/variance/trend?days=${days}`
      );
      return response.data.data || [];
    } catch (error) {
      console.error("Error getting variance trend:", error);
      throw error;
    }
  },

  /**
   * Get live active users
   * Endpoint: GET /api/v2/erp/items/live/users
   */
  getLiveUsers: async () => {
    try {
      const response = await verificationClient.get("/api/v2/erp/items/live/users");
      return response.data.users || [];
    } catch (error) {
      console.error("Error getting live users:", error);
      throw error;
    }
  },
};
