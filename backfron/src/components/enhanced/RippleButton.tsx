/**
 * Ripple Button - Enhanced button with ripple effect and animations
 */

import React from "react";
import { ActivityIndicator, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import styled from "@emotion/native";
import {
  modernColors,
  modernBorderRadius,
  modernSpacing,
  modernTypography,
  modernShadows,
} from "../../styles/modernDesignSystem";
import {
  animatePress,
  animateRelease,
} from "../../utils/animationHelpers";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
type ButtonSize = "small" | "medium" | "large";

interface RippleButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: "left" | "right";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  hapticFeedback?: boolean;
  rippleEffect?: boolean;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export const RippleButton: React.FC<RippleButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  hapticFeedback = true,
  rippleEffect = true,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(0);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rippleScale.value }],
    opacity: rippleOpacity.value,
  }));

  const handlePressIn = () => {
    if (disabled || loading) return;
    animatePress(scale, opacity);
  };

  const handlePressOut = () => {
    if (disabled || loading) return;
    animateRelease(scale, opacity);
  };

  const handlePress = () => {
    if (disabled || loading) return;

    // Haptic feedback
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Ripple effect
    if (rippleEffect) {
      rippleScale.value = 0;
      rippleOpacity.value = 0.5;

      rippleScale.value = withTiming(2, { duration: 600 });
      rippleOpacity.value = withTiming(0, { duration: 600 }, (finished) => {
        if (finished) {
          rippleScale.value = 0;
        }
      });
    }

    onPress();
  };

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: modernBorderRadius.button,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      overflow: "hidden",
      position: "relative",
    };

    // Size
    const sizeStyle = getSizeStyle();

    // Variant
    let variantStyle: ViewStyle = {};
    switch (variant) {
      case "primary":
        variantStyle = {
          backgroundColor: modernColors.primary[500],
          ...modernShadows.primary,
        };
        break;
      case "secondary":
        variantStyle = {
          backgroundColor: modernColors.secondary[500],
          ...modernShadows.success,
        };
        break;
      case "outline":
        variantStyle = {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: modernColors.primary[500],
        };
        break;
      case "ghost":
        variantStyle = {
          backgroundColor: "transparent",
        };
        break;
      case "danger":
        variantStyle = {
          backgroundColor: modernColors.error.main,
          ...modernShadows.error,
        };
        break;
      case "success":
        variantStyle = {
          backgroundColor: modernColors.success.main,
          ...modernShadows.success,
        };
        break;
    }

    // Disabled state
    if (disabled) {
      variantStyle = {
        ...variantStyle,
        backgroundColor: modernColors.states.disabled.background,
        borderColor: modernColors.states.disabled.border,
        opacity: 0.5,
      };
    }

    return {
      ...baseStyle,
      ...sizeStyle,
      ...variantStyle,
      width: fullWidth ? "100%" : undefined,
    };
  };

  const getSizeStyle = (): ViewStyle => {
    switch (size) {
      case "small":
        return {
          paddingVertical: modernSpacing[2],
          paddingHorizontal: modernSpacing[4],
          minHeight: 36,
          gap: modernSpacing.xs,
        };
      case "large":
        return {
          paddingVertical: modernSpacing[4],
          paddingHorizontal: modernSpacing[6],
          minHeight: 56,
          gap: modernSpacing.sm,
        };
      default:
        return {
          paddingVertical: modernSpacing[3],
          paddingHorizontal: modernSpacing[5],
          minHeight: 48,
          gap: modernSpacing.sm,
        };
    }
  };

  const getTextColor = (): string => {
    if (disabled) return modernColors.states.disabled.text;
    if (variant === "outline" || variant === "ghost") return modernColors.primary[500];
    return modernColors.text.primary;
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

  const renderIcon = () => {
    if (!icon || loading) return null;
    return <Ionicons name={icon} size={getIconSize()} color={getTextColor()} />;
  };

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="small" color={getTextColor()} />;
    }

    return (
      <>
        {icon && iconPosition === "left" && renderIcon()}
        <ButtonText
          size={size}
          color={getTextColor()}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </ButtonText>
        {icon && iconPosition === "right" && renderIcon()}
      </>
    );
  };

  return (
    <AnimatedTouchableOpacity
      style={[getButtonStyle(), animatedButtonStyle, style]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {/* Ripple effect */}
      {rippleEffect && (
        <RippleContainer style={animatedRippleStyle}>
          <RippleCircle variant={variant} />
        </RippleContainer>
      )}

      {/* Button content */}
      <ContentContainer>{renderContent()}</ContentContainer>
    </AnimatedTouchableOpacity>
  );
};

// Styled Components
const ContentContainer = styled.View`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  z-index: 1;
`;

const ButtonText = styled.Text<{ size: ButtonSize; color: string }>`
  font-size: ${(props) =>
    props.size === "small"
      ? modernTypography.button.small.fontSize
      : props.size === "large"
      ? modernTypography.button.large.fontSize
      : modernTypography.button.medium.fontSize}px;
  font-weight: ${modernTypography.button.medium.fontWeight};
  color: ${(props) => props.color};
  text-align: center;
`;

const RippleContainer = styled(Animated.View)`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  z-index: 0;
`;

const RippleCircle = styled.View<{ variant: ButtonVariant }>`
  width: 100%;
  height: 100%;
  border-radius: 1000px;
  background-color: ${(props) =>
    props.variant === "outline" || props.variant === "ghost"
      ? modernColors.primary[500]
      : "rgba(255, 255, 255, 0.3)"};
`;
