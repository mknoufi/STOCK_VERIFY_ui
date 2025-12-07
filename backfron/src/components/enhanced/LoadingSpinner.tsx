/**
 * Loading Spinner - Animated loading indicator
 */

import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import styled from "@emotion/native";
import { modernColors } from "../../styles/modernDesignSystem";

type SpinnerSize = "small" | "medium" | "large";
type SpinnerVariant = "primary" | "secondary" | "white";

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  style?: ViewStyle;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  variant = "primary",
  style,
}) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, [rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const getSize = (): number => {
    switch (size) {
      case "small":
        return 20;
      case "large":
        return 48;
      default:
        return 32;
    }
  };

  const getColor = (): string => {
    switch (variant) {
      case "secondary":
        return modernColors.secondary[500];
      case "white":
        return "#FFFFFF";
      default:
        return modernColors.primary[500];
    }
  };

  const spinnerSize = getSize();
  const color = getColor();

  return (
    <Container style={style}>
      <Animated.View style={animatedStyle}>
        <SpinnerRing size={spinnerSize} color={color} />
      </Animated.View>
    </Container>
  );
};

// Styled Components
const Container = styled.View`
  align-items: center;
  justify-content: center;
`;

const SpinnerRing = styled.View<{ size: number; color: string }>`
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  border-radius: ${(props) => props.size / 2}px;
  border-width: ${(props) => Math.max(2, props.size / 10)}px;
  border-color: ${(props) => props.color}33;
  border-top-color: ${(props) => props.color};
`;
