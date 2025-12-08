export interface Item {
  item_code: string;
  item_name: string;
  barcode?: string;
  mrp?: number;
  stock_qty?: number;
  category?: string;
  subcategory?: string;
  uom_name?: string;
  item_group?: string;
  warehouse?: string;
  item_type?: string;
  sales_price?: number;
  quantity?: number;
  mrp_variants?: any[];
  mrp_history?: any[];
  image_url?: string;
}

export interface SearchResult {
  item_code: string;
  item_name: string;
  barcode?: string;
  mrp?: number;
  stock_qty?: number;
  category?: string;
  subcategory?: string;
  uom_name?: string;
  warehouse?: string;
  image_url?: string;
}
