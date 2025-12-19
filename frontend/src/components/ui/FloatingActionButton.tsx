/**
 * FloatingActionButton Component - Premium FAB
 * Features:
 * - Gradient background
 * - Pulse animation
 * - Shadow and glow effects
 * - Press animation
 * - Optional mini variant
 * - Badge support
 */

import React, { useEffect } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  modernColors,
  modernTypography,
  modernSpacing,
  modernBorderRadius,
  modernShadows,
} from "../../styles/modernDesignSystem";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

type FABSize = "mini" | "default" | "extended";

interface FloatingActionButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  label?: string;
  size?: FABSize;
  gradientColors?: [string, string];
  pulse?: boolean;
  badge?: number | string;
  position?: "bottom-right" | "bottom-center" | "bottom-left";
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

const sizeConfig: Record<
  FABSize,
  { width: number; height: number; iconSize: number }
> = {
  mini: { width: 48, height: 48, iconSize: 20 },
  default: { width: 60, height: 60, iconSize: 26 },
  extended: { width: "auto" as any, height: 56, iconSize: 22 },
};

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  label,
  size = "default",
  gradientColors,
  pulse = false,
  badge,
  position = "bottom-right",
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const shadowOpacity = useSharedValue(0.3);
  const config = sizeConfig[size === "extended" && label ? "extended" : size];

  // Pulse animation
  useEffect(() => {
    if (pulse && !disabled) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1000 }),
          withTiming(1, { duration: 1000 }),
        ),
        -1,
        true,
      );
      shadowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 }),
        ),
        -1,
        true,
      );
    }
  }, [pulse, disabled, pulseScale, shadowOpacity]);

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulseScale.value }],
  }));

  const getPositionStyle = (): ViewStyle => {
    switch (position) {
      case "bottom-center":
        return { alignSelf: "center" };
      case "bottom-left":
        return { alignSelf: "flex-start" };
      default:
        return { alignSelf: "flex-end" };
    }
  };

  const buttonStyle: ViewStyle = {
    width: size === "extended" && label ? "auto" : config.width,
    height: config.height,
    borderRadius:
      size === "extended" && label ? modernBorderRadius.xl : config.width / 2,
    paddingHorizontal: size === "extended" && label ? modernSpacing.lg : 0,
  };

  const defaultGradient: [string, string] = [
    modernColors.primary[500],
    modernColors.primary[600],
  ];
  const colors = gradientColors || defaultGradient;

  return (
    <View style={[styles.wrapper, getPositionStyle(), style]}>
      <Animated.View style={[animatedStyle]}>
        <AnimatedTouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          disabled={disabled}
          style={[disabled && styles.disabled]}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
        >
          <LinearGradient
            colors={colors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, buttonStyle]}
          >
            <Ionicons name={icon} size={config.iconSize} color="#FFFFFF" />
            {size === "extended" && label && (
              <Text style={styles.label}>{label}</Text>
            )}
          </LinearGradient>

          {/* Badge */}
          {badge !== undefined && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {typeof badge === "number" && badge > 99 ? "99+" : badge}
              </Text>
            </View>
          )}
        </AnimatedTouchableOpacity>
      </Animated.View>

      {/* Glow effect */}
      {!disabled && (
        <View
          style={[
            styles.glow,
            {
              backgroundColor: colors[0],
              width: config.width,
              height: config.width,
              borderRadius: config.width / 2,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: modernSpacing.sm,
    ...modernShadows.lg,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...modernTypography.button.medium,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: modernColors.error.main,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: modernColors.background.default,
  },
  badgeText: {
    ...modernTypography.label.small,
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
  },
  glow: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: "-50%" }, { translateY: "-50%" }],
    opacity: 0.15,
    zIndex: -1,
  },
});

export default FloatingActionButton;
