/**
 * Separator - Clean Divider Component
 *
 * Features:
 * - Horizontal and vertical orientations
 * - Customizable thickness, color, spacing
 * - Optional text label in center
 *
 * Inspired by react-native-separator-ui patterns
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, FontSizes, FontWeights } from '@/theme/uiConstants';

export type SeparatorOrientation = 'horizontal' | 'vertical';

export interface SeparatorProps {
  /** Orientation of the separator */
  orientation?: SeparatorOrientation;
  /** Thickness of the line (default: 1) */
  thickness?: number;
  /** Custom color (uses theme border by default) */
  color?: string;
  /** Spacing above and below (horizontal) or left/right (vertical) */
  spacing?: number;
  /** Length as percentage or fixed value (undefined = full) */
  length?: number | `${number}%`;
  /** Optional text label in the center */
  label?: string;
  /** Label style override */
  labelStyle?: StyleProp<TextStyle>;
  /** Container style override */
  style?: StyleProp<ViewStyle>;
}

/**
 * Separator - Visual divider for content sections
 *
 * @example
 * // Basic horizontal separator
 * <Separator />
 *
 * @example
 * // Vertical separator
 * <Separator orientation="vertical" />
 *
 * @example
 * // With label
 * <Separator label="OR" />
 *
 * @example
 * // Custom styling
 * <Separator
 *   thickness={2}
 *   color="#e0e0e0"
 *   spacing={24}
 *   length="80%"
 * />
 */
export const Separator: React.FC<SeparatorProps> = ({
  orientation = 'horizontal',
  thickness = 1,
  color,
  spacing = Spacing.md,
  length,
  label,
  labelStyle,
  style,
}) => {
  const theme = useTheme();
  const lineColor = color || theme.colors.border || 'rgba(0, 0, 0, 0.1)';

  const isHorizontal = orientation === 'horizontal';

  // Container style
  const containerStyle: ViewStyle = isHorizontal
    ? {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing,
        width: length || '100%',
        alignSelf: length ? 'center' : undefined,
      }
    : {
        flexDirection: 'column',
        alignItems: 'center',
        marginHorizontal: spacing,
        height: length || '100%',
        alignSelf: length ? 'center' : undefined,
      };

  // Line style
  const lineStyle: ViewStyle = isHorizontal
    ? {
        flex: 1,
        height: thickness,
        backgroundColor: lineColor,
      }
    : {
        flex: 1,
        width: thickness,
        backgroundColor: lineColor,
      };

  // If no label, just render a simple line
  if (!label) {
    return <View style={[containerStyle, style, lineStyle]} />;
  }

  // With label - render line, text, line
  return (
    <View style={[containerStyle, style]}>
      <View style={lineStyle} />
        <Text
          style={[
            styles.label,
            { color: theme.textSecondary || '#666' },
            labelStyle,
          ]}
        >
          {label}
        </Text>
      <View style={lineStyle} />
    </View>
  );
};

/**
 * Presets for common separator patterns
 */
export const SeparatorPresets = {
  /** Subtle thin separator */
  subtle: {
    thickness: 0.5,
    spacing: Spacing.sm,
  },
  /** Standard section divider */
  section: {
    thickness: 1,
    spacing: Spacing.lg,
  },
  /** Bold separator for major sections */
  bold: {
    thickness: 2,
    spacing: Spacing.xl,
  },
  /** Inset separator (like in lists) */
  inset: {
    thickness: 1,
    spacing: Spacing.sm,
    length: '90%' as const,
  },
};

const styles = StyleSheet.create({
  label: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginHorizontal: Spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

export default Separator;
