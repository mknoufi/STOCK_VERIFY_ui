import React, { useRef } from "react";
import {
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Animated,
  Pressable,
  StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  modernColors,
  modernBorderRadius,
  modernSpacing,
  modernAnimations,
  modernShadows,
} from "../../styles/modernDesignSystem";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
export type ButtonSize = "small" | "medium" | "large";

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  hapticFeedback?: boolean;
  fullWidth?: boolean;
}

export const PremiumButton: React.FC<PremiumButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  style,
  textStyle,
  hapticFeedback = true,
  fullWidth = false,
}) => {
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Handle press in
  const handlePressIn = () => {
    if (disabled || loading) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: modernAnimations.scale.pressed,
        useNativeDriver: true,
        ...modernAnimations.easing.spring,
      }),
      Animated.timing(opacityAnim, {
        toValue: modernAnimations.opacity.pressed,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle press out
  const handlePressOut = () => {
    if (disabled || loading) return;

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        ...modernAnimations.easing.spring,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePress = () => {
    if (disabled || loading) return;

    if (hapticFeedback) {
      Haptics.selectionAsync();
    }

    onPress();
  };

  // Get styles based on variant and size
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return styles.primaryButton;
      case "secondary":
        return styles.secondaryButton;
      case "outline":
        return styles.outlineButton;
      case "ghost":
        return styles.ghostButton;
      case "danger":
        return styles.dangerButton;
      case "success":
        return styles.successButton;
      default:
        return styles.primaryButton;
    }
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case "small":
        return {
          paddingVertical: 6,
          paddingHorizontal: 12,
          minHeight: 32,
        };
      case "large":
        return {
          paddingVertical: 16,
          paddingHorizontal: 24,
          minHeight: 56,
        };
      default: // medium
        return {
          paddingVertical: 12,
          paddingHorizontal: 16,
          minHeight: 48,
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: "600",
      textAlign: "center",
    };

    switch (variant) {
      case "outline":
      case "ghost":
        return { ...baseStyle, color: modernColors.primary[500] };
      case "secondary":
        return { ...baseStyle, color: modernColors.text.primary };
      default:
        return { ...baseStyle, color: "#FFFFFF" };
    }
  };

  const getIconColor = (): string => {
    if (disabled) return modernColors.text.disabled;
    switch (variant) {
      case "outline":
      case "ghost":
        return modernColors.primary[500];
      case "secondary":
        return modernColors.text.primary;
      default:
        return "#FFFFFF";
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case "small":
        return 16;
      case "large":
        return 24;
      default:
        return 20;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.container,
        getVariantStyle(),
        getSizeStyle(),
        disabled && styles.disabledButton,
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.contentContainer,
          { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={getIconColor()} size="small" />
        ) : (
          <>
            {icon && iconPosition === "left" && (
              <Ionicons
                name={icon}
                size={getIconSize()}
                color={getIconColor()}
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={[getTextStyle(), textStyle]}>{title}</Text>
            {icon && iconPosition === "right" && (
              <Ionicons
                name={icon}
                size={getIconSize()}
                color={getIconColor()}
                style={{ marginLeft: 8 }}
              />
            )}
          </>
        )}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: modernBorderRadius.button,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: modernColors.neutral[700],
    borderColor: modernColors.neutral[600],
  },
  primaryButton: {
    backgroundColor: modernColors.primary[500],
    borderWidth: 0,
    ...modernShadows.primary,
  },
  secondaryButton: {
    backgroundColor: modernColors.background.elevated,
    borderWidth: 1,
    borderColor: modernColors.border.light,
  },
  outlineButton: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: modernColors.primary[500],
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  dangerButton: {
    backgroundColor: modernColors.error.main,
    borderWidth: 0,
    ...modernShadows.sm,
  },
  successButton: {
    backgroundColor: modernColors.success.main,
    borderWidth: 0,
    ...modernShadows.success,
  },
  smallButton: {
    paddingVertical: modernSpacing.xs,
    paddingHorizontal: modernSpacing.md,
    minHeight: 32,
  },
  mediumButton: {
    paddingVertical: modernSpacing.sm,
    paddingHorizontal: modernSpacing.lg,
    minHeight: 44,
  },
  largeButton: {
    paddingVertical: modernSpacing.md,
    paddingHorizontal: modernSpacing.xl,
    minHeight: 56,
  },
  button: {
    borderRadius: modernBorderRadius.button,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    overflow: "hidden",
  },
  fullWidth: {
    width: "100%",
  },
});
