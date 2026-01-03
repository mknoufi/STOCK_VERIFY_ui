/**
 * EnhancedButton - Material Design Inspired Button Component
 *
 * Features:
 * - Types: solid, outline, text
 * - Icon positions: left, right, top, bottom
 * - Raised/shadow effect
 * - Loading states
 * - Size variants
 *
 * Inspired by react-native-design-kit Button patterns
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MyPressable, MyPressableProps } from './MyPressable';
import { useThemeContext } from '@/context/ThemeContext';
import {
  ComponentSizes,
  BorderRadius,
  FontSizes,
  FontWeights,
  Spacing,
  Shadows,
  Opacity,
} from '@/theme/uiConstants';

export type ButtonType = 'solid' | 'outline' | 'text' | 'gradient';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type IconPosition = 'left' | 'right' | 'top' | 'bottom';

export interface EnhancedButtonProps
  extends Omit<MyPressableProps, 'children' | 'style'> {
  /** Button label text */
  title: string;
  /** Button type/variant */
  type?: ButtonType;
  /** Button size */
  size?: ButtonSize;
  /** Icon name from Ionicons */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon position relative to text */
  iconPosition?: IconPosition;
  /** Custom icon size (auto-calculated by default) */
  iconSize?: number;
  /** Whether button should have raised shadow */
  raised?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Custom colors */
  color?: string;
  /** Text color override */
  textColor?: string;
  /** Gradient colors (for gradient type) */
  gradientColors?: readonly [string, string, ...string[]];
  /** Container style */
  style?: StyleProp<ViewStyle>;
  /** Text style override */
  textStyle?: StyleProp<TextStyle>;
}

/**
 * EnhancedButton - Beautiful button with multiple variants
 *
 * @example
 * // Solid button
 * <EnhancedButton title="Continue" type="solid" />
 *
 * @example
 * // Outline with icon
 * <EnhancedButton
 *   title="Scan Barcode"
 *   type="outline"
 *   icon="barcode-outline"
 *   iconPosition="left"
 * />
 *
 * @example
 * // Gradient button
 * <EnhancedButton
 *   title="Premium Action"
 *   type="gradient"
 *   gradientColors={['#667eea', '#764ba2']}
 * />
 */
export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  title,
  type = 'solid',
  size = 'md',
  icon,
  iconPosition = 'left',
  iconSize,
  raised = false,
  loading = false,
  fullWidth = false,
  color,
  textColor,
  gradientColors,
  style,
  textStyle,
  disabled,
  ...rest
}) => {
  const { themeLegacy } = useThemeContext();

  // Determine colors based on type
  const primaryColor = color || themeLegacy.colors.primary;
  const resolvedTextColor =
    textColor ||
    (type === 'solid' || type === 'gradient'
      ? '#FFFFFF'
      : primaryColor);

  // Size configurations
  const sizeConfig = {
    sm: {
      height: ComponentSizes.button.sm,
      paddingHorizontal: Spacing.md,
      fontSize: FontSizes.sm,
      iconSize: ComponentSizes.icon.sm,
      borderRadius: BorderRadius.sm,
    },
    md: {
      height: ComponentSizes.button.md,
      paddingHorizontal: Spacing.base,
      fontSize: FontSizes.md,
      iconSize: ComponentSizes.icon.md,
      borderRadius: BorderRadius.md,
    },
    lg: {
      height: ComponentSizes.button.lg,
      paddingHorizontal: Spacing.xl,
      fontSize: FontSizes.lg,
      iconSize: ComponentSizes.icon.lg,
      borderRadius: BorderRadius.lg,
    },
    xl: {
      height: ComponentSizes.button.xl,
      paddingHorizontal: Spacing.xxl,
      fontSize: FontSizes.xl,
      iconSize: ComponentSizes.icon.xl,
      borderRadius: BorderRadius.xl,
    },
  };

  const config = sizeConfig[size];
  const finalIconSize = iconSize || config.iconSize;
  const isVertical = iconPosition === 'top' || iconPosition === 'bottom';

  // Build container style
  const containerStyle: ViewStyle = {
    minHeight: config.height,
    paddingHorizontal: config.paddingHorizontal,
    paddingVertical: Spacing.sm,
    borderRadius: config.borderRadius,
    flexDirection: isVertical ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? Opacity.disabled : 1,
    ...(fullWidth && { width: '100%' }),
    ...(raised && !disabled && Shadows.raised),
  };

  // Type-specific styles
  const typeStyles: ViewStyle =
    type === 'solid'
      ? { backgroundColor: primaryColor }
      : type === 'outline'
        ? {
            backgroundColor: 'transparent',
            borderWidth: 1.5,
            borderColor: primaryColor,
          }
        : { backgroundColor: 'transparent' };

  // Icon spacing
  const iconSpacing = icon && title ? Spacing.sm : 0;
  const iconMargin: ViewStyle =
    iconPosition === 'left'
      ? { marginRight: iconSpacing }
      : iconPosition === 'right'
        ? { marginLeft: iconSpacing }
        : iconPosition === 'top'
          ? { marginBottom: iconSpacing }
          : { marginTop: iconSpacing };

  // Render icon
  const renderIcon = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size={size === 'sm' ? 'small' : 'small'}
          color={resolvedTextColor}
          style={iconMargin}
        />
      );
    }
    if (!icon) return null;
    return (
      <Ionicons
        name={icon}
        size={finalIconSize}
        color={resolvedTextColor}
        style={iconMargin}
      />
    );
  };

  // Content order based on icon position
  const renderContent = () => {
    const textElement = (
      <Text
        style={[
          styles.text,
          { fontSize: config.fontSize, color: resolvedTextColor },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
    );

    const iconElement = renderIcon();

    if (iconPosition === 'right' || iconPosition === 'bottom') {
      return (
        <>
          {textElement}
          {iconElement}
        </>
      );
    }
    return (
      <>
        {iconElement}
        {textElement}
      </>
    );
  };

  // Gradient variant
  if (type === 'gradient') {
    const defaultGradient: readonly [string, string] = [
      themeLegacy.colors.primary,
      themeLegacy.colors.accent || themeLegacy.colors.primary,
    ];
    const colors = gradientColors || defaultGradient;

    return (
      <MyPressable
        disabled={disabled || loading}
        feedbackType="both"
        scaleValue={0.97}
        style={[style, fullWidth && styles.fullWidth]}
        {...rest}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[containerStyle, raised && Shadows.raised]}
        >
          {renderContent()}
        </LinearGradient>
      </MyPressable>
    );
  }

  return (
    <MyPressable
      disabled={disabled || loading}
      feedbackType="both"
      scaleValue={0.97}
      style={[containerStyle, typeStyles, style]}
      {...rest}
    >
      {renderContent()}
    </MyPressable>
  );
};

const styles = StyleSheet.create({
  text: {
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});

export default EnhancedButton;
