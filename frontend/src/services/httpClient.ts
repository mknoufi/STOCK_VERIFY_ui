import axios from "axios";
import Constants from "expo-constants";

// Logic to determine the backend URL
// Priority:
// 1. Expo Config `extra.backendUrl` (runtime dynamic config)
// 2. EXPO_PUBLIC_BACKEND_URL (build-time env var)
// 3. Fallback to localhost (dev default)

const getBackendUrl = () => {
  // Check for dynamically loaded URL from app.config.js
  const configUrl = Constants.expoConfig?.extra?.backendUrl;
  if (configUrl) {
    console.log("[API] Using Dynamic Backend URL:", configUrl);
    return configUrl;
  }

  // Fallback to env var
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
  if (envUrl) {
    console.log("[API] Using Env Backend URL:", envUrl);
    return envUrl;
  }

  // Default fallback
  console.log("[API] Using Default Localhost URL");
  return "http://localhost:8000";
};

export const API_BASE_URL = getBackendUrl();

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for debugging
apiClient.interceptors.request.use(
  (config) => {
    console.log(
      `[API Request] ${config.method?.toUpperCase()} ${config.url}`,
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
    console.log(`[API Response] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        `[API Error] ${error.response.status} ${error.config.url}`,
        error.response.data,
      );
    } else if (error.request) {
      console.error(`[API Error] No response received for ${error.config.url}`);
    } else {
      console.error("[API Error]", error.message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
