import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const COLORS = {
  BG_MAIN: "#0F172A",       // Deep Slate (Background)
  BG_CARD: "#1E293B",       // Lighter Slate (Cards)
  BG_MODAL: "#334155",      // Modals
  
  INPUT_BG: "#0F172A",
  INPUT_BORDER: "#475569",
  
  TEXT_PRIMARY: "#F8FAFC",  // White
  TEXT_SECONDARY: "#94A3B8", // Light Grey
  TEXT_MUTED: "#64748B",    // Dark Grey

  SUCCESS: "#10B981",       // Emerald Green (Synced/Safe)
  WARNING: "#F59E0B",       // Amber (Pending/Print)
  ERROR: "#EF4444",         // Red (Offline/Variance)
  INFO: "#3B82F6",          // Neon Blue (Focus/Active)
  
  BORDER: "#334155",        // Legacy alias
} as const;

export const METRICS = {
  padding: 16,
  radius: 12,
  screenWidth: width,
  // Legacy aliases
  RADIUS_SM: 10,
  RADIUS_MD: 14,
  RADIUS_LG: 18,
  SPACING_1: 4,
  SPACING_2: 8,
  SPACING_3: 12,
  SPACING_4: 16,
  SPACING_5: 20,
  SPACING_6: 24,
  HEADER_HEIGHT: 56,
  INPUT_HEIGHT: 52,
} as const;

export const SHADOWS = {
  light: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  neon: {
    shadowColor: COLORS.INFO,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  // Legacy aliases
  CARD: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  FLOATING: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
} as const;

export function withAlpha(hexColor: string, alpha: number): string {
  const normalized = hexColor.trim();
  const clamped = Math.max(0, Math.min(1, alpha));
  const a = Math.round(clamped * 255);
  const aa = a.toString(16).padStart(2, "0").toUpperCase();

  if (/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `${normalized}${aa}`;
  }

  // If not a 6-digit hex, fall back unchanged.
  return hexColor;
}
