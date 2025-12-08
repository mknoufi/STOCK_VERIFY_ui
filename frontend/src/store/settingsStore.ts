import { create } from "zustand";
import { mmkvStorage } from "../services/mmkvStorage";
import { ThemeService, Theme } from "../services/themeService";

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
  showItemImages: true,
  showItemPrices: true,
  showItemStock: true,
  exportFormat: "csv",
  backupFrequency: "weekly",
  requireAuth: true,
  sessionTimeout: 30,
  biometricAuth: false,
  imageCache: true,
  lazyLoading: true,
  debounceDelay: 300,
};

interface SettingsState {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

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
}));
