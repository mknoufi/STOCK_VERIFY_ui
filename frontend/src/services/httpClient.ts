import axios from "axios";

// Default to localhost for development if env var is not set
// Note: For Android Emulator use 'http://10.0.2.2:8001'
const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
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
