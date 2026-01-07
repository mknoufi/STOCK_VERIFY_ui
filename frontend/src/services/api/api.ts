/**
 * API service layer: network-aware endpoints with offline fallbacks and caching.
 * Most functions prefer online calls and transparently fall back to cache.
 */
import { useAuthStore } from "../../store/authStore";
import api from "../httpClient";
import { retryWithBackoff } from "../../utils/retry";
import { validateBarcode } from "../../utils/validation";
import { CreateCountLinePayload, Item } from "../../types/scan";
import {
  addToOfflineQueue,
  cacheItem,
  searchItemsInCache,
  cacheSession,
  getSessionsCache,
  getSessionFromCache,
  getItemFromCache,
  cacheCountLine,
  getCountLinesBySessionFromCache,
  isCacheStale,
  type DataSource,
} from "../offline/offlineStorage";
import { createOfflineCountLine } from "../offline/offlineCountLine";
import { AppError } from "../../utils/errors";
import { createLogger } from "../logging";
import { generateOfflineId } from "../../utils/uuid";

const log = createLogger('ApiService');

/**
 * Response with source metadata for transparency about data freshness
 */
export interface ApiResponseWithSource<T> {
  data: T;
  _source: DataSource;
  _cachedAt?: string | null;
  _stale?: boolean;
  _degraded?: boolean;
}

// Check if online - uses three-state network model for better reliability
export const isOnline = () => {
  const { status, isOnline: rawOnline, isInternetReachable, connectionType } = getNetworkStatus();

  // Debug logging
  log.debug("Network Status Check", {
    status,
    isOnline: rawOnline,
    isInternetReachable,
    connectionType,
  });

  // Use three-state logic: only skip API if definitely offline
  return status !== 'OFFLINE';
};

// Create session (with offline support)
export const createSession = async (
  params: string | { warehouse: string; type?: string },
) => {
  const warehouse = typeof params === "string" ? params : params.warehouse;
  const sessionType = typeof params !== "string" ? params.type : undefined;

  // Helper to create offline session - single source of truth
  const createOfflineSession = () => ({
    id: generateOfflineId(),
    warehouse,
    status: "OPEN",
    type: sessionType || "STANDARD",
    staff_user: "offline_user",
    staff_name: "Offline User",
    started_at: new Date().toISOString(),
    total_items: 0,
    total_variance: 0,
    _source: 'offline' as DataSource,
    _createdOffline: true,
  });

  try {
    if (!isOnline()) {
      log.info('Creating offline session', { warehouse, type: sessionType });
      const offlineSession = createOfflineSession();
      await cacheSession(offlineSession);
      await addToOfflineQueue("session", offlineSession);
      return offlineSession;
    }

    const payload = {
      warehouse,
      ...(sessionType && { type: sessionType }),
    };

    const response = await api.post("/api/sessions", payload);
    await cacheSession(response.data);
    return response.data;
  } catch (error) {
    log.warn("Error creating session, switching to offline mode", {
      error: error instanceof Error ? error.message : String(error),
    });

    // Fallback to offline mode using same helper
    const offlineSession = createOfflineSession();
    await cacheSession(offlineSession);
    await addToOfflineQueue("session", offlineSession);
    return offlineSession;
  }
};

// Get sessions (with offline support and pagination)
/**
 * Get sessions with pagination. Falls back to local cache when offline or on errors.
 * @param page Page number (1-based)
 * @param pageSize Page size (1-100)
 */
export const getSessions = async (page: number = 1, pageSize: number = 20) => {
  try {
    if (!isOnline()) {
      // Return cached sessions
      const cache = await getSessionsCache();
      const allSessions = Object.values(cache);

      // Apply pagination to cached data
      const skip = (page - 1) * pageSize;
      const paginatedSessions = allSessions.slice(skip, skip + pageSize);

      return {
        items: paginatedSessions,
        pagination: {
          page,
          page_size: pageSize,
          total: allSessions.length,
          total_pages: Math.ceil(allSessions.length / pageSize),
          has_next: skip + pageSize < allSessions.length,
          has_prev: page > 1,
        },
      };
    }

    // Ensure page and pageSize are valid numbers (convert to integers explicitly)
    const validPage = Math.max(1, Math.floor(Number(page)) || 1);
    const validPageSize = Math.max(
      1,
      Math.min(100, Math.floor(Number(pageSize)) || 20),
    );

    const response = await api.get("/api/sessions", {
      params: {
        page: validPage,
        page_size: validPageSize,
      },
    });

    // Handle both old format (array) and new format (object with items)
    const sessions = response.data.items || response.data;
    const pagination = response.data.pagination || {
      page,
      page_size: pageSize,
      total: sessions.length,
      total_pages: 1,
      has_next: false,
      has_prev: false,
    };

    // Cache sessions
    if (Array.isArray(sessions)) {
      for (const session of sessions) {
        await cacheSession(session);
      }
    }

    return {
      items: sessions,
      pagination,
    };
  } catch (error: any) {
    // Suppress logging for 401 errors as they are handled by the interceptor
    if (error?.response?.status !== 401) {
      __DEV__ && console.error("Error getting sessions:", error);
    }

    // Fallback to cache
    const cache = await getSessionsCache();
    const allSessions = Object.values(cache);
    const skip = (page - 1) * pageSize;
    const paginatedSessions = allSessions.slice(skip, skip + pageSize);

    return {
      items: paginatedSessions,
      pagination: {
        page,
        page_size: pageSize,
        total: allSessions.length,
        total_pages: Math.ceil(allSessions.length / pageSize),
        has_next: skip + pageSize < allSessions.length,
        has_prev: page > 1,
      },
    };
  }
};

// Get session by ID (with offline support)
/**
 * Get a single session by id. Uses cache offline.
 * @param sessionId Session identifier
 */
export const getSession = async (sessionId: string) => {
  try {
    if (!isOnline()) {
      // Return cached session
      return await getSessionFromCache(sessionId);
    }

    const response = await api.get(`/api/sessions/${sessionId}`);
    await cacheSession(response.data);
    return response.data;
  } catch (error) {
    __DEV__ && console.error("Error getting session:", error);

    // Fallback to cache
    // Fallback to cache
    return await getSessionFromCache(sessionId);
  }
};

// Get Rack Progress
export const getRackProgress = async (sessionId: string) => {
  try {
    if (!isOnline()) {
      // Offline: Calculate rack progress from cached count lines
      // Implementation: Provides meaningful progress data using available cached information
      const cachedLines = await getCountLinesBySessionFromCache(sessionId);

      if (cachedLines.length === 0) {
        return {
          data: [],
          message:
            "Offline mode - no cached count data available for this session",
          offline: true,
        };
      }

      // Group counted items by rack with enhanced calculation
      const rackStats: Record<
        string,
        {
          counted: number;
          uniqueItems: Set<string>;
          totalQuantity: number;
          lastUpdated: string;
          hasDiscrepancies: boolean;
        }
      > = {};

      for (const line of cachedLines) {
        // Extract rack information from count line data
        const rack =
          line.rack_no ||
          line.rack ||
          line.rack_id ||
          "Unknown";

        // Create stats object if it doesn't exist
        let stats = rackStats[rack];
        if (!stats) {
          stats = {
            counted: 0,
            uniqueItems: new Set(),
            totalQuantity: 0,
            lastUpdated: line.counted_at || new Date().toISOString(),
            hasDiscrepancies: false,
          };
          rackStats[rack] = stats;
        }

        // Track unique items and quantities
        if (!stats.uniqueItems.has(line.item_code)) {
          stats.uniqueItems.add(line.item_code);
          stats.counted++;
        }

        // Accumulate total quantity counted
        stats.totalQuantity += line.counted_qty || 1;

        // Check for discrepancies (if variance data is available)
        if (line.variance && Math.abs(line.variance) > 0) {
          stats.hasDiscrepancies = true;
        }

        // Update last modified time
        const lineTime = line.counted_at;
        if (lineTime && lineTime > stats.lastUpdated) {
          stats.lastUpdated = lineTime;
        }
      }

      // Build comprehensive rack progress array
      const rackProgress = Object.entries(rackStats)
        .filter(([rack]) => rack !== "Unknown")
        .map(([rack, stats]) => ({
          rack,
          total: null, // Unknown offline - would require full ERP data cache
          counted: stats.counted,
          counted_quantity: stats.totalQuantity,
          percentage: null, // Cannot calculate without total items per rack
          offline: true,
          last_updated: stats.lastUpdated,
          has_discrepancies: stats.hasDiscrepancies,
          status: stats.hasDiscrepancies ? "discrepancies" : "counting",
          estimated_completion: null, // Would need historical data for estimation
        }))
        .sort((a, b) => a.rack.localeCompare(b.rack));

      // Provide detailed offline status information
      const totalItems = rackProgress.reduce(
        (sum, rack) => sum + rack.counted,
        0,
      );
      const totalQuantity = rackProgress.reduce(
        (sum, rack) => sum + rack.counted_quantity,
        0,
      );
      const racksWithDiscrepancies = rackProgress.filter(
        (r) => r.has_discrepancies,
      ).length;

      return {
        data: rackProgress,
        message: `Offline mode - ${rackProgress.length} racks with ${totalItems} counted items (${totalQuantity} total quantity)${racksWithDiscrepancies > 0 ? `, ${racksWithDiscrepancies} racks with discrepancies` : ""}`,
        offline: true,
        summary: {
          total_racks: rackProgress.length,
          total_counted_items: totalItems,
          total_counted_quantity: totalQuantity,
          racks_with_discrepancies: racksWithDiscrepancies,
          last_sync: new Date().toISOString(),
        },
      };
    }
    // Note: The backend response wrapper puts the actual array in data.data
    const response = await api.get(
      `/api/v2/sessions/${sessionId}/rack-progress`,
    );
    // Return just the data part which is the array of racks
    return response.data;
  } catch (error) {
    __DEV__ && console.error("Error getting rack progress:", error);
    return { data: [] };
  }
};

// Bulk close sessions
export const bulkCloseSessions = async (sessionIds: string[]) => {
  try {
    const response = await api.post("/api/sessions/bulk/close", sessionIds);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Bulk close sessions error:", error);
    throw error;
  }
};

// Bulk reconcile sessions
export const bulkReconcileSessions = async (sessionIds: string[]) => {
  try {
    const response = await api.post("/api/sessions/bulk/reconcile", sessionIds);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Bulk reconcile sessions error:", error);
    throw error;
  }
};

// Bulk export sessions
export const bulkExportSessions = async (
  sessionIds: string[],
  format: string = "excel",
) => {
  try {
    const response = await api.post("/api/sessions/bulk/export", sessionIds, {
      params: { format },
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Bulk export sessions error:", error);
    throw error;
  }
};

// Get sessions analytics (aggregated server-side)
export const getSessionsAnalytics = async () => {
  try {
    const response = await api.get("/api/sessions/analytics");
    return response.data;
  } catch (error: unknown) {
    log.error("Get sessions analytics error", { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

// Get item by barcode (with offline support, retry, and auto recovery)
/**
 * Lookup an item by barcode with validation, retry and cache fallback.
 * Returns item with source metadata indicating freshness.
 * @param barcode Barcode string scanned/entered
 * @param retryCount Number of retries for transient failures
 */
export const getItemByBarcode = async (
  barcode: string,
  retryCount: number = 3,
): Promise<Item & { _source?: DataSource; _cachedAt?: string; _stale?: boolean }> => {
  // Validate and normalize barcode before making API call
  const validation = validateBarcode(barcode);
  if (!validation.valid || !validation.value) {
    throw new AppError({
      code: 'INVALID_BARCODE',
      severity: 'USER',
      message: validation.error || "Invalid barcode format",
      userMessage: 'Please check the barcode and try again.',
      context: { barcode },
    });
  }

  // Use normalized barcode if available (6-digit format for numeric barcodes)
  const trimmedBarcode = validation.value;

  log.debug(`Looking up barcode: ${trimmedBarcode}`, { original: barcode });

  // Helper to return cached item with source metadata
  const returnCachedItem = (cached: any): Item & { _source: DataSource; _cachedAt: string; _stale: boolean } => {
    const stale = isCacheStale(cached.cached_at);
    const stockValue = cached.current_stock ?? cached.stock_qty ?? 0;
    return {
      id: cached.item_code,
      name: cached.item_name,
      item_code: cached.item_code,
      barcode: cached.barcode,
      item_name: cached.item_name,
      description: cached.description,
      stock_qty: stockValue,
      current_stock: stockValue, // Also set current_stock for item-detail.tsx compatibility
      uom_name: cached.uom_name ?? cached.uom,
      mrp: cached.mrp,
      sales_price: cached.sales_price,
      category: cached.category,
      subcategory: cached.subcategory,
      // Source metadata
      _source: 'cache',
      _cachedAt: cached.cached_at,
      _stale: stale,
    };
  };

  // Check if offline first - only use cache if truly offline
  if (!isOnline()) {
    log.debug("Offline mode - searching cache");
    const items = await searchItemsInCache(trimmedBarcode);
    if (items.length > 0 && items[0]) {
      log.debug("Found in cache", { itemCode: items[0].item_code });
      return returnCachedItem(items[0]);
    }
    throw new AppError({
      code: 'ITEM_CACHE_MISS',
      severity: 'USER',
      message: `Item not found in offline cache: ${trimmedBarcode}`,
      userMessage: 'Item not found in offline cache. Connect to internet to search.',
      context: { barcode: trimmedBarcode },
    });
  }

  // Online - try API first, then cache as fallback
  try {
    log.debug("Online mode - calling API");

    // Direct API call with retry (only retries transient errors)
    const response = await retryWithBackoff(
      () =>
        api.get(
          `/api/v2/erp/items/barcode/${encodeURIComponent(trimmedBarcode)}/enhanced`,
        ),
      {
        retries: retryCount,
        backoffMs: 1000,
        // Only retry on server errors and network issues, not client errors
        shouldRetry: (error: any) => {
          const status = error?.response?.status;
          // Don't retry 4xx errors (client errors like 404, 400)
          if (status && status >= 400 && status < 500) {
            return false;
          }
          // Retry network errors and 5xx server errors
          return true;
        },
      },
    );

    // Handle v2 response format { item: ..., metadata: ... }
    const itemData = response.data.item || response.data;

    // Check if we actually got an item
    if (!itemData || !itemData.item_code) {
      throw new AppError({
        code: 'ITEM_NOT_FOUND',
        severity: 'USER',
        message: `Item not found: Barcode '${trimmedBarcode}' not in database`,
        userMessage: `No item found for barcode ${trimmedBarcode}`,
        context: { barcode: trimmedBarcode },
      });
    }

    // Normalize backend fields to the canonical frontend Item interface.
    const displayName =
      itemData.item_name || itemData.category || `Item ${itemData.item_code}`;

    // Fix: Use proper fallback chain without redundancy
    const stockQty = itemData.stock_qty ?? itemData.current_stock ?? 0;

    const normalizedItem: Item & { _source: DataSource } = {
      id: itemData.id || itemData._id || itemData.item_code,
      name: itemData.name || displayName,
      item_code: itemData.item_code,
      barcode: itemData.barcode,
      item_name: itemData.item_name || displayName,
      uom_name: itemData.uom_name ?? itemData.uom ?? itemData.uom_code,
      uom: itemData.uom_name ?? itemData.uom ?? itemData.uom_code,
      sales_price: itemData.sales_price ?? itemData.sale_price ?? itemData.standard_rate,
      sale_price: itemData.sale_price ?? itemData.sales_price,
      mrp: itemData.mrp,
      category: itemData.category,
      subcategory: itemData.subcategory,
      warehouse: itemData.warehouse,
      stock_qty: stockQty,
      current_stock: stockQty, // Also set current_stock for item-detail.tsx compatibility
      batch_id: itemData.batch_id,
      manual_barcode: itemData.manual_barcode,
      unit2_barcode: itemData.unit2_barcode,
      unit_m_barcode: itemData.unit_m_barcode,
      // Source metadata
      _source: 'api',
    };

    log.debug("Found via API", { itemCode: normalizedItem.item_code });


    // Cache the item for future offline use
    try {
      await cacheItem({
        item_code: normalizedItem.item_code,
        barcode: normalizedItem.barcode,
        item_name: normalizedItem.item_name || normalizedItem.name || normalizedItem.item_code || '',
        description: (normalizedItem as any).description,
        uom: normalizedItem.uom ?? normalizedItem.uom_code ?? normalizedItem.uom_name,
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
        current_stock:
          normalizedItem.current_stock || normalizedItem.stock_qty,
      });
    } catch (cacheError) {
      log.warn("Failed to cache item", { error: cacheError instanceof Error ? cacheError.message : String(cacheError) });
      // Don't fail the whole operation for cache errors
    }

    return normalizedItem;
  } catch (apiError: any) {
    const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
    log.error("API call failed", { error: errorMessage });

    // Only fallback to cache if API fails (degraded mode)
    log.debug("API failed, trying cache fallback");
    try {
      const items = await searchItemsInCache(trimmedBarcode);
      if (items.length > 0 && items[0]) {
        log.debug("Found in cache fallback", { itemCode: items[0].item_code });
        // Return with degraded metadata to indicate stale data
        return {
          ...returnCachedItem(items[0]),
          _source: 'cache' as DataSource,
          _degraded: true, // API failed, cache fallback
        } as any;
      }
      // Cache is empty too
      throw new AppError({
        code: 'ITEM_NOT_FOUND',
        severity: 'USER',
        message: "Item not found in cache",
        userMessage: `Barcode ${trimmedBarcode} not found. Please try again when online.`,
        context: { barcode: trimmedBarcode },
      });
    } catch (cacheError: any) {
      // If it's already an AppError, just rethrow
      if (cacheError instanceof AppError) {
        throw cacheError;
      }

      log.error("Cache fallback also failed", { error: cacheError.message });

      // Provide helpful error message based on API error type
      throw AppError.fromApiError(apiError, {
        barcode: trimmedBarcode,
        fallbackAttempted: true,
      });
    }
  }
};

// Search items (with offline support)
/**
 * Search items by query with offline fallback.
 * Returns items with source metadata.
 */
export const searchItems = async (query: string): Promise<(Item & { _source?: DataSource })[]> => {
  // Helper to map cached items to frontend Item interface
  const mapCachedItems = (items: any[], source: DataSource = 'cache'): (Item & { _source: DataSource })[] => {
    return items.map((item) => ({
      id: item.item_code,
      name: item.item_name,
      item_code: item.item_code,
      barcode: item.barcode,
      item_name: item.item_name,
      description: item.description,
      uom: item.uom,
      stock_qty: item.current_stock,
      manual_barcode: item.manual_barcode,
      unit2_barcode: item.unit2_barcode,
      unit_m_barcode: item.unit_m_barcode,
      batch_id: item.batch_id,
      _source: source,
    }));
  };

  try {
    if (!isOnline()) {
      log.debug("Offline mode - searching cache", { query });
      const cachedItems = await searchItemsInCache(query);
      return mapCachedItems(cachedItems, 'cache');
    }

    // Use new optimized search endpoint (fallback to cache on network errors)
    let response;
    try {
      log.debug("Searching via API", { query });
      response = await api.get("/api/items/search/optimized", {
        params: { q: query },
      });
    } catch (error: any) {
      log.warn("Search API failed, falling back to cache", { error: error.message });
      const cachedItems = await searchItemsInCache(query);
      return mapCachedItems(cachedItems, 'cache').map(item => ({
        ...item,
        _degraded: true, // API failed
      } as any));
    }

    // Handle ApiResponse wrapper
    const apiResponse = response.data;
    const data = apiResponse.data || { items: [] };
    const items = data.items || [];

    // Map backend fields to frontend Item interface
    const mappedItems: (Item & { _source: DataSource })[] = items.map((item: Record<string, unknown>) => {
      const mapped = { ...item } as unknown as Item & { _source: DataSource };
      if (item.item_name && !mapped.name) {
        mapped.name = item.item_name as string;
      }
      if (item.uom_name && !mapped.uom) {
        mapped.uom = item.uom_name as string;
      }
      if (item._id && !mapped.id) {
        mapped.id = item._id as string;
      } else if (item.item_code && !mapped.id) {
        mapped.id = item.item_code as string;
      }
      mapped._source = 'api';
      return mapped;
    });

    log.debug("Found items via API", { count: mappedItems.length });

    // Cache the items
    for (const item of mappedItems) {
      await cacheItem({
        item_code: item.item_code!,
        barcode: item.barcode,
        item_name: item.item_name || item.name,
        description: (item as any).description,
        uom: (item as any).uom_name || (item as any).uom,
        current_stock: item.stock_qty,
        mrp: item.mrp,
        sale_price: item.sale_price,
        category: item.category,
        subcategory: item.subcategory,
        warehouse: item.warehouse,
        manual_barcode: item.manual_barcode,
        unit2_barcode: item.unit2_barcode,
        unit_m_barcode: item.unit_m_barcode,
        batch_id: item.batch_id,
      });
    }

    return mappedItems;
  } catch (error: any) {
    log.error("Error searching items", { error: error.message });

    // Fallback to cache
    try {
      const cachedItems = await searchItemsInCache(query);
      return mapCachedItems(cachedItems, 'cache').map(item => ({
        ...item,
        _degraded: true,
      } as any));
    } catch (fallbackError: any) {
      log.error("Cache fallback error", { error: fallbackError.message });
      return [];
    }
  }
};

// Optimized search with relevance scoring and pagination
export interface OptimizedSearchResult {
  items: Item[];
  total: number;
  page: number;
  page_size: number;
  query: string;
  search_time_ms: number;
}

export const searchItemsOptimized = async (
  query: string,
  page: number = 1,
  pageSize: number = 20
): Promise<OptimizedSearchResult> => {
  try {
    if (!isOnline()) {
      // Fallback to cache search for offline
      const cachedItems = await searchItemsInCache(query);
      const mappedItems = cachedItems.map((item) => ({
        id: item.item_code,
        name: item.item_name,
        item_code: item.item_code,
        barcode: item.barcode,
        item_name: item.item_name,
        description: item.description,
        uom: item.uom,
        stock_qty: item.current_stock,
        mrp: item.mrp,
        sale_price: item.sale_price,
        sales_price: item.sales_price,
        category: item.category,
        subcategory: item.subcategory,
        warehouse: item.warehouse,
        manual_barcode: item.manual_barcode,
        unit2_barcode: item.unit2_barcode,
        unit_m_barcode: item.unit_m_barcode,
        batch_id: item.batch_id,
      }));
      return {
        items: mappedItems,
        total: mappedItems.length,
        page: 1,
        page_size: mappedItems.length,
        query,
        search_time_ms: 0,
      };
    }

    // Use new optimized search endpoint
    const response = await api.get("/api/items/search/optimized", {
      params: {
        q: query,
        page,
        page_size: pageSize,
      },
    });

    // Unwrap ApiResponse
    const apiResponse = response.data;
    const data = apiResponse.data || { items: [] };
    const items = data.items || [];

    // Map backend fields to frontend Item interface with relevance info
    const mappedItems: Item[] = items.map((item: Record<string, unknown>) => ({
      id: (item._id as string) || (item.item_code as string),
      item_code: item.item_code as string,
      barcode: item.barcode as string,
      name: item.item_name as string,
      item_name: item.item_name as string,
      description: item.description as string,
      uom: (item.uom_name as string) || (item.uom as string),
      uom_name: (item.uom_name as string) || (item.uom as string),
      stock_qty: item.current_stock as number,
      mrp: item.mrp as number,
      sale_price: item.sale_price as number,
      sales_price: (item.sale_price as number) || (item.sales_price as number),
      manual_barcode: item.manual_barcode as string,
      unit2_barcode: item.unit2_barcode as string,
      unit_m_barcode: item.unit_m_barcode as string,
      batch_id: item.batch_id as string,
      category: item.category as string,
      subcategory: item.subcategory as string,
      warehouse: item.warehouse as string,
      // Relevance metadata from optimized search
      relevance_score: item.relevance_score as number,
      match_type: item.match_type as string,
    }));

    // Cache top items for offline access
    for (const item of mappedItems.slice(0, 10)) {
      await cacheItem({
        item_code: item.item_code!,
        barcode: item.barcode,
        item_name: item.item_name || item.name,
        description: (item as any).description,
        uom: (item as any).uom,
        current_stock: item.stock_qty,
        mrp: item.mrp,
        sale_price: item.sale_price,
        sales_price: item.sales_price,
        category: item.category,
        subcategory: item.subcategory,
        warehouse: item.warehouse,
        manual_barcode: item.manual_barcode,
        unit2_barcode: item.unit2_barcode,
        unit_m_barcode: item.unit_m_barcode,
        batch_id: item.batch_id,
      });
    }

    return {
      items: mappedItems,
      total: data.total || mappedItems.length,
      page: data.page || page,
      page_size: data.page_size || pageSize,
      query: data.query || query,
      search_time_ms: data.search_time_ms || 0,
    };
  } catch (error) {
    __DEV__ && console.error("Error in optimized search:", error);

    // Fallback to cache
    try {
      const cachedItems = await searchItemsInCache(query);
      const mappedItems = cachedItems.map((item) => ({
        id: item.item_code,
        name: item.item_name,
        item_code: item.item_code,
        barcode: item.barcode,
        item_name: item.item_name,
        description: item.description,
        uom: item.uom,
        stock_qty: item.current_stock,
        mrp: item.mrp,
        sale_price: item.sale_price,
        sales_price: item.sales_price,
        category: item.category,
        subcategory: item.subcategory,
        warehouse: item.warehouse,
        manual_barcode: item.manual_barcode,
        unit2_barcode: item.unit2_barcode,
        unit_m_barcode: item.unit_m_barcode,
        batch_id: item.batch_id,
      }));
      return {
        items: mappedItems,
        total: mappedItems.length,
        page: 1,
        page_size: mappedItems.length,
        query,
        search_time_ms: 0,
      };
    } catch (fallbackError) {
      __DEV__ && console.error("Cache fallback error:", fallbackError);
      return {
        items: [],
        total: 0,
        page: 1,
        page_size: pageSize,
        query,
        search_time_ms: 0,
      };
    }
  }
};

// Get search suggestions for autocomplete
export const getSearchSuggestions = async (
  query: string,
  limit: number = 5
): Promise<string[]> => {
  try {
    if (!isOnline() || query.length < 2) {
      return [];
    }

    const response = await api.get("/api/items/search/suggestions", {
      params: { query, limit },
    });

    return response.data.suggestions || [];
  } catch (error) {
    __DEV__ && console.error("Error fetching suggestions:", error);
    return [];
  }
};

// Semantic Search (AI-Powered)
export const searchItemsSemantic = async (query: string, limit: number = 20): Promise<Item[]> => {
  try {
    if (!isOnline()) {
      return []; // Semantic search requires server-side model
    }

    const response = await api.get("/api/v2/items/semantic", {
      params: { query, limit },
    });

    const items = response.data.data?.items || [];
    return items.map((item: any) => ({
      ...item,
      id: item.id || item._id,
      name: item.name || item.item_name,
    }));
  } catch (error) {
    __DEV__ && console.error("Error in semantic search:", error);
    return [];
  }
};

// AI Variance Risk Predictions
export const getRiskPredictions = async (sessionId: string, limit: number = 10) => {
  try {
    if (!isOnline()) return [];

    const response = await api.get("/api/v2/supervisor/predictions", {
      params: { session_id: sessionId, limit }
    });

    return response.data.data || [];
  } catch (error) {
    __DEV__ && console.error("Error fetching risk predictions:", error);
    return [];
  }
};

// Visual Search / Identify Item
export const identifyItem = async (imageUri: string): Promise<Item[]> => {
  try {
    if (!isOnline()) {
      throw new Error("Visual search requires internet connection");
    }

    // Create form data for image upload
    const formData = new FormData();
    const filename = imageUri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename || "");
    const type = match ? `image/${match[1]}` : `image`;

    formData.append("file", {
      uri: imageUri,
      name: filename || "upload.jpg",
      type,
    } as any);

    const response = await api.post("/api/v2/items/identify", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000, // Recognition might take longer
    });

    const items = response.data.data?.items || [];
    return items.map((item: any) => ({
      ...item,
      id: item.id || item._id,
      name: item.name || item.item_name,
    }));
  } catch (error) {
    __DEV__ && console.error("Error in visual search:", error);
    throw error;
  }
};

// Create count line (with offline support)
/**
 * Create a count line with offline fallback.
 * Uses createOfflineCountLine helper for consistent offline object creation.
 */
export const createCountLine = async (countData: CreateCountLinePayload): Promise<any & { _source?: DataSource; _offline?: boolean }> => {
  // Helper to resolve item name from cache
  const resolveItemName = async (): Promise<string> => {
    try {
      const cachedItem = await getItemFromCache(countData.item_code);
      if (cachedItem) return cachedItem.item_name;
    } catch {
      // Ignore cache lookup error
    }
    return "Unknown Item";
  };

  // Get user context once
  const user = useAuthStore.getState().user;

  try {
    if (!isOnline()) {
      log.debug("Offline mode - creating offline count line");

      const itemName = await resolveItemName();
      const offlineCountLine = (await createOfflineCountLine(countData, {
        username: user?.username,
        itemName,
      })) as any;

      await cacheCountLine(offlineCountLine);
      await addToOfflineQueue("count_line", offlineCountLine);

      log.debug("Created offline count line", { id: offlineCountLine._id });
      return {
        ...offlineCountLine,
        _source: 'local' as DataSource,
        _offline: true,
      };
    }

    // Online - make API call
    log.debug("Online mode - creating count line via API");
    const response = await api.post("/api/count-lines", countData);
    await cacheCountLine(response.data);

    log.debug("Created count line via API", { id: response.data._id || response.data.id });
    return {
      ...response.data,
      _source: 'api' as DataSource,
    };
  } catch (error: any) {
    log.error("Error creating count line, falling back to offline", {
      error: error instanceof Error ? error.message : String(error)
    });

    // Fallback to offline mode using the same helper
    const itemName = await resolveItemName();
    const offlineCountLine = (await createOfflineCountLine(countData, {
      username: user?.username,
      itemName,
    })) as any; // Cast to any to avoid double Promise confusion

    await cacheCountLine(offlineCountLine);
    await addToOfflineQueue("count_line", offlineCountLine);

    log.debug("Created offline count line as fallback", { id: offlineCountLine._id });
    return {
      ...offlineCountLine,
      _source: 'local' as DataSource,
      _offline: true,
      _degraded: true, // API failed, fallback
    } as any;
  }
};

// Get count lines by session (with offline support)
/**
 * Get count lines for a session with proper pagination support (including offline).
 */
export const getCountLines = async (
  sessionId: string,
  page: number = 1,
  pageSize: number = 50,
  verified?: boolean,
): Promise<{ items: any[]; pagination: any; _source?: DataSource; _stale?: boolean; _degraded?: boolean }> => {
  // Helper to create proper paginated response from array
  const paginateItems = (
    items: any[],
    requestedPage: number,
    requestedPageSize: number,
    source: DataSource = 'cache',
    stale: boolean = false,
  ) => {
    const total = items.length;
    const totalPages = Math.ceil(total / requestedPageSize);
    const startIndex = (requestedPage - 1) * requestedPageSize;
    const endIndex = startIndex + requestedPageSize;
    const pageItems = items.slice(startIndex, endIndex);

    return {
      items: pageItems,
      pagination: {
        page: requestedPage,
        page_size: requestedPageSize,
        total,
        total_pages: totalPages,
        has_next: requestedPage < totalPages,
        has_prev: requestedPage > 1,
      },
      _source: source,
      _stale: stale,
    };
  };

  try {
    if (!isOnline()) {
      log.debug("Offline mode - returning cached count lines with pagination");

      // Return cached count lines with proper pagination
      const cachedLines = await getCountLinesBySessionFromCache(sessionId);

      // Filter by verified status if provided
      const filteredLines = verified !== undefined
        ? cachedLines.filter((line) => line.verified === verified)
        : cachedLines;

      return paginateItems(filteredLines, page, pageSize, 'cache', true);
    }

    let url = `/api/count-lines/session/${sessionId}?page=${page}&page_size=${pageSize}`;
    if (verified !== undefined) {
      url += `&verified=${verified}`;
    }

    log.debug("Fetching count lines from API", { sessionId, page, pageSize });
    const response = await api.get(url);

    // Cache count lines
    if (response.data?.items && Array.isArray(response.data.items)) {
      for (const countLine of response.data.items) {
        await cacheCountLine(countLine);
      }
    } else if (Array.isArray(response.data)) {
      // Handle legacy format
      for (const countLine of response.data) {
        await cacheCountLine(countLine);
      }
    }

    return {
      ...response.data,
      _source: 'api' as DataSource,
    };
  } catch (error: any) {
    log.error("Error getting count lines, falling back to cache", {
      error: error instanceof Error ? error.message : String(error)
    });

    // Fallback to cache with proper pagination
    const cachedLines = await getCountLinesBySessionFromCache(sessionId);

    const filteredLines = verified !== undefined
      ? cachedLines.filter((line) => line.verified === verified)
      : cachedLines;

    return {
      ...paginateItems(filteredLines, page, pageSize, 'cache', true),
      _degraded: true, // API failed, using cache
    };
  }
};

// Check if item already counted
export const checkItemCounted = async (sessionId: string, itemCode: string) => {
  try {
    if (!isOnline()) {
      // Check in cached count lines
      const cachedLines = await getCountLinesBySessionFromCache(sessionId);
      const itemLines = cachedLines.filter(
        (line) => line.item_code === itemCode,
      );
      return { already_counted: itemLines.length > 0, count_lines: itemLines };
    }

    const response = await api.get(
      `/api/count-lines/check/${sessionId}/${itemCode}`,
    );
    return response.data;
  } catch (error) {
    __DEV__ && console.error("Error checking item counted:", error);

    // Fallback to cache
    const cachedLines = await getCountLinesBySessionFromCache(sessionId);
    const itemLines = cachedLines.filter((line) => line.item_code === itemCode);
    return { already_counted: itemLines.length > 0, count_lines: itemLines };
  }
};

// Add quantity to existing count line
export const addQuantityToCountLine = async (
  lineId: string,
  additionalQty: number,
  batches?: any[],
) => {
  try {
    const payload: any = { additional_qty: additionalQty };
    if (batches) {
      payload.batches = batches;
    }

    // Use PATCH with body for batches, or just query params if simple
    const response = await api.patch(
      `/api/count-lines/${lineId}/add-quantity`,
      payload
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Error adding quantity to count line:", error);
    throw error;
  }
};

// Get variance reasons
export const getVarianceReasons = async () => {
  const response = await api.get("/api/variance-reasons");
  // Handle wrapped response format
  if (
    response.data &&
    response.data.reasons &&
    Array.isArray(response.data.reasons)
  ) {
    return response.data.reasons.map((r: Record<string, unknown>) => ({
      ...r,
      code: r.id || r.code,
      label: r.label || r.name,
    }));
  }
  return response.data;
};

// Approve count line
export const approveCountLine = async (lineId: string) => {
  const response = await api.put(`/api/count-lines/${lineId}/approve`);
  return response.data;
};

// Reject count line
export const rejectCountLine = async (lineId: string) => {
  const response = await api.put(`/api/count-lines/${lineId}/reject`);
  return response.data;
};

// Update session status
export const updateSessionStatus = async (
  sessionId: string,
  status: string,
) => {
  const response = await api.put(
    `/api/sessions/${sessionId}/status?status=${status}`,
  );
  return response.data;
};

// Create unknown item (with offline support)
export const createUnknownItem = async (itemData: Record<string, unknown>) => {
  try {
    if (!isOnline()) {
      await addToOfflineQueue("unknown_item", itemData);
      return { success: true, offline: true };
    }

    const response = await api.post("/api/unknown-items", itemData);
    return response.data;
  } catch (error) {
    __DEV__ && console.error("Error creating unknown item:", error);
    await addToOfflineQueue("unknown_item", itemData);
    return { success: true, offline: true };
  }
};

// Register user
export const registerUser = async (userData: {
  username: string;
  password: string;
  full_name: string;
  employee_id?: string;
  phone?: string;
}) => {
  const response = await api.post("/api/auth/register", userData);
  return response.data;
};

// Refresh item stock from ERP (with longer timeout for slow ERP connections)
export const refreshItemStock = async (itemCode: string) => {
  try {
    const response = await api.post(
      `/api/erp/items/${encodeURIComponent(itemCode)}/refresh-stock`,
      {},
      { timeout: 30000 }, // 30s timeout for slow ERP operations
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Refresh stock error:", error);
    throw error;
  }
};

// Database Mapping API
export const getAvailableTables = async (
  host: string,
  port: number,
  database: string,
  user?: string,
  password?: string,
  schema: string = "dbo",
) => {
  try {
    const params = new URLSearchParams({
      host,
      port: port.toString(),
      database,
      schema,
    });
    if (user) params.append("user", user);
    if (password) params.append("password", password);

    const response = await api.get(`/api/mapping/tables?${params.toString()}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get tables error:", error);
    throw error;
  }
};

export const getTableColumns = async (
  host: string,
  port: number,
  database: string,
  tableName: string,
  user?: string,
  password?: string,
  schema: string = "dbo",
) => {
  try {
    const params = new URLSearchParams({
      host,
      port: port.toString(),
      database,
      table_name: tableName,
      schema,
    });
    if (user) params.append("user", user);
    if (password) params.append("password", password);

    const response = await api.get(`/api/mapping/columns?${params.toString()}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get columns error:", error);
    throw error;
  }
};

export const getCurrentMapping = async () => {
  try {
    const response = await api.get("/api/mapping/current");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get current mapping error:", error);
    throw error;
  }
};

export const testMapping = async (
  config: Record<string, unknown>,
  host: string,
  port: number,
  database: string,
  user?: string,
  password?: string,
) => {
  try {
    const params = new URLSearchParams({
      host,
      port: port.toString(),
      database,
    });
    if (user) params.append("user", user);
    if (password) params.append("password", password);

    const response = await api.post(
      `/api/mapping/test?${params.toString()}`,
      config,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Test mapping error:", error);
    throw error;
  }
};

export const saveMapping = async (config: Record<string, unknown>) => {
  try {
    const response = await api.post("/api/mapping/save", config);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Save mapping error:", error);
    throw error;
  }
};

// Sync offline queue (enhanced version in syncService.ts)
export const syncOfflineQueue = async (options?: Record<string, unknown>) => {
  // Import sync service dynamically
  const syncService = await import("../syncService");
  return await syncService.syncOfflineQueue(options);
};

// Activity Log API
export const getActivityLogs = async (
  page: number = 1,
  pageSize: number = 50,
  user?: string,
  action?: string,
  status?: string,
  startDate?: string,
  endDate?: string,
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (user) params.append("user", user);
    if (action) params.append("action", action);
    if (status) params.append("status_filter", status);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    __DEV__ &&
      console.log("🔍 [Activity Logs] Fetching activity logs:", {
        page,
        pageSize,
        filters: { user, action, status, startDate, endDate },
        url: `/api/activity-logs?${params.toString()}`,
      });

    const response = await api.get(`/api/activity-logs?${params.toString()}`);

    __DEV__ &&
      console.log("✅ [Activity Logs] Success:", {
        activitiesReturned: response.data?.activities?.length || 0,
      });

    return response.data;
  } catch (error: any) {
    __DEV__ &&
      console.error("❌ [Activity Logs] Error fetching activity logs:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
        filters: { page, pageSize, user, action, status, startDate, endDate },
      });
    throw error;
  }
};

// Verify Supervisor PIN
export const verifyPin = async (data: {
  supervisor_username: string;
  pin: string;
  action: string;
  reason: string;
  staff_username: string;
  entity_id?: string;
}) => {
  try {
    const response = await api.post("/api/supervisor/verify-pin", data);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Verify PIN error:", error);
    throw error;
  }
};

// Delete Count Line (Authorized)
export const deleteCountLine = async (lineId: string) => {
  try {
    const response = await api.delete(`/api/count-lines/${lineId}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Delete count line error:", error);
    throw error;
  }
};

export const getActivityStats = async (
  startDate?: string,
  endDate?: string,
) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    __DEV__ &&
      console.log("📊 [Activity Stats] Fetching statistics:", {
        filters: { startDate, endDate },
        url: `/api/activity-logs/stats?${params.toString()}`,
      });

    const response = await api.get(
      `/api/activity-logs/stats?${params.toString()}`,
    );

    __DEV__ &&
      console.log("✅ [Activity Stats] Success:", {
        total: response.data?.total || 0,
        successCount: response.data?.by_status?.success || 0,
        errorCount: response.data?.by_status?.error || 0,
        warningCount: response.data?.by_status?.warning || 0,
      });

    return response.data;
  } catch (error: any) {
    __DEV__ &&
      console.error("❌ [Activity Stats] Error fetching statistics:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
        filters: { startDate, endDate },
      });
    throw error;
  }
};

// Error Log API
export const getErrorLogs = async (
  page: number = 1,
  pageSize: number = 50,
  severity?: string,
  errorType?: string,
  endpoint?: string,
  resolved?: boolean,
  startDate?: string,
  endDate?: string,
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (severity) params.append("severity", severity);
    if (errorType) params.append("error_type", errorType);
    if (endpoint) params.append("endpoint", endpoint);
    if (resolved !== undefined) params.append("resolved", resolved.toString());
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    __DEV__ &&
      console.log("🔍 [Error Logs] Fetching error logs:", {
        page,
        pageSize,
        filters: {
          severity,
          errorType,
          endpoint,
          resolved,
          startDate,
          endDate,
        },
        url: `/api/error-logs?${params.toString()}`,
      });

    const response = await api.get(`/api/error-logs?${params.toString()}`);

    __DEV__ &&
      console.log("✅ [Error Logs] Success:", {
        totalErrors: response.data?.pagination?.total || 0,
        page: response.data?.pagination?.page || page,
        errorsReturned: response.data?.errors?.length || 0,
      });

    return response.data;
  } catch (error: any) {
    __DEV__ &&
      console.error("❌ [Error Logs] Error fetching error logs:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
        filters: {
          page,
          pageSize,
          severity,
          errorType,
          endpoint,
          resolved,
          startDate,
          endDate,
        },
      });
    throw error;
  }
};

export const getErrorStats = async (startDate?: string, endDate?: string) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    __DEV__ &&
      console.log("📊 [Error Stats] Fetching statistics:", {
        filters: { startDate, endDate },
        url: `/api/error-logs/stats?${params.toString()}`,
      });

    const response = await api.get(
      `/api/error-logs/stats?${params.toString()}`,
    );

    __DEV__ &&
      console.log("✅ [Error Stats] Success:", {
        total: response.data?.total || 0,
        criticalCount: response.data?.by_severity?.critical || 0,
        errorCount: response.data?.by_severity?.error || 0,
        warningCount: response.data?.by_severity?.warning || 0,
      });

    return response.data;
  } catch (error: any) {
    __DEV__ &&
      console.error("❌ [Error Stats] Error fetching statistics:", {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
        filters: { startDate, endDate },
      });
    throw error;
  }
};

export const getErrorDetail = async (errorId: string) => {
  try {
    __DEV__ &&
      console.log("🔍 [Error Detail] Fetching error details:", { errorId });

    const response = await api.get(`/api/error-logs/${errorId}`);

    __DEV__ &&
      console.log("✅ [Error Detail] Success:", {
        errorId,
        severity: response.data?.severity,
        errorType: response.data?.error_type,
        timestamp: response.data?.timestamp,
      });

    return response.data;
  } catch (error: any) {
    __DEV__ &&
      console.error("❌ [Error Detail] Error fetching error details:", {
        errorId,
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        data: error.response?.data,
      });
    throw error;
  }
};

export const resolveError = async (
  errorId: string,
  resolutionNote?: string,
) => {
  try {
    const response = await api.put(`/api/error-logs/${errorId}/resolve`, {
      resolution_note: resolutionNote,
    });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Resolve error error:", error);
    throw error;
  }
};

export const clearErrorLogs = async () => {
  try {
    const response = await api.delete("/api/error-logs");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Clear error logs error:", error);
    throw error;
  }
};

// ERP Configuration
export const getERPConfig = async () => {
  try {
    const response = await api.get("/api/erp/config");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get ERP config error:", error);
    throw error;
  }
};

// Stock Verification
export const verifyStock = async (countLineId: string) => {
  try {
    const response = await api.put(`/api/count-lines/${countLineId}/verify`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Verify stock error:", error);
    throw error;
  }
};

export const unverifyStock = async (countLineId: string) => {
  try {
    const response = await api.put(`/api/count-lines/${countLineId}/unverify`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Unverify stock error:", error);
    throw error;
  }
};

// ==========================================
// ADMIN CONTROL PANEL APIs
// ==========================================

// Service Status Management
export const getServicesStatus = async () => {
  try {
    const response = await api.get("/api/admin/control/services/status");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get services status error:", error);
    throw error;
  }
};

export const startService = async (service: string) => {
  try {
    const response = await api.post(
      `/api/admin/control/services/${service}/start`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Start service error:", error);
    throw error;
  }
};

export const stopService = async (service: string) => {
  try {
    const response = await api.post(
      `/api/admin/control/services/${service}/stop`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Stop service error:", error);
    throw error;
  }
};

// System Health & Issues
export const getSystemIssues = async () => {
  try {
    const response = await api.get("/api/admin/control/system/issues");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get system issues error:", error);
    throw error;
  }
};

export const getSystemHealthScore = async () => {
  try {
    const response = await api.get("/api/admin/control/system/health-score");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get system health score error:", error);
    throw error;
  }
};

export const getSystemStats = async () => {
  try {
    const response = await api.get("/api/admin/control/system/stats");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get system stats error:", error);
    throw error;
  }
};

// Device & Login Management
export const getLoginDevices = async () => {
  try {
    const response = await api.get("/api/admin/control/devices");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get login devices error:", error);
    throw error;
  }
};

// Log Management
export const getServiceLogs = async (
  service: string,
  lines: number = 100,
  level?: string,
) => {
  try {
    const params = new URLSearchParams({
      lines: lines.toString(),
    });
    if (level) params.append("level", level);

    const response = await api.get(
      `/api/admin/control/logs/${service}?${params.toString()}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get service logs error:", error);
    throw error;
  }
};

export const getAvailablePermissions = async () => {
  try {
    const response = await api.get("/api/permissions/available");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get available permissions error:", error);
    throw error;
  }
};

export const getRolePermissions = async (role: string) => {
  try {
    const response = await api.get(`/api/permissions/roles/${role}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get role permissions error:", error);
    throw error;
  }
};

export const getUserPermissions = async (username: string) => {
  try {
    const response = await api.get(`/api/permissions/users/${username}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get user permissions error:", error);
    throw error;
  }
};

export const addUserPermissions = async (
  username: string,
  permissions: string[],
) => {
  try {
    const response = await api.post(`/api/permissions/users/${username}/add`, {
      permissions,
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Add user permissions error:", error);
    throw error;
  }
};

export const removeUserPermissions = async (
  username: string,
  permissions: string[],
) => {
  try {
    const response = await api.post(
      `/api/permissions/users/${username}/remove`,
      { permissions },
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Remove user permissions error:", error);
    throw error;
  }
};

// ==========================================
// EXPORT SCHEDULES API
// ==========================================

export const getExportSchedules = async (enabled?: boolean) => {
  try {
    const params = new URLSearchParams();
    if (enabled !== undefined) params.append("enabled", enabled.toString());

    const response = await api.get(
      `/api/exports/schedules?${params.toString()}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get export schedules error:", error);
    throw error;
  }
};

export const getExportSchedule = async (scheduleId: string) => {
  try {
    const response = await api.get(`/api/exports/schedules/${scheduleId}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get export schedule error:", error);
    throw error;
  }
};

export const createExportSchedule = async (scheduleData: Record<string, unknown>) => {
  try {
    const response = await api.post("/api/exports/schedules", scheduleData);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Create export schedule error:", error);
    throw error;
  }
};

export const updateExportSchedule = async (
  scheduleId: string,
  scheduleData: Record<string, unknown>,
) => {
  try {
    const response = await api.put(
      `/api/exports/schedules/${scheduleId}`,
      scheduleData,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Update export schedule error:", error);
    throw error;
  }
};

export const deleteExportSchedule = async (scheduleId: string) => {
  try {
    const response = await api.delete(`/api/exports/schedules/${scheduleId}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Delete export schedule error:", error);
    throw error;
  }
};

export const triggerExportSchedule = async (scheduleId: string) => {
  try {
    const response = await api.post(
      `/api/exports/schedules/${scheduleId}/trigger`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Trigger export schedule error:", error);
    throw error;
  }
};

export const getExportResults = async (
  scheduleId?: string,
  status?: string,
  page: number = 1,
  pageSize: number = 50,
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (scheduleId) params.append("schedule_id", scheduleId);
    if (status) params.append("status", status);

    const response = await api.get(`/api/exports/results?${params.toString()}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get export results error:", error);
    throw error;
  }
};

export const downloadExportResult = async (resultId: string) => {
  try {
    const response = await api.get(
      `/api/exports/results/${resultId}/download`,
      {
        responseType: "blob",
      },
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Download export result error:", error);
    throw error;
  }
};

// ==========================================
// SYNC CONFLICTS API
// ==========================================

export const getSyncConflicts = async (
  status?: string,
  sessionId?: string,
  page: number = 1,
  pageSize: number = 50,
) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });
    if (status) params.append("status", status);
    if (sessionId) params.append("session_id", sessionId);

    const response = await api.get(`/api/sync/conflicts?${params.toString()}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get sync conflicts error:", error);
    throw error;
  }
};

export const getSyncConflictDetail = async (conflictId: string) => {
  try {
    const response = await api.get(`/api/sync/conflicts/${conflictId}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get sync conflict detail error:", error);
    throw error;
  }
};

export const resolveSyncConflict = async (
  conflictId: string,
  resolution: string,
  resolutionNote?: string,
) => {
  try {
    const response = await api.post(
      `/api/sync/conflicts/${conflictId}/resolve`,
      {
        resolution,
        resolution_note: resolutionNote,
      },
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Resolve sync conflict error:", error);
    throw error;
  }
};

export const batchResolveSyncConflicts = async (
  conflictIds: string[],
  resolution: string,
  resolutionNote?: string,
) => {
  try {
    const response = await api.post("/api/sync/conflicts/batch-resolve", {
      conflict_ids: conflictIds,
      resolution,
      resolution_note: resolutionNote,
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Batch resolve sync conflicts error:", error);
    throw error;
  }
};

export const getSyncConflictStats = async () => {
  try {
    const response = await api.get("/api/sync/conflicts/stats");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get sync conflict stats error:", error);
    throw error;
  }
};

// ==========================================
// METRICS API
// ==========================================

export const getMetrics = async () => {
  try {
    const response = await api.get("/api/metrics");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get metrics error:", error);
    throw error;
  }
};

export const getMetricsHealth = async () => {
  try {
    const response = await api.get("/api/metrics/health");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get metrics health error:", error);
    throw error;
  }
};

// Health check alias for backward compatibility
export const checkHealth = async () => {
  try {
    const response = await api.get("/health");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Health check error:", error);
    throw error;
  }
};

export const getMetricsStats = async () => {
  try {
    const response = await api.get("/api/metrics/stats");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get metrics stats error:", error);
    throw error;
  }
};

// Sync Status API
export const getSyncStatus = async () => {
  try {
    const response = await api.get("/api/sync/status");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get sync status error:", error);
    throw error;
  }
};

export const getSyncStats = async () => {
  try {
    const response = await api.get("/api/sync/stats");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get sync stats error:", error);
    throw error;
  }
};

export const triggerManualSync = async () => {
  try {
    const response = await api.post("/api/sync/trigger");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Trigger manual sync error:", error);
    throw error;
  }
};

export const getAvailableReports = async () => {
  try {
    const response = await api.get("/api/admin/control/reports/available");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get available reports error:", error);
    throw error;
  }
};

export const generateReport = async (
  reportId: string,
  format: string = "json",
  startDate?: string,
  endDate?: string,
) => {
  try {
    const response = await api.post("/api/admin/control/reports/generate", {
      report_id: reportId,
      format,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Generate report error:", error);
    throw error;
  }
};

export const getSqlServerConfig = async () => {
  try {
    const response = await api.get("/api/admin/control/sql-server/config");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get SQL Server config error:", error);
    throw error;
  }
};

export const updateSqlServerConfig = async (config: Record<string, unknown>) => {
  try {
    const response = await api.post(
      "/api/admin/control/sql-server/config",
      config,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Update SQL Server config error:", error);
    throw error;
  }
};

export const testSqlServerConnection = async (config?: Record<string, unknown>) => {
  try {
    const response = await api.post(
      "/api/admin/control/sql-server/test",
      config || {},
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Test SQL Server connection error:", error);
    throw error;
  }
};

// Security Dashboard API
export const getSecuritySummary = async () => {
  try {
    const response = await api.get("/api/admin/security/summary");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get security summary error:", error);
    throw error;
  }
};

export const getFailedLogins = async (
  limit: number = 100,
  hours: number = 24,
  username?: string,
  ipAddress?: string,
) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      hours: hours.toString(),
    });
    if (username) params.append("username", username);
    if (ipAddress) params.append("ip_address", ipAddress);
    const response = await api.get(
      `/api/admin/security/failed-logins?${params.toString()}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get failed logins error:", error);
    throw error;
  }
};

export const getSuspiciousActivity = async (hours: number = 24) => {
  try {
    const response = await api.get(
      `/api/admin/security/suspicious-activity?hours=${hours}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get suspicious activity error:", error);
    throw error;
  }
};

export const getSecuritySessions = async (
  limit: number = 100,
  activeOnly: boolean = false,
) => {
  try {
    const response = await api.get(
      `/api/admin/security/sessions?limit=${limit}&active_only=${activeOnly}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get security sessions error:", error);
    throw error;
  }
};

export const getSecurityAuditLog = async (
  limit: number = 100,
  hours: number = 24,
  action?: string,
  user?: string,
) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      hours: hours.toString(),
    });
    if (action) params.append("action", action);
    if (user) params.append("user", user);
    const response = await api.get(
      `/api/admin/security/audit-log?${params.toString()}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get security audit log error:", error);
    throw error;
  }
};

export const getIpTracking = async (hours: number = 24) => {
  try {
    const response = await api.get(
      `/api/admin/security/ip-tracking?hours=${hours}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get IP tracking error:", error);
    throw error;
  }
};

export const clearServiceLogs = async (service: string) => {
  try {
    const response = await api.post("/api/admin/control/logs/clear", null, {
      params: { service },
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error(`Clear ${service} logs error:`, error);
    throw error;
  }
};

// SQL Server Connection API
export const getSQLStatus = async () => {
  try {
    const response = await api.get("/api/admin/sql/status");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get SQL status error:", error);
    throw error;
  }
};

export const testSQLConnection = async (config: Record<string, unknown>) => {
  try {
    const response = await api.post("/api/admin/sql/test", config);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Test SQL connection error:", error);
    throw error;
  }
};

export const configureSQLConnection = async (config: Record<string, unknown>) => {
  try {
    const response = await api.post("/api/admin/sql/configure", config);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Configure SQL connection error:", error);
    throw error;
  }
};

export const getSQLConnectionHistory = async () => {
  try {
    const response = await api.get("/api/admin/sql/history");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get SQL connection history error:", error);
    throw error;
  }
};

// Master Settings API
export const getSystemParameters = async () => {
  try {
    const response = await api.get("/api/admin/settings/parameters");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get system parameters error:", error);
    throw error;
  }
};

export const updateSystemParameters = async (parameters: Record<string, unknown>) => {
  try {
    const response = await api.put(
      "/api/admin/settings/parameters",
      parameters,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Update system parameters error:", error);
    throw error;
  }
};

export const getSettingsCategories = async () => {
  try {
    const response = await api.get("/api/admin/settings/categories");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get settings categories error:", error);
    throw error;
  }
};

export const resetSettingsToDefaults = async (category?: string) => {
  try {
    const params = category ? { category } : {};
    const response = await api.post("/api/admin/settings/reset", null, {
      params,
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Reset settings error:", error);
    throw error;
  }
};

// Settings API
export const getSystemSettings = async () => {
  try {
    const response = await api.get("/api/admin/settings/parameters");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get system settings error:", error);
    throw error;
  }
};

export const updateSystemSettings = async (settings: Record<string, unknown>) => {
  try {
    const response = await api.put("/api/admin/settings/parameters", settings);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Update system settings error:", error);
    throw error;
  }
};

// --- Modern grouped exports for logical access patterns ---
export const sessionsApi = {
  createSession,
  getSessions,
  getSession,
  bulkCloseSessions,
  bulkReconcileSessions,
  bulkExportSessions,
  getSessionsAnalytics,
  updateSessionStatus,
};

export const countLineApi = {
  createCountLine,
  getCountLines,
  checkItemCounted,
  addQuantityToCountLine,
  getVarianceReasons,
  approveCountLine,
  rejectCountLine,
  verifyStock,
  unverifyStock,
};

export const itemsApi = {
  getItemByBarcode,
  searchItems,
  searchItemsOptimized,
  getSearchSuggestions,
  createUnknownItem,
  refreshItemStock,
};

export const mappingApi = {
  getAvailableTables,
  getTableColumns,
  getCurrentMapping,
  testMapping,
  saveMapping,
};

export const exportsApi = {
  getExportSchedules,
  getExportSchedule,
  createExportSchedule,
  updateExportSchedule,
  deleteExportSchedule,
  triggerExportSchedule,
  getExportResults,
  downloadExportResult,
};

export const syncApi = {
  syncOfflineQueue,
  getSyncConflicts,
  getSyncConflictDetail,
  resolveSyncConflict,
  batchResolveSyncConflicts,
  getSyncConflictStats,
  getSyncStatus,
  getSyncStats,
  triggerManualSync,
};

export const metricsApi = {
  getMetrics,
  getMetricsHealth,
  getMetricsStats,
  getSystemHealthScore,
  getSystemStats,
};

export const adminControlApi = {
  getServicesStatus,
  startService,
  stopService,
  getSystemIssues,
  getLoginDevices,
  getServiceLogs,
  clearServiceLogs,
};

export const reportsApi = {
  getAvailableReports,
  generateReport,
};

export const sqlServerApi = {
  getSqlServerConfig,
  updateSqlServerConfig,
  testSqlServerConnection,
  getSQLStatus,
  testSQLConnection,
  configureSQLConnection,
  getSQLConnectionHistory,
};

export const securityApi = {
  getSecuritySummary,
  getFailedLogins,
  getSuspiciousActivity,
  getSecuritySessions,
  getSecurityAuditLog,
  getIpTracking,
};

export const settingsApi = {
  getSystemParameters,
  updateSystemParameters,
  getSettingsCategories,
  resetSettingsToDefaults,
  getSystemSettings,
  updateSystemSettings,
};

// Advanced Analytics API
export const getVarianceTrend = async (days: number = 30) => {
  try {
    const response = await api.get(`/api/variance/trend?days=${days}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get variance trend error:", error);
    throw error;
  }
};

export const getStaffPerformance = async (days: number = 30) => {
  try {
    const response = await api.get(
      `/api/metrics/staff-performance?days=${days}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get staff performance error:", error);
    throw error;
  }
};

// ==========================================
// DYNAMIC FIELDS API
// ==========================================

export const getFieldDefinitions = async (
  enabledOnly: boolean = true,
  visibleOnly: boolean = false,
) => {
  try {
    const params = new URLSearchParams({
      enabled_only: enabledOnly.toString(),
      visible_only: visibleOnly.toString(),
    });
    const response = await api.get(
      `/api/dynamic-fields/definitions?${params.toString()}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get field definitions error:", error);
    throw error;
  }
};

export const createFieldDefinition = async (fieldData: Record<string, unknown>) => {
  try {
    const response = await api.post(
      "/api/dynamic-fields/definitions",
      fieldData,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Create field definition error:", error);
    throw error;
  }
};

export const updateFieldDefinition = async (fieldId: string, updates: Record<string, unknown>) => {
  try {
    const response = await api.put(
      `/api/dynamic-fields/definitions/${fieldId}`,
      updates,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Update field definition error:", error);
    throw error;
  }
};

export const deleteFieldDefinition = async (fieldId: string) => {
  try {
    const response = await api.delete(
      `/api/dynamic-fields/definitions/${fieldId}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Delete field definition error:", error);
    throw error;
  }
};

export const setFieldValue = async (
  itemCode: string,
  fieldName: string,
  value: unknown,
) => {
  try {
    const response = await api.post("/api/dynamic-fields/values", {
      item_code: itemCode,
      field_name: fieldName,
      value,
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Set field value error:", error);
    throw error;
  }
};

export const setBulkFieldValues = async (
  itemCodes: string[],
  fieldValues: Record<string, unknown>,
) => {
  try {
    const response = await api.post("/api/dynamic-fields/values/bulk", {
      item_codes: itemCodes,
      field_values: fieldValues,
    });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Set bulk field values error:", error);
    throw error;
  }
};

export const getItemFieldValues = async (itemCode: string) => {
  try {
    const response = await api.get(`/api/dynamic-fields/values/${itemCode}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get item field values error:", error);
    throw error;
  }
};

export const getItemsWithFields = async (
  fieldName?: string,
  fieldValue?: string,
  limit: number = 100,
  skip: number = 0,
) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      skip: skip.toString(),
    });
    if (fieldName) params.append("field_name", fieldName);
    if (fieldValue) params.append("field_value", fieldValue);

    const response = await api.get(
      `/api/dynamic-fields/items?${params.toString()}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get items with fields error:", error);
    throw error;
  }
};

export const getFieldStatistics = async (fieldName: string) => {
  try {
    const response = await api.get(
      `/api/dynamic-fields/statistics/${fieldName}`,
    );
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get field statistics error:", error);
    throw error;
  }
};

// ==========================================
// SELF-DIAGNOSIS API
// ==========================================

/**
 * Get comprehensive health status with auto-diagnosis
 */
export const getDiagnosisHealth = async () => {
  try {
    const response = await api.get("/api/diagnosis/health");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get diagnosis health error:", error);
    throw error;
  }
};

/**
 * Get error statistics with analysis
 * @param hours Time window in hours
 */
export const getDiagnosisStats = async (hours: number = 24) => {
  try {
    const response = await api.get(`/api/diagnosis/statistics?hours=${hours}`);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get diagnosis stats error:", error);
    throw error;
  }
};

/**
 * Manually diagnose an error
 * @param errorInfo Error details (type, message, context)
 */
export const diagnoseError = async (errorInfo: {
  error_type: string;
  error_message: string;
  context?: Record<string, any>;
}) => {
  try {
    const response = await api.post("/api/diagnosis/diagnose", errorInfo);
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Diagnose error failed:", error);
    throw error;
  }
};

export default api;

// Batch sync offline queue
export const syncBatch = async (operations: Record<string, unknown>[]) => {
  try {
    const response = await api.post("/api/sync/batch", { operations });
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Sync batch error:", error);
    throw error;
  }
};

// Get Watchtower stats
export const getWatchtowerStats = async () => {
  try {
    const response = await api.get("/api/v2/sessions/watchtower");
    return response.data;
  } catch (error: unknown) {
    __DEV__ && console.error("Get watchtower stats error:", error);
    throw error;
  }
};

// Get Zones
export const getZones = async () => {
  try {
    const response = await api.get("/api/locations/zones");
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 401) {
      console.error("Error fetching zones:", error);
    }
    throw error;
  }
};

// Get Warehouses
export const getWarehouses = async (zone?: string) => {
  try {
    const url = zone ? `/api/locations/warehouses?zone=${zone}` : "/api/locations/warehouses";
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    if (error?.response?.status !== 401) {
      console.error("Error fetching warehouses:", error);
    }
    throw error;
  }
};
