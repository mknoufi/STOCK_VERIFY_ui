import axios from "axios";
import Constants from "expo-constants";
import { resolveBackendUrl } from "./backendUrl";
import { createLogger } from "./logging";
import { secureStorage } from "./storage/secureStorage";
import { handleUnauthorized } from "./authUnauthorizedHandler";
import { getDeviceId } from "./deviceId";
import { useNetworkStore } from "../store/networkStore";

const log = createLogger("httpClient");

// Initial best-guess base URL; will be auto-updated after reachability probe
const getInitialBackendUrl = (): string => {
  const configUrl = Constants.expoConfig?.extra?.backendUrl;
  if (configUrl) return configUrl as string;
  if (process.env.EXPO_PUBLIC_BACKEND_URL)
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  return "http://localhost:8001";
};

export const API_BASE_URL: string = getInitialBackendUrl();

const IS_TEST_ENV =
  process.env.NODE_ENV === "test" ||
  typeof process.env.JEST_WORKER_ID !== "undefined";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // Increased timeout to 20s
  headers: {
    "Content-Type": "application/json",
  },
});

const summarizePayload = (payload: unknown): Record<string, unknown> | undefined => {
  if (payload == null) return undefined;
  if (typeof payload === "string") return { type: "string", length: payload.length };
  if (typeof payload === "number" || typeof payload === "boolean") return { type: typeof payload };
  if (Array.isArray(payload)) return { type: "array", length: payload.length };
  if (typeof payload === "object") {
    const keys = Object.keys(payload as Record<string, unknown>);
    return { type: "object", keys: keys.slice(0, 25), keyCount: keys.length };
  }
  return { type: typeof payload };
};

// Log resolved base URL once (dev only)
if (!IS_TEST_ENV) {
  log.info("API base URL initialised", { baseUrl: API_BASE_URL });
}

// Auto-detect backend reachability (handles LAN IP changes) and update baseURL
if (!IS_TEST_ENV) {
  resolveBackendUrl()
    .then((url) => {
      apiClient.defaults.baseURL = url;
      log.info("API base URL updated after detection", { baseUrl: url });
    })
    .catch((err) => {
      log.warn("Failed to auto-detect backend URL; continuing with default", {
        error: (err as { message?: string } | null)?.message || String(err),
      });
    });
}

// Helper to build a full URL for logging
const toFullUrl = (baseURL: string | undefined, url: string | undefined) => {
  const base = (baseURL || "").replace(/\/$/, "");
  const path = (url || "").replace(/^\//, "");
  if (!url) return base || "";
  if (/^https?:\/\//i.test(url)) return url;
  return base ? `${base}/${path}` : url;
};

const summarizeResponseData = (data: unknown): Record<string, unknown> | undefined => {
  if (data == null) return undefined;
  if (typeof data === "string") return { type: "string", length: data.length };
  if (Array.isArray(data)) return { type: "array", length: data.length };
  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    return {
      type: "object",
      keys: keys.slice(0, 25),
      keyCount: keys.length,
      message: typeof obj.message === "string" ? obj.message : undefined,
      detail: typeof obj.detail === "string" ? obj.detail : undefined,
      code: typeof obj.code === "string" ? obj.code : undefined,
    };
  }
  return { type: typeof data };
};

const shouldLogNetworkDebug =
  !IS_TEST_ENV &&
  (typeof __DEV__ !== "undefined"
    ? __DEV__
    : process.env.NODE_ENV === "development");

// Add request interceptor for debugging (never log raw payloads or auth headers)
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const deviceId = await getDeviceId();
      if (deviceId) {
        config.headers["X-Device-ID"] = deviceId;
      }
    } catch (err) {
      log.warn("Failed to attach device ID header", { error: String(err) });
    }

    if (shouldLogNetworkDebug) {
      const fullUrl = toFullUrl(config.baseURL, config.url);
      log.debug("API request", {
        method: config.method?.toUpperCase(),
        url: fullUrl,
        payload: summarizePayload(config.data),
      });
    }
    return config;
  },
  (error) => {
    log.error("API request interceptor error", {
      error: (error as { message?: string } | null)?.message || String(error),
    });
    return Promise.reject(error);
  },
);

// Add response interceptor for debugging and session handling
apiClient.interceptors.response.use(
  (response) => {
    if (shouldLogNetworkDebug) {
      const fullUrl = toFullUrl(response.config.baseURL, response.config.url);
      log.debug("API response", { status: response.status, url: fullUrl });
    }
    return response;
  },
  (error) => {
    const fullUrl = toFullUrl(error.config?.baseURL, error.config?.url);
    const status = error.response?.status;
    const data = error.response?.data as { code?: string; message?: string } | undefined;
    const errorCode = data?.code;

    // Handle Network Restrictions (403 NETWORK_NOT_ALLOWED)
    if (status === 403 && errorCode === "NETWORK_NOT_ALLOWED") {
      log.warn("Network restricted: App is outside allowed LAN", { url: fullUrl });
      useNetworkStore.getState().setRestrictedMode(true);
      // We don't reject immediately if we want the UI to handle it, but usually we reject
      // and let the UI show the "Restricted Mode" banner based on the store state.
      return Promise.reject(error);
    }

    // Handle Session Revocation (401/403 SESSION_REVOKED)
    if ((status === 401 || status === 403) && errorCode === "SESSION_REVOKED") {
      log.warn("Session revoked (single device enforcement)", { url: fullUrl });
      
      // Clear tokens
      secureStorage.removeItem("auth_token").catch(() => {});
      secureStorage.removeItem("refresh_token").catch(() => {});
      
      handleUnauthorized();
      return Promise.reject(error);
    }

    // Handle session expiration (401 Unauthorized) - General case
    if (status === 401) {
      log.warn("API unauthorized; clearing credentials", { url: fullUrl });

      // Clear storage immediately to prevent stale token persistence
      secureStorage.removeItem("auth_token").catch((err) => {
        log.warn("Failed to clear auth token", {
          error: (err as { message?: string } | null)?.message || String(err),
        });
      });
      secureStorage.removeItem("refresh_token").catch((err) => {
        log.warn("Failed to clear refresh token", {
          error: (err as { message?: string } | null)?.message || String(err),
        });
      });

      handleUnauthorized();
      return Promise.reject(error);
    }

    if (status) {
      // 404 is often an expected state (e.g. item not found), so use warn instead of error
      if (status === 404) {
        log.warn("API resource not found (404)", {
          url: fullUrl,
          data: summarizeResponseData(error.response?.data),
        });
      } else {
        log.error("API error response", {
          status,
          url: fullUrl,
          data: summarizeResponseData(error.response?.data),
        });
      }
    } else if (error.request) {
      log.error("API no response received", { url: fullUrl });
    } else {
      log.error("API error", {
        url: fullUrl,
        error: (error as { message?: string } | null)?.message || String(error),
      });
    }

    return Promise.reject(error);
  },
);

export default apiClient;
