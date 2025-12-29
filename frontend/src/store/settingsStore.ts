import { create } from "zustand";
import { mmkvStorage } from "../services/mmkvStorage";
import { ThemeService, Theme } from "../services/themeService";
import { authApi, UserSettings } from "../services/api/authApi";

export interface Settings {
  // Theme
  darkMode: boolean;
  theme: "light" | "dark" | "auto";

  // Notifications
  notificationsEnabled: boolean;
  notificationSound: boolean;
  notificationBadge: boolean;

  // Sync
  autoSyncEnabled: boolean;
  autoSyncInterval: number;
  syncOnReconnect: boolean;

  // Offline
  offlineMode: boolean;
  cacheExpiration: number;
  maxQueueSize: number;

  // Scanner
  scannerVibration: boolean;
  scannerSound: boolean;
  scannerAutoSubmit: boolean;
  scannerTimeout: number;

  // Display
  fontSize: "small" | "medium" | "large";
  fontSizeValue: number; // Numeric font size (12-22)
  primaryColor: string; // Hex color or color id
  primaryColorId: string; // Color palette id (aurora, ocean, etc.)
  showItemImages: boolean;
  showItemPrices: boolean;
  showItemStock: boolean;

  // Data
  exportFormat: "csv" | "json";
  backupFrequency: "daily" | "weekly" | "monthly" | "never";

  // Security
  requireAuth: boolean;
  sessionTimeout: number;
  biometricAuth: boolean;
  operationalMode: "live_audit" | "routine" | "training";

  // Performance
  imageCache: boolean;
  lazyLoading: boolean;
  debounceDelay: number;
}

const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  theme: "auto",
  notificationsEnabled: true,
  notificationSound: true,
  notificationBadge: true,
  autoSyncEnabled: true,
  autoSyncInterval: 15,
  syncOnReconnect: true,
  offlineMode: false,
  cacheExpiration: 24,
  maxQueueSize: 1000,
  scannerVibration: true,
  scannerSound: true,
  scannerAutoSubmit: true,
  scannerTimeout: 30,
  fontSize: "medium",
  fontSizeValue: 16,
  primaryColor: "#6366F1",
  primaryColorId: "aurora",
  showItemImages: true,
  showItemPrices: true,
  showItemStock: true,
  exportFormat: "csv",
  backupFrequency: "weekly",
  requireAuth: true,
  sessionTimeout: 30,
  biometricAuth: false,
  operationalMode: "routine",
  imageCache: true,
  lazyLoading: true,
  debounceDelay: 300,
};

interface SettingsState {
  settings: Settings;
  isSyncing: boolean;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
  syncFromBackend: () => Promise<void>;
  syncToBackend: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isSyncing: false,

  setSetting: (key, value) => {
    const newSettings = { ...get().settings, [key]: value };
    set({ settings: newSettings });

    // Persist to storage
    mmkvStorage.setItem("app_settings", JSON.stringify(newSettings));

    // Handle side effects
    if (key === "theme") {
      ThemeService.setTheme(value as Theme);
    }
  },

  resetSettings: async () => {
    set({ settings: DEFAULT_SETTINGS });
    mmkvStorage.setItem("app_settings", JSON.stringify(DEFAULT_SETTINGS));
    ThemeService.setTheme(DEFAULT_SETTINGS.theme as Theme);
  },

  loadSettings: async () => {
    try {
      const storedSettings = mmkvStorage.getItem("app_settings");
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        // Merge with defaults to handle new keys
        const mergedSettings = { ...DEFAULT_SETTINGS, ...parsedSettings };
        set({ settings: mergedSettings });

        // Apply theme
        ThemeService.setTheme(mergedSettings.theme);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  },

  syncFromBackend: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    try {
      const backendSettings = await authApi.getUserSettings();
      const currentSettings = get().settings;

      // Map backend fields to frontend settings
      const updatedSettings: Partial<Settings> = {
        ...currentSettings,
        theme: backendSettings.theme as Settings["theme"],
        fontSizeValue: backendSettings.font_size,
        primaryColor: backendSettings.primary_color,
        scannerVibration: backendSettings.haptic_enabled,
        scannerSound: backendSettings.sound_enabled,
        autoSyncEnabled: backendSettings.auto_sync_enabled,
      };

      const mergedSettings = { ...currentSettings, ...updatedSettings };
      set({ settings: mergedSettings });

      // Persist locally
      mmkvStorage.setItem("app_settings", JSON.stringify(mergedSettings));

      // Apply theme if changed
      if (backendSettings.theme !== currentSettings.theme) {
        ThemeService.setTheme(mergedSettings.theme as Theme);
      }

      console.log("[SettingsStore] Synced settings from backend");
    } catch (error) {
      // Silently fail - use local settings if backend unavailable
      console.warn("[SettingsStore] Failed to sync from backend:", error);
    } finally {
      set({ isSyncing: false });
    }
  },

  syncToBackend: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    try {
      const currentSettings = get().settings;

      // Map frontend settings to backend schema
      const backendPayload: Partial<UserSettings> = {
        theme: currentSettings.theme,
        font_size: currentSettings.fontSizeValue,
        primary_color: currentSettings.primaryColor,
        haptic_enabled: currentSettings.scannerVibration,
        sound_enabled: currentSettings.scannerSound,
        auto_sync_enabled: currentSettings.autoSyncEnabled,
      };

      await authApi.updateUserSettings(backendPayload);
      console.log("[SettingsStore] Synced settings to backend");
    } catch (error) {
      console.warn("[SettingsStore] Failed to sync to backend:", error);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
