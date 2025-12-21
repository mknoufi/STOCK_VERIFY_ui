// TypeScript interfaces generated from backend Pydantic models

export interface PinLogin {
  pin: string;
}

export interface UserInfo {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email?: string;
  is_active: boolean;
  permissions: string[];
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserInfo;
}

export interface Session {
  id: string;
  warehouse: string;
  staff_user: string;
  staff_name: string;
  status: string;
  type: string;
  started_at: string; // ISO date string
  closed_at?: string;
  reconciled_at?: string;
  total_items: number;
  total_variance: number;
  notes?: string;
}

export interface ERPItem {
  item_code: string;
  item_name: string;
  barcode: string;
  stock_qty: number;
  mrp: number;
  category?: string;
  subcategory?: string;
  warehouse?: string;
  location?: string;
  uom_code?: string;
  uom_name?: string;
  hsn_code?: string;
  gst_category?: string;
  gst_percent?: number;
  sgst_percent?: number;
  cgst_percent?: number;
  igst_percent?: number;
  floor?: string;
  rack?: string;
  verified?: boolean;
  verified_by?: string;
  verified_at?: string;
  last_scanned_at?: string;
  verified_qty?: number;
  variance?: number;
  damaged_qty?: number;
  non_returnable_damaged_qty?: number;
  item_condition?: string;
  manual_barcode?: string;
  serial_number?: string;
  is_serialized?: boolean;
  verified_floor?: string;
  verified_rack?: string;
  image_url?: string;
  // Sales / pricing metadata
  sales_price?: number;
  sale_price?: number;
  standard_rate?: number;
  last_purchase_rate?: number;
  last_purchase_price?: number;
  // Brand metadata
  brand_id?: string;
  brand_name?: string;
  brand_code?: string;
  // Supplier metadata
  supplier_id?: string;
  supplier_code?: string;
  supplier_name?: string;
  last_purchase_supplier?: string;
  supplier_phone?: string;
  supplier_city?: string;
  supplier_state?: string;
  supplier_gst?: string;
  // Purchase info
  purchase_price?: number;
  last_purchase_qty?: number;
  purchase_qty?: number;
  purchase_invoice_no?: string;
  purchase_reference?: string;
  last_purchase_date?: string;
  last_purchase_cost?: number;
  purchase_voucher_type?: string;
  purchase_type?: string;
  batch_id?: string;
  batch_no?: string;
  manufacturing_date?: string;
  expiry_date?: string;
}
