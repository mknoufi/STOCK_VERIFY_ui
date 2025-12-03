/**
 * Item Enrichment Types
 * TypeScript definitions for data enrichment features
 */

/**
 * Enrichment data fields that can be added/corrected by staff
 */
export interface EnrichmentData {
  serial_number?: string;
  mrp?: number;
  hsn_code?: string;
  barcode?: string;
  location?: string;
  condition?: 'good' | 'damaged' | 'obsolete' | 'excellent' | 'fair';
  notes?: string;
}

/**
 * Enrichment history entry tracking changes over time
 */
export interface EnrichmentHistoryEntry {
  updated_at: string;
  updated_by: string;
  updated_by_name: string;
  fields_updated: string[];
  old_values: Record<string, any>;
  new_values: Record<string, any>;
}

/**
 * Data completeness information
 */
export interface DataCompleteness {
  is_complete: boolean;
  percentage: number;
  missing_fields: string[];
  filled_count: number;
  total_required: number;
}

/**
 * Enriched item with all fields
 */
export interface EnrichedItem {
  _id?: string;
  item_code: string;
  item_name: string;
  category: string;
  subcategory?: string;
  warehouse: string;

  // Quantity tracking
  stock_qty: number; // Current qty in SQL Server
  sql_server_qty: number; // Synced qty from SQL Server
  last_verified_qty?: number; // Counted qty by staff
  last_synced: string;
  qty_changed_at?: string;
  qty_change_delta?: number;

  // Enrichment data
  serial_number?: string;
  mrp?: number;
  hsn_code?: string;
  barcode: string;
  location?: string;
  condition?: 'good' | 'damaged' | 'obsolete' | 'excellent' | 'fair';

  // Data completeness
  data_complete: boolean;
  completion_percentage: number;
  missing_fields: string[];

  // Enrichment tracking
  last_enriched_at?: string;
  enriched_by?: string;
  enriched_by_name?: string;
  enrichment_history: EnrichmentHistoryEntry[];

  // Verification
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  verification_status?: 'pending' | 'in_progress' | 'completed';

  // Metadata
  created_at: string;
  updated_at: string;
}

/**
 * Enrichment request payload
 */
export interface EnrichmentRequest {
  item_code: string;
  enrichment: EnrichmentData;
  counted_qty?: number;
}

/**
 * Enrichment validation error
 */
export interface EnrichmentValidationError {
  field: string;
  message: string;
}

/**
 * Enrichment validation result
 */
export interface EnrichmentValidation {
  is_valid: boolean;
  errors: EnrichmentValidationError[];
}

/**
 * Enrichment response
 */
export interface EnrichmentResponse {
  success: boolean;
  item_code: string;
  fields_updated: string[];
  data_complete: boolean;
  completion_percentage: number;
  updated_at: string;
}

/**
 * Missing fields info for an item
 */
export interface MissingFieldsInfo {
  item_code: string;
  missing_fields: string[];
  completion_percentage: number;
  is_complete: boolean;
}

/**
 * Incomplete item summary
 */
export interface IncompleteItem {
  item_code: string;
  item_name: string;
  category: string;
  missing_fields: string[];
  completion_percentage: number;
}

/**
 * Incomplete items list response
 */
export interface IncompleteItemsResponse {
  items: IncompleteItem[];
  total: number;
  limit: number;
  skip: number;
}

/**
 * Field statistics
 */
export interface FieldStats {
  serial_numbers: number;
  mrp: number;
  hsn_codes: number;
  locations: number;
}

/**
 * Top contributor
 */
export interface TopContributor {
  user_id: string;
  name: string;
  items_enriched: number;
}

/**
 * Enrichment statistics
 */
export interface EnrichmentStats {
  total_items: number;
  complete_items: number;
  incomplete_items: number;
  completion_percentage: number;
  field_stats: FieldStats;
  top_contributors: TopContributor[];
}

/**
 * Bulk enrichment import
 */
export interface BulkEnrichmentImport {
  enrichments: EnrichmentRequest[];
}

/**
 * Bulk import result
 */
export interface BulkImportResult {
  success: number;
  failed: number;
  errors: {
    item_code: string;
    error: string;
    validation_errors?: EnrichmentValidationError[];
  }[];
}

/**
 * Real-time quantity check result
 */
export interface QtyCheckResult {
  item_code: string;
  sql_qty: number;
  previous_qty?: number;
  delta?: number;
  updated: boolean;
  source: 'sql_server' | 'mongodb_cache';
  message: string;
}
