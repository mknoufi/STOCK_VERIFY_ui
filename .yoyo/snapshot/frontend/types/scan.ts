/**
 * Type definitions for scan screen components
 * Extracted from scan.tsx for better organization
 */

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
};

export type PhotoProofType = 'ITEM' | 'SHELF' | 'SERIAL' | 'DAMAGE';

export type PhotoProofDraft = {
  id: string;
  base64: string;
  previewUri: string;
  type: PhotoProofType;
  capturedAt: string;
};

export type ScannerMode = 'item' | 'serial';

export interface Item {
  id: string;
  name: string;
  item_code?: string;
  barcode?: string;
  mrp?: number | string;
  mrp_variants?: NormalizedMrpVariant[];
  mrp_history?: Array<{ value: number | string; date?: string; source?: string }>;
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
}

export interface VarianceReason {
  id: string;
  code: string;
  label: string;
  name?: string;
  description?: string;
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
  existingCountLine: any;
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
