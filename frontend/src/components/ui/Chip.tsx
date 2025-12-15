/**
 * Chip Component
 * Interactive tags with optional remove functionality
 * Phase 2: Design System - Core Components
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colorPalette, spacing, typography, borderRadius } from '@/theme/designTokens';

export type ChipVariant = 'filled' | 'outlined';
export type ChipSize = 'sm' | 'md' | 'lg';

interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  onPress?: () => void;
  onRemove?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  selected?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const sizeStyles: Record<ChipSize, { padding: number; fontSize: number; iconSize: number }> = {
  sm: { padding: spacing.xs, fontSize: typography.fontSize.xs, iconSize: 14 },
  md: { padding: spacing.sm, fontSize: typography.fontSize.sm, iconSize: 16 },
  lg: { padding: spacing.md, fontSize: typography.fontSize.base, iconSize: 18 },
};

export const Chip: React.FC<ChipProps> = ({
  label,
  variant = 'filled',
  size = 'md',
  onPress,
  onRemove,
  icon,
  selected = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const sizes = sizeStyles[size];
  const isInteractive = !disabled && (onPress || onRemove);

  const getColors = () => {
    if (disabled) {
      return {
        bg: colorPalette.neutral[200],
        text: colorPalette.neutral[400],
        border: colorPalette.neutral[300],
      };
    }

    if (variant === 'outlined') {
      return {
        bg: 'transparent',
        text: selected ? colorPalette.primary[600] : colorPalette.neutral[700],
        border: selected ? colorPalette.primary[500] : colorPalette.neutral[400],
      };
    }

    return {
      bg: selected ? colorPalette.primary[500] : colorPalette.neutral[200],
      text: selected ? colorPalette.neutral[0] : colorPalette.neutral[800],
      border: 'transparent',
    };
  };

  const colors = getColors();

  const Container = isInteractive ? TouchableOpacity : View;

  return (
    <Container
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.chip,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          borderWidth: variant === 'outlined' ? 1 : 0,
          paddingHorizontal: sizes.padding * 1.5,
          paddingVertical: sizes.padding,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={sizes.iconSize}
          color={colors.text}
          style={styles.icon}
        />
      )}
      
      <Text
        style={[
          styles.text,
          {
            color: colors.text,
            fontSize: sizes.fontSize,
            fontWeight: typography.fontWeight.medium,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>

      {onRemove && !disabled && (
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.removeButton}
        >
          <Ionicons
            name="close-circle"
            size={sizes.iconSize}
            color={colors.text}
          />
        </TouchableOpacity>
      )}
    </Container>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    textAlign: 'center',
  },
  icon: {
    marginRight: spacing.xs,
  },
  removeButton: {
    marginLeft: spacing.xs,
  },
});