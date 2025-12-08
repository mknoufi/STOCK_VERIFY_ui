/**
 * API service layer: network-aware endpoints with offline fallbacks and caching.
 * Most functions prefer online calls and transparently fall back to cache.
 */
import { useNetworkStore } from "../../store/networkStore";
import api from "../httpClient";
import { retryWithBackoff } from "../../utils/retry";
import { validateBarcode } from "../../utils/validation";
import {
  addToOfflineQueue,
  cacheItem,
  searchItemsInCache,
  cacheSession,
  getSessionsCache,
  getSessionFromCache,
  cacheCountLine,
  getCountLinesBySessionFromCache,
} from "../offline/offlineStorage";

// Check if online - simplified logic for better reliability
export const isOnline = () => {
  const state = useNetworkStore.getState();
  const online = state.isOnline && state.isInternetReachable !== false;

  // Debug logging
  __DEV__ &&
    console.log("🌐 Network Status Check:", {
      isOnline: state.isOnline,
      isInternetReachable: state.isInternetReachable,
      connectionType: state.connectionType,
      result: online,
    });

  // If network state is unknown or null, assume online (fail-safe for API calls)
  if (state.isOnline === undefined || state.isOnline === null) {
    __DEV__ && console.log("🌐 Network state unknown, assuming ONLINE for API calls");
    return true;
  }

  return online;
};

// Create session (with offline support)
// Create session (with offline support)
export const createSession = async (params: string | { warehouse: string; type?: string }) => {
  const warehouse = typeof params === "string" ? params : params.warehouse;
  const sessionType = typeof params !== "string" ? params.type : undefined;

  try {
    if (!isOnline()) {
      // Create offline session
      const offlineSession = {
        session_id: `offline_${Date.now()}`,
        warehouse,
        type: sessionType || "general", // Default to general if not specified
        status: "active",
        created_by: "offline_user",
        created_at: new Date().toISOString(),
      };

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
    // Use warn instead of error to avoid blocking the UI with LogBox since we have a fallback
    __DEV__ && console.warn("Error creating session (switching to offline mode):", error);

    // Fallback to offline mode
    const offlineSession = {
      session_id: `offline_${Date.now()}`,
      warehouse,
      status: "active",
      created_by: "offline_user",
      created_at: new Date().toISOString(),
    };

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
    const validPageSize = Math.max(1, Math.min(100, Math.floor(Number(pageSize)) || 20));

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
  } catch (error) {
    __DEV__ && console.error("Error getting sessions:", error);

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
      // TODO: Implement offline calculation if possible, or return empty
      return { data: [] };
    }
    // Note: The backend response wrapper puts the actual array in data.data
    const response = await api.get(`/api/v2/sessions/${sessionId}/rack-progress`);
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
  } catch (error: any) {
    __DEV__ && console.error("Bulk close sessions error:", error);
    throw error;
  }
};

// Bulk reconcile sessions
export const bulkReconcileSessions = async (sessionIds: string[]) => {
  try {
    const response = await api.post("/api/sessions/bulk/reconcile", sessionIds);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Bulk reconcile sessions error:", error);
    throw error;
  }
};

// Bulk export sessions
export const bulkExportSessions = async (sessionIds: string[], format: string = "excel") => {
  try {
    const response = await api.post("/api/sessions/bulk/export", sessionIds, {
      params: { format },
    });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Bulk export sessions error:", error);
    throw error;
  }
};

// Get sessions analytics (aggregated server-side)
export const getSessionsAnalytics = async () => {
  try {
    const response = await api.get("/api/sessions/analytics");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get sessions analytics error:", error);
    throw error;
  }
};

// Get item by barcode (with offline support, retry, and auto recovery)
/**
 * Lookup an item by barcode with validation, retry and cache fallback.
 * @param barcode Barcode string scanned/entered
 * @param retryCount Number of retries for transient failures
 */
export const getItemByBarcode = async (barcode: string, retryCount: number = 3) => {
  // Validate and normalize barcode before making API call
  const validation = validateBarcode(barcode);
  if (!validation.valid || !validation.value) {
    throw new Error(validation.error || "Invalid barcode format");
  }

  // Use normalized barcode if available (6-digit format for numeric barcodes)
  const trimmedBarcode = validation.value;

  __DEV__ && console.log(`🔍 Looking up barcode: ${trimmedBarcode} (original: ${barcode})`);

  // Check if offline first - only use cache if truly offline
  if (!isOnline()) {
    __DEV__ && console.log("📱 Offline mode - searching cache");
    try {
      const items = await searchItemsInCache(trimmedBarcode);
      if (items.length > 0) {
        __DEV__ && console.log("✅ Found in cache:", items[0]?.item_code);
        return items[0];
      }
      throw new Error("Item not found in offline cache. Connect to internet to search server.");
    } catch {
      throw new Error("Offline: Item not found in cache. Connect to internet to search server.");
    }
  }

  // Online - try API first, then cache as fallback
  try {
    __DEV__ && console.log("🌐 Online mode - calling API");

    // Direct API call with retry
    // Use enhanced v2 endpoint for better performance and metadata
    const response = await retryWithBackoff(
      () => api.get(`/api/v2/erp/items/barcode/${encodeURIComponent(trimmedBarcode)}/enhanced`),
      {
        retries: retryCount,
        backoffMs: 1000,
      },
    );

    // Handle v2 response format { item: ..., metadata: ... }
    const itemData = response.data.item || response.data;

    // Map backend fields to frontend Item interface
    if (itemData.item_name && !itemData.name) {
      itemData.name = itemData.item_name;
    }
    if (itemData._id && !itemData.id) {
      itemData.id = itemData._id;
    }

    __DEV__ && console.log("✅ Found via API:", itemData.item_code);

    // Cache the item for future offline use
    try {
      await cacheItem({
        item_code: itemData.item_code,
        barcode: itemData.barcode,
        item_name: itemData.item_name,
        description: itemData.description,
        uom: itemData.uom,
        current_stock: itemData.current_stock || itemData.stock_qty, // Handle field name difference
      });
    } catch (cacheError) {
      __DEV__ && console.warn("Failed to cache item:", cacheError);
      // Don't fail the whole operation for cache errors
    }

    return itemData;
  } catch (apiError: any) {
    __DEV__ && console.error("❌ API call failed:", apiError.message);

    // Only fallback to cache if API fails
    __DEV__ && console.log("🔄 API failed, trying cache fallback");
    try {
      const items = await searchItemsInCache(trimmedBarcode);
      if (items.length > 0) {
        __DEV__ && console.log("✅ Found in cache fallback:", items[0]?.item_code);
        return items[0];
      }

      // Cache is empty too
      throw new Error("Item not found in cache");
    } catch (cacheError: any) {
      if (cacheError.message !== "Item not found in cache") {
        __DEV__ && console.error("❌ Cache fallback also failed:", cacheError);
      } else {
        __DEV__ && console.log("ℹ️ Item not found in cache either");
      }

      // Provide helpful error message
      if (apiError.response?.status === 404) {
        throw new Error(`Item not found: Barcode '${trimmedBarcode}' not in database`);
      } else if (apiError.code === "ECONNABORTED" || apiError.message?.includes("timeout")) {
        throw new Error("Connection timeout. Check your internet connection.");
      } else if (apiError.code === "ECONNREFUSED" || !apiError.response) {
        throw new Error("Cannot connect to server. Check if backend is running.");
      } else {
        throw new Error(`Barcode lookup failed: ${apiError.message || "Unknown error"}`);
      }
    }
  }
};

// Search items (with offline support)
export const searchItems = async (query: string) => {
  try {
    if (!isOnline()) {
      // Search in cache
      return await searchItemsInCache(query);
    }

    // Use enhanced v2 search endpoint
    const response = await api.get(
      `/api/v2/erp/items/search/advanced?query=${encodeURIComponent(query)}`,
    );

    // Handle v2 response format
    const items = response.data.items || [];

    // Map backend fields to frontend Item interface
    const mappedItems = items.map((item: any) => {
      const mapped = { ...item };
      if (mapped.item_name && !mapped.name) {
        mapped.name = mapped.item_name;
      }
      if (mapped._id && !mapped.id) {
        mapped.id = mapped._id;
      }
      return mapped;
    });

    // Cache the items
    for (const item of mappedItems) {
      await cacheItem({
        item_code: item.item_code,
        barcode: item.barcode,
        item_name: item.item_name || item.name,
        description: item.description,
        uom: item.uom,
        current_stock: item.current_stock || item.stock_qty,
      });
    }

    return mappedItems;
  } catch (error) {
    __DEV__ && console.error("Error searching items:", error);

    // Fallback to cache
    try {
      return await searchItemsInCache(query);
    } catch (fallbackError) {
      __DEV__ && console.error("Cache fallback error:", fallbackError);
      return [];
    }
  }
};

// Create count line (with offline support)
export const createCountLine = async (countData: any) => {
  try {
    if (!isOnline()) {
      // Create offline count line
      const offlineCountLine = {
        _id: `offline_${Date.now()}`,
        ...countData,
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
    const offlineCountLine = {
      _id: `offline_${Date.now()}`,
      ...countData,
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
        const filtered = cachedLines.filter((line: any) => line.verified === verified);
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

    let url = `/api/count-lines/session/${sessionId}?page=${page}&page_size=${pageSize}`;
    if (verified !== undefined) {
      url += `&verified=${verified}`;
    }

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

    return response.data;
  } catch (error) {
    __DEV__ && console.error("Error getting count lines:", error);

    // Fallback to cache
    const cachedLines = await getCountLinesBySessionFromCache(sessionId);
    if (verified !== undefined) {
      const filtered = cachedLines.filter((line: any) => line.verified === verified);
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
};

// Check if item already counted
export const checkItemCounted = async (sessionId: string, itemCode: string) => {
  try {
    if (!isOnline()) {
      // Check in cached count lines
      const cachedLines = await getCountLinesBySessionFromCache(sessionId);
      const itemLines = cachedLines.filter((line) => line.item_code === itemCode);
      return { already_counted: itemLines.length > 0, count_lines: itemLines };
    }

    const response = await api.get(`/api/count-lines/check/${sessionId}/${itemCode}`);
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
export const addQuantityToCountLine = async (lineId: string, additionalQty: number) => {
  try {
    const response = await api.patch(
      `/api/count-lines/${lineId}/add-quantity?additional_qty=${additionalQty}`,
    );
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Error adding quantity to count line:", error);
    throw error;
  }
};

// Get variance reasons
export const getVarianceReasons = async () => {
  const response = await api.get("/api/variance-reasons");
  // Handle wrapped response format
  if (response.data && response.data.reasons && Array.isArray(response.data.reasons)) {
    return response.data.reasons.map((r: any) => ({
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
export const updateSessionStatus = async (sessionId: string, status: string) => {
  const response = await api.put(`/api/sessions/${sessionId}/status?status=${status}`);
  return response.data;
};

// Create unknown item (with offline support)
export const createUnknownItem = async (itemData: any) => {
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

// Refresh item stock from ERP
export const refreshItemStock = async (itemCode: string) => {
  try {
    const response = await api.post(`/api/erp/items/${encodeURIComponent(itemCode)}/refresh-stock`);
    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    __DEV__ && console.error("Get columns error:", error);
    throw error;
  }
};

export const getCurrentMapping = async () => {
  try {
    const response = await api.get("/api/mapping/current");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get current mapping error:", error);
    throw error;
  }
};

export const testMapping = async (
  config: any,
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

    const response = await api.post(`/api/mapping/test?${params.toString()}`, config);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Test mapping error:", error);
    throw error;
  }
};

export const saveMapping = async (config: any) => {
  try {
    const response = await api.post("/api/mapping/save", config);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Save mapping error:", error);
    throw error;
  }
};

// Sync offline queue (enhanced version in syncService.ts)
export const syncOfflineQueue = async (options?: any) => {
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

export const getActivityStats = async (startDate?: string, endDate?: string) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    __DEV__ &&
      console.log("📊 [Activity Stats] Fetching statistics:", {
        filters: { startDate, endDate },
        url: `/api/activity-logs/stats?${params.toString()}`,
      });

    const response = await api.get(`/api/activity-logs/stats?${params.toString()}`);

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
        filters: { severity, errorType, endpoint, resolved, startDate, endDate },
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
        filters: { page, pageSize, severity, errorType, endpoint, resolved, startDate, endDate },
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

    const response = await api.get(`/api/error-logs/stats?${params.toString()}`);

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
    __DEV__ && console.log("🔍 [Error Detail] Fetching error details:", { errorId });

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

export const resolveError = async (errorId: string, resolutionNote?: string) => {
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
  } catch (error: any) {
    __DEV__ && console.error("Clear error logs error:", error);
    throw error;
  }
};

// ERP Configuration
export const getERPConfig = async () => {
  try {
    const response = await api.get("/api/erp/config");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get ERP config error:", error);
    throw error;
  }
};

// Stock Verification
export const verifyStock = async (countLineId: string) => {
  try {
    const response = await api.put(`/api/count-lines/${countLineId}/verify`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Verify stock error:", error);
    throw error;
  }
};

export const unverifyStock = async (countLineId: string) => {
  try {
    const response = await api.put(`/api/count-lines/${countLineId}/unverify`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Unverify stock error:", error);
    throw error;
  }
};

// ==========================================
// PERMISSIONS API
// ==========================================

export const getAvailablePermissions = async () => {
  try {
    const response = await api.get("/api/permissions/available");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get available permissions error:", error);
    throw error;
  }
};

export const getRolePermissions = async (role: string) => {
  try {
    const response = await api.get(`/api/permissions/roles/${role}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get role permissions error:", error);
    throw error;
  }
};

export const getUserPermissions = async (username: string) => {
  try {
    const response = await api.get(`/api/permissions/users/${username}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get user permissions error:", error);
    throw error;
  }
};

export const addUserPermissions = async (username: string, permissions: string[]) => {
  try {
    const response = await api.post(`/api/permissions/users/${username}/add`, { permissions });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Add user permissions error:", error);
    throw error;
  }
};

export const removeUserPermissions = async (username: string, permissions: string[]) => {
  try {
    const response = await api.post(`/api/permissions/users/${username}/remove`, { permissions });
    return response.data;
  } catch (error: any) {
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

    const response = await api.get(`/api/exports/schedules?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get export schedules error:", error);
    throw error;
  }
};

export const getExportSchedule = async (scheduleId: string) => {
  try {
    const response = await api.get(`/api/exports/schedules/${scheduleId}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get export schedule error:", error);
    throw error;
  }
};

export const createExportSchedule = async (scheduleData: any) => {
  try {
    const response = await api.post("/api/exports/schedules", scheduleData);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Create export schedule error:", error);
    throw error;
  }
};

export const updateExportSchedule = async (scheduleId: string, scheduleData: any) => {
  try {
    const response = await api.put(`/api/exports/schedules/${scheduleId}`, scheduleData);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Update export schedule error:", error);
    throw error;
  }
};

export const deleteExportSchedule = async (scheduleId: string) => {
  try {
    const response = await api.delete(`/api/exports/schedules/${scheduleId}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Delete export schedule error:", error);
    throw error;
  }
};

export const triggerExportSchedule = async (scheduleId: string) => {
  try {
    const response = await api.post(`/api/exports/schedules/${scheduleId}/trigger`);
    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
    __DEV__ && console.error("Get export results error:", error);
    throw error;
  }
};

export const downloadExportResult = async (resultId: string) => {
  try {
    const response = await api.get(`/api/exports/results/${resultId}/download`, {
      responseType: "blob",
    });
    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
    __DEV__ && console.error("Get sync conflicts error:", error);
    throw error;
  }
};

export const getSyncConflictDetail = async (conflictId: string) => {
  try {
    const response = await api.get(`/api/sync/conflicts/${conflictId}`);
    return response.data;
  } catch (error: any) {
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
    const response = await api.post(`/api/sync/conflicts/${conflictId}/resolve`, {
      resolution,
      resolution_note: resolutionNote,
    });
    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
    __DEV__ && console.error("Batch resolve sync conflicts error:", error);
    throw error;
  }
};

export const getSyncConflictStats = async () => {
  try {
    const response = await api.get("/api/sync/conflicts/stats");
    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
    __DEV__ && console.error("Get metrics error:", error);
    throw error;
  }
};

export const getMetricsHealth = async () => {
  try {
    const response = await api.get("/api/metrics/health");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get metrics health error:", error);
    throw error;
  }
};

export const getMetricsStats = async () => {
  try {
    const response = await api.get("/api/metrics/stats");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get metrics stats error:", error);
    throw error;
  }
};

// Sync Status API
export const getSyncStatus = async () => {
  try {
    const response = await api.get("/api/sync/status");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get sync status error:", error);
    throw error;
  }
};

export const getSyncStats = async () => {
  try {
    const response = await api.get("/api/sync/stats");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get sync stats error:", error);
    throw error;
  }
};

export const triggerManualSync = async () => {
  try {
    const response = await api.post("/api/sync/trigger");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Trigger manual sync error:", error);
    throw error;
  }
};

// Admin Control Panel API
export const getServicesStatus = async () => {
  try {
    const response = await api.get("/api/admin/control/services/status");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get services status error:", error);
    throw error;
  }
};

export const startService = async (service: string) => {
  try {
    const response = await api.post(`/api/admin/control/services/${service}/start`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error(`Start ${service} error:`, error);
    throw error;
  }
};

export const stopService = async (service: string) => {
  try {
    const response = await api.post(`/api/admin/control/services/${service}/stop`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error(`Stop ${service} error:`, error);
    throw error;
  }
};

export const getSystemIssues = async () => {
  try {
    const response = await api.get("/api/admin/control/system/issues");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get system issues error:", error);
    throw error;
  }
};

export const getLoginDevices = async () => {
  try {
    const response = await api.get("/api/admin/control/devices");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get login devices error:", error);
    throw error;
  }
};

export const getAvailableReports = async () => {
  try {
    const response = await api.get("/api/admin/control/reports/available");
    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
    __DEV__ && console.error("Generate report error:", error);
    throw error;
  }
};

export const getServiceLogs = async (service: string, lines: number = 100, level?: string) => {
  try {
    const params = new URLSearchParams({ lines: lines.toString() });
    if (level) params.append("level", level);
    const response = await api.get(`/api/admin/control/logs/${service}?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get service logs error:", error);
    throw error;
  }
};

export const getSqlServerConfig = async () => {
  try {
    const response = await api.get("/api/admin/control/sql-server/config");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get SQL Server config error:", error);
    throw error;
  }
};

export const updateSqlServerConfig = async (config: any) => {
  try {
    const response = await api.post("/api/admin/control/sql-server/config", config);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Update SQL Server config error:", error);
    throw error;
  }
};

export const testSqlServerConnection = async (config?: any) => {
  try {
    const response = await api.post("/api/admin/control/sql-server/test", config || {});
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Test SQL Server connection error:", error);
    throw error;
  }
};

export const getSystemHealthScore = async () => {
  try {
    const response = await api.get("/api/admin/control/system/health-score");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get system health score error:", error);
    throw error;
  }
};

export const getSystemStats = async () => {
  try {
    const response = await api.get("/api/admin/control/system/stats");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get system stats error:", error);
    throw error;
  }
};

// Security Dashboard API
export const getSecuritySummary = async () => {
  try {
    const response = await api.get("/api/admin/security/summary");
    return response.data;
  } catch (error: any) {
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
    const params = new URLSearchParams({ limit: limit.toString(), hours: hours.toString() });
    if (username) params.append("username", username);
    if (ipAddress) params.append("ip_address", ipAddress);
    const response = await api.get(`/api/admin/security/failed-logins?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get failed logins error:", error);
    throw error;
  }
};

export const getSuspiciousActivity = async (hours: number = 24) => {
  try {
    const response = await api.get(`/api/admin/security/suspicious-activity?hours=${hours}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get suspicious activity error:", error);
    throw error;
  }
};

export const getSecuritySessions = async (limit: number = 100, activeOnly: boolean = false) => {
  try {
    const response = await api.get(
      `/api/admin/security/sessions?limit=${limit}&active_only=${activeOnly}`,
    );
    return response.data;
  } catch (error: any) {
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
    const params = new URLSearchParams({ limit: limit.toString(), hours: hours.toString() });
    if (action) params.append("action", action);
    if (user) params.append("user", user);
    const response = await api.get(`/api/admin/security/audit-log?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get security audit log error:", error);
    throw error;
  }
};

export const getIpTracking = async (hours: number = 24) => {
  try {
    const response = await api.get(`/api/admin/security/ip-tracking?hours=${hours}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get IP tracking error:", error);
    throw error;
  }
};

export const clearServiceLogs = async (service: string) => {
  try {
    const response = await api.post("/api/admin/control/logs/clear", null, { params: { service } });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error(`Clear ${service} logs error:`, error);
    throw error;
  }
};

// SQL Server Connection API
export const getSQLStatus = async () => {
  try {
    const response = await api.get("/api/admin/sql/status");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get SQL status error:", error);
    throw error;
  }
};

export const testSQLConnection = async (config: any) => {
  try {
    const response = await api.post("/api/admin/sql/test", config);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Test SQL connection error:", error);
    throw error;
  }
};

export const configureSQLConnection = async (config: any) => {
  try {
    const response = await api.post("/api/admin/sql/configure", config);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Configure SQL connection error:", error);
    throw error;
  }
};

export const getSQLConnectionHistory = async () => {
  try {
    const response = await api.get("/api/admin/sql/history");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get SQL connection history error:", error);
    throw error;
  }
};

// Master Settings API
export const getSystemParameters = async () => {
  try {
    const response = await api.get("/api/admin/settings/parameters");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get system parameters error:", error);
    throw error;
  }
};

export const updateSystemParameters = async (parameters: any) => {
  try {
    const response = await api.put("/api/admin/settings/parameters", parameters);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Update system parameters error:", error);
    throw error;
  }
};

export const getSettingsCategories = async () => {
  try {
    const response = await api.get("/api/admin/settings/categories");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get settings categories error:", error);
    throw error;
  }
};

export const resetSettingsToDefaults = async (category?: string) => {
  try {
    const params = category ? { category } : {};
    const response = await api.post("/api/admin/settings/reset", null, { params });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Reset settings error:", error);
    throw error;
  }
};

// Settings API
export const getSystemSettings = async () => {
  try {
    const response = await api.get("/api/admin/settings/parameters");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get system settings error:", error);
    throw error;
  }
};

export const updateSystemSettings = async (settings: any) => {
  try {
    const response = await api.put("/api/admin/settings/parameters", settings);
    return response.data;
  } catch (error: any) {
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
  } catch (error: any) {
    __DEV__ && console.error("Get variance trend error:", error);
    throw error;
  }
};

export const getStaffPerformance = async (days: number = 30) => {
  try {
    const response = await api.get(`/api/metrics/staff-performance?days=${days}`);
    return response.data;
  } catch (error: any) {
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
    const response = await api.get(`/api/dynamic-fields/definitions?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get field definitions error:", error);
    throw error;
  }
};

export const createFieldDefinition = async (fieldData: any) => {
  try {
    const response = await api.post("/api/dynamic-fields/definitions", fieldData);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Create field definition error:", error);
    throw error;
  }
};

export const updateFieldDefinition = async (fieldId: string, updates: any) => {
  try {
    const response = await api.put(`/api/dynamic-fields/definitions/${fieldId}`, updates);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Update field definition error:", error);
    throw error;
  }
};

export const deleteFieldDefinition = async (fieldId: string) => {
  try {
    const response = await api.delete(`/api/dynamic-fields/definitions/${fieldId}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Delete field definition error:", error);
    throw error;
  }
};

export const setFieldValue = async (itemCode: string, fieldName: string, value: any) => {
  try {
    const response = await api.post("/api/dynamic-fields/values", {
      item_code: itemCode,
      field_name: fieldName,
      value,
    });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Set field value error:", error);
    throw error;
  }
};

export const setBulkFieldValues = async (itemCodes: string[], fieldValues: Record<string, any>) => {
  try {
    const response = await api.post("/api/dynamic-fields/values/bulk", {
      item_codes: itemCodes,
      field_values: fieldValues,
    });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Set bulk field values error:", error);
    throw error;
  }
};

export const getItemFieldValues = async (itemCode: string) => {
  try {
    const response = await api.get(`/api/dynamic-fields/values/${itemCode}`);
    return response.data;
  } catch (error: any) {
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

    const response = await api.get(`/api/dynamic-fields/items?${params.toString()}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get items with fields error:", error);
    throw error;
  }
};

export const getFieldStatistics = async (fieldName: string) => {
  try {
    const response = await api.get(`/api/dynamic-fields/statistics/${fieldName}`);
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get field statistics error:", error);
    throw error;
  }
};

export default api;

// Batch sync offline queue
export const syncBatch = async (operations: any[]) => {
  try {
    const response = await api.post("/api/sync/batch", { operations });
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Sync batch error:", error);
    throw error;
  }
};

// Get Watchtower stats
export const getWatchtowerStats = async () => {
  try {
    const response = await api.get("/api/v2/sessions/watchtower");
    return response.data;
  } catch (error: any) {
    __DEV__ && console.error("Get watchtower stats error:", error);
    throw error;
  }
};
