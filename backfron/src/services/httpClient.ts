import axios, { InternalAxiosRequestConfig } from "axios";
import { getBackendURL } from "./backendUrl";
import { storage } from "./asyncStorageService";

// Get the dynamic backend URL
const baseURL = getBackendURL();

const apiClient = axios.create({
  baseURL,
  timeout: parseInt(process.env.EXPO_PUBLIC_API_TIMEOUT || "30000", 10),
  headers: {
    "Content-Type": "application/json",
  },
});

// Token cache to avoid async storage lookups on every request
let cachedToken: string | null = null;

// Function to update cached token (called from authStore)
export const setCachedToken = (token: string | null) => {
  cachedToken = token;
};

// Function to get token (sync with fallback)
const getAuthToken = (): string | null => {
  return cachedToken;
};

// Initialize token from storage on app start
export const initializeToken = async () => {
  try {
    const token = await storage.getItem("auth_token");
    if (token) {
      cachedToken = token;
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  } catch (e) {
    console.warn("Failed to initialize token from storage:", e);
  }
};

// Add request interceptor to attach auth token and log requests (SYNC)
apiClient.interceptors.request.use((request: InternalAxiosRequestConfig) => {
  // Attach token from cache if not already in headers
  if (!request.headers.Authorization) {
    const token = getAuthToken();
    if (token) {
      request.headers.Authorization = `Bearer ${token}`;
    }
  }

  if (__DEV__) {
    const hasAuth = !!request.headers.Authorization;
    console.log("📡 API Request:", request.method?.toUpperCase(), `${baseURL}${request.url}`, hasAuth ? "🔐" : "🔓");
    console.log("📡 [DEBUG] Full URL:", `${baseURL}${request.url}`);
    console.log("📡 [DEBUG] Has token:", hasAuth, "Token preview:", cachedToken?.substring(0, 20) + "...");
  }
  return request;
});

// Add response interceptor to handle global errors (like 401)
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log("📥 API Response:", response.status, response.config.url);
      console.log("📥 [DEBUG] Response data keys:", Object.keys(response.data || {}));
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      console.error("❌ API Error:", error.response?.status, error.config?.url);
      console.error("❌ [DEBUG] Error message:", error.message);
      console.error("❌ [DEBUG] Error response data:", error.response?.data);
    }
    if (error.response?.status === 401) {
      // Import store dynamically to avoid circular dependencies
      // Import store dynamically to avoid circular dependencies
      const { useAuthStore } = await import("../store/authStore");
      const { router } = await import("expo-router");

      console.log("🔒 Session expired, logging out...");

      // Clear auth state
      useAuthStore.getState().logout();

      // Redirect to login
      router.replace("/login");
    }
    return Promise.reject(error);
  },
);

export default apiClient;
