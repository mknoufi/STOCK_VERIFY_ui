import axios from "axios";

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8001",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to log requests in dev
apiClient.interceptors.request.use((request) => {
  if (__DEV__) {
    console.log("📡 API Request:", request.method?.toUpperCase(), request.url);
  }
  return request;
});

// Add response interceptor to handle global errors (like 401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
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
