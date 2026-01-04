/**
 * FloatingScanButton Component
 *
 * Large floating action button for scanning
 * Features:
 * - Pulse animation
 * - Gradient background
 * - Haptic feedback
 * - Glow effect
 * - Accessibility optimized
 */

import React, { useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useThemeContext } from "../../context/ThemeContext";

interface FloatingScanButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  size?: number;
  disabled?: boolean;
  testID?: string;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export const FloatingScanButton: React.FC<FloatingScanButtonProps> = ({
  onPress,
  style,
  size,
  disabled = false,
  testID = "floating-scan-button",
}) => {
  const { themeLegacy: theme } = useThemeContext();
  const buttonSize = size || theme.componentSizes?.button?.xl || 72;

  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    // Glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulseScale, glowOpacity]);

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: glowOpacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withTiming(0.95, { duration: 100 });
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handlePressOut = () => {
    scale.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (!disabled) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      onPress();
    }
  };

  const fallbackColor = theme.colors.accent || "#6366F1";
  const gradientColors = theme.gradients?.primary || [
    fallbackColor,
    fallbackColor,
  ];
  const glowShadow = theme.shadows?.glow || {};

  return (
    <AnimatedTouchable
      style={[
        styles.container,
        { width: buttonSize, height: buttonSize },
        style,
        buttonStyle,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.9}
      testID={testID}
      accessible={true}
      accessibilityLabel="Scan barcode"
      accessibilityHint="Double tap to open camera and scan item barcode"
      accessibilityRole="button"
    >
      {/* Glow effect (pulse ring) */}
      <AnimatedGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.glow,
          pulseStyle,
          {
            width: buttonSize + 20,
            height: buttonSize + 20,
            borderRadius: (buttonSize + 20) / 2,
          },
        ]}
      />

      {/* Main button */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            opacity: disabled ? 0.5 : 1,
            borderColor: theme.colors.borderLight || theme.colors.border,
          },
        ]}
      >
        <Ionicons
          name="scan"
          size={buttonSize * 0.5}
          color="#FFFFFF" // White for best visibility on gradient background
        />
      </LinearGradient>

      {/* Shadow overlay for depth */}
      <Animated.View
        style={[
          styles.shadow,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
          },
          glowShadow,
        ]}
      />
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    position: "absolute",
    opacity: 0.3,
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    // borderColor is set dynamically
  },
  shadow: {
    position: "absolute",
    pointerEvents: "none",
  },
});

export default FloatingScanButton;
