/**
 * UnifiedView Component
 * View component that uses unified theme tokens
 *
 * Features:
 * - Background color from theme
 * - Padding/margin from spacing tokens
 * - Border radius from radius tokens
 * - Shadow from shadow tokens
 * - Dark mode aware
 */

import React from "react";
import {
  View,
  ViewStyle,
  StyleProp,
  StyleSheet,
  ViewProps,
} from "react-native";
import {
  colors,
  spacing,
  radius,
  shadows,
  semanticColors,
} from "../../theme/unified";
import type { SpacingKey } from "../../theme/unified";
import type { RadiusKey } from "../../theme/unified";
import type { ShadowKey } from "../../theme/unified";

// ==========================================
// TYPES
// ==========================================
export type BackgroundColor =
  | "default"
  | "paper"
  | "elevated"
  | "card"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "transparent";

export interface UnifiedViewProps extends ViewProps {
  /** Background color preset */
  background?: BackgroundColor;
  /** Padding from spacing tokens */
  padding?: SpacingKey;
  /** Horizontal padding */
  paddingHorizontal?: SpacingKey;
  /** Vertical padding */
  paddingVertical?: SpacingKey;
  /** Margin from spacing tokens */
  margin?: SpacingKey;
  /** Border radius from radius tokens */
  borderRadius?: RadiusKey;
  /** Shadow elevation */
  shadow?: ShadowKey;
  /** Center children */
  center?: boolean;
  /** Flex 1 to fill space */
  flex?: boolean;
  /** Row layout */
  row?: boolean;
  /** Gap between children */
  gap?: SpacingKey;
  /** Additional styles */
  style?: StyleProp<ViewStyle>;
  /** Children */
  children?: React.ReactNode;
}

// ==========================================
// BACKGROUND COLOR MAPPING
// ==========================================
const backgroundMap: Record<BackgroundColor, string> = {
  default: semanticColors.background.default,
  paper: semanticColors.background.paper,
  elevated: semanticColors.background.elevated,
  card: semanticColors.background.card,
  primary: colors.primary[50],
  secondary: colors.secondary[50],
  success: colors.success[50],
  warning: colors.warning[50],
  error: colors.error[50],
  info: colors.info[50],
  transparent: "transparent",
};

// ==========================================
// COMPONENT
// ==========================================
export const UnifiedView: React.FC<UnifiedViewProps> = ({
  background,
  padding,
  paddingHorizontal,
  paddingVertical,
  margin,
  borderRadius,
  shadow,
  center,
  flex,
  row,
  gap,
  style,
  children,
  ...props
}) => {
  const combinedStyle: StyleProp<ViewStyle> = [
    // Background
    background && { backgroundColor: backgroundMap[background] },
    // Padding
    padding !== undefined && { padding: spacing[padding] },
    paddingHorizontal !== undefined && {
      paddingHorizontal: spacing[paddingHorizontal],
    },
    paddingVertical !== undefined && {
      paddingVertical: spacing[paddingVertical],
    },
    // Margin
    margin !== undefined && { margin: spacing[margin] },
    // Border radius
    borderRadius !== undefined && { borderRadius: radius[borderRadius] },
    // Shadow
    shadow !== undefined && shadows[shadow],
    // Layout
    center && styles.center,
    flex && styles.flex,
    row && styles.row,
    gap !== undefined && { gap: spacing[gap] },
    // Custom styles
    style,
  ].filter(Boolean);

  return (
    <View style={combinedStyle} {...props}>
      {children}
    </View>
  );
};

// ==========================================
// STYLES
// ==========================================
const styles = StyleSheet.create({
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  flex: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
  },
});

export default UnifiedView;
