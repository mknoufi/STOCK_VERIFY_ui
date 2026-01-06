import axios from "axios";
import Constants from "expo-constants";
import { resolveBackendUrl } from "./backendUrl";
import { secureStorage } from "./storage/secureStorage";
import { handleUnauthorized } from "./authUnauthorizedHandler";

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

// Log resolved base URL once
if (!IS_TEST_ENV) {
  console.log("[API] Base URL:", API_BASE_URL);
}

// Auto-detect backend reachability (handles LAN IP changes) and update baseURL
if (!IS_TEST_ENV) {
  resolveBackendUrl()
    .then((url) => {
      apiClient.defaults.baseURL = url;
      console.log("[API] Base URL updated after detection:", url);
    })
    .catch((err) => {
      console.warn(
        "[API] Failed to auto-detect backend URL; continuing with default",
        err,
      );
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

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    const fullUrl = toFullUrl(config.baseURL, config.url);
    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${fullUrl}`,
      config.data ? config.data : "",
    );
    return config;
  },
  (error) => {
    console.error("[API Request Error]", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for debugging and session handling
apiClient.interceptors.response.use(
  (response) => {
    const fullUrl = toFullUrl(response.config.baseURL, response.config.url);
    console.log(`[API Response] ${response.status} ${fullUrl}`);
    return response;
  },
  (error) => {
    if (error.response) {
      const fullUrl = toFullUrl(error.config?.baseURL, error.config?.url);

      // Handle session expiration (401 Unauthorized)
      if (error.response.status === 401) {
        console.warn("[API] Session expired or unauthorized. Logging out...");

        // Clear storage immediately to prevent stale token persistence
        secureStorage.removeItem("auth_token").catch(console.error);
        secureStorage.removeItem("refresh_token").catch(console.error);

        handleUnauthorized();
      } else {
        // Log other errors as usual
        console.error(
          `[API Error] ${error.response.status} ${fullUrl}`,
          error.response.data,
        );
      }
    } else if (error.request) {
      const fullUrl = toFullUrl(error.config?.baseURL, error.config?.url);
      console.error(`[API Error] No response received for ${fullUrl}`);
    } else {
      console.error("[API Error]", error.message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
