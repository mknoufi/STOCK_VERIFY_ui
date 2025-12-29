/**
 * LiveIndicator Component - Aurora Design
 *
 * Pulsing dot indicator for live/active status
 * Features:
 * - Smooth pulse animation
 * - Customizable colors
 * - Optional label
 */

import React, { useEffect } from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

interface LiveIndicatorProps {
  label?: string;
  color?: string;
  size?: "small" | "medium" | "large";
  style?: ViewStyle;
}

const sizeMap = {
  small: 8,
  medium: 12,
  large: 16,
};

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  label = "Live",
  color = auroraTheme.colors.success[500],
  size = "medium",
  style,
}) => {
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulseOpacity, pulseScale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const dotSize = sizeMap[size];

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.dotContainer,
          { width: dotSize * 2, height: dotSize * 2 },
        ]}
      >
        {/* Pulse ring */}
        <Animated.View
          style={[
            styles.pulse,
            pulseStyle,
            {
              width: dotSize * 2,
              height: dotSize * 2,
              borderRadius: dotSize,
              backgroundColor: color,
            },
          ]}
        />
        {/* Core dot */}
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      {label && (
        <Text
          style={[
            styles.label,
            {
              fontFamily: auroraTheme.typography.fontFamily.label,
              fontSize: auroraTheme.typography.fontSize.sm,
              color: auroraTheme.colors.text.primary,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: auroraTheme.spacing.sm,
  },
  dotContainer: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  pulse: {
    position: "absolute",
    opacity: 0.4,
  },
  dot: {
    ...auroraTheme.shadows.sm,
  },
  label: {
    fontWeight: "600",
  },
});
