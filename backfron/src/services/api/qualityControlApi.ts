/**
 * Quality Control API Service
 * Handles communication with quality control backend endpoints
 */

import api from "./api";

export interface QualityInspectionRequest {
  itemCode: string;
  conditionStatus: "GOOD" | "DAMAGED" | "EXPIRED";
  expiryDate?: string;
  qualityNotes?: string;
  photos: string[];
  disposition: "ACCEPTED" | "REJECTED" | "QUARANTINE";
  session_id?: string;
}

export interface QualityInspectionResponse {
  inspection_id: string;
  message: string;
}

export interface ExpiryAlertRequest {
  itemCode: string;
  batchNumber?: string;
  expiryDate: string;
  alertType: "EXPIRED" | "EXPIRING_SOON";
}

export interface DefectiveItemRequest {
  itemCode: string;
  batchNumber?: string;
  defectDescription: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  photos: string[];
  reportedBy: string;
}

export interface QualityMetrics {
  condition_stats: { _id: string; count: number }[];
  defective_stats: { _id: string; count: number }[];
  expiring_count: number;
  total_inspections: number;
}

class QualityControlApiService {
  /**
   * Create a new quality inspection
   */
  async createInspection(
    data: QualityInspectionRequest,
  ): Promise<QualityInspectionResponse> {
    const response = await api.post("/api/v1/quality/inspections", data);
    return response.data;
  }

  /**
   * Get a specific quality inspection by ID
   */
  async getInspection(inspectionId: string): Promise<any> {
    const response = await api.get(
      `/api/v1/quality/inspections/${inspectionId}`,
    );
    return response.data;
  }

  /**
   * Get quality inspections for a specific item
   */
  async getItemInspections(itemCode: string, limit: number = 50): Promise<any> {
    const response = await api.get("/api/v1/quality/inspections", {
      params: { item_code: itemCode, limit },
    });
    return response.data;
  }

  /**
   * Update an existing quality inspection
   */
  async updateInspection(inspectionId: string, updates: any): Promise<any> {
    const response = await api.put(
      `/api/v1/quality/inspections/${inspectionId}`,
      updates,
    );
    return response.data;
  }

  /**
   * Get items expiring within specified days
   */
  async getExpiringItems(daysAhead: number = 30): Promise<any> {
    const response = await api.get("/api/v1/quality/expiring", {
      params: { days_ahead: daysAhead },
    });
    return response.data;
  }

  /**
   * Get expired items
   */
  async getExpiredItems(): Promise<any> {
    const response = await api.get("/api/v1/quality/expired");
    return response.data;
  }

  /**
   * Create an expiry alert
   */
  async createExpiryAlert(data: ExpiryAlertRequest): Promise<any> {
    const response = await api.post("/api/v1/quality/alerts", data);
    return response.data;
  }

  /**
   * Acknowledge an expiry alert
   */
  async acknowledgeAlert(alertId: string): Promise<any> {
    const response = await api.put(
      `/api/v1/quality/alerts/${alertId}/acknowledge`,
    );
    return response.data;
  }

  /**
   * Get unacknowledged expiry alerts
   */
  async getUnacknowledgedAlerts(): Promise<any> {
    const response = await api.get("/api/v1/quality/alerts/unacknowledged");
    return response.data;
  }

  /**
   * Report a defective item
   */
  async reportDefectiveItem(data: DefectiveItemRequest): Promise<any> {
    const response = await api.post("/api/v1/quality/defective-items", data);
    return response.data;
  }

  /**
   * Get defective items, optionally filtered by status
   */
  async getDefectiveItems(status?: string): Promise<any> {
    const response = await api.get("/api/v1/quality/defective-items", {
      params: status ? { status } : {},
    });
    return response.data;
  }

  /**
   * Update defective item status
   */
  async updateDefectiveItemStatus(
    itemId: string,
    status: string,
  ): Promise<any> {
    const response = await api.put(
      `/api/v1/quality/defective-items/${itemId}/status`,
      null,
      {
        params: { status },
      },
    );
    return response.data;
  }

  /**
   * Get quality control metrics
   */
  async getQualityMetrics(): Promise<QualityMetrics> {
    const response = await api.get("/api/v1/quality/metrics");
    return response.data;
  }
}

// Export singleton instance
export const qualityControlApi = new QualityControlApiService();
