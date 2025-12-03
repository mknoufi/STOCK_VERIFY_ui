/**
 * Modern Button Component - Enhanced UI/UX
 * Features:
 * - Multiple variants (primary, secondary, outline, ghost, danger)
 * - Size options (small, medium, large)
 * - Smooth animations and micro-interactions
 * - Loading states with spinners
 * - Icon support (left/right)
 * - Full accessibility support
 * - Gradient support
 * - Glassmorphism variant
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { modernColors, modernTypography, modernSpacing, modernBorderRadius, modernShadows, modernAnimations } from '../styles/modernDesignSystem';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass' | 'gradient';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ModernButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  gradientColors?: string[];
  testID?: string;
  accessibilityLabel?: string;
}

export const ModernButton: React.FC<ModernButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  gradientColors,
  testID,
  accessibilityLabel,
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  // Press handlers with animations
  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(modernAnimations.scale.pressed, {
        damping: modernAnimations.easing.spring.damping,
        stiffness: modernAnimations.easing.spring.stiffness,
      });
      opacity.value = withTiming(modernAnimations.opacity.pressed, {
        duration: modernAnimations.duration.fast,
      });
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, {
        damping: modernAnimations.easing.spring.damping,
        stiffness: modernAnimations.easing.spring.stiffness,
      });
      opacity.value = withTiming(1, {
        duration: modernAnimations.duration.fast,
      });
    }
  };

  // Get button styles based on variant and size
  const getButtonStyles = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: modernBorderRadius.button,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: modernSpacing.sm,
      minHeight: getSizeConfig().height,
      paddingHorizontal: getSizeConfig().paddingHorizontal,
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: modernAnimations.opacity.disabled }),
    };

    // Variant-specific styles
    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: modernColors.primary[500],
        ...modernShadows.sm,
      },
      secondary: {
        backgroundColor: modernColors.secondary[500],
        ...modernShadows.sm,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: modernColors.primary[500],
      },
      ghost: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: modernColors.error.main,
        ...modernShadows.sm,
      },
      glass: {
        backgroundColor: 'transparent',
      },
      gradient: {
        backgroundColor: 'transparent',
      },
    };

    return {
      ...baseStyle,
      ...variantStyles[variant],
    };
  };

  // Get text styles
  const getTextStyles = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...getSizeConfig().typography,
      fontWeight: '600' as const,
    };

    const variantTextColors: Record<ButtonVariant, string> = {
      primary: '#FFFFFF',
      secondary: '#FFFFFF',
      outline: modernColors.primary[500],
      ghost: modernColors.primary[500],
      danger: '#FFFFFF',
      glass: modernColors.text.primary,
      gradient: '#FFFFFF',
    };

    return {
      ...baseStyle,
      color: variantTextColors[variant],
    };
  };

  // Get icon color
  const getIconColor = (): string => {
    if (variant === 'outline' || variant === 'ghost') {
      return modernColors.primary[500];
    }
    if (variant === 'glass') {
      return modernColors.text.primary;
    }
    return '#FFFFFF';
  };

  // Size configuration
  function getSizeConfig() {
    const configs = {
      small: {
        height: 36,
        paddingHorizontal: modernSpacing.md,
        typography: modernTypography.button.small,
        iconSize: 16,
      },
      medium: {
        height: 44,
        paddingHorizontal: modernSpacing.lg,
        typography: modernTypography.button.medium,
        iconSize: 20,
      },
      large: {
        height: 56,
        paddingHorizontal: modernSpacing.xl,
        typography: modernTypography.button.large,
        iconSize: 24,
      },
    };
    return configs[size];
  }

  const sizeConfig = getSizeConfig();

  // Render icon
  const renderIcon = () => {
    if (!icon || loading) return null;

    return (
      <Ionicons
        name={icon}
        size={sizeConfig.iconSize}
        color={getIconColor()}
      />
    );
  };

  // Render button content
  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? modernColors.primary[500] : '#FFFFFF'}
        />
      );
    }

    return (
      <>
        {iconPosition === 'left' && renderIcon()}
        <Text style={[getTextStyles(), textStyle]}>{title}</Text>
        {iconPosition === 'right' && renderIcon()}
      </>
    );
  };

  // Render button based on variant
  const renderButton = () => {
    const buttonStyle = [getButtonStyles(), style];

    if (variant === 'gradient') {
      const colors = gradientColors || modernColors.gradients.primary;
      return (
        <AnimatedTouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={1}
          style={[animatedStyle, buttonStyle]}
          testID={testID}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading }}
        >
          <LinearGradient
            colors={colors as unknown as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.gradient}
          >
            {renderContent()}
          </LinearGradient>
        </AnimatedTouchableOpacity>
      );
    }

    if (variant === 'glass') {
      return (
        <AnimatedTouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={1}
          style={[animatedStyle, buttonStyle]}
          testID={testID}
          accessibilityLabel={accessibilityLabel || title}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading }}
        >
          <BlurView intensity={20} tint="dark" style={styles.blur}>
            {renderContent()}
          </BlurView>
        </AnimatedTouchableOpacity>
      );
    }

    return (
      <AnimatedTouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[animatedStyle, buttonStyle]}
        testID={testID}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading }}
      >
        {renderContent()}
      </AnimatedTouchableOpacity>
    );
  };

  return renderButton();
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    borderRadius: modernBorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: modernSpacing.sm,
    minHeight: '100%',
    width: '100%',
  },
  blur: {
    flex: 1,
    borderRadius: modernBorderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: modernSpacing.sm,
    minHeight: '100%',
    width: '100%',
    paddingHorizontal: modernSpacing.lg,
    paddingVertical: modernSpacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
});

export default ModernButton;
