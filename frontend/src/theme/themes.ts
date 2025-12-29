/**
 * Enhanced Theme System v3.0 - Aurora Pro
 * Modern color schemes with improved contrast and visual appeal
 * Includes vibrant gradients and glassmorphism support
 */

export type AppTheme = {
  colors: {
    background: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textSecondary: string;
    muted: string;
    accent: string;
    accentLight: string;
    accentDark: string;
    success: string;
    successLight: string;
    danger: string;
    dangerLight: string;
    warning: string;
    warningLight: string;
    info: string;
    border: string;
    borderLight: string;
    overlay: string;
    glass: string;
    shimmer: readonly [string, string, string];
  };
  gradients: {
    primary: readonly [string, string, string];
    accent: readonly [string, string];
    surface: readonly [string, string];
    success: readonly [string, string];
    danger: readonly [string, string];
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  typography: { baseSize: number; scale: number };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
};

export const themes: Record<string, AppTheme> = {
  // Modern Light Theme - Clean & Professional
  light: {
    colors: {
      background: "#FAFBFC",
      surface: "#FFFFFF",
      surfaceElevated: "#F8F9FB",
      text: "#0D1117",
      textSecondary: "#57606A",
      muted: "#8B949E",
      accent: "#0969DA",
      accentLight: "#54AEFF",
      accentDark: "#0550AE",
      success: "#1A7F37",
      successLight: "#2DA44E",
      danger: "#CF222E",
      dangerLight: "#FA4549",
      warning: "#BF8700",
      warningLight: "#D4A72C",
      info: "#0969DA",
      border: "#D0D7DE",
      borderLight: "#E1E7ED",
      overlay: "rgba(27, 31, 36, 0.5)",
      glass: "rgba(255, 255, 255, 0.85)",
      shimmer: ["#E1E4E8", "#F6F8FA", "#E1E4E8"],
    },
    gradients: {
      primary: ["#0969DA", "#0550AE", "#033D8B"],
      accent: ["#54AEFF", "#0969DA"],
      surface: ["#FFFFFF", "#F6F8FA"],
      success: ["#2DA44E", "#1A7F37"],
      danger: ["#FA4549", "#CF222E"],
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
    typography: { baseSize: 14, scale: 1.125 },
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.05)",
      md: "0 4px 6px rgba(0,0,0,0.07)",
      lg: "0 10px 20px rgba(0,0,0,0.1)",
      glow: "0 0 20px rgba(9,105,218,0.25)",
    },
  },

  // Midnight Dark Theme - Deep & Elegant
  dark: {
    colors: {
      background: "#0D1117",
      surface: "#161B22",
      surfaceElevated: "#21262D",
      text: "#F0F6FC",
      textSecondary: "#8B949E",
      muted: "#6E7681",
      accent: "#58A6FF",
      accentLight: "#79C0FF",
      accentDark: "#388BFD",
      success: "#3FB950",
      successLight: "#56D364",
      danger: "#F85149",
      dangerLight: "#FF7B72",
      warning: "#D29922",
      warningLight: "#E3B341",
      info: "#58A6FF",
      border: "#30363D",
      borderLight: "#3D444D",
      overlay: "rgba(1, 4, 9, 0.8)",
      glass: "rgba(22, 27, 34, 0.85)",
      shimmer: ["#21262D", "#30363D", "#21262D"],
    },
    gradients: {
      primary: ["#58A6FF", "#388BFD", "#1F6FEB"],
      accent: ["#79C0FF", "#58A6FF"],
      surface: ["#21262D", "#161B22"],
      success: ["#56D364", "#3FB950"],
      danger: ["#FF7B72", "#F85149"],
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
    typography: { baseSize: 14, scale: 1.125 },
    shadows: {
      sm: "0 1px 2px rgba(0,0,0,0.3)",
      md: "0 4px 8px rgba(0,0,0,0.4)",
      lg: "0 8px 24px rgba(0,0,0,0.5)",
      glow: "0 0 25px rgba(88,166,255,0.35)",
    },
  },

  // Aurora Premium - Deep Ocean & Emerald (Professional & Modern)
  premium: {
    colors: {
      background: "#020617",
      surface: "#0F172A",
      surfaceElevated: "#1E293B",
      text: "#F8FAFC",
      textSecondary: "#94A3B8",
      muted: "#64748B",
      accent: "#0EA5E9",
      accentLight: "#38BDF8",
      accentDark: "#0284C7",
      success: "#10B981",
      successLight: "#34D399",
      danger: "#EF4444",
      dangerLight: "#F87171",
      warning: "#F59E0B",
      warningLight: "#FBBF24",
      info: "#0EA5E9",
      border: "#1E293B",
      borderLight: "#334155",
      overlay: "rgba(2, 6, 23, 0.9)",
      glass: "rgba(15, 23, 42, 0.75)",
      shimmer: ["#1E293B", "#334155", "#1E293B"],
    },
    gradients: {
      primary: ["#0EA5E9", "#0284C7", "#0369A1"],
      accent: ["#38BDF8", "#0EA5E9"],
      surface: ["#1E293B", "#0F172A"],
      success: ["#34D399", "#10B981"],
      danger: ["#F87171", "#EF4444"],
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, full: 9999 },
    typography: { baseSize: 15, scale: 1.2 },
    shadows: {
      sm: "0 2px 4px rgba(0,0,0,0.2)",
      md: "0 6px 12px rgba(0,0,0,0.3)",
      lg: "0 12px 32px rgba(0,0,0,0.4)",
      glow: "0 0 30px rgba(14,165,233,0.3)",
    },
  },

  // Ocean Pro - Teal & Cyan Harmony
  ocean: {
    colors: {
      background: "#042F2E",
      surface: "#0D3D3B",
      surfaceElevated: "#134E4A",
      text: "#F0FDFA",
      textSecondary: "#99F6E4",
      muted: "#5EEAD4",
      accent: "#14B8A6",
      accentLight: "#2DD4BF",
      accentDark: "#0D9488",
      success: "#22C55E",
      successLight: "#4ADE80",
      danger: "#F43F5E",
      dangerLight: "#FB7185",
      warning: "#F59E0B",
      warningLight: "#FBBF24",
      info: "#0EA5E9",
      border: "#134E4A",
      borderLight: "#1D6B67",
      overlay: "rgba(4, 47, 46, 0.9)",
      glass: "rgba(13, 61, 59, 0.8)",
      shimmer: ["#134E4A", "#1D6B67", "#134E4A"],
    },
    gradients: {
      primary: ["#14B8A6", "#0D9488", "#0F766E"],
      accent: ["#2DD4BF", "#14B8A6"],
      surface: ["#134E4A", "#0D3D3B"],
      success: ["#4ADE80", "#22C55E"],
      danger: ["#FB7185", "#F43F5E"],
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 18, full: 9999 },
    typography: { baseSize: 14, scale: 1.15 },
    shadows: {
      sm: "0 2px 4px rgba(0,0,0,0.2)",
      md: "0 4px 10px rgba(0,0,0,0.25)",
      lg: "0 10px 25px rgba(0,0,0,0.35)",
      glow: "0 0 25px rgba(20,184,166,0.4)",
    },
  },

  // Sunset Warm - Orange & Rose Vibrancy
  sunset: {
    colors: {
      background: "#1C1917",
      surface: "#292524",
      surfaceElevated: "#3B3835",
      text: "#FAFAF9",
      textSecondary: "#E7E5E4",
      muted: "#A8A29E",
      accent: "#F97316",
      accentLight: "#FB923C",
      accentDark: "#EA580C",
      success: "#22C55E",
      successLight: "#4ADE80",
      danger: "#E11D48",
      dangerLight: "#FB7185",
      warning: "#FACC15",
      warningLight: "#FDE047",
      info: "#0EA5E9",
      border: "#3B3835",
      borderLight: "#57534E",
      overlay: "rgba(28, 25, 23, 0.9)",
      glass: "rgba(41, 37, 36, 0.85)",
      shimmer: ["#3B3835", "#57534E", "#3B3835"],
    },
    gradients: {
      primary: ["#F97316", "#EA580C", "#C2410C"],
      accent: ["#FB923C", "#F97316"],
      surface: ["#3B3835", "#292524"],
      success: ["#4ADE80", "#22C55E"],
      danger: ["#FB7185", "#E11D48"],
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { xs: 4, sm: 6, md: 10, lg: 14, xl: 18, full: 9999 },
    typography: { baseSize: 14, scale: 1.15 },
    shadows: {
      sm: "0 2px 4px rgba(0,0,0,0.2)",
      md: "0 4px 10px rgba(0,0,0,0.3)",
      lg: "0 10px 25px rgba(0,0,0,0.4)",
      glow: "0 0 25px rgba(249,115,22,0.4)",
    },
  },

  // High Contrast - Maximum Accessibility
  highContrast: {
    colors: {
      background: "#000000",
      surface: "#0A0A0A",
      surfaceElevated: "#171717",
      text: "#FFFFFF",
      textSecondary: "#E5E5E5",
      muted: "#A3A3A3",
      accent: "#00D4FF",
      accentLight: "#5CE1FF",
      accentDark: "#00B8E0",
      success: "#00FF88",
      successLight: "#5CFFA8",
      danger: "#FF3366",
      dangerLight: "#FF6699",
      warning: "#FFD700",
      warningLight: "#FFE44D",
      info: "#00D4FF",
      border: "#404040",
      borderLight: "#525252",
      overlay: "rgba(0, 0, 0, 0.95)",
      glass: "rgba(10, 10, 10, 0.9)",
      shimmer: ["#171717", "#262626", "#171717"],
    },
    gradients: {
      primary: ["#00D4FF", "#00B8E0", "#0099CC"],
      accent: ["#5CE1FF", "#00D4FF"],
      surface: ["#171717", "#0A0A0A"],
      success: ["#5CFFA8", "#00FF88"],
      danger: ["#FF6699", "#FF3366"],
    },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
    radius: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
    typography: { baseSize: 16, scale: 1.2 },
    shadows: {
      sm: "0 2px 4px rgba(0,0,0,0.5)",
      md: "0 4px 10px rgba(0,0,0,0.6)",
      lg: "0 10px 25px rgba(0,0,0,0.7)",
      glow: "0 0 30px rgba(0,212,255,0.5)",
    },
  },
};

// Default theme export for quick access
export const defaultTheme = themes.premium;
