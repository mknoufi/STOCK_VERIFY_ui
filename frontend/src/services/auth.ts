import apiClient from "./httpClient";
import { useAuthStore } from "../store/authStore";
import { secureStorage } from "./storage/secureStorage";

const TOKEN_STORAGE_KEY = "auth_token";
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

/**
 * Authentication service for handling token management and user state.
 * This service acts as a bridge between the Zustand auth store and the API.
 */
export const authService = {
  /**
   * Get the current access token from secure storage.
   */
  async getAccessToken(): Promise<string | null> {
    return await secureStorage.getItem(TOKEN_STORAGE_KEY);
  },

  /**
   * Get the current refresh token from secure storage.
   */
  async getRefreshToken(): Promise<string | null> {
    return await secureStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
  },

  /**
   * Refresh the access token using the refresh token.
   */
  async refreshToken(): Promise<string | null> {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        console.warn("[AuthService] No refresh token available");
        return null;
      }

      const response = await apiClient.post("/api/auth/refresh", {
        refresh_token: refreshToken,
      });

      if (response.data.success && response.data.data) {
        const { access_token, refresh_token } = response.data.data;

        // Update storage
        await secureStorage.setItem(TOKEN_STORAGE_KEY, access_token);
        if (refresh_token) {
          await secureStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh_token);
        }

        // Update axios defaults
        apiClient.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

        return access_token;
      }

      return null;
    } catch (error) {
      console.error("[AuthService] Token refresh failed:", error);
      return null;
    }
  },

  /**
   * Get the current user from the auth store.
   */
  getCurrentUser() {
    return useAuthStore.getState().user;
  },

  /**
   * Check if the user is currently authenticated.
   */
  isAuthenticated(): boolean {
    return useAuthStore.getState().isAuthenticated;
  },

  /**
   * Logout the user and clear all stored data.
   */
  async logout(): Promise<void> {
    await useAuthStore.getState().logout();
    await secureStorage.removeItem(TOKEN_STORAGE_KEY);
    await secureStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
};
