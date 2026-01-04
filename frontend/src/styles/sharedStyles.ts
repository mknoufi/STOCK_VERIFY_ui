/**
 * Shared Style Constants for Uniformity Across All Pages
 *
 * Use these constants to maintain consistent spacing, sizing, and styling
 * throughout the application.
 */

import { Platform, StyleSheet } from "react-native";

// ============================================
// SPACING & SIZING CONSTANTS
// ============================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const BORDER_RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  pill: 999,
} as const;

export const FONT_SIZE = {
  xs: 10,
  sm: 11,
  md: 12,
  base: 13,
  lg: 14,
  xl: 16,
  xxl: 18,
  xxxl: 20,
  title: 22,
  display: 32,
  hero: 36,
} as const;

export const FONT_WEIGHT = {
  normal: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

// ============================================
// SHARED COLORS
// ============================================

export const COLORS = {
  // Primary accent
  accent: "#0EA5E9",
  accentLight: "rgba(14, 165, 233, 0.1)",
  accentBorder: "rgba(14, 165, 233, 0.2)",

  // Surface colors
  surface: "rgba(15, 23, 42, 0.5)",
  surfaceElevated: "rgba(255, 255, 255, 0.05)",
  surfaceLight: "rgba(255, 255, 255, 0.03)",

  // Border colors
  border: "rgba(255, 255, 255, 0.08)",
  borderLight: "rgba(255, 255, 255, 0.06)",

  // Status colors
  success: "#22C55E",
  successLight: "rgba(34, 197, 94, 0.1)",
  successBorder: "rgba(34, 197, 94, 0.2)",

  warning: "#F59E0B",
  warningLight: "rgba(245, 158, 11, 0.1)",
  warningBorder: "rgba(245, 158, 11, 0.2)",

  danger: "#EF4444",
  dangerLight: "rgba(239, 68, 68, 0.06)",
  dangerBorder: "rgba(239, 68, 68, 0.2)",

  // Text colors
  textPrimary: "#F8FAFC",
  textSecondary: "#94A3B8",
  textTertiary: "#64748B",
} as const;

// ============================================
// SHARED COMPONENT STYLES
// ============================================

export const sharedStyles = StyleSheet.create({
  // =========== CONTAINERS ===========
  container: {
    flex: 1,
  },

  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: 140,
  },

  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },

  // =========== HEADERS ===========
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: SPACING.lg,
    backgroundColor: "transparent",
  },

  headerTitle: {
    fontSize: FONT_SIZE.xxxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },

  headerSubtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // =========== BUTTONS ===========
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },

  // =========== CARDS ===========
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xxl,
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },

  cardSmall: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },

  cardTitle: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  // =========== SECTIONS ===========
  section: {
    marginBottom: SPACING.xl,
  },

  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },

  // =========== LABELS & TEXT ===========
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },

  value: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.3,
  },

  valueAccent: {
    fontSize: FONT_SIZE.display,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.accent,
    letterSpacing: -0.5,
  },

  helperText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    marginTop: SPACING.xs,
  },

  // =========== BADGES ===========
  badge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  badgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  accentBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.accentLight,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
  },

  accentBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  successBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.successLight,
    borderWidth: 1,
    borderColor: COLORS.successBorder,
  },

  successBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.success,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  warningBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
  },

  warningBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.warning,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // =========== INPUTS ===========
  inputContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 48,
    justifyContent: "center",
  },

  inputText: {
    fontSize: FONT_SIZE.xl,
    color: COLORS.textPrimary,
  },

  // =========== ROWS & GRIDS ===========
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowGap: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  grid2: {
    flexDirection: "row",
    gap: SPACING.md,
  },

  gridItem: {
    flex: 1,
  },

  // =========== STAT CARDS ===========
  statCard: {
    flex: 1,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.xxl,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },

  statIconBox: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.accentLight,
  },

  statValue: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  statLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },

  // =========== LIST ITEMS ===========
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },

  listItemLast: {
    borderBottomWidth: 0,
  },

  // =========== EMPTY STATE ===========
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
  },

  emptyText: {
    color: COLORS.textSecondary,
    fontSize: FONT_SIZE.xl,
    marginTop: SPACING.lg,
  },

  // =========== MODALS ===========
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },

  modalContent: {
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingBottom: 40,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },

  modalTitle: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },

  modalBody: {
    paddingHorizontal: SPACING.xl,
  },

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(148, 163, 184, 0.3)",
    alignSelf: "center",
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
  },
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create consistent card styling with variant
 */
export const createCardStyle = (
  variant: "default" | "accent" | "success" | "warning" | "danger" = "default",
) => {
  const variants = {
    default: {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.border,
    },
    accent: {
      backgroundColor: COLORS.accentLight,
      borderColor: COLORS.accentBorder,
    },
    success: {
      backgroundColor: COLORS.successLight,
      borderColor: COLORS.successBorder,
    },
    warning: {
      backgroundColor: COLORS.warningLight,
      borderColor: COLORS.warningBorder,
    },
    danger: {
      backgroundColor: COLORS.dangerLight,
      borderColor: COLORS.dangerBorder,
    },
  };

  return {
    ...variants[variant],
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
  };
};

export default {
  SPACING,
  BORDER_RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
  COLORS,
  sharedStyles,
  createCardStyle,
};
