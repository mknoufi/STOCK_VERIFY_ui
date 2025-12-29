import { useNetworkStore } from "../../store/networkStore";
import { useAuthStore } from "../../store/authStore";
import api from "../../services/httpClient";
import { retryWithBackoff } from "../../utils/retry";
import { validateBarcode } from "../../utils/validation";
import { CreateCountLinePayload, Item } from "./types";
import {
  addToOfflineQueue,
  cacheItem,
  searchItemsInCache,
  getItemFromCache,
  cacheCountLine,
  getCountLinesBySessionFromCache,
} from "../../services/offline/offlineStorage";

interface AxiosErrorLike {
  response?: {
    status?: number;
    data?: {
      detail?: string | { message: string };
    };
  };
  code?: string;
  message?: string;
}

// Check if online - simplified logic for better reliability
export const isOnline = () => {
  const state = useNetworkStore.getState();
  const online = state.isOnline && state.isInternetReachable !== false;

  // If network state is unknown or null, assume online (fail-safe for API calls)
  if (state.isOnline === undefined || state.isOnline === null) {
    return true;
  }

  return online;
};

/**
 * Lookup an item by barcode with validation, retry and cache fallback.
 * @param barcode Barcode string scanned/entered
 * @param retryCount Number of retries for transient failures
 */
export const getItemByBarcode = async (
  barcode: string,
  retryCount: number = 3,
): Promise<Item> => {
  // Validate and normalize barcode before making API call
  const validation = validateBarcode(barcode);
  if (!validation.valid || !validation.value) {
    throw new Error(validation.error || "Invalid barcode format");
  }

  // Use normalized barcode if available (6-digit format for numeric barcodes)
  const trimmedBarcode = validation.value;

  __DEV__ &&
    console.log(
      `🔍 Looking up barcode: ${trimmedBarcode} (original: ${barcode})`,
    );

  // Check if offline first - only use cache if truly offline
  if (!isOnline()) {
    __DEV__ && console.log("📱 Offline mode - searching cache");
    try {
      const items = await searchItemsInCache(trimmedBarcode);
      if (items.length > 0) {
        __DEV__ && console.log("✅ Found in cache:", items[0]?.item_code);
        const cached = items[0];
        if (!cached) {
          throw new Error(
            "Offline: Cache returned an empty item. Connect to internet to search server.",
          );
        }
        return {
          id: cached.item_code,
          name: cached.item_name,
          item_code: cached.item_code,
          barcode: cached.barcode,
          item_name: cached.item_name,
          description: cached.description,
          stock_qty: cached.current_stock,
          uom_name: cached.uom_name ?? cached.uom,
          mrp: cached.mrp,
          sales_price: cached.sales_price,
          category: cached.category,
          subcategory: cached.subcategory,
          // Add other fields as needed
          uom: cached.uom,
          warehouse: cached.warehouse,
          manual_barcode: cached.manual_barcode,
          unit2_barcode: cached.unit2_barcode,
          unit_m_barcode: cached.unit_m_barcode,
          batch_id: cached.batch_id,
          sale_price: cached.sale_price,
        } as Item;
      }
      throw new Error(
        "Item not found in offline cache. Connect to internet to search server.",
      );
    } catch {
      throw new Error(
        "Offline: Item not found in cache. Connect to internet to search server.",
      );
    }
  }

  // Online - try API first, then cache as fallback
  try {
    __DEV__ && console.log("🌐 Online mode - calling API");

    // Direct API call with retry
    // Use enhanced v2 endpoint for better performance and metadata
    const response = await retryWithBackoff(
      () =>
        api.get(
          `/api/v2/erp/items/barcode/${encodeURIComponent(trimmedBarcode)}/enhanced`,
        ),
      {
        retries: retryCount,
        backoffMs: 1000,
      },
    );

    // Handle v2 response format { item: ..., metadata: ... }
    const itemData = response.data.item || response.data;

    // Check if we actually got an item
    if (!itemData || !itemData.item_code) {
      throw new Error(
        `Item not found: Barcode '${trimmedBarcode}' not in database`,
      );
    }

    // Normalize backend fields to the canonical frontend Item interface.
    // Backend field names can vary (e.g. uom vs uom_name, sale_price vs sales_price).
    const displayName =
      itemData.item_name || itemData.category || `Item ${itemData.item_code}`;

    const normalizedItem: Item = {
      ...itemData,
      id: itemData.id || itemData._id || itemData.item_code,
      name: itemData.name || displayName,
      item_name: itemData.item_name || displayName,
      // Prefer the human-readable UOM if available.
      uom_name: itemData.uom_name ?? itemData.uom ?? itemData.uom_code,
      // Prefer sales_price, but accept alternate backend names.
      sales_price:
        itemData.sales_price ?? itemData.sale_price ?? itemData.standard_rate,
      mrp: itemData.mrp,
      category: itemData.category,
      subcategory: itemData.subcategory,
      // Normalize stock quantity naming differences.
      stock_qty:
        itemData.stock_qty ?? itemData.current_stock ?? itemData.stock_qty,
    };

    __DEV__ && console.log("✅ Found via API:", normalizedItem.item_code);

    // Cache the item for future offline use
    try {
      await cacheItem({
        item_code: normalizedItem.item_code,
        barcode: normalizedItem.barcode,
        item_name: normalizedItem.item_name,
        description: normalizedItem.description,
        uom:
          normalizedItem.uom ??
          normalizedItem.uom_code ??
          normalizedItem.uom_name,
        uom_name: normalizedItem.uom_name,
        mrp: normalizedItem.mrp,
        sales_price: normalizedItem.sales_price,
        sale_price: normalizedItem.sale_price ?? normalizedItem.sales_price,
        category: normalizedItem.category,
        subcategory: normalizedItem.subcategory,
        warehouse: normalizedItem.warehouse,
        manual_barcode: normalizedItem.manual_barcode,
        unit2_barcode: normalizedItem.unit2_barcode,
        unit_m_barcode: normalizedItem.unit_m_barcode,
        batch_id: normalizedItem.batch_id,
        current_stock: normalizedItem.current_stock || normalizedItem.stock_qty, // Handle field name difference
      });
    } catch (cacheError) {
      __DEV__ && console.warn("Failed to cache item:", cacheError);
      // Don't fail the whole operation for cache errors
    }

    return normalizedItem;
  } catch (apiError: unknown) {
    const errorMessage =
      apiError instanceof Error ? apiError.message : String(apiError);
    __DEV__ && console.error("❌ API call failed:", errorMessage);

    // Only fallback to cache if API fails
    __DEV__ && console.log("🔄 API failed, trying cache fallback");
    try {
      const items = await searchItemsInCache(trimmedBarcode);
      const cachedItem = items[0];
      if (cachedItem) {
        __DEV__ &&
          console.log("✅ Found in cache fallback:", cachedItem.item_code);
        return {
          id: cachedItem.item_code,
          name: cachedItem.item_name,
          item_code: cachedItem.item_code,
          barcode: cachedItem.barcode,
          item_name: cachedItem.item_name,
          description: cachedItem.description,
          stock_qty: cachedItem.current_stock,
          uom_name: cachedItem.uom_name ?? cachedItem.uom,
          mrp: cachedItem.mrp,
          sales_price: cachedItem.sales_price,
          category: cachedItem.category,
          subcategory: cachedItem.subcategory,
          uom: cachedItem.uom,
          warehouse: cachedItem.warehouse,
          manual_barcode: cachedItem.manual_barcode,
          unit2_barcode: cachedItem.unit2_barcode,
          unit_m_barcode: cachedItem.unit_m_barcode,
          batch_id: cachedItem.batch_id,
          sale_price: cachedItem.sale_price,
        } as Item;
      }

      // Cache is empty too
      throw new Error("Item not found in cache");
    } catch (cacheError: unknown) {
      const errorMessage =
        cacheError instanceof Error ? cacheError.message : String(cacheError);
      if (errorMessage !== "Item not found in cache") {
        __DEV__ && console.error("❌ Cache fallback also failed:", cacheError);
      } else {
        __DEV__ && console.log("ℹ️ Item not found in cache either");
      }

      // Provide helpful error message
      const error = apiError as AxiosErrorLike;
      if (error.response?.status === 404) {
        throw new Error(
          `Item not found: Barcode '${trimmedBarcode}' not in database`,
        );
      } else if (error.response?.status === 400) {
        __DEV__ &&
          console.error("❌ API Bad Request Details:", error.response?.data);
        const detail = error.response?.data?.detail;
        throw new Error(
          (typeof detail === "object" && detail !== null && "message" in detail
            ? (detail as any).message
            : detail) || "Invalid request parameters",
        );
      } else if (
        error.code === "ECONNABORTED" ||
        error.message?.includes("timeout")
      ) {
        throw new Error("Connection timeout. Check your internet connection.");
      } else if (error.code === "ECONNREFUSED" || !error.response) {
        throw new Error(
          "Cannot connect to server. Check if backend is running.",
        );
      } else {
        const errorMsg =
          error.response?.data?.detail || error.message || "Unknown error";
        throw new Error(
          `Barcode lookup failed: ${typeof errorMsg === "object" ? JSON.stringify(errorMsg) : errorMsg}`,
        );
      }
    }
  }
};

export const createCountLine = async (countData: CreateCountLinePayload) => {
  try {
    if (!isOnline()) {
      // Create offline count line
      const user = useAuthStore.getState().user;

      // Try to get item name from cache if not available
      let itemName = "Unknown Item";
      try {
        const cachedItem = await getItemFromCache(countData.item_code);
        if (cachedItem) itemName = cachedItem.item_name;
      } catch {
        // Ignore cache lookup error
      }

      const offlineCountLine = {
        _id: `offline_${Date.now()}`,
        ...countData,
        rack_no: countData.rack_no || undefined,
        floor_no: countData.floor_no || undefined,
        mark_location: countData.mark_location || undefined,
        sr_no: countData.sr_no || undefined,
        manufacturing_date: countData.manufacturing_date || undefined,
        variance_reason: countData.variance_reason || undefined,
        variance_note: countData.variance_note || undefined,
        remark: countData.remark || undefined,
        damage_included: countData.damage_included || undefined,
        damaged_qty: countData.damaged_qty || undefined,
        non_returnable_damaged_qty:
          countData.non_returnable_damaged_qty || undefined,
        item_name: itemName,
        counted_by: user?.username || "offline_user",
        counted_at: new Date().toISOString(),
      };

      await cacheCountLine(offlineCountLine);
      await addToOfflineQueue("count_line", offlineCountLine);

      return offlineCountLine;
    }

    const response = await api.post("/api/count-lines", countData);
    await cacheCountLine(response.data);
    return response.data;
  } catch (error) {
    __DEV__ && console.error("Error creating count line:", error);

    // Fallback to offline mode
    const user = useAuthStore.getState().user;

    // Try to get item name from cache if not available
    let itemName = "Unknown Item";
    try {
      const cachedItem = await getItemFromCache(countData.item_code);
      if (cachedItem) itemName = cachedItem.item_name;
    } catch {
      // Ignore cache lookup error
    }

    const offlineCountLine = {
      _id: `offline_${Date.now()}`,
      ...countData,
      rack_no: countData.rack_no || undefined,
      floor_no: countData.floor_no || undefined,
      mark_location: countData.mark_location || undefined,
      sr_no: countData.sr_no || undefined,
      manufacturing_date: countData.manufacturing_date || undefined,
      variance_reason: countData.variance_reason || undefined,
      variance_note: countData.variance_note || undefined,
      remark: countData.remark || undefined,
      damage_included: countData.damage_included || undefined,
      damaged_qty: countData.damaged_qty || undefined,
      non_returnable_damaged_qty:
        countData.non_returnable_damaged_qty || undefined,
      item_name: itemName,
      counted_by: user?.username || "offline_user",
      counted_at: new Date().toISOString(),
    };

    await cacheCountLine(offlineCountLine);
    await addToOfflineQueue("count_line", offlineCountLine);

    return offlineCountLine;
  }
};

// Get count lines by session (with offline support)
export const getCountLines = async (
  sessionId: string,
  page: number = 1,
  pageSize: number = 50,
  verified?: boolean,
) => {
  try {
    if (!isOnline()) {
      // Return cached count lines
      const cachedLines = await getCountLinesBySessionFromCache(sessionId);
      // Filter by verified status if provided
      if (verified !== undefined) {
        const filtered = cachedLines.filter(
          (line) => line.verified === verified,
        );
        return {
          items: filtered,
          pagination: {
            page: 1,
            page_size: filtered.length,
            total: filtered.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        };
      }
      return {
        items: cachedLines,
        pagination: {
          page: 1,
          page_size: cachedLines.length,
          total: cachedLines.length,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
      };
    }

    const response = await api.get(`/api/count-lines/session/${sessionId}`, {
      params: {
        page,
        page_size: pageSize,
        verified,
      },
    });
    return response.data;
  } catch (error) {
    __DEV__ && console.error("Error getting count lines:", error);

    // Fallback to offline cache
    try {
      const cachedLines = await getCountLinesBySessionFromCache(sessionId);
      if (verified !== undefined) {
        const filtered = cachedLines.filter(
          (line) => line.verified === verified,
        );
        return {
          items: filtered,
          pagination: {
            page: 1,
            page_size: filtered.length,
            total: filtered.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
          },
        };
      }
      return {
        items: cachedLines,
        pagination: {
          page: 1,
          page_size: cachedLines.length,
          total: cachedLines.length,
          total_pages: 1,
          has_next: false,
          has_prev: false,
        },
      };
    } catch (cacheError) {
      throw error;
    }
  }
};
