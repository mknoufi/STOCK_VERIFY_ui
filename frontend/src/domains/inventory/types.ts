import { z } from "zod";
import { ItemSchema } from "../../types/schemas";

export type Item = z.infer<typeof ItemSchema> & {
  // Add fields missing from ItemSchema but present in legacy Item type
  id: string;
  name: string;
  uom?: string;
  item_group?: string;
  location?: string;
  mrp_variants?: unknown[];
  mrp_history?: unknown[];
  item_type?: string;
  quantity?: number;
  sales_price?: number;
  sale_price?: number;
  batch_id?: string;
  manual_barcode?: string;
  unit2_barcode?: string;
  unit_m_barcode?: string;
};

export interface SerialInput {
  serial_number: string;
  condition?: string;
  image_url?: string;
}

export interface PhotoProofDraft {
  uri: string;
  type: "ITEM" | "SERIAL" | "LOCATION" | "DAMAGE" | "SHELF";
  timestamp: number;
}

export interface CountLineBatch {
  batch_id: string;
  qty: number;
  mrp?: number;
  expiry_date?: string;
  manufacturing_date?: string;
}

export interface CreateCountLinePayload {
  session_id: string;
  item_code: string;
  batch_id?: string;
  counted_qty: number;
  damaged_qty?: number;
  damage_included?: boolean;
  non_returnable_damaged_qty?: number;
  variance_reason?: string | null;
  variance_note?: string | null;
  remark?: string | null;
  item_condition?: string;
  condition_details?: string;
  serial_numbers?: string[];
  floor_no?: string | null;
  rack_no?: string | null;
  mark_location?: string | null;
  sr_no?: string | null;
  manufacturing_date?: string | null;
  expiry_date?: string | null;
  photo_base64?: string;
  photo_proofs?: PhotoProofDraft[];
  mrp_counted?: number;
  mrp_source?: string;
  variant_id?: string;
  variant_barcode?: string;
  category_correction?: string;
  subcategory_correction?: string;
  batches?: CountLineBatch[];
}
