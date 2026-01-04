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
import {
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  useWindowDimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useThemeContext } from "../../context/ThemeContext";
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
  style?: StyleProp<ViewStyle>;
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
  const { theme } = useThemeContext();

  // Use theme colors for aurora variants with a safe fallback for mocks.
  const fallbackColor = theme.colors.accent || "#6366F1";
  const auroraPalette = theme.colors.aurora;
  const colors =
    auroraPalette?.[variant] ||
    auroraPalette?.primary ||
    ([fallbackColor, fallbackColor, fallbackColor] as const);

  // Animation values for gradient blobs
  const blob1X = useSharedValue(0);
  const blob1Y = useSharedValue(0);
  const blob2X = useSharedValue(0);
  const blob2Y = useSharedValue(0);
  const blob3X = useSharedValue(0);
  const blob3Y = useSharedValue(0);

  useEffect(() => {
    if (animated && Platform.OS !== "web") {
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

  const BlobComponent = Platform.OS === "web" ? View : Animated.View;

  return (
    <View style={[styles.container, style]}>
      {/* Base gradient background - verify if theme has specific background gradient or use colors */}
      <LinearGradient
        colors={[
          theme.colors.background.default,
          theme.colors.background.paper || theme.colors.background.default,
        ]}
        style={StyleSheet.absoluteFill}
      />

      {/* Animated gradient blobs */}
      <BlobComponent
        style={[
          styles.blob,
          {
            width: width * 1.2,
            height: width * 1.2,
            top: -width * 0.3,
            left: -width * 0.2,
          },
          Platform.OS === "web" ? { opacity } : blob1Style,
          Platform.OS !== "web" && { opacity },
        ]}
      >
        <LinearGradient
          colors={[colors[0], colors[1]] as readonly [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.blobGradient}
        />
      </BlobComponent>

      <BlobComponent
        style={[
          styles.blob,
          {
            width: width * 1,
            height: width * 1,
            bottom: -width * 0.2,
            right: -width * 0.3,
          },
          Platform.OS === "web" ? { opacity } : blob2Style,
          Platform.OS !== "web" && { opacity },
        ]}
      >
        <LinearGradient
          colors={[colors[1], colors[2]] as readonly [string, string]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.blobGradient}
        />
      </BlobComponent>

      <BlobComponent
        style={[
          styles.blob,
          {
            width: width * 0.8,
            height: width * 0.8,
            top: height * 0.4,
            left: width * 0.1,
          },
          Platform.OS === "web" ? { opacity } : blob3Style,
          Platform.OS !== "web" && { opacity },
        ]}
      >
        <LinearGradient
          colors={[colors[2], colors[0]] as readonly [string, string]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.blobGradient}
        />
      </BlobComponent>

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
