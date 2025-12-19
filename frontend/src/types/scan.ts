/**
 * Item - Canonical item interface for the entire application
 * All components should import Item from this file or @/types/item (which re-exports this)
 */
export interface Item {
  id: string;
  name: string;
  item_code: string;
  barcode?: string;
  mrp?: number;
  stock_qty?: number;
  category?: string;
  subcategory?: string;
  uom_name?: string;
  item_group?: string;
  location?: string;
  warehouse?: string; // warehouse location (alias for location in some contexts)
  mrp_variants?: unknown[];
  mrp_history?: unknown[];
  item_type?: string;
  quantity?: number;
  sales_price?: number;
  item_name?: string;
  image_url?: string; // item image URL for display
}

export type ScannerMode = "item" | "serial";

export type PhotoProofType =
  | "ITEM"
  | "SERIAL"
  | "LOCATION"
  | "DAMAGE"
  | "SHELF";

export interface ScanFormData {
  countedQty: string;
  returnableDamageQty: string;
  nonReturnableDamageQty: string;
  mrp: string;
  remark: string;
  varianceNote: string;
}

export interface CreateCountLinePayload {
  session_id: string;
  item_code: string;
  counted_qty: number;
  damaged_qty?: number;
  damage_included?: boolean;
  non_returnable_damaged_qty?: number;
  variance_reason?: string | null;
  variance_note?: string | null;
  remark?: string | null;
  item_condition?: string;
  serial_numbers?: SerialInput[];
  floor_no?: string | null;
  rack_no?: string | null;
  mark_location?: string | null;
  sr_no?: string | null;
  manufacturing_date?: string | null;
  photo_base64?: string;
  photo_proofs?: PhotoProofDraft[];
  mrp_counted?: number;
  mrp_source?: string;
  variant_id?: string;
  variant_barcode?: string;
  category_correction?: string;
  subcategory_correction?: string;
}

export interface ApiErrorResponse {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

// Additional missing types
export interface NormalizedMrpVariant {
  value: number;
  id?: string;
  barcode?: string;
  label?: string;
  source?: string;
  item_condition?: string;
}

export interface VarianceReason {
  code: string;
  description: string;
  label?: string;
  requires_approval: boolean;
}

export interface PhotoProofDraft {
  id?: string;
  type: PhotoProofType;
  uri: string;
  previewUri?: string;
  base64: string;
  capturedAt: string;
}

export interface SerialInput {
  id?: string;
  serial_number: string;
  value?: string;
  label?: string;
  condition: "good" | "damaged";
}

/**
 * Count Line Data - represents an existing count line in workflow context
 */
export interface CountLineData {
  id?: string;
  session_id: string;
  item_code: string;
  item_name?: string;
  barcode?: string;
  counted_qty: number;
  system_qty?: number;
  variance?: number;
  mrp?: number;
  notes?: string;
  location?: string;
  created_at?: string;
  updated_at?: string;
}

export interface WorkflowState {
  step?: string;
  currentStep?: string;
  data?: Record<string, any>;
  errors?: string[];
  serialCaptureEnabled?: boolean;
  serialInputs?: SerialInput[];
  expectedSerialCount?: number;
  showSerialEntry?: boolean;
  showPhotoCapture?: boolean;
  autoIncrementEnabled?: boolean;
  damageQtyEnabled?: boolean;
  requiredSerialCount?: number;
  serialInputTarget?: number;
  existingCountLine?: CountLineData;
  showAddQuantityModal?: boolean;
  additionalQty?: string;
}

export interface CountLineBatch {
  quantity: number;
  mrp?: number;
  manufacturing_date?: string;
  item_condition: string;
  condition_details?: string;
  batch_number?: string;
  expiry_date?: string;
}
