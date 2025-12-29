/**
 * Authentication API Service
 *
 * Handles authentication-related API calls including login, logout,
 * PIN change, and password change.
 */

import api from '../httpClient';

export interface ChangePinResponse {
  status: string;
  message: string;
  data: {
    changed_at: string;
  };
}

export interface ChangePasswordResponse {
  status: string;
  message: string;
  data: {
    changed_at: string;
  };
}

export interface UserSettings {
  theme: string;
  font_size: number;
  primary_color: string;
  haptic_enabled: boolean;
  sound_enabled: boolean;
  auto_sync_enabled: boolean;
  language: string;
  updated_at: string | null;
}

/**
 * Authentication API methods
 */
export const authApi = {
  /**
   * Change the current user's PIN
   *
   * @param currentPin - The user's current PIN
   * @param newPin - The new PIN to set
   * @returns Promise with change confirmation
   * @throws Error if current PIN is wrong or new PIN is invalid
   */
  async changePin(currentPin: string, newPin: string): Promise<ChangePinResponse> {
    const response = await api.post<ChangePinResponse>('/api/auth/change-pin', {
      current_pin: currentPin,
      new_pin: newPin,
    });
    return response.data;
  },

  /**
   * Change the current user's password
   *
   * @param currentPassword - The user's current password
   * @param newPassword - The new password to set (min 8 characters)
   * @returns Promise with change confirmation
   * @throws Error if current password is wrong or new password is invalid
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<ChangePasswordResponse> {
    const response = await api.post<ChangePasswordResponse>('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  /**
   * Get current user's settings from the backend
   *
   * @returns Promise with user settings
   */
  async getUserSettings(): Promise<UserSettings> {
    const response = await api.get<{ data: UserSettings }>('/api/user/settings');
    return response.data.data;
  },

  /**
   * Update user settings on the backend
   *
   * @param settings - Partial settings to update
   * @returns Promise with updated settings
   */
  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    const response = await api.patch<{ data: UserSettings }>('/api/user/settings', settings);
    return response.data.data;
  },

  /**
   * Session heartbeat to keep session alive
   *
   * @returns Promise with heartbeat response
   */
  async heartbeat(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get<{ status: string; timestamp: string }>(
      '/api/auth/heartbeat'
    );
    return response.data;
  },
};

export default authApi;
