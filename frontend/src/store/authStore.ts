import { create } from "zustand";
import { storage } from "../services/asyncStorageService";
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
  loginWithPin: (pin: string) => Promise<{ success: boolean; message?: string }>;
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
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
        await storage.setItem(TOKEN_STORAGE_KEY, access_token);
        await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, message: response.data.message || "Login failed" };
    } catch (error: any) {
      console.error("Login failed:", error);
      set({ isLoading: false });

      let message = "An unexpected error occurred";
      if (error.response) {
        // Server responded with error code
        message =
          error.response.data?.detail ||
          error.response.data?.message ||
          `Server Error (${error.response.status})`;
      } else if (error.request) {
        // Request made but no response (Network Error)
        message =
          "Unable to connect to server. Please check your internet connection and verify the backend is running.";
      } else {
        message = error.message;
      }

      return { success: false, message };
    }
  },

  loginWithPin: async (pin: string): Promise<{ success: boolean; message?: string }> => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post("/api/auth/login-pin", { pin });

      if (response.data.success && response.data.data) {
        const { access_token, user } = response.data.data;

        // Store token for subsequent requests
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
        await storage.setItem(TOKEN_STORAGE_KEY, access_token);
        await storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
        return { success: true };
      }

      set({ isLoading: false });
      return { success: false, message: response.data.message || "Invalid PIN" };
    } catch (error: any) {
      console.error("PIN login failed:", error);
      set({ isLoading: false });

      let message = "Invalid PIN";
      if (error.response?.status === 401) {
        message = "Invalid PIN. Please try again.";
      } else if (error.request) {
        message = "Unable to connect to server.";
      }

      return { success: false, message };
    }
  },

  setUser: (user: User) => {
    storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    set({
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  },

  logout: () => {
    storage.removeItem(AUTH_STORAGE_KEY);
    storage.removeItem(TOKEN_STORAGE_KEY);
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
      const storedUser = await storage.getItem(AUTH_STORAGE_KEY);
      const storedToken = await storage.getItem(TOKEN_STORAGE_KEY);

      if (storedUser && storedToken) {
        const user = JSON.parse(storedUser) as User;
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
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
