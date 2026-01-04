/**
 * RippleButton Component - Aurora Design v2.0
 *
 * Material-style ripple button with gradient support
 * Features:
 * - Ripple effect on press
 * - Gradient backgrounds
 * - Multiple variants
 * - Loading state
 * - Haptic feedback
 */

import React, { useState } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  LayoutChangeEvent,
  GestureResponderEvent,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "ghost"
  | "outline";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface RippleButtonProps {
  children?: React.ReactNode;
  label?: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  hapticFeedback?: "light" | "medium" | "heavy" | "none";
}

const variantStyles = {
  primary: {
    gradient: auroraTheme.colors.aurora.primary,
    textColor: auroraTheme.colors.text.primary,
    rippleColor: "rgba(255, 255, 255, 0.3)",
  },
  secondary: {
    gradient: auroraTheme.colors.aurora.secondary,
    textColor: auroraTheme.colors.text.primary,
    rippleColor: "rgba(255, 255, 255, 0.3)",
  },
  success: {
    gradient: auroraTheme.colors.aurora.success,
    textColor: auroraTheme.colors.text.primary,
    rippleColor: "rgba(255, 255, 255, 0.3)",
  },
  warning: {
    gradient: auroraTheme.colors.aurora.warm,
    textColor: auroraTheme.colors.text.primary,
    rippleColor: "rgba(255, 255, 255, 0.3)",
  },
  error: {
    gradient: [
      auroraTheme.colors.error[500],
      auroraTheme.colors.error[700],
    ] as const,
    textColor: auroraTheme.colors.text.primary,
    rippleColor: "rgba(255, 255, 255, 0.3)",
  },
  ghost: {
    gradient: ["transparent", "transparent"] as const,
    textColor: auroraTheme.colors.text.primary,
    rippleColor: "rgba(255, 255, 255, 0.1)",
  },
  outline: {
    gradient: ["transparent", "transparent"] as const,
    textColor: auroraTheme.colors.primary[400],
    rippleColor: "rgba(21, 96, 189, 0.2)",
  },
};

const sizeStyles = {
  sm: {
    paddingVertical: auroraTheme.spacing.sm,
    paddingHorizontal: auroraTheme.spacing.md,
    fontSize: auroraTheme.typography.fontSize.sm,
    iconSize: 16,
    borderRadius: auroraTheme.borderRadius.md,
  },
  md: {
    paddingVertical: auroraTheme.spacing.md,
    paddingHorizontal: auroraTheme.spacing.lg,
    fontSize: auroraTheme.typography.fontSize.md,
    iconSize: 20,
    borderRadius: auroraTheme.borderRadius.lg,
  },
  lg: {
    paddingVertical: auroraTheme.spacing.lg,
    paddingHorizontal: auroraTheme.spacing.xl,
    fontSize: auroraTheme.typography.fontSize.lg,
    iconSize: 24,
    borderRadius: auroraTheme.borderRadius.xl,
  },
  xl: {
    paddingVertical: auroraTheme.spacing.xl,
    paddingHorizontal: auroraTheme.spacing["2xl"],
    fontSize: auroraTheme.typography.fontSize.xl,
    iconSize: 28,
    borderRadius: auroraTheme.borderRadius["2xl"],
  },
};

export const RippleButton: React.FC<RippleButtonProps> = ({
  children,
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  textStyle,
  hapticFeedback = "medium",
}) => {
  const [buttonLayout, setButtonLayout] = useState({ width: 0, height: 0 });
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);
  const rippleX = useSharedValue(0);
  const rippleY = useSharedValue(0);

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setButtonLayout({ width, height });
  };

  const triggerRipple = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    rippleX.value = locationX;
    rippleY.value = locationY;

    // Calculate max ripple size
    const maxDistance = Math.sqrt(
      Math.pow(Math.max(locationX, buttonLayout.width - locationX), 2) +
        Math.pow(Math.max(locationY, buttonLayout.height - locationY), 2),
    );
    const maxScale = (maxDistance * 2) / 10; // 10 is base ripple size

    rippleScale.value = 0;
    rippleOpacity.value = 1;

    rippleScale.value = withTiming(maxScale, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });

    rippleOpacity.value = withTiming(0, {
      duration: 600,
      easing: Easing.out(Easing.cubic),
    });
  };

  const handlePress = (event: GestureResponderEvent) => {
    if (disabled || loading) return;

    triggerRipple(event);

    if (Platform.OS !== "web" && hapticFeedback !== "none") {
      const hapticType = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[hapticFeedback];
      Haptics.impactAsync(hapticType);
    }

    onPress?.();
  };

  const rippleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: rippleX.value - 5 },
      { translateY: rippleY.value - 5 },
      { scale: rippleScale.value },
    ],
    opacity: rippleOpacity.value,
  }));

  const content = (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={variantStyle.textColor} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === "left" && (
            <Ionicons
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.textColor}
              style={styles.iconLeft}
            />
          )}
          {(label || children) && (
            <Text
              style={[
                styles.label,
                {
                  fontSize: sizeStyle.fontSize,
                  color: variantStyle.textColor,
                  fontFamily: auroraTheme.typography.fontFamily.label,
                },
                textStyle,
              ]}
            >
              {label || children}
            </Text>
          )}
          {icon && iconPosition === "right" && (
            <Ionicons
              name={icon}
              size={sizeStyle.iconSize}
              color={variantStyle.textColor}
              style={styles.iconRight}
            />
          )}
        </View>
      )}

      {/* Ripple effect */}
      <Animated.View
        style={[
          styles.ripple,
          { backgroundColor: variantStyle.rippleColor },
          rippleStyle,
        ]}
        pointerEvents="none"
      />
    </>
  );

  const buttonStyles: ViewStyle[] = [
    styles.button,
    {
      paddingVertical: sizeStyle.paddingVertical,
      paddingHorizontal: sizeStyle.paddingHorizontal,
      borderRadius: sizeStyle.borderRadius,
      opacity: disabled ? 0.5 : 1,
    },
    fullWidth ? styles.fullWidth : {},
    variant === "outline"
      ? {
          borderWidth: 2,
          borderColor: auroraTheme.colors.primary[400],
        }
      : {},
    style ?? {},
  ];

  if (variant === "ghost" || variant === "outline") {
    return (
      <TouchableOpacity
        style={buttonStyles}
        onPress={handlePress}
        onLayout={handleLayout}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLayout={handleLayout}
      disabled={disabled || loading}
      activeOpacity={0.9}
      style={[fullWidth && styles.fullWidth]}
    >
      <LinearGradient
        colors={variantStyle.gradient as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[buttonStyles, styles.gradient]}
      >
        {content}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  gradient: {
    overflow: "hidden",
  },
  fullWidth: {
    width: "100%",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "600",
    textAlign: "center",
  },
  iconLeft: {
    marginRight: auroraTheme.spacing.sm,
  },
  iconRight: {
    marginLeft: auroraTheme.spacing.sm,
  },
  ripple: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default RippleButton;
