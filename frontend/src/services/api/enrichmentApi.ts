/**
 * Enrichment API Service
 * Frontend service for item data enrichment operations
 */

import apiClient from "../httpClient";
import type {
  EnrichmentData,
  EnrichmentRequest,
  EnrichmentResponse,
  EnrichmentValidation,
  MissingFieldsInfo,
  EnrichmentHistoryEntry,
  IncompleteItemsResponse,
  EnrichmentStats,
  BulkImportResult,
  QtyCheckResult,
} from "../../types/enrichment";

interface ApiError {
  response?: {
    data?: {
      detail?: string | { message: string };
    };
  };
  message?: string;
}

/**
 * Enrich/correct data for a specific item
 */
export const enrichItem = async (
  itemCode: string,
  enrichmentData: EnrichmentData,
): Promise<EnrichmentResponse> => {
  try {
    const response = await apiClient.post(
      `/enrichment/items/${itemCode}`,
      enrichmentData,
    );
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Enrichment failed:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message =
      typeof detail === "object" && detail !== null
        ? detail.message
        : (detail as string) || err.message || "Failed to enrich item data";
    throw new Error(message);
  }
};

/**
 * Get missing fields for an item
 */
export const getMissingFields = async (
  itemCode: string,
): Promise<MissingFieldsInfo> => {
  try {
    const response = await apiClient.get(
      `/enrichment/items/${itemCode}/missing-fields`,
    );
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Failed to get missing fields:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message =
      (detail as string) || err.message || "Failed to get missing fields";
    throw new Error(message);
  }
};

/**
 * Get enrichment history for an item
 */
export const getEnrichmentHistory = async (
  itemCode: string,
  limit: number = 10,
): Promise<EnrichmentHistoryEntry[]> => {
  try {
    const response = await apiClient.get(
      `/enrichment/items/${itemCode}/history`,
      {
        params: { limit },
      },
    );
    return response.data.data.history;
  } catch (error: unknown) {
    __DEV__ && console.error("Failed to get enrichment history:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message =
      (detail as string) || err.message || "Failed to get enrichment history";
    throw new Error(message);
  }
};

/**
 * Validate enrichment data without saving
 */
export const validateEnrichmentData = async (
  enrichmentData: EnrichmentData,
): Promise<EnrichmentValidation> => {
  try {
    const response = await apiClient.post(
      "/enrichment/validate",
      enrichmentData,
    );
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Validation failed:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message = (detail as string) || err.message || "Validation failed";
    throw new Error(message);
  }
};

/**
 * Get list of items with incomplete data
 */
export const getIncompleteItems = async (
  limit: number = 100,
  skip: number = 0,
  category?: string,
): Promise<IncompleteItemsResponse> => {
  try {
    const response = await apiClient.get("/enrichment/incomplete-items", {
      params: { limit, skip, category },
    });
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Failed to get incomplete items:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message =
      (detail as string) || err.message || "Failed to get incomplete items";
    throw new Error(message);
  }
};

/**
 * Get enrichment statistics
 */
export const getEnrichmentStats = async (
  dateFrom?: string,
  dateTo?: string,
): Promise<EnrichmentStats> => {
  try {
    const response = await apiClient.get("/enrichment/stats", {
      params: { date_from: dateFrom, date_to: dateTo },
    });
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Failed to get enrichment stats:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message =
      (detail as string) || err.message || "Failed to get enrichment stats";
    throw new Error(message);
  }
};

/**
 * Bulk import enrichment data
 */
export const bulkImportEnrichments = async (
  enrichments: EnrichmentRequest[],
): Promise<BulkImportResult> => {
  try {
    const response = await apiClient.post("/enrichment/bulk-import", {
      enrichments,
    });
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Bulk import failed:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message = (detail as string) || err.message || "Bulk import failed";
    throw new Error(message);
  }
};

/**
 * Check real-time quantity from SQL Server
 * Call this when staff selects an item for counting
 */
export const checkItemQtyRealtime = async (
  itemCode: string,
): Promise<QtyCheckResult> => {
  try {
    const response = await apiClient.get(
      `/enrichment/items/${itemCode}/check-qty`,
    );
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Real-time qty check failed:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message =
      (detail as string) || err.message || "Failed to check quantity";
    throw new Error(message);
  }
};

/**
 * Recalculate data completeness for all items (admin only)
 */
export const recalculateCompleteness = async (): Promise<{
  items_updated: number;
}> => {
  try {
    const response = await apiClient.post(
      "/enrichment/recalculate-completeness",
    );
    return response.data.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Recalculation failed:", error);
    const err = error as ApiError;
    const detail = err.response?.data?.detail;
    const message =
      (detail as string) || err.message || "Failed to recalculate completeness";
    throw new Error(message);
  }
};
