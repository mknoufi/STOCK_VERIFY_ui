/**
 * Success Animation - Animated checkmark for success feedback
 */

import React, { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
} from "react-native-reanimated";
import Svg, { Circle, Path } from "react-native-svg";
import styled from "@emotion/native";
import { modernColors, modernShadows } from "../../styles/modernDesignSystem";
import { springPresets, timingPresets } from "../../utils/animationHelpers";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SuccessAnimationProps {
  size?: number;
  color?: string;
  onComplete?: () => void;
  style?: ViewStyle;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  size = 80,
  color = modernColors.success.main,
  onComplete,
  style,
}) => {
  const scale = useSharedValue(0);
  const circleProgress = useSharedValue(0);
  const checkProgress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Sequence: fade in -> scale circle -> draw checkmark
    opacity.value = withTiming(1, timingPresets.fast);

    scale.value = withDelay(
      100,
      withSpring(1, springPresets.bouncy, (finished) => {
        if (finished) {
          // Draw circle
          circleProgress.value = withTiming(1, { duration: 400 }, (finished) => {
            if (finished) {
              // Draw checkmark
              checkProgress.value = withTiming(1, { duration: 300 }, (finished) => {
                if (finished && onComplete) {
                  onComplete();
                }
              });
            }
          });
        }
      })
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const circleProps = useAnimatedProps(() => {
    const circumference = 2 * Math.PI * (size / 2 - 4);
    const strokeDashoffset = circumference * (1 - circleProgress.value);

    return {
      strokeDasharray: `${circumference} ${circumference}`,
      strokeDashoffset,
    };
  });

  const checkProps = useAnimatedProps(() => {
    const pathLength = 60; // Approximate path length
    const strokeDashoffset = pathLength * (1 - checkProgress.value);

    return {
      strokeDasharray: `${pathLength} ${pathLength}`,
      strokeDashoffset,
    };
  });

  return (
    <Container style={[{ width: size, height: size }, style]}>
      <Animated.View style={containerStyle}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 4}
            fill="none"
            stroke={`${color}33`}
            strokeWidth={3}
          />

          {/* Animated circle */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 4}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeLinecap="round"
            animatedProps={circleProps}
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />

          {/* Checkmark */}
          <AnimatedPath
            d={`M ${size * 0.3} ${size * 0.5} L ${size * 0.45} ${size * 0.65} L ${
              size * 0.7
            } ${size * 0.35}`}
            fill="none"
            stroke={color}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            animatedProps={checkProps}
          />
        </Svg>
      </Animated.View>
    </Container>
  );
};

// Styled Components
const Container = styled.View`
  align-items: center;
  justify-content: center;
`;