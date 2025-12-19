/**
 * Theme Context - Global Theme Management
 *
 * Provides:
 * - Full theme switching (6 variants)
 * - System theme auto-detection
 * - Persistent storage via MMKV
 * - Pattern selection
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useColorScheme, Appearance } from "react-native";
import { themes, AppTheme } from "./themes";
import { mmkvStorage } from "../services/mmkvStorage";

// Available theme keys
export type ThemeKey =
  | "light"
  | "dark"
  | "premium"
  | "ocean"
  | "sunset"
  | "highContrast";
export type ThemeMode = "light" | "dark" | "system";

// Pattern types for background arrangements
export type PatternType =
  | "none"
  | "dots"
  | "grid"
  | "waves"
  | "aurora"
  | "mesh"
  | "circuit"
  | "hexagon";

// Layout arrangement types
export type LayoutArrangement =
  | "default"
  | "compact"
  | "spacious"
  | "cards"
  | "list"
  | "grid";

interface ThemeContextType {
  // Current theme
  theme: AppTheme;
  themeKey: ThemeKey;
  themeMode: ThemeMode;
  isDark: boolean;

  // Pattern & Layout
  pattern: PatternType;
  layout: LayoutArrangement;

  // Actions
  setThemeKey: (key: ThemeKey) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setPattern: (pattern: PatternType) => void;
  setLayout: (layout: LayoutArrangement) => void;
  toggleDarkMode: () => void;

  // Helpers
  getThemeColor: (colorPath: string) => string;
  availableThemes: { key: ThemeKey; name: string; preview: string[] }[];
  availablePatterns: { key: PatternType; name: string; icon: string }[];
  availableLayouts: { key: LayoutArrangement; name: string; icon: string }[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Storage keys
const STORAGE_KEYS = {
  THEME_KEY: "app_theme_key",
  THEME_MODE: "app_theme_mode",
  PATTERN: "app_pattern",
  LAYOUT: "app_layout",
};

// Theme metadata for picker UI
const THEME_METADATA: { key: ThemeKey; name: string; preview: string[] }[] = [
  { key: "light", name: "Light", preview: ["#FAFBFC", "#0969DA", "#1A7F37"] },
  { key: "dark", name: "Midnight", preview: ["#0D1117", "#58A6FF", "#3FB950"] },
  {
    key: "premium",
    name: "Aurora Pro",
    preview: ["#030712", "#6366F1", "#8B5CF6"],
  },
  { key: "ocean", name: "Ocean", preview: ["#042F2E", "#14B8A6", "#0EA5E9"] },
  { key: "sunset", name: "Sunset", preview: ["#1C1917", "#F97316", "#E11D48"] },
  {
    key: "highContrast",
    name: "High Contrast",
    preview: ["#000000", "#00D4FF", "#00FF88"],
  },
];

// Pattern metadata
const PATTERN_METADATA: { key: PatternType; name: string; icon: string }[] = [
  { key: "none", name: "None", icon: "remove-circle-outline" },
  { key: "dots", name: "Dots", icon: "ellipsis-horizontal" },
  { key: "grid", name: "Grid", icon: "grid-outline" },
  { key: "waves", name: "Waves", icon: "water-outline" },
  { key: "aurora", name: "Aurora", icon: "color-wand-outline" },
  { key: "mesh", name: "Mesh", icon: "apps-outline" },
  { key: "circuit", name: "Circuit", icon: "git-network-outline" },
  { key: "hexagon", name: "Hexagon", icon: "hexagon-outline" },
];

// Layout metadata
const LAYOUT_METADATA: {
  key: LayoutArrangement;
  name: string;
  icon: string;
}[] = [
  { key: "default", name: "Default", icon: "apps-outline" },
  { key: "compact", name: "Compact", icon: "contract-outline" },
  { key: "spacious", name: "Spacious", icon: "expand-outline" },
  { key: "cards", name: "Cards", icon: "albums-outline" },
  { key: "list", name: "List", icon: "list-outline" },
  { key: "grid", name: "Grid", icon: "grid-outline" },
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme();

  // State
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("premium");
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [pattern, setPatternState] = useState<PatternType>("none");
  const [layout, setLayoutState] = useState<LayoutArrangement>("default");
  const [isInitialized, setIsInitialized] = useState(false);

  // Compute effective theme based on mode
  const effectiveThemeKey = useMemo((): ThemeKey => {
    if (themeMode === "system") {
      return systemColorScheme === "dark" ? "dark" : "light";
    }
    if (themeMode === "dark" && themeKey === "light") {
      return "dark";
    }
    if (themeMode === "light" && themeKey === "dark") {
      return "light";
    }
    return themeKey;
  }, [themeMode, themeKey, systemColorScheme]);

  const theme = useMemo(
    () => themes[effectiveThemeKey] || themes.premium,
    [effectiveThemeKey],
  );

  const isDark = useMemo(() => {
    return (
      effectiveThemeKey === "dark" ||
      effectiveThemeKey === "premium" ||
      effectiveThemeKey === "ocean" ||
      effectiveThemeKey === "sunset" ||
      effectiveThemeKey === "highContrast"
    );
  }, [effectiveThemeKey]);

  // Load persisted settings
  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedThemeKey = mmkvStorage.getItem(STORAGE_KEYS.THEME_KEY);
        const savedThemeMode = mmkvStorage.getItem(STORAGE_KEYS.THEME_MODE);
        const savedPattern = mmkvStorage.getItem(STORAGE_KEYS.PATTERN);
        const savedLayout = mmkvStorage.getItem(STORAGE_KEYS.LAYOUT);

        if (savedThemeKey && themes[savedThemeKey as ThemeKey]) {
          setThemeKeyState(savedThemeKey as ThemeKey);
        }
        if (savedThemeMode) {
          setThemeModeState(savedThemeMode as ThemeMode);
        }
        if (savedPattern) {
          setPatternState(savedPattern as PatternType);
        }
        if (savedLayout) {
          setLayoutState(savedLayout as LayoutArrangement);
        }
      } catch (error) {
        console.warn("Failed to load theme settings:", error);
      }
      setIsInitialized(true);
    };

    loadSettings();
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === "system") {
        // Theme will auto-update via effectiveThemeKey computation
      }
    });

    return () => subscription.remove();
  }, [themeMode]);

  // Actions
  const setThemeKey = useCallback((key: ThemeKey) => {
    setThemeKeyState(key);
    mmkvStorage.setItem(STORAGE_KEYS.THEME_KEY, key);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    mmkvStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
  }, []);

  const setPattern = useCallback((p: PatternType) => {
    setPatternState(p);
    mmkvStorage.setItem(STORAGE_KEYS.PATTERN, p);
  }, []);

  const setLayout = useCallback((l: LayoutArrangement) => {
    setLayoutState(l);
    mmkvStorage.setItem(STORAGE_KEYS.LAYOUT, l);
  }, []);

  const toggleDarkMode = useCallback(() => {
    if (themeMode === "system") {
      setThemeMode(systemColorScheme === "dark" ? "light" : "dark");
    } else {
      setThemeMode(themeMode === "dark" ? "light" : "dark");
    }
  }, [themeMode, systemColorScheme, setThemeMode]);

  // Helper to get nested color value
  const getThemeColor = useCallback(
    (colorPath: string): string => {
      const currentTheme = theme!;
      const parts = colorPath.split(".");
      let value: any = currentTheme.colors;
      for (const part of parts) {
        value = value?.[part];
      }
      return typeof value === "string" ? value : currentTheme.colors.text;
    },
    [theme],
  );

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme: theme!,
      themeKey: effectiveThemeKey,
      themeMode,
      isDark,
      pattern,
      layout,
      setThemeKey,
      setThemeMode,
      setPattern,
      setLayout,
      toggleDarkMode,
      getThemeColor,
      availableThemes: THEME_METADATA,
      availablePatterns: PATTERN_METADATA,
      availableLayouts: LAYOUT_METADATA,
    }),
    [
      theme,
      effectiveThemeKey,
      themeMode,
      isDark,
      pattern,
      layout,
      setThemeKey,
      setThemeMode,
      setPattern,
      setLayout,
      toggleDarkMode,
      getThemeColor,
    ],
  );

  if (!isInitialized) {
    // Return a loading placeholder instead of null to prevent blank screen
    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme context
export const useThemeContext = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
};

// Optional hook that doesn't throw (for components that may be outside provider)
export const useThemeContextSafe = (): ThemeContextType | null => {
  return useContext(ThemeContext) ?? null;
};

export default ThemeContext;
