/**
 * Shared Screen Styles - Unified Layout System v1.0
 *
 * Provides consistent styling patterns across all screens.
 * Import these styles in your screens for uniformity.
 *
 * Usage:
 * import { screenStyles, createScreenStyles } from '@/styles/screenStyles';
 */

import { StyleSheet, Dimensions, Platform } from "react-native";
import { auroraTheme } from "../theme/auroraTheme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isTablet = SCREEN_WIDTH > 768;

// ============================================================================
// Screen Layout Constants
// ============================================================================

export const screenLayout = {
  // Content width constraints
  maxContentWidth: 1200,
  maxCardWidth: 600,

  // Padding values
  screenPadding: auroraTheme.spacing.lg,
  sectionPadding: auroraTheme.spacing.md,
  cardPadding: auroraTheme.spacing.lg,

  // Spacing between sections
  sectionGap: auroraTheme.spacing.xl,

  // Grid columns
  gridColumns: isWeb && isTablet ? 3 : 2,

  // Card dimensions
  cardBorderRadius: auroraTheme.borderRadius.xl,
  cardMinHeight: 120,

  // FAB positioning
  fabBottom: 20,
  fabRight: 20,

  // Header heights
  headerHeight: 60,
  headerWithSubtitleHeight: 80,
};

// ============================================================================
// Shared Base Styles
// ============================================================================

export const screenStyles = StyleSheet.create({
  // Container Styles
  container: {
    flex: 1,
  },

  safeContainer: {
    flex: 1,
  },

  // Content Layouts
  content: {
    flexGrow: 1,
    paddingHorizontal: screenLayout.screenPadding,
    paddingTop: auroraTheme.spacing.md,
    paddingBottom: auroraTheme.spacing.xl,
    gap: screenLayout.sectionGap,
  },

  contentCentered: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: screenLayout.screenPadding,
  },

  contentNoPadding: {
    flexGrow: 1,
  },

  // Section Styles
  section: {
    gap: auroraTheme.spacing.md,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
    marginBottom: auroraTheme.spacing.sm,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: auroraTheme.spacing.sm,
  },

  sectionTitle: {
    fontSize: auroraTheme.typography.fontSize.lg,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },

  sectionSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
    marginTop: 2,
  },

  // Card Styles
  card: {
    borderRadius: screenLayout.cardBorderRadius,
    padding: screenLayout.cardPadding,
    overflow: "hidden",
  },

  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },

  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: auroraTheme.spacing.md,
  },

  // Grid Item Styles (responsive)
  gridItem: {
    width: isWeb && isTablet ? "31%" : "48%",
    minHeight: screenLayout.cardMinHeight,
  },

  // Header Row Styles
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: screenLayout.screenPadding,
    paddingVertical: auroraTheme.spacing.md,
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: auroraTheme.spacing.md,
  },

  loadingText: {
    fontSize: auroraTheme.typography.fontSize.base,
    marginTop: auroraTheme.spacing.sm,
  },

  // Empty States
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: screenLayout.screenPadding,
    gap: auroraTheme.spacing.lg,
  },

  emptyIcon: {
    marginBottom: auroraTheme.spacing.md,
  },

  emptyTitle: {
    fontSize: auroraTheme.typography.fontSize.xl,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    textAlign: "center",
  },

  emptyMessage: {
    fontSize: auroraTheme.typography.fontSize.base,
    textAlign: "center",
    maxWidth: 280,
  },

  // Button Styles
  primaryButton: {
    borderRadius: auroraTheme.borderRadius.lg,
    paddingVertical: auroraTheme.spacing.md,
    paddingHorizontal: auroraTheme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },

  primaryButtonText: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: "#FFFFFF",
  },

  secondaryButton: {
    borderRadius: auroraTheme.borderRadius.lg,
    paddingVertical: auroraTheme.spacing.md,
    paddingHorizontal: auroraTheme.spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },

  secondaryButtonText: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
  },

  // Icon Button Styles
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: auroraTheme.borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },

  iconButtonSmall: {
    width: 36,
    height: 36,
    borderRadius: auroraTheme.borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
  },

  // FAB Styles
  fab: {
    position: "absolute",
    bottom: screenLayout.fabBottom,
    right: screenLayout.fabRight,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    ...auroraTheme.shadows.lg,
  },

  fabExtended: {
    position: "absolute",
    bottom: screenLayout.fabBottom,
    right: screenLayout.fabRight,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: auroraTheme.spacing.lg,
    paddingVertical: auroraTheme.spacing.md,
    borderRadius: auroraTheme.borderRadius.full,
    gap: auroraTheme.spacing.sm,
    ...auroraTheme.shadows.lg,
  },

  fabLabel: {
    fontSize: auroraTheme.typography.fontSize.md,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
    color: "#FFFFFF",
  },

  // Input Styles
  input: {
    borderRadius: auroraTheme.borderRadius.lg,
    paddingHorizontal: auroraTheme.spacing.md,
    paddingVertical: auroraTheme.spacing.md,
    fontSize: auroraTheme.typography.fontSize.base,
    borderWidth: 1.5,
  },

  inputWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: auroraTheme.borderRadius.lg,
    paddingHorizontal: auroraTheme.spacing.md,
    borderWidth: 1.5,
    gap: auroraTheme.spacing.sm,
  },

  // List Styles
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: auroraTheme.spacing.md,
    paddingHorizontal: auroraTheme.spacing.md,
    gap: auroraTheme.spacing.md,
  },

  listItemBordered: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: auroraTheme.spacing.md,
    paddingHorizontal: auroraTheme.spacing.md,
    borderBottomWidth: 1,
    gap: auroraTheme.spacing.md,
  },

  listItemContent: {
    flex: 1,
    gap: 2,
  },

  listItemTitle: {
    fontSize: auroraTheme.typography.fontSize.base,
    fontWeight: auroraTheme.typography.fontWeight.medium,
  },

  listItemSubtitle: {
    fontSize: auroraTheme.typography.fontSize.sm,
  },

  // Badge Styles
  badge: {
    paddingHorizontal: auroraTheme.spacing.sm,
    paddingVertical: 4,
    borderRadius: auroraTheme.borderRadius.sm,
  },

  badgeText: {
    fontSize: auroraTheme.typography.fontSize.xs,
    fontWeight: auroraTheme.typography.fontWeight.semibold,
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: auroraTheme.spacing.md,
  },

  // Row utilities
  row: {
    flexDirection: "row",
    alignItems: "center",
  },

  rowSpaceBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // Web-specific styles
  ...(isWeb && {
    webContainer: {
      maxWidth: screenLayout.maxContentWidth,
      alignSelf: "center",
      width: "100%",
    },
    webCard: {
      maxWidth: screenLayout.maxCardWidth,
    },
  }),
});

// ============================================================================
// Theme-Aware Style Generator
// ============================================================================

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textSecondary: string;
  accent: string;
  accentLight: string;
  border: string;
  error: string;
  success: string;
  warning: string;
}

export const createScreenStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    // Themed containers
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // Themed sections
    sectionTitle: {
      fontSize: auroraTheme.typography.fontSize.lg,
      fontWeight: auroraTheme.typography.fontWeight.semibold,
      color: colors.text,
      letterSpacing: 0.3,
    },

    sectionSubtitle: {
      fontSize: auroraTheme.typography.fontSize.sm,
      color: colors.textSecondary,
    },

    // Themed cards
    card: {
      borderRadius: screenLayout.cardBorderRadius,
      padding: screenLayout.cardPadding,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    cardElevated: {
      borderRadius: screenLayout.cardBorderRadius,
      padding: screenLayout.cardPadding,
      backgroundColor: colors.surfaceElevated,
      ...auroraTheme.shadows.md,
    },

    // Themed text
    textPrimary: {
      color: colors.text,
    },

    textSecondary: {
      color: colors.textSecondary,
    },

    textAccent: {
      color: colors.accent,
    },

    // Themed buttons
    primaryButton: {
      backgroundColor: colors.accent,
      borderRadius: auroraTheme.borderRadius.lg,
      paddingVertical: auroraTheme.spacing.md,
      paddingHorizontal: auroraTheme.spacing.xl,
      alignItems: "center",
      justifyContent: "center",
    },

    secondaryButton: {
      backgroundColor: "transparent",
      borderRadius: auroraTheme.borderRadius.lg,
      paddingVertical: auroraTheme.spacing.md,
      paddingHorizontal: auroraTheme.spacing.xl,
      borderWidth: 1.5,
      borderColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },

    // Themed inputs
    input: {
      backgroundColor: colors.surface,
      borderRadius: auroraTheme.borderRadius.lg,
      paddingHorizontal: auroraTheme.spacing.md,
      paddingVertical: auroraTheme.spacing.md,
      fontSize: auroraTheme.typography.fontSize.base,
      color: colors.text,
      borderWidth: 1.5,
      borderColor: colors.border,
    },

    inputFocused: {
      borderColor: colors.accent,
    },

    // Themed list items
    listItemBordered: {
      borderBottomColor: colors.border,
    },

    // Themed divider
    divider: {
      backgroundColor: colors.border,
    },

    // Status colors
    errorText: {
      color: colors.error,
    },

    successText: {
      color: colors.success,
    },

    warningText: {
      color: colors.warning,
    },

    // Loading text
    loadingText: {
      color: colors.textSecondary,
      fontSize: auroraTheme.typography.fontSize.base,
    },

    // Empty state
    emptyTitle: {
      color: colors.text,
      fontSize: auroraTheme.typography.fontSize.xl,
      fontWeight: auroraTheme.typography.fontWeight.semibold,
      textAlign: "center",
    },

    emptyMessage: {
      color: colors.textSecondary,
      fontSize: auroraTheme.typography.fontSize.base,
      textAlign: "center",
    },
  });

// ============================================================================
// Responsive Helpers
// ============================================================================

export const responsive = {
  isWeb,
  isTablet,
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,

  // Get responsive value
  select: <T>(options: { mobile: T; tablet?: T; web?: T }): T => {
    if (isWeb && options.web !== undefined) return options.web;
    if (isTablet && options.tablet !== undefined) return options.tablet;
    return options.mobile;
  },

  // Get responsive columns
  columns: (mobile: number, tablet?: number, web?: number): number => {
    if (isWeb && web !== undefined) return web;
    if (isTablet && tablet !== undefined) return tablet;
    return mobile;
  },

  // Get responsive width percentage
  gridItemWidth: (
    columns: number,
    gap: number = auroraTheme.spacing.md,
  ): string => {
    const totalGap = gap * (columns - 1);
    const itemWidth = (100 - (totalGap / SCREEN_WIDTH) * 100) / columns;
    return `${Math.floor(itemWidth)}%`;
  },
};

export default screenStyles;
