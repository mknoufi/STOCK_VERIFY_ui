/**
 * Settings Store - User preferences and app settings
 * Manages app settings using Zustand
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mmkvStorage } from '../services/mmkvStorage';
import { flags } from '../constants/flags';
import { ThemeService, Theme } from '../services/themeService';
import { getSyncStatus } from '../services/syncService';

export interface AppSettings {
  // Theme
  theme: 'light' | 'dark' | 'auto';
  darkMode: boolean;

  // Notifications
  notificationsEnabled: boolean;
  notificationSound: boolean;
  notificationBadge: boolean;

  // Sync
  autoSyncEnabled: boolean;
  autoSyncInterval: number; // minutes
  syncOnReconnect: boolean;

  // Offline
  offlineMode: boolean;
  cacheExpiration: number; // hours
  maxQueueSize: number;

  // Scanner
  scannerVibration: boolean;
  scannerSound: boolean;
  scannerAutoSubmit: boolean;
  scannerTimeout: number; // seconds

  // Display
  fontSize: 'small' | 'medium' | 'large';
  showItemImages: boolean;
  showItemPrices: boolean;
  showItemStock: boolean;

  // Data
  exportFormat: 'csv' | 'json';
  backupFrequency: 'daily' | 'weekly' | 'monthly' | 'never';

  // Security
  requireAuth: boolean;
  sessionTimeout: number; // minutes
  biometricAuth: boolean;

  // Performance
  imageCache: boolean;
  lazyLoading: boolean;
  debounceDelay: number; // ms
}

const defaultSettings: AppSettings = {
  // Theme
  theme: 'light',
  darkMode: false,

  // Notifications
  notificationsEnabled: true,
  notificationSound: true,
  notificationBadge: true,

  // Sync
  autoSyncEnabled: true,
  autoSyncInterval: 5, // 5 minutes
  syncOnReconnect: true,

  // Offline
  offlineMode: true,
  cacheExpiration: 24, // 24 hours
  maxQueueSize: 1000,

  // Scanner
  scannerVibration: true,
  scannerSound: false,
  scannerAutoSubmit: true,
  scannerTimeout: 30, // 30 seconds

  // Display
  fontSize: 'medium',
  showItemImages: true,
  showItemPrices: true,
  showItemStock: true,

  // Data
  exportFormat: 'csv',
  backupFrequency: 'weekly',

  // Security
  requireAuth: true,
  sessionTimeout: 60, // 60 minutes
  biometricAuth: false,

  // Performance
  imageCache: true,
  lazyLoading: true,
  debounceDelay: 300, // 300ms
};

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  setSetting: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>;
  setSettings: (settings: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      isLoading: false,

      setSetting: async (key, value) => {
        const currentSettings = get().settings;
        const newSettings = {
          ...currentSettings,
          [key]: value,
        };

        set({ settings: newSettings });

        // Apply theme change immediately
        if (key === 'darkMode' || key === 'theme') {
          const darkMode = key === 'darkMode'
            ? value as boolean
            : newSettings.theme === 'dark' || (newSettings.theme === 'auto' && newSettings.darkMode);
          await ThemeService.setDarkMode(darkMode);
        }
      },

      setSettings: async (newSettings) => {
        const currentSettings = get().settings;
        const mergedSettings = {
          ...currentSettings,
          ...newSettings,
        };

        set({ settings: mergedSettings });

        // Apply theme change
        if (newSettings.darkMode !== undefined || newSettings.theme !== undefined) {
          const darkMode = mergedSettings.theme === 'dark'
            ? true
            : mergedSettings.theme === 'light'
            ? false
            : mergedSettings.darkMode;
          await ThemeService.setDarkMode(darkMode);
        }
      },

      resetSettings: async () => {
        set({ settings: defaultSettings });
        await ThemeService.setDarkMode(defaultSettings.darkMode);
      },

      loadSettings: async () => {
        set({ isLoading: true });
        try {
          const settings = get().settings;
          await ThemeService.setDarkMode(settings.darkMode);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'app-settings',
      storage: createJSONStorage(() => (flags.enableMMKV ? (mmkvStorage as any) : AsyncStorage)),
    }
  )
);
