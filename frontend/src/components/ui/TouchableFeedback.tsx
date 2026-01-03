/**
 * TouchableFeedback Component
 * Platform-aware touch feedback based on Aashu-Dubey/React-Native-UI-Templates
 *
 * Features:
 * - Android: Material ripple effect
 * - iOS: Opacity fade on press
 * - Accessibility: Proper hit slop and feedback
 *
 * Usage:
 * <TouchableFeedback onPress={handlePress}>
 *   <Text>Click me</Text>
 * </TouchableFeedback>
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  Platform,
} from 'react-native';
import { hitSlop as hitSlopPresets, touchTargets } from '../../theme/unified';

// ==========================================
// TYPES
// ==========================================
export interface TouchableFeedbackProps extends Omit<PressableProps, 'style'> {
  /** Content to render inside the touchable */
  children: React.ReactNode;
  /** Style for the container */
  style?: StyleProp<ViewStyle>;
  /** Opacity when pressed on iOS (0-1) */
  touchOpacity?: number;
  /** Android ripple color */
  rippleColor?: string;
  /** Whether ripple is borderless (Android only) */
  rippleBorderless?: boolean;
  /** Hit slop preset: 'small' | 'medium' | 'large' */
  hitSlopSize?: 'small' | 'medium' | 'large';
  /** Whether the touchable is disabled */
  disabled?: boolean;
  /** Minimum touch target size (for accessibility) */
  minTouchTarget?: boolean;
}

// ==========================================
// CONSTANTS
// ==========================================
const isAndroid = Platform.OS === 'android';
const DEFAULT_TOUCH_OPACITY = 0.7;
const DEFAULT_RIPPLE_COLOR = 'rgba(0, 0, 0, 0.1)';

// ==========================================
// COMPONENT
// ==========================================
export const TouchableFeedback: React.FC<TouchableFeedbackProps> = ({
  children,
  style,
  touchOpacity = DEFAULT_TOUCH_OPACITY,
  rippleColor = DEFAULT_RIPPLE_COLOR,
  rippleBorderless = false,
  hitSlopSize,
  disabled = false,
  minTouchTarget = true,
  onPress,
  ...pressableProps
}) => {
  // Get hit slop based on preset
  const hitSlop = hitSlopSize ? hitSlopPresets[hitSlopSize] : undefined;

  // Create the style function for Pressable
  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
      const baseStyle: ViewStyle = {
        // Ensure minimum touch target for accessibility
        ...(minTouchTarget && {
          minWidth: touchTargets.minimum,
          minHeight: touchTargets.minimum,
        }),
      };

      // On iOS, apply opacity feedback
      const pressedStyle: ViewStyle = !isAndroid && pressed
        ? { opacity: touchOpacity }
        : {};

      // Combine styles
      return [baseStyle, style, pressedStyle];
    },
    [style, touchOpacity, minTouchTarget]
  );

  // Android ripple config
  const androidRipple = isAndroid
    ? {
        color: rippleColor,
        borderless: rippleBorderless,
      }
    : undefined;

  return (
    <Pressable
      style={getStyle}
      android_ripple={androidRipple}
      hitSlop={hitSlop}
      disabled={disabled}
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...pressableProps}
    >
      {children}
    </Pressable>
  );
};

// ==========================================
// VARIANTS
// ==========================================

/**
 * TouchableScale - Adds scale animation on press
 */
export interface TouchableScaleProps extends TouchableFeedbackProps {
  /** Scale when pressed (0-1) */
  scalePressed?: number;
}

export const TouchableScale: React.FC<TouchableScaleProps> = ({
  children,
  style,
  scalePressed = 0.97,
  disabled = false,
  ...props
}) => {
  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
      return [
        style,
        {
          transform: [{ scale: pressed && !disabled ? scalePressed : 1 }],
        },
      ];
    },
    [style, scalePressed, disabled]
  );

  return (
    <Pressable
      style={getStyle}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...props}
    >
      {children}
    </Pressable>
  );
};

/**
 * TouchableHighlight - Applies background color change on press
 */
export interface TouchableHighlightProps extends TouchableFeedbackProps {
  /** Background color when pressed */
  underlayColor?: string;
}

export const TouchableHighlight: React.FC<TouchableHighlightProps> = ({
  children,
  style,
  underlayColor = 'rgba(0, 0, 0, 0.1)',
  disabled = false,
  ...props
}) => {
  const getStyle = useCallback(
    ({ pressed }: { pressed: boolean }): StyleProp<ViewStyle> => {
      return [
        style,
        pressed && !disabled && { backgroundColor: underlayColor },
      ];
    },
    [style, underlayColor, disabled]
  );

  return (
    <Pressable
      style={getStyle}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...props}
    >
      {children}
    </Pressable>
  );
};

// Default export
export default TouchableFeedback;
