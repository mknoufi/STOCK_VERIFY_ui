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
import { auroraTheme } from "@/theme/auroraTheme";

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
  size = auroraTheme.componentSizes.button.xl,
  disabled = false,
  testID = "floating-scan-button",
}) => {
  const scale = useSharedValue(1);
  const pulseScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.6);

  useEffect(() => {
    // Pulse animation
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Glow animation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

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

  return (
    <AnimatedTouchable
      style={[styles.container, { width: size, height: size }, style, buttonStyle]}
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
        colors={auroraTheme.colors.aurora.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.glow,
          pulseStyle,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
          },
        ]}
      />

      {/* Main button */}
      <LinearGradient
        colors={auroraTheme.colors.aurora.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.button,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Ionicons
          name="scan"
          size={size * 0.5}
          color={auroraTheme.colors.text.primary}
        />
      </LinearGradient>

      {/* Shadow overlay for depth */}
      <Animated.View
        style={[
          styles.shadow,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          auroraTheme.shadows.glow,
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
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  shadow: {
    position: "absolute",
    pointerEvents: "none",
  },
});

export default FloatingScanButton;