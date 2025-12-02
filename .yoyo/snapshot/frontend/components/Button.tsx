/**
 * Button Component - Enhanced button with variants
 */

import React, { useRef, useEffect } from 'react';
import {
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  Platform,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { flags } from '../constants/flags';

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
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
}) => {
  const theme = useTheme();
  
  // Reanimated values for press animation
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Animated style for press effect
  const animatedStyle = useAnimatedStyle(() => {
    if (!flags.enableAnimations) {
      return {};
    }
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (flags.enableAnimations && !disabled && !loading) {
      scale.value = withSpring(0.95, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(0.8, { duration: 100 });
    }
  };

  const handlePressOut = () => {
    if (flags.enableAnimations && !disabled && !loading) {
      scale.value = withSpring(1, {
        damping: 15,
        stiffness: 300,
      });
      opacity.value = withTiming(1, { duration: 100 });
    }
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    };

    // Size styles
    const sizeStyles = {
      small: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
      medium: { paddingVertical: 12, paddingHorizontal: 24, minHeight: 44 },
      large: { paddingVertical: 16, paddingHorizontal: 32, minHeight: 52 },
    };

    // Variant styles
    const variantStyles: Record<string, ViewStyle> = {
      primary: {
        backgroundColor: theme.colors.primary,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
      },
      text: {
        backgroundColor: 'transparent',
      },
      danger: {
        backgroundColor: theme.colors.error,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
      ...(disabled && { opacity: 0.5 }),
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
    };

    const sizeStyles = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles: Record<string, TextStyle> = {
      primary: { color: '#FFFFFF' },
      secondary: { color: '#FFFFFF' },
      outline: { color: theme.colors.primary },
      text: { color: theme.colors.primary },
      danger: { color: '#FFFFFF' },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getIconColor = (): string => {
    if (variant === 'outline' || variant === 'text') {
      return theme.colors.primary;
    }
    return '#FFFFFF';
  };

  const buttonStyle = Platform.OS === 'web'
    ? {
      ...getButtonStyle(),
      ...style,
      WebkitUserSelect: 'none',
      userSelect: 'none',
      WebkitTouchCallout: 'none',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
    } as any
    : [getButtonStyle(), style];

  const buttonRef = useRef<any>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && buttonRef.current) {
      const element = buttonRef.current;

      // Only prevent text selection, don't block clicks
      const handleSelectStart = (e: Event) => {
        e.preventDefault();
      };

      const handleMouseUp = (e: MouseEvent) => {
        // Clear selection on double-click, but don't prevent the click
        if (e.detail === 2 && window.getSelection) {
          const selection = window.getSelection();
          if (selection && selection.toString().length > 0) {
            selection.removeAllRanges();
          }
        }
      };

      element.addEventListener('selectstart', handleSelectStart, true);
      element.addEventListener('mouseup', handleMouseUp, false);

      return () => {
        element.removeEventListener('selectstart', handleSelectStart, true);
        element.removeEventListener('mouseup', handleMouseUp, false);
      };
    }
    return undefined;
  }, [disabled, loading]);

  return (
    <AnimatedTouchableOpacity
      ref={buttonRef}
      style={[buttonStyle, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={flags.enableAnimations ? 1 : 0.7}
      // Web-specific props as fallback
      {...(Platform.OS === 'web' ? {
        onClick: (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && !loading) {
            onPress();
          }
        },
        onMouseDown: (e: any) => {
          e.preventDefault();
          e.stopPropagation();
        },
        onDoubleClick: (e: any) => {
          e.preventDefault();
          e.stopPropagation();
          if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
          }
        },
        onContextMenu: (e: any) => {
          e.preventDefault();
        },
        onSelectStart: (e: any) => {
          e.preventDefault();
        },
      } : {})}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'text' ? theme.colors.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : size === 'medium' ? 20 : 24}
              color={getIconColor()}
            />
          )}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons
              name={icon}
              size={size === 'small' ? 16 : size === 'medium' ? 20 : 24}
              color={getIconColor()}
            />
          )}
        </>
      )}
    </AnimatedTouchableOpacity>
  );
};
