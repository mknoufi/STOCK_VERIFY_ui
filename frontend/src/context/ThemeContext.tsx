/**
 * Theme Context - Global Theme Management
 *
 * Provides:
 * - Full theme switching (6 variants)
 * - System theme auto-detection
 * - Persistent storage via MMKV
 * - Pattern selection
 * - Dynamic font size
 * - Dynamic primary color
 */

import * as React from "react";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useColorScheme, Appearance } from "react-native";
import { themes, AppTheme } from "../theme/themes";
import { mmkvStorage } from "../services/mmkvStorage";
import { useSettingsStore } from "../store/settingsStore";

const hexToRgba = (hex: string, alpha: number): string => {
  const normalized = hex.replace("#", "").trim();
  const isValid = /^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(normalized);
  if (!isValid) return hex;

  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
};

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
  // Legacy/normalized theme contract (flat string colors) for most components
  themeLegacy: {
    theme: "light" | "dark";
    isDark: boolean;
    colors: {
      primary: string;
      secondary: string;
      muted: string;
      background: string;
      surface: string;
      surfaceElevated: string;
      surfaceDark: string;
      text: string;
      textTokens: Record<string, string>;
      textPrimary: string;
      textSecondary: string;
      textTertiary: string;
      border: string;
      borderLight: string;
      error: string;
      success: string;
      warning: string;
      info: string;
      danger: string;
      overlay: string;
      overlayPrimary: string;
      accent: string;
      accentLight: string;
      accentDark: string;
      glass: string;
      card: string;
      placeholder: string;
      disabled: string;
    };
    gradients: AppTheme["gradients"];
    spacing: {
      xs: number;
      sm: number;
      md: number;
      base: number;
      lg: number;
      xl: number;
      xxl: number;
    };
    typography: any;
    borderRadius: {
      sm: number;
      md: number;
      lg: number;
      xl: number;
      round: number;
    };
    shadows: AppTheme["shadows"];
    animations: AppTheme["animations"];
    componentSizes: AppTheme["componentSizes"];
    layout: AppTheme["layout"];
  };
  themeKey: ThemeKey;
  themeMode: ThemeMode;
  isDark: boolean;

  // Pattern & Layout
  pattern: PatternType;
  layout: LayoutArrangement;

  // Dynamic styling from settings
  fontSize: number;
  primaryColor: string;

  // Actions
  setThemeKey: (key: ThemeKey) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setPattern: (pattern: PatternType) => void;
  setLayout: (layout: LayoutArrangement) => void;
  toggleDarkMode: () => void;

  // Helpers
  getThemeColor: (colorPath: string) => string;
  getFontSize: (
    scale?: number | "xs" | "sm" | "md" | "lg" | "xl" | "xxl",
  ) => number;
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
  const { settings } = useSettingsStore();

  // State
  const [themeKey, setThemeKeyState] = useState<ThemeKey>("premium");
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [pattern, setPatternState] = useState<PatternType>("none");
  const [layout, setLayoutState] = useState<LayoutArrangement>("default");
  const [isInitialized, setIsInitialized] = useState(false);

  // Get dynamic values from settings store
  const fontSize = settings.fontSizeValue || 16;
  const primaryColor = settings.primaryColor || "#6366F1";

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

  const theme = useMemo<AppTheme>(() => {
    const resolved = (themes as any)?.[effectiveThemeKey] as
      | AppTheme
      | undefined;
    const fallback = (themes as any)?.premium ?? (themes as any)?.light;
    return (resolved ??
      fallback ??
      (Object.values(themes)[0] as AppTheme)) as AppTheme;
  }, [effectiveThemeKey]);

  const isDark = useMemo(() => {
    return (
      effectiveThemeKey === "dark" ||
      effectiveThemeKey === "premium" ||
      effectiveThemeKey === "ocean" ||
      effectiveThemeKey === "sunset" ||
      effectiveThemeKey === "highContrast"
    );
  }, [effectiveThemeKey]);

  const themeLegacy = useMemo<ThemeContextType["themeLegacy"]>(() => {
    const resolvedPrimary = primaryColor || theme.colors.accent;
    const baseFontSize = fontSize;

    const fontSizeTokens = {
      xs: Math.max(12, Math.round(baseFontSize * 0.75)),
      sm: Math.max(14, Math.round(baseFontSize * 0.875)),
      md: baseFontSize,
      lg: Math.round(baseFontSize * 1.125),
      xl: Math.round(baseFontSize * 1.25),
      xxl: Math.round(baseFontSize * 1.5),
    };

    return {
      theme: isDark ? "dark" : "light",
      isDark,
      colors: {
        primary: resolvedPrimary,
        secondary: theme.colors.text.muted,
        muted: theme.colors.text.muted,
        background: theme.colors.background.default,
        surface: theme.colors.background.paper,
        surfaceElevated: theme.colors.background.elevated,
        surfaceDark: theme.colors.background.elevated,
        text: theme.colors.text.primary,
        textTokens: theme.colors.text,
        textPrimary: theme.colors.text.primary,
        textSecondary: theme.colors.text.secondary,
        textTertiary: theme.colors.text.muted,
        border: theme.colors.border.light,
        borderLight: theme.colors.border.light,
        error: theme.colors.error.main,
        success: theme.colors.success.main,
        warning: theme.colors.warning.main,
        info: theme.colors.info.main,
        danger: theme.colors.danger,
        overlay: theme.colors.background.overlay,
        overlayPrimary: hexToRgba(resolvedPrimary, isDark ? 0.16 : 0.12),
        accent: theme.colors.accent,
        accentLight: theme.colors.accentLight,
        accentDark: theme.colors.accentDark,
        glass: theme.colors.background.glass,
        card: theme.colors.background.paper,
        placeholder: theme.colors.text.muted,
        disabled: theme.colors.text.disabled,
      },
      gradients: theme.gradients,
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        base: 16,
        lg: 24,
        xl: 32,
        xxl: 48,
      },
      typography: {
        ...theme.typography,
        fontSize: {
          ...(theme.typography as any)?.fontSize,
          ...fontSizeTokens,
        },
      },
      borderRadius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
        round: 50,
      },
      shadows: theme.shadows,
      animations: theme.animations,
      componentSizes: theme.componentSizes,
      layout: theme.layout,
    };
  }, [theme, isDark, primaryColor, fontSize]);

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
    const subscription = Appearance.addChangeListener(
      ({ colorScheme: _colorScheme }) => {
        if (themeMode === "system") {
          // Theme will auto-update via effectiveThemeKey computation
        }
      },
    );

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
      return typeof value === "string"
        ? value
        : currentTheme.colors.text.primary;
    },
    [theme],
  );

  // Helper to get scaled font size based on user preference
  const getFontSize = useCallback(
    (scale: number | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" = 1): number => {
      const namedScales: Record<
        "xs" | "sm" | "md" | "lg" | "xl" | "xxl",
        number
      > = {
        xs: 0.75,
        sm: 0.875,
        md: 1,
        lg: 1.125,
        xl: 1.25,
        xxl: 1.5,
      };

      const numericScale =
        typeof scale === "number" ? scale : (namedScales[scale] ?? 1);
      return Math.round(fontSize * numericScale);
    },
    [fontSize],
  );

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme: theme!,
      themeLegacy,
      themeKey: effectiveThemeKey,
      themeMode,
      isDark,
      pattern,
      layout,
      fontSize,
      primaryColor,
      setThemeKey,
      setThemeMode,
      setPattern,
      setLayout,
      toggleDarkMode,
      getThemeColor,
      getFontSize,
      availableThemes: THEME_METADATA,
      availablePatterns: PATTERN_METADATA,
      availableLayouts: LAYOUT_METADATA,
    }),
    [
      theme,
      themeLegacy,
      effectiveThemeKey,
      themeMode,
      isDark,
      pattern,
      layout,
      fontSize,
      primaryColor,
      setThemeKey,
      setThemeMode,
      setPattern,
      setLayout,
      toggleDarkMode,
      getThemeColor,
      getFontSize,
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
