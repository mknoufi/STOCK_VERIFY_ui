/**
 * Token Store Service
 *
 * Bridge between session management and secure storage.
 * Uses authStore (Zustand) as the source of truth.
 */

import { secureStorage } from "./secureStorage";

/**
 * Token Store Utility
 * Provides synchronous-like access to tokens for the session manager
 * while maintaining secure storage as the source of truth.
 */

// In-memory cache for synchronous access
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;

export const tokenStore = {
  /**
   * Get access token
   */
  getAccessToken: (): string | null => {
    return cachedAccessToken;
  },

  /**
   * Get refresh token
   */
  getRefreshToken: (): string | null => {
    return cachedRefreshToken;
  },

  /**
   * Set tokens
   */
  setTokens: async (
    accessToken: string,
    refreshToken: string,
  ): Promise<void> => {
    cachedAccessToken = accessToken;
    cachedRefreshToken = refreshToken;
    await secureStorage.setItem("auth_token", accessToken);
    await secureStorage.setItem("refresh_token", refreshToken);
  },

  /**
   * Clear tokens
   */
  clearTokens: async (): Promise<void> => {
    cachedAccessToken = null;
    cachedRefreshToken = null;
    await secureStorage.removeItem("auth_token");
    await secureStorage.removeItem("refresh_token");
  },

  /**
   * Check if has token
   */
  hasToken: (): boolean => {
    return !!cachedAccessToken;
  },

  /**
   * Initialize from storage
   */
  initialize: async (): Promise<void> => {
    cachedAccessToken = await secureStorage.getItem("auth_token");
    cachedRefreshToken = await secureStorage.getItem("refresh_token");
  },
};

export default tokenStore;
