/**
 * AnimatedPressable Component
 * Modern pressable with spring animations inspired by native-springs
 * Provides tactile feedback with scale and opacity animations
 */

import React, { useCallback } from "react";
import {
  Pressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
  Animated,
  StyleProp,
} from "react-native";
import * as Haptics from "expo-haptics";

interface AnimatedPressableProps extends Omit<PressableProps, "style"> {
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  hapticFeedback?: "light" | "medium" | "heavy" | "none";
  children: React.ReactNode;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  style,
  scaleValue = 0.97,
  hapticFeedback = "light",
  children,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...props
}) => {
  const animatedScale = React.useRef(new Animated.Value(1)).current;
  const animatedOpacity = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(
    (event: any) => {
      // Spring animation for natural feel
      Animated.parallel([
        Animated.spring(animatedScale, {
          toValue: scaleValue,
          useNativeDriver: true,
          speed: 50,
          bounciness: 4,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Haptic feedback
      if (hapticFeedback !== "none") {
        const impactStyle =
          hapticFeedback === "light"
            ? Haptics.ImpactFeedbackStyle.Light
            : hapticFeedback === "medium"
              ? Haptics.ImpactFeedbackStyle.Medium
              : Haptics.ImpactFeedbackStyle.Heavy;
        Haptics.impactAsync(impactStyle);
      }

      onPressIn?.(event);
    },
    [animatedScale, animatedOpacity, scaleValue, hapticFeedback, onPressIn]
  );

  const handlePressOut = useCallback(
    (event: any) => {
      Animated.parallel([
        Animated.spring(animatedScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 20,
          bounciness: 8,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      onPressOut?.(event);
    },
    [animatedScale, animatedOpacity, onPressOut]
  );

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      {...props}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: animatedScale }],
            opacity: disabled ? 0.5 : animatedOpacity,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

// Convenience wrapper for card-like pressables
export const AnimatedCard: React.FC<AnimatedPressableProps> = (props) => {
  return (
    <AnimatedPressable
      scaleValue={0.98}
      hapticFeedback="light"
      {...props}
      style={[styles.card, props.style]}
    />
  );
};

// Convenience wrapper for button-like pressables
export const AnimatedButton: React.FC<AnimatedPressableProps> = (props) => {
  return (
    <AnimatedPressable
      scaleValue={0.95}
      hapticFeedback="medium"
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    overflow: "hidden",
  },
});

export default AnimatedPressable;
