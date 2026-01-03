/**
 * Enhanced Theme System v3.0 - Aurora Pro
 * Modern color schemes with improved contrast and visual appeal
 * Includes vibrant gradients and glassmorphism support
 */

import {
  modernLayout,
  modernColors,
  modernGradients,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
  modernGlass,
  modernAnimations,
  modernComponentSizes,
} from "../styles/modernDesignSystem";

export type AppTheme = {
  colors: {
    background: {
      default: string;
      paper: string;
      elevated: string;
      overlay: string;
      glass: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      muted: string;
      disabled: string;
      inverse: string;
      link: string;
      linkHover: string;
    };
    primary: {
      500: string;
      600: string;
      400: string;
    };
    secondary: {
      500: string;
      600: string;
      400: string;
    };
    success: {
      main: string;
      light: string;
      dark: string;
      50: string;
      700: string;
    };
    error: {
      main: string;
      light: string;
      dark: string;
      50: string;
      700: string;
    };
    warning: {
      main: string;
      light: string;
      dark: string;
      50: string;
      700: string;
    };
    info: {
      main: string;
      light: string;
      50: string;
      700: string;
    };
    border: {
      light: string;
      medium: string;
      strong: string;
    };
    accent: string;
    accentLight: string;
    accentDark: string;
    danger: string; // Add danger alias
    overlay: string;
    glass: string;
    shimmer: readonly [string, string, string];
    // Aurora specific colors (gradients mostly)
    aurora: {
      primary: readonly [string, string, string];
      secondary: readonly [string, string, string];
      success: readonly [string, string, string];
      warm: readonly [string, string, string];
      dark: readonly [string, string, string];
    };
  };
  gradients: {
    primary: readonly [string, string, string];
    accent: readonly [string, string];
    surface: readonly [string, string];
    success: readonly [string, string];
    danger: readonly [string, string];
    // Aurora specific gradients
    aurora: readonly [string, string, string];
    auroraPrimary: readonly [string, string, string];
    auroraSecondary: readonly [string, string, string];
    auroraSuccess: readonly [string, string, string];
    auroraWarm: readonly [string, string, string];
    auroraDark: readonly [string, string, string];
  };
  spacing: {
    0: number;
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
    8: number;
    10: number;
    12: number;
    16: number;
    20: number;
    24: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    "2xl": number;
    "3xl": number;
  };
  borderRadius: {
    none: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    "2xl": number;
    "3xl": number;
    full: number;
    button: number;
    card: number;
    input: number;
    modal: number;
    badge: number;
  };
  radius: {
    none: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    "2xl": number;
    "3xl": number;
    full: number;
    button: number;
    card: number;
    input: number;
    modal: number;
    badge: number;
  };
  typography: typeof modernTypography;
  shadows: typeof modernShadows;
  glass: typeof modernGlass;
  animations: typeof modernAnimations;
  componentSizes: typeof modernComponentSizes;
  layout: typeof modernLayout;
};

// Common Aurora tokens to reuse
const commonAurora = {
  colors: {
    accent: modernColors.primary[400],
    accentLight: modernColors.primary[300],
    accentDark: modernColors.primary[600],
    danger: modernColors.error.main,
    overlay: "rgba(0, 0, 0, 0.5)",
    glass: "rgba(255, 255, 255, 0.15)",
    shimmer: ["rgba(255,255,255,0)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)"] as const,
    aurora: {
      primary: modernGradients.auroraPrimary,
      secondary: modernGradients.auroraSecondary,
      success: modernGradients.auroraSuccess,
      warm: modernGradients.auroraWarm,
      dark: modernGradients.auroraDark,
    },
  },
  gradients: {
    aurora: modernGradients.aurora,
    auroraPrimary: modernGradients.auroraPrimary,
    auroraSecondary: modernGradients.auroraSecondary,
    auroraSuccess: modernGradients.auroraSuccess,
    auroraWarm: modernGradients.auroraWarm,
    auroraDark: modernGradients.auroraDark,
  },
  typography: modernTypography,
  spacing: modernSpacing,
  borderRadius: modernBorderRadius,
  radius: modernBorderRadius,
  shadows: modernShadows,
  glass: modernGlass,
  animations: modernAnimations,
  componentSizes: modernComponentSizes,
  layout: modernLayout,
};

export const themes: Record<string, AppTheme> = {
  // Modern Light Theme - Clean & Professional
  light: {
    colors: {
      background: {
        default: "#FAFBFC",
        paper: "#FFFFFF",
        elevated: "#F8F9FB",
        overlay: "rgba(27, 31, 36, 0.5)",
        glass: "rgba(255, 255, 255, 0.85)",
      },
      text: {
        primary: "#0D1117",
        secondary: "#57606A",
        tertiary: "#8B949E",
        muted: "#8B949E",
        disabled: "#8B949E",
        inverse: "#FFFFFF",
        link: "#0969DA",
        linkHover: "#0550AE",
      },
      primary: {
        500: "#0969DA",
        600: "#0550AE",
        400: "#54AEFF",
      },
      secondary: {
        500: "#2DA44E",
        600: "#1A7F37",
        400: "#2DA44E",
      },
      success: {
        main: "#1A7F37",
        light: "#2DA44E",
        dark: "#115E26",
        50: "#DAFBE1",
        700: "#1A7F37",
      },
      error: {
        main: "#D1242F",
        light: "#EE5A5D",
        dark: "#A40E26",
        50: "#FFEBE9",
        700: "#CF222E",
      },
      warning: {
        main: "#9A6700",
        light: "#D4A72C",
        dark: "#704D00",
        50: "#FFF8C5",
        700: "#BF8700",
      },
      info: {
        main: "#0969DA",
        light: "#54AEFF",
        50: "#DDF4FF",
        700: "#0969DA",
      },
      border: {
        light: "#E1E7ED",
        medium: "#D0D7DE",
        strong: "#D0D7DE",
      },
      accent: "#0969DA",
      accentLight: "#54AEFF",
      accentDark: "#0550AE",
      danger: "#D1242F",
      overlay: "rgba(27, 31, 36, 0.5)",
      glass: "rgba(255, 255, 255, 0.85)",
      shimmer: ["#E1E4E8", "#F6F8FA", "#E1E4E8"],
      aurora: {
        ...commonAurora.colors.aurora,
      },
    },
    gradients: {
      primary: ["#0969DA", "#0550AE", "#033D8B"],
      accent: ["#54AEFF", "#0969DA"],
      surface: ["#FFFFFF", "#F6F8FA"],
      success: ["#2DA44E", "#1A7F37"],
      danger: ["#FA4549", "#CF222E"],
      ...commonAurora.gradients,
    },
    spacing: commonAurora.spacing,
    borderRadius: commonAurora.borderRadius,
    radius: commonAurora.borderRadius,
    typography: commonAurora.typography,
    shadows: commonAurora.shadows,
    glass: commonAurora.glass,
    animations: commonAurora.animations,
    componentSizes: commonAurora.componentSizes,
    layout: commonAurora.layout,
  },

  // Midnight Dark Theme - Deep & Elegant
  dark: {
    colors: {
      background: {
        default: "#0D1117",
        paper: "#161B22",
        elevated: "#21262D",
        overlay: "rgba(1, 4, 9, 0.8)",
        glass: "rgba(22, 27, 34, 0.85)",
      },
      text: {
        primary: "#F0F6FC",
        secondary: "#8B949E",
        tertiary: "#6E7681",
        muted: "#6E7681",
        disabled: "#6E7681",
        inverse: "#0D1117",
        link: "#58A6FF",
        linkHover: "#388BFD",
      },
      primary: {
        500: "#58A6FF",
        600: "#388BFD",
        400: "#79C0FF",
      },
      secondary: {
        500: "#3FB950",
        600: "#3FB950",
        400: "#56D364",
      },
      success: {
        main: "#3FB950",
        light: "#56D364",
        dark: "#238636",
        50: "#0E1C12",
        700: "#3FB950",
      },
      error: {
        main: "#F85149",
        light: "#FF7B72",
        dark: "#DA3633",
        50: "#1E1212",
        700: "#F85149",
      },
      warning: {
        main: "#D29922",
        light: "#E3B341",
        dark: "#9E6A03",
        50: "#19150E",
        700: "#D29922",
      },
      info: {
        main: "#58A6FF",
        light: "#79C0FF",
        50: "#0C141C",
        700: "#58A6FF",
      },
      border: {
        light: "#3D444D",
        medium: "#30363D",
        strong: "#30363D",
      },
      accent: "#58A6FF",
      accentLight: "#79C0FF",
      accentDark: "#388BFD",
      danger: "#F85149",
      overlay: "rgba(1, 4, 9, 0.8)",
      glass: "rgba(22, 27, 34, 0.85)",
      shimmer: ["#21262D", "#30363D", "#21262D"],
      aurora: {
        ...commonAurora.colors.aurora,
      },
    },
    gradients: {
      primary: ["#58A6FF", "#388BFD", "#1F6FEB"],
      accent: ["#79C0FF", "#58A6FF"],
      surface: ["#21262D", "#161B22"],
      success: ["#56D364", "#3FB950"],
      danger: ["#FF7B72", "#F85149"],
      ...commonAurora.gradients,
    },
    spacing: commonAurora.spacing,
    borderRadius: commonAurora.borderRadius,
    radius: commonAurora.borderRadius,
    typography: commonAurora.typography,
    shadows: commonAurora.shadows,
    glass: commonAurora.glass,
    animations: commonAurora.animations,
    componentSizes: commonAurora.componentSizes,
    layout: commonAurora.layout,
  },

  // Aurora Premium - Deep Ocean & Emerald (Professional & Modern)
  premium: {
    colors: {
      background: {
        default: "#0B1121", // Deep Ocean
        paper: "#151B2E", // Slightly lighter navy
        elevated: "#1E293B",
        overlay: "rgba(11, 17, 33, 0.95)", // Matches default background
        glass: "rgba(21, 27, 46, 0.8)", // Frosted navy
      },
      text: {
        primary: "#F8FAFC",
        secondary: "#94A3B8",
        tertiary: "#64748B",
        muted: "#64748B",
        disabled: "#64748B",
        inverse: "#020617",
        link: "#0EA5E9",
        linkHover: "#38BDF8",
      },
      primary: {
        500: "#0EA5E9",
        600: "#0284C7",
        400: "#38BDF8",
      },
      secondary: {
        500: "#10B981",
        600: "#10B981",
        400: "#34D399",
      },
      success: {
        main: "#10B981",
        light: "#34D399",
        dark: "#065F46",
        50: "#ECFDF5",
        700: "#047857",
      },
      error: {
        main: "#EF4444",
        light: "#F87171",
        dark: "#B91C1C",
        50: "#FEF2F2",
        700: "#B91C1C",
      },
      warning: {
        main: "#F59E0B",
        light: "#FBBF24",
        dark: "#B45309",
        50: "#FFFBEB",
        700: "#B45309",
      },
      info: {
        main: "#0EA5E9",
        light: "#38BDF8",
        50: "#F0F9FF",
        700: "#0EA5E9",
      },
      border: {
        light: "#334155",
        medium: "#1E293B",
        strong: "#1E293B",
      },
      accent: "#0EA5E9",
      accentLight: "#38BDF8",
      accentDark: "#0284C7",
      danger: "#EF4444",
      overlay: "rgba(2, 6, 23, 0.9)",
      glass: "rgba(15, 23, 42, 0.75)",
      shimmer: ["#1E293B", "#334155", "#1E293B"],
      aurora: {
        ...commonAurora.colors.aurora,
      },
    },
    gradients: {
      primary: ["#0EA5E9", "#0284C7", "#0369A1"],
      accent: ["#38BDF8", "#0EA5E9"],
      surface: ["#1E293B", "#0F172A"],
      success: ["#34D399", "#10B981"],
      danger: ["#F87171", "#EF4444"],
      ...commonAurora.gradients,
    },
    spacing: commonAurora.spacing,
    borderRadius: commonAurora.borderRadius,
    radius: commonAurora.borderRadius,
    typography: commonAurora.typography,
    shadows: commonAurora.shadows,
    glass: commonAurora.glass,
    animations: commonAurora.animations,
    componentSizes: commonAurora.componentSizes,
    layout: commonAurora.layout,
  },

  // Ocean Pro - Teal & Cyan Harmony
  ocean: {
    colors: {
      background: {
        default: "#042F2E",
        paper: "#0D3D3B",
        elevated: "#134E4A",
        overlay: "rgba(4, 47, 46, 0.9)",
        glass: "rgba(13, 61, 59, 0.8)",
      },
      text: {
        primary: "#F0FDFA",
        secondary: "#99F6E4",
        tertiary: "#5EEAD4",
        muted: "#5EEAD4",
        disabled: "#5EEAD4",
        inverse: "#042F2E",
        link: "#14B8A6",
        linkHover: "#2DD4BF",
      },
      primary: {
        500: "#14B8A6",
        600: "#0D9488",
        400: "#2DD4BF",
      },
      secondary: {
        500: "#22C55E",
        600: "#22C55E",
        400: "#4ADE80",
      },
      success: {
        main: "#22C55E",
        light: "#4ADE80",
        dark: "#166534",
        50: "#F0FDF4",
        700: "#15803D",
      },
      error: {
        main: "#F43F5E",
        light: "#FB7185",
        dark: "#9F1239",
        50: "#FFF1F2",
        700: "#BE123C",
      },
      warning: {
        main: "#F59E0B",
        light: "#FBBF24",
        dark: "#92400E",
        50: "#FFFBEB",
        700: "#B45309",
      },
      info: {
        main: "#0EA5E9",
        light: "#38BDF8",
        50: "#F0F9FF",
        700: "#0EA5E9",
      },
      border: {
        light: "#1D6B67",
        medium: "#134E4A",
        strong: "#134E4A",
      },
      accent: "#14B8A6",
      accentLight: "#2DD4BF",
      accentDark: "#0D9488",
      danger: "#F43F5E",
      overlay: "rgba(4, 47, 46, 0.9)",
      glass: "rgba(13, 61, 59, 0.8)",
      shimmer: ["#134E4A", "#1D6B67", "#134E4A"],
      aurora: {
        ...commonAurora.colors.aurora,
      },
    },
    gradients: {
      primary: ["#14B8A6", "#0D9488", "#0F766E"],
      accent: ["#2DD4BF", "#14B8A6"],
      surface: ["#134E4A", "#0D3D3B"],
      success: ["#4ADE80", "#22C55E"],
      danger: ["#FB7185", "#F43F5E"],
      ...commonAurora.gradients,
    },
    spacing: commonAurora.spacing,
    borderRadius: commonAurora.borderRadius,
    radius: commonAurora.borderRadius,
    typography: commonAurora.typography,
    shadows: commonAurora.shadows,
    glass: commonAurora.glass,
    animations: commonAurora.animations,
    componentSizes: commonAurora.componentSizes,
    layout: commonAurora.layout,
  },

  // Sunset Warm - Orange & Rose Vibrancy
  sunset: {
    colors: {
      background: {
        default: "#1C1917",
        paper: "#292524",
        elevated: "#3B3835",
        overlay: "rgba(28, 25, 23, 0.9)",
        glass: "rgba(41, 37, 36, 0.85)",
      },
      text: {
        primary: "#FAFAF9",
        secondary: "#E7E5E4",
        tertiary: "#A8A29E",
        muted: "#A8A29E",
        disabled: "#A8A29E",
        inverse: "#1C1917",
        link: "#F97316",
        linkHover: "#FB923C",
      },
      primary: {
        500: "#F97316",
        600: "#EA580C",
        400: "#FB923C",
      },
      secondary: {
        500: "#22C55E",
        600: "#22C55E",
        400: "#4ADE80",
      },
      success: {
        main: "#22C55E",
        light: "#4ADE80",
        dark: "#166534",
        50: "#F0FDF4",
        700: "#15803D",
      },
      error: {
        main: "#E11D48",
        light: "#FB7185",
        dark: "#9F1239",
        50: "#FFF1F2",
        700: "#BE123C",
      },
      warning: {
        main: "#FACC15",
        light: "#FDE047",
        dark: "#A16207",
        50: "#FEFCE8",
        700: "#A16207",
      },
      info: {
        main: "#0EA5E9",
        light: "#38BDF8",
        50: "#F0F9FF",
        700: "#0EA5E9",
      },
      border: {
        light: "#57534E",
        medium: "#3B3835",
        strong: "#3B3835",
      },
      accent: "#F97316",
      accentLight: "#FB923C",
      accentDark: "#EA580C",
      danger: "#E11D48",
      overlay: "rgba(28, 25, 23, 0.9)",
      glass: "rgba(41, 37, 36, 0.85)",
      shimmer: ["#3B3835", "#57534E", "#3B3835"],
      aurora: {
        ...commonAurora.colors.aurora,
      },
    },
    gradients: {
      primary: ["#F97316", "#EA580C", "#C2410C"],
      accent: ["#FB923C", "#F97316"],
      surface: ["#3B3835", "#292524"],
      success: ["#4ADE80", "#22C55E"],
      danger: ["#FB7185", "#E11D48"],
      ...commonAurora.gradients,
    },
    spacing: commonAurora.spacing,
    borderRadius: commonAurora.borderRadius,
    radius: commonAurora.borderRadius,
    typography: commonAurora.typography,
    shadows: commonAurora.shadows,
    glass: commonAurora.glass,
    animations: commonAurora.animations,
    componentSizes: commonAurora.componentSizes,
    layout: commonAurora.layout,
  },

  // High Contrast - Maximum Accessibility
  highContrast: {
    colors: {
      background: {
        default: "#000000",
        paper: "#0A0A0A",
        elevated: "#171717",
        overlay: "rgba(0, 0, 0, 0.95)",
        glass: "rgba(10, 10, 10, 0.9)",
      },
      text: {
        primary: "#FFFFFF",
        secondary: "#E5E5E5",
        tertiary: "#A3A3A3",
        muted: "#A3A3A3",
        disabled: "#A3A3A3",
        inverse: "#000000",
        link: "#00D4FF",
        linkHover: "#5CE1FF",
      },
      primary: {
        500: "#00D4FF",
        600: "#00B8E0",
        400: "#5CE1FF",
      },
      secondary: {
        500: "#00FF88",
        600: "#00FF88",
        400: "#5CFFA8",
      },
      success: {
        main: "#00FF88",
        light: "#5CFFA8",
        dark: "#008844",
        50: "#001108",
        700: "#00FF88",
      },
      error: {
        main: "#FF3366",
        light: "#FF6699",
        dark: "#AA0033",
        50: "#110005",
        700: "#FF3366",
      },
      warning: {
        main: "#FFD700",
        light: "#FFE44D",
        dark: "#AA8800",
        50: "#111100",
        700: "#FFD700",
      },
      info: {
        main: "#00D4FF",
        light: "#5CE1FF",
        50: "#00111A",
        700: "#00D4FF",
      },
      border: {
        light: "#525252",
        medium: "#404040",
        strong: "#404040",
      },
      accent: "#00D4FF",
      accentLight: "#5CE1FF",
      accentDark: "#00B8E0",
      danger: "#FF3366",
      overlay: "rgba(0, 0, 0, 0.95)",
      glass: "rgba(10, 10, 10, 0.9)",
      shimmer: ["#171717", "#262626", "#171717"],
      aurora: {
        ...commonAurora.colors.aurora,
      },
    },
    gradients: {
      primary: ["#00D4FF", "#00B8E0", "#0099CC"],
      accent: ["#5CE1FF", "#00D4FF"],
      surface: ["#171717", "#0A0A0A"],
      success: ["#5CFFA8", "#00FF88"],
      danger: ["#FF6699", "#FF3366"],
      ...commonAurora.gradients,
    },
    spacing: commonAurora.spacing,
    borderRadius: commonAurora.borderRadius,
    radius: commonAurora.borderRadius,
    typography: commonAurora.typography,
    shadows: commonAurora.shadows,
    glass: commonAurora.glass,
    animations: commonAurora.animations,
    componentSizes: commonAurora.componentSizes,
    layout: commonAurora.layout,
  },
};

// Default theme export for quick access
export const defaultTheme = themes.premium;
