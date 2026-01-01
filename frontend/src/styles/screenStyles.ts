/**
 * Shared Screen Styles - Unified Layout System v2.0 (Responsive)
 *
 * Provides consistent styling patterns across all screens.
 * Import these hooks in your screens for uniformity.
 *
 * Usage:
 * import { useScreenStyles, useThemeScreenStyles } from '@/styles/screenStyles';
 */

import { StyleSheet, useWindowDimensions, Platform } from "react-native";
import { useMemo } from "react";
import {
  modernSpacing,
  modernBorderRadius,
  modernTypography,
  modernShadows,
} from "./modernDesignSystem";

// ============================================================================
// Screen Layout Constants (Static)
// ============================================================================

export const screenLayoutConstants = {
  // Content width constraints
  maxContentWidth: 1200,
  maxCardWidth: 600,

  // Padding values
  screenPadding: modernSpacing.xl,
  sectionPadding: modernSpacing.lg,
  cardPadding: modernSpacing.lg,

  // Spacing between sections
  sectionGap: modernSpacing.xl,

  // Card dimensions
  cardBorderRadius: modernBorderRadius.card,
  cardMinHeight: 120,

  // FAB positioning
  fabBottom: 20,
  fabRight: 20,

  // Header heights
  headerHeight: 60,
  headerWithSubtitleHeight: 80,
};

// ============================================================================
// Responsive Hooks
// ============================================================================

export const useScreenLayout = () => {
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isTablet = width > 768;

  return {
    width,
    height,
    isWeb,
    isTablet,
    gridColumns: isWeb && isTablet ? 3 : 2,
    ...screenLayoutConstants,
  };
};

export const useScreenStyles = () => {
  const { isWeb, isTablet } = useScreenLayout();

  return useMemo(
    () =>
      StyleSheet.create({
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
          paddingHorizontal: screenLayoutConstants.screenPadding,
          paddingTop: modernSpacing.lg,
          paddingBottom: modernSpacing.xl,
          gap: screenLayoutConstants.sectionGap,
        },

        contentCentered: {
          flexGrow: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: screenLayoutConstants.screenPadding,
        },

        contentNoPadding: {
          flexGrow: 1,
        },

        // Section Styles
        section: {
          gap: modernSpacing.md,
        },

        sectionHeader: {
          flexDirection: "row",
          alignItems: "center",
          gap: modernSpacing.sm,
          marginBottom: modernSpacing.sm,
        },

        sectionHeaderRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: modernSpacing.sm,
        },

        sectionTitle: {
          fontSize: modernTypography.h2.fontSize,
          fontWeight: "600",
          letterSpacing: 0.3,
        },

        sectionSubtitle: {
          fontSize: modernTypography.body.small.fontSize,
          marginTop: 2,
        },

        // Card Styles
        card: {
          borderRadius: screenLayoutConstants.cardBorderRadius,
          padding: screenLayoutConstants.cardPadding,
          overflow: "hidden",
        },

        cardRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: modernSpacing.md,
        },

        cardGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: modernSpacing.md,
        },

        // Grid Item Styles (responsive)
        gridItem: {
          width: isWeb && isTablet ? "31%" : "48%",
          minHeight: screenLayoutConstants.cardMinHeight,
        },

        // Header Row Styles
        headerRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: screenLayoutConstants.screenPadding,
          paddingVertical: modernSpacing.md,
        },

        // Loading States
        loadingContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: modernSpacing.md,
        },

        loadingText: {
          fontSize: modernTypography.body.medium.fontSize,
          marginTop: modernSpacing.sm,
        },

        // Empty States
        emptyContainer: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: screenLayoutConstants.screenPadding,
          gap: modernSpacing.lg,
        },

        emptyIcon: {
          marginBottom: modernSpacing.md,
        },

        emptyTitle: {
          fontSize: modernTypography.h1.fontSize,
          fontWeight: "600",
          textAlign: "center",
        },

        emptyMessage: {
          fontSize: modernTypography.body.medium.fontSize,
          textAlign: "center",
          maxWidth: 280,
        },

        // Button Styles
        primaryButton: {
          borderRadius: modernBorderRadius.button,
          paddingVertical: modernSpacing.md,
          paddingHorizontal: modernSpacing.xl,
          alignItems: "center",
          justifyContent: "center",
        },

        primaryButtonText: {
          fontSize: modernTypography.body.medium.fontSize,
          fontWeight: "600",
          color: "#FFFFFF",
        },

        secondaryButton: {
          borderRadius: modernBorderRadius.button,
          paddingVertical: modernSpacing.md,
          paddingHorizontal: modernSpacing.xl,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1.5,
        },

        secondaryButtonText: {
          fontSize: modernTypography.body.medium.fontSize,
          fontWeight: "600",
        },

        // Icon Button Styles
        iconButton: {
          width: 44,
          height: 44,
          borderRadius: modernBorderRadius.full,
          justifyContent: "center",
          alignItems: "center",
        },

        iconButtonSmall: {
          width: 36,
          height: 36,
          borderRadius: modernBorderRadius.full,
          justifyContent: "center",
          alignItems: "center",
        },

        // FAB Styles
        fab: {
          position: "absolute",
          bottom: screenLayoutConstants.fabBottom,
          right: screenLayoutConstants.fabRight,
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: "center",
          alignItems: "center",
          ...modernShadows.lg,
        },

        fabExtended: {
          position: "absolute",
          bottom: screenLayoutConstants.fabBottom,
          right: screenLayoutConstants.fabRight,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: modernSpacing.lg,
          paddingVertical: modernSpacing.md,
          borderRadius: modernBorderRadius.full,
          gap: modernSpacing.sm,
          ...modernShadows.lg,
        },

        fabLabel: {
          fontSize: modernTypography.body.medium.fontSize,
          fontWeight: "600",
          color: "#FFFFFF",
        },

        // Input Styles
        input: {
          borderRadius: modernBorderRadius.input,
          paddingHorizontal: modernSpacing.md,
          paddingVertical: modernSpacing.md,
          fontSize: modernTypography.body.medium.fontSize,
          borderWidth: 1.5,
        },

        inputWithIcon: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: modernBorderRadius.input,
          paddingHorizontal: modernSpacing.md,
          borderWidth: 1.5,
          gap: modernSpacing.sm,
        },

        // List Styles
        listItem: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: modernSpacing.md,
          paddingHorizontal: modernSpacing.md,
          gap: modernSpacing.md,
        },

        listItemBordered: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: modernSpacing.md,
          paddingHorizontal: modernSpacing.md,
          borderBottomWidth: 1,
          gap: modernSpacing.md,
        },

        listItemContent: {
          flex: 1,
          gap: 2,
        },

        listItemTitle: {
          fontSize: modernTypography.body.medium.fontSize,
          fontWeight: "500",
        },

        listItemSubtitle: {
          fontSize: modernTypography.body.small.fontSize,
        },

        // Badge Styles
        badge: {
          paddingHorizontal: modernSpacing.sm,
          paddingVertical: 4,
          borderRadius: modernBorderRadius.sm,
        },

        badgeText: {
          fontSize: modernTypography.body.small.fontSize,
          fontWeight: "600",
        },

        // Divider
        divider: {
          height: 1,
          marginVertical: modernSpacing.md,
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
            maxWidth: screenLayoutConstants.maxContentWidth,
            alignSelf: "center",
            width: "100%",
          },
          webCard: {
            maxWidth: screenLayoutConstants.maxCardWidth,
          },
        }),
      }),
    [isWeb, isTablet],
  );
};

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

export const useThemeScreenStyles = (colors: ThemeColors) => {
  return useMemo(
    () =>
      StyleSheet.create({
        // Themed containers
        container: {
          flex: 1,
          backgroundColor: colors.background,
        },

        // Themed sections
        sectionTitle: {
          fontSize: modernTypography.h2.fontSize,
          fontWeight: "600",
          color: colors.text,
          letterSpacing: 0.3,
        },

        sectionSubtitle: {
          fontSize: modernTypography.body.small.fontSize,
          color: colors.textSecondary,
        },

        // Themed cards
        card: {
          borderRadius: screenLayoutConstants.cardBorderRadius,
          padding: screenLayoutConstants.cardPadding,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },

        cardElevated: {
          borderRadius: screenLayoutConstants.cardBorderRadius,
          padding: screenLayoutConstants.cardPadding,
          backgroundColor: colors.surfaceElevated,
          ...modernShadows.md,
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
          borderRadius: modernBorderRadius.button,
          paddingVertical: modernSpacing.md,
          paddingHorizontal: modernSpacing.xl,
          alignItems: "center",
          justifyContent: "center",
        },

        secondaryButton: {
          backgroundColor: "transparent",
          borderRadius: modernBorderRadius.button,
          paddingVertical: modernSpacing.md,
          paddingHorizontal: modernSpacing.xl,
          borderWidth: 1.5,
          borderColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
        },

        // Themed inputs
        input: {
          backgroundColor: colors.surface,
          borderRadius: modernBorderRadius.input,
          paddingHorizontal: modernSpacing.md,
          paddingVertical: modernSpacing.md,
          fontSize: modernTypography.body.medium.fontSize,
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
          fontSize: modernTypography.body.medium.fontSize,
        },

        // Empty state
        emptyTitle: {
          color: colors.text,
          fontSize: modernTypography.h1.fontSize,
          fontWeight: "600",
          textAlign: "center",
        },

        emptyMessage: {
          color: colors.textSecondary,
          fontSize: modernTypography.body.medium.fontSize,
          textAlign: "center",
        },
      }),
    [colors],
  );
};

// ============================================================================
// Responsive Helpers
// ============================================================================

export const useResponsiveHelpers = () => {
  const { width, height, isWeb, isTablet } = useScreenLayout();

  return useMemo(
    () => ({
      isWeb,
      isTablet,
      screenWidth: width,
      screenHeight: height,

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
        gap: number = modernSpacing.md,
      ): string => {
        const totalGap = gap * (columns - 1);
        const itemWidth = (100 - (totalGap / width) * 100) / columns;
        return `${Math.floor(itemWidth)}%`;
      },
    }),
    [width, height, isWeb, isTablet],
  );
};
