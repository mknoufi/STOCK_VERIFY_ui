export type NormalizedMrpVariant = {
  id?: string;
  value: number;
  barcode?: string;
  label?: string;
  source?: string;
  item_condition?: string;
};

export type SerialInput = {
  id: string;
  label: string;
  value: string;
  timestamp?: number;
  isValid?: boolean;
};

export type PhotoProofType = 'ITEM' | 'SHELF' | 'SERIAL' | 'DAMAGE';

export type ScannerMode = 'item' | 'serial';

export interface PhotoProofDraft {
  id: string;
  uri: string;
  type: PhotoProofType;
  timestamp: string;
  base64?: string;
  capturedAt?: string;
  previewUri?: string;
}

export interface Item {
  id: string;
  name: string;
  item_code?: string;
  barcode?: string;
  mrp?: number | string;
  mrp_variants?: NormalizedMrpVariant[];
  mrp_history?: { value: number | string; date?: string; source?: string }[];
  quantity?: number;
  stock_qty?: number;
  counted_quantity?: number;
  serial_requirement?: 'optional' | 'single' | 'required' | 'dual';
  item_condition?: string;
  location?: string;
  category?: string;
  subcategory?: string;
  item_type?: string;
  item_group?: string;
  uom_name?: string;
  sales_price?: number | string;
}

export interface VarianceReason {
  id: string;
  code: string;
  label: string;
  name?: string;
  description?: string;
}

export interface CountLine {
  id?: string;
  item_code: string;
  counted_qty?: number;
  damaged_qty?: number;
  non_returnable_damaged_qty?: number;
  variance_reason?: string;
  variance_note?: string;
  remark?: string;
  status?: string;
  [key: string]: unknown;
}

export interface WorkflowState {
  step: 'scan' | 'quantity' | 'serial' | 'photo' | 'complete';
  expectedSerialCount: number;
  showSerialEntry: boolean;
  showPhotoCapture: boolean;
  autoIncrementEnabled: boolean;
  serialCaptureEnabled: boolean;
  damageQtyEnabled: boolean;
  serialInputs: SerialInput[];
  requiredSerialCount: number;
  serialInputTarget: number;
  existingCountLine: CountLine | null;
  showAddQuantityModal: boolean;
  additionalQty: string;
}

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
  damaged_qty: number;
  non_returnable_damaged_qty: number;
  variance_reason: string | null;
  variance_note: string | null;
  remark: string | null;
  item_condition?: string;
  serial_numbers?: {
    label: string;
    value: string;
    captured_at: string;
  }[];
  photo_proofs?: {
    id: string;
    type: PhotoProofType;
    base64?: string;
    captured_at?: string;
  }[];
  mrp_counted?: number;
  mrp_source?: string;
  variant_id?: string;
  variant_barcode?: string;
  floor_no?: string | null;
  rack_no?: string | null;
  mark_location?: string | null;
  sr_no?: string | null;
  manufacturing_date?: string | null;
  [key: string]: unknown;
}

export interface ApiErrorResponse {
  response?: {
    data?: {
      detail?: {
        message?: string;
      } | string;
      message?: string;
    };
    status?: number;
  };
  message?: string;
}
