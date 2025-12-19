/**
 * Sync Type Definitions
 * Matches backend SyncRecord model
 */

export interface SyncRecord {
  client_record_id: string;
  session_id: string;
  rack_id?: string | null;
  floor?: string | null;
  item_code: string;
  verified_qty: number;
  damage_qty: number;
  serial_numbers: string[];
  mfg_date?: string | null;
  mrp?: number | null;
  uom?: string | null;
  category?: string | null;
  subcategory?: string | null;
  item_condition?: string | null;
  condition_details?: string | null;
  evidence_photos: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BatchSyncResponse {
  ok: string[];
  conflicts: {
    client_record_id: string;
    conflict_type: string;
    message: string;
    details?: Record<string, unknown>;
  }[];
  errors: {
    client_record_id: string;
    error_type: string;
    message: string;
  }[];
  batch_id?: string;
  processing_time_ms: number;
  total_records: number;
}

export interface SyncResult {
  id: string;
  success: boolean;
  message?: string;
}

export interface SyncBatchResult extends BatchSyncResponse {
  results: SyncResult[];
}
