import { create } from "zustand";
import { secureStorage } from "../services/storage/secureStorage";
import apiClient from "../services/httpClient";

interface User {
  id: string;
  username: string;
  full_name: string;
  role: "staff" | "supervisor" | "admin";
  email?: string;
  is_active: boolean;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  login: (
    username: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; message?: string }>;
  loginWithPin: (
    pin: string,
  ) => Promise<{ success: boolean; message?: string }>;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  loadStoredAuth: () => Promise<void>;
}

const AUTH_STORAGE_KEY = "auth_user";
const TOKEN_STORAGE_KEY = "auth_token";

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  login: async (
    username: string,
    password: string,
    _rememberMe?: boolean,
  ): Promise<{ success: boolean; message?: string }> => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post("/api/auth/login", {
        username,
        password,
      });

      if (response.data.success && response.data.data) {
        const { access_token, user } = response.data.data;

        // Store token for subsequent requests
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${access_token}`;

        // Use SecureStore for sensitive data
        await secureStorage.setItem(TOKEN_STORAGE_KEY, access_token);
        await secureStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return {
        success: false,
        message: response.data.message || "Login failed",
      };
    } catch (error: unknown) {
      console.error("Login failed:", error);
      set({ isLoading: false });

      let message = "An unexpected error occurred";
      const axiosError = error as {
        response?: {
          status?: number;
          data?: { detail?: string; message?: string };
        };
        request?: unknown;
        message?: string;
      };
      if (axiosError.response) {
        // Server responded with error code
        message =
          axiosError.response.data?.detail ||
          axiosError.response.data?.message ||
          `Server Error (${axiosError.response.status})`;
      } else if (axiosError.request) {
        // Request made but no response (Network Error)
        message =
          "Unable to connect to server. Please check your internet connection and verify the backend is running.";
      } else {
        message = axiosError.message || "An unexpected error occurred";
      }

      return { success: false, message };
    }
  },

  loginWithPin: async (
    pin: string,
  ): Promise<{ success: boolean; message?: string }> => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post("/api/auth/login-pin", { pin });

      if (response.data.success && response.data.data) {
        const { access_token, user } = response.data.data;

        // Store token for subsequent requests
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${access_token}`;

        // Use SecureStore
        await secureStorage.setItem(TOKEN_STORAGE_KEY, access_token);
        await secureStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return {
        success: false,
        message: response.data.message || "Invalid PIN",
      };
    } catch (error: unknown) {
      console.error("PIN login failed:", error);
      set({ isLoading: false });

      let message = "Invalid PIN";
      const axiosError = error as {
        response?: { status?: number };
        request?: unknown;
      };
      if (axiosError.response?.status === 401) {
        message = "Invalid PIN. Please try again.";
      } else if (axiosError.request) {
        message = "Unable to connect to server.";
      }

      return { success: false, message };
    }
  },

  setUser: (user: User) => {
    secureStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: async () => {
    await secureStorage.removeItem(AUTH_STORAGE_KEY);
    await secureStorage.removeItem(TOKEN_STORAGE_KEY);
    delete apiClient.defaults.headers.common["Authorization"];
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  loadStoredAuth: async () => {
    set({ isLoading: true });
    try {
      const storedUser = await secureStorage.getItem(AUTH_STORAGE_KEY);
      const storedToken = await secureStorage.getItem(TOKEN_STORAGE_KEY);

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser) as User;
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${storedToken}`;
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      console.error("Failed to load stored auth:", error);
      set({
        isLoading: false,
        isInitialized: true,
      });
    }
  },
}));
