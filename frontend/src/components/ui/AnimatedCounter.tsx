/**
 * AnimatedCounter Component - Aurora Design v2.0
 *
 * Animated number counter with smooth transitions
 * Features:
 * - Smooth counting animation
 * - Customizable duration
 * - Number formatting
 * - Color transitions
 */

import React, { useEffect, useRef } from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import { auroraTheme } from "@/theme/auroraTheme";

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: StyleProp<TextStyle>;
  prefix?: string;
  suffix?: string;
  decimalPlaces?: number;
  formatNumber?: boolean;
}

const AnimatedText = Animated.createAnimatedComponent(Text);

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  style,
  prefix = "",
  suffix = "",
  decimalPlaces = 0,
  formatNumber = true,
}) => {
  const animatedValue = useSharedValue(0);
  const [displayValue, setDisplayValue] = React.useState("0");

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  // Use a simple interval-based approach for display
  useEffect(() => {
    const startValue = 0;
    const endValue = value;
    const startTime = Date.now();

    const updateDisplay = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * eased;

      let formatted = currentValue.toFixed(decimalPlaces);
      if (formatNumber && decimalPlaces === 0) {
        formatted = Math.round(currentValue).toLocaleString();
      }

      setDisplayValue(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(updateDisplay);
      }
    };

    requestAnimationFrame(updateDisplay);
  }, [value, duration, prefix, suffix, decimalPlaces, formatNumber]);

  return (
    <Text
      style={[
        {
          fontFamily: auroraTheme.typography.fontFamily.heading,
          fontSize: auroraTheme.typography.fontSize["3xl"],
          color: auroraTheme.colors.text.primary,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    >
      {displayValue}
    </Text>
  );
};

export default AnimatedCounter;
