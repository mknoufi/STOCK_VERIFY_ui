/**
 * AuroraBackground Component v2.1
 *
 * Animated aurora gradient background with mesh effect
 * Features:
 * - Multiple gradient blobs with animation
 * - Optional particle field overlay
 * - Customizable colors
 * - Smooth transitions
 * - Performance optimized
 */

import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";
import { ParticleField } from "./ParticleField";

export type AuroraVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warm"
  | "dark";

interface AuroraBackgroundProps {
  variant?: AuroraVariant;
  intensity?: "low" | "medium" | "high";
  animated?: boolean;
  withParticles?: boolean;
  particleCount?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  variant = "primary",
  intensity = "medium",
  animated = true,
  withParticles = false,
  particleCount = 15,
  style,
  children,
}) => {
  const { width, height } = useWindowDimensions();
  const colors = variant === "primary"
    ? ["#0EA5E9", "#10B981", "#020617"]
    : auroraTheme.colors.aurora[variant];

  // Animation values for gradient blobs
  const blob1X = useSharedValue(0);
  const blob1Y = useSharedValue(0);
  const blob2X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob3X = useSharedValue(0);
  const blob3Y = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      // Blob 1 animation
      blob1X.value = withRepeat(
        withSequence(
          withTiming(30, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-30, {
            duration: 8000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
      blob1Y.value = withRepeat(
        withSequence(
          withTiming(20, { duration: 6000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-20, {
            duration: 6000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );

      // Blob 2 animation
      blob2X.value = withRepeat(
        withSequence(
          withTiming(-40, {
            duration: 10000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(40, {
            duration: 10000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
      blob2Y.value = withRepeat(
        withSequence(
          withTiming(-30, {
            duration: 7000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(30, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );

      // Blob 3 animation
      blob3X.value = withRepeat(
        withSequence(
          withTiming(25, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-25, {
            duration: 9000,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        true,
      );
      blob3Y.value = withRepeat(
        withSequence(
          withTiming(-25, {
            duration: 8500,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(25, { duration: 8500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      );
    }
  }, [animated, blob1X, blob1Y, blob2X, blob2Y, blob3X, blob3Y]);

  const blob1Style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob1X.value }, { translateY: blob1Y.value }],
  }));

  const blob2Style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob2X.value }, { translateY: blob2Y.value }],
  }));

  const blob3Style = useAnimatedStyle(() => ({
    transform: [{ translateX: blob3X.value }, { translateY: blob3Y.value }],
  }));

  const opacityByIntensity = {
    low: 0.15,
    medium: 0.25,
    high: 0.4,
  };

  const opacity = opacityByIntensity[intensity];

  return (
    <View style={[styles.container, style]}>
      {/* Base gradient background */}
      <LinearGradient
        colors={["#020617", "#0F172A"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated gradient blobs */}
      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 1.2,
            height: width * 1.2,
            top: -width * 0.3,
            left: -width * 0.2,
          },
          blob1Style,
          { opacity }
        ]}
      >
        <LinearGradient
          colors={[colors[0], colors[1]] as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.blobGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 1,
            height: width * 1,
            bottom: -width * 0.2,
            right: -width * 0.3,
          },
          blob2Style,
          { opacity }
        ]}
      >
        <LinearGradient
          colors={[colors[1], colors[2]] as readonly [string, string]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.blobGradient}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.blob,
          {
            width: width * 0.8,
            height: width * 0.8,
            top: height * 0.4,
            left: width * 0.1,
          },
          blob3Style,
          { opacity }
        ]}
      >
        <LinearGradient
          colors={[colors[2], colors[0]] as readonly [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.blobGradient}
        />
      </Animated.View>

      {/* Optional Particle Field overlay */}
      {withParticles && (
        <ParticleField
          count={particleCount}
          color={colors[1]}
          animated={animated}
        />
      )}

      {/* Content overlay */}
      {children && <View style={styles.content}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    borderRadius: 9999,
  },
  blobGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 9999,
  },
  content: {
    flex: 1,
    position: "relative",
    zIndex: 1,
  },
});

export default AuroraBackground;
