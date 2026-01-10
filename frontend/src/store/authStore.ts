import { create } from "zustand";
import { secureStorage } from "../services/storage/secureStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiClient from "../services/httpClient";
import { useSettingsStore } from "./settingsStore";
import { setUnauthorizedHandler } from "../services/authUnauthorizedHandler";
import { BiometricAuthService } from "../services/biometricAuth";

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
  isBiometricEnabled: boolean;
  isBiometricSupported: boolean;
  
  checkBiometricSupport: () => Promise<void>;
  enableBiometrics: (pin: string) => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  loginWithBiometrics: () => Promise<{ success: boolean; message?: string }>;

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
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";
const BIOMETRIC_ENABLED_KEY = "biometric_enabled";

const biometricService = BiometricAuthService.getInstance();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  isBiometricEnabled: false,
  isBiometricSupported: false,

  checkBiometricSupport: async () => {
    const hardware = await biometricService.checkHardwareAvailability();
    const enrolled = await biometricService.checkBiometricsEnrolled();
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    
    set({
        isBiometricSupported: hardware && enrolled,
        isBiometricEnabled: enabled === 'true' && hardware && enrolled
    });
  },

  enableBiometrics: async (pin: string) => {
      const success = await biometricService.savePinWithBiometrics(pin);
      if (success) {
          await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
          set({ isBiometricEnabled: true });
          return true;
      }
      return false;
  },

  disableBiometrics: async () => {
      await biometricService.clearBiometricPin();
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      set({ isBiometricEnabled: false });
  },

  loginWithBiometrics: async () => {
    set({ isLoading: true });
    try {
        const pin = await biometricService.getBiometricPin();
        if (!pin) {
            set({ isLoading: false });
            return { success: false, message: "Biometric authentication failed or cancelled" };
        }
        // Proceed to login with retrieved PIN
        return await get().loginWithPin(pin);
    } catch (error) {
        set({ isLoading: false });
        return { success: false, message: "Biometric login error" };
    }
  },

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
        const { access_token, refresh_token, user } = response.data.data;

        // Store token for subsequent requests
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${access_token}`;

        // Use SecureStore for sensitive data
        await secureStorage.setItem(TOKEN_STORAGE_KEY, access_token);
        if (refresh_token) {
          await secureStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh_token);
        }
        await secureStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Sync user settings from backend after successful login
        useSettingsStore.getState().syncFromBackend();

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
        const { access_token, refresh_token, user } = response.data.data;

        // Store token for subsequent requests
        apiClient.defaults.headers.common["Authorization"] =
          `Bearer ${access_token}`;

        // Use SecureStore
        await secureStorage.setItem(TOKEN_STORAGE_KEY, access_token);
        if (refresh_token) {
          await secureStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh_token);
        }
        await secureStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));

        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });

        // Sync user settings from backend after successful PIN login
        useSettingsStore.getState().syncFromBackend();

        return { success: true };
      }

      set({ isLoading: false });
      return {
        success: false,
        message: response.data.message || "Invalid PIN",
      };
    } catch (error: unknown) {
      // Avoid console.error here: React Native LogBox can surface it as a noisy
      // on-screen overlay, and the UI already shows a user-friendly Alert.
      // Also avoid logging the full Axios error object (may contain request data).
      __DEV__ &&
        console.log(
          "PIN login failed:",
          (error as { message?: string } | null)?.message || "unknown error",
        );
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
    await secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    delete apiClient.defaults.headers.common["Authorization"];
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  loadStoredAuth: async () => {
    console.log('🔐 [AUTH] Loading stored auth...');
    set({ isLoading: true });
    
    // Check biometrics on load
    await get().checkBiometricSupport();

    try {
      const storedUser = await secureStorage.getItem(AUTH_STORAGE_KEY);
      console.log('🔐 [AUTH] Stored user retrieved:', !!storedUser);
      const storedToken = await secureStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('🔐 [AUTH] Stored token retrieved:', !!storedToken);

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
        console.log('🔐 [AUTH] No stored credentials found');
        set({
          isLoading: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      console.error("🔐 [AUTH] Failed to load stored auth:", error);
      set({
        isLoading: false,
        isInitialized: true,
      });
    } finally {
      console.log('🔐 [AUTH] loadStoredAuth completed');
    }
  },
}));

// Register a global unauthorized handler for the HTTP client without creating a circular dependency.
setUnauthorizedHandler(() => {
  void useAuthStore.getState().logout();
});
