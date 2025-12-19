import axios from "axios";
import Constants from "expo-constants";

// Logic to determine the backend URL
// Priority:
// 1. Expo Config `extra.backendUrl` (runtime dynamic config)
// 2. EXPO_PUBLIC_BACKEND_URL (build-time env var)
// 3. Fallback to localhost (dev default)

const getBackendUrl = (): string => {
  // Check for dynamically loaded URL from app.config.js
  const configUrl = Constants.expoConfig?.extra?.backendUrl;
  if (configUrl) {
    console.log("[API] Using Dynamic Backend URL:", configUrl);
    return configUrl as string;
  }

  // Fallback to env var
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    console.log("[API] Using Env Backend URL:", envUrl);
    return envUrl;
  }

  // Default fallback
  console.log("[API] Using Default Localhost URL (8001)");
  return "http://localhost:8001";
};

export const API_BASE_URL: string = getBackendUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Log resolved base URL once
console.log("[API] Base URL:", API_BASE_URL);

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

// Add response interceptor for debugging
apiClient.interceptors.response.use(
  (response) => {
    const fullUrl = toFullUrl(response.config.baseURL, response.config.url);
    console.log(`[API Response] ${response.status} ${fullUrl}`);
    return response;
  },
  (error) => {
    if (error.response) {
      const fullUrl = toFullUrl(error.config?.baseURL, error.config?.url);
      console.error(
        `[API Error] ${error.response.status} ${fullUrl}`,
        error.response.data,
      );
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
