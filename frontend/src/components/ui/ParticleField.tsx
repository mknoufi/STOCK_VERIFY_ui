/**
 * ParticleField Component - Aurora Design v2.0
 *
 * Floating particle animation background effect
 * Features:
 * - Floating particles with random motion
 * - Glow effects
 * - Performance optimized
 * - Customizable density and colors
 */

import React, { useEffect, useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
}

interface ParticleFieldProps {
  count?: number;
  color?: string;
  minSize?: number;
  maxSize?: number;
  animated?: boolean;
}

const ParticleElement: React.FC<{
  particle: Particle;
  color: string;
  animated: boolean;
}> = ({ particle, color, animated }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(particle.opacity);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (animated) {
      // Floating animation
      translateY.value = withDelay(
        particle.delay,
        withRepeat(
          withSequence(
            withTiming(-30, {
              duration: 3000 + Math.random() * 2000,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(30, {
              duration: 3000 + Math.random() * 2000,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          -1,
          true,
        ),
      );

      // Pulse opacity
      opacity.value = withDelay(
        particle.delay,
        withRepeat(
          withSequence(
            withTiming(particle.opacity * 1.5, {
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(particle.opacity * 0.5, {
              duration: 2000,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          -1,
          true,
        ),
      );

      // Slight scale pulse
      scale.value = withDelay(
        particle.delay,
        withRepeat(
          withSequence(
            withTiming(1.2, {
              duration: 2500,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(0.8, {
              duration: 2500,
              easing: Easing.inOut(Easing.ease),
            }),
          ),
          -1,
          true,
        ),
      );
    }
  }, [animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          left: particle.x,
          top: particle.y,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
          backgroundColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: particle.size,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ParticleField: React.FC<ParticleFieldProps> = ({
  count = 20,
  color = auroraTheme.colors.primary[400],
  minSize = 2,
  maxSize = 6,
  animated = true,
}) => {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }).map((_, index) => ({
      id: index,
      x: Math.random() * SCREEN_WIDTH,
      y: Math.random() * SCREEN_HEIGHT,
      size: minSize + Math.random() * (maxSize - minSize),
      opacity: 0.2 + Math.random() * 0.4,
      delay: Math.random() * 2000,
    }));
  }, [count, minSize, maxSize]);

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle) => (
        <ParticleElement
          key={particle.id}
          particle={particle}
          color={color}
          animated={animated}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
  },
});

export default ParticleField;
