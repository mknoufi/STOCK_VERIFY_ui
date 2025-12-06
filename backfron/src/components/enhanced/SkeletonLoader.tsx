/**
 * Skeleton Loader - Animated loading placeholder
 */

import React, { useEffect } from "react";
import { View, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import styled from "@emotion/native";
import { modernColors, modernBorderRadius, modernSpacing } from "../../styles/modernDesignSystem";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: "text" | "circular" | "rectangular";
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = modernBorderRadius.sm,
  style,
  variant = "rectangular",
}) => {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.3, 0.7, 0.3], Extrapolate.CLAMP);

    return {
      opacity,
    };
  });

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "circular":
        return {
          width: height,
          height: height,
          borderRadius: height / 2,
        };
      case "text":
        return {
          width: typeof width === "number" ? width : undefined,
          height,
          borderRadius: modernBorderRadius.xs,
        };
      default:
        return {
          width: typeof width === "number" ? width : undefined,
          height,
          borderRadius,
        };
    }
  };

  // For string widths, we need to handle them separately with type assertion
  const widthStyle = typeof width === "string" ? ({ width } as ViewStyle) : {};

  return (
    <SkeletonContainer style={[getVariantStyle(), widthStyle, style]}>
      <AnimatedShimmer style={animatedStyle} />
    </SkeletonContainer>
  );
};

// Skeleton List Component
interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  gap?: number;
  style?: ViewStyle;
}

export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 3,
  itemHeight = 80,
  gap = modernSpacing.md,
  style,
}) => {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ marginBottom: index < count - 1 ? gap : 0 }}>
          <SkeletonLoader height={itemHeight} />
        </View>
      ))}
    </View>
  );
};

// Skeleton Card Component
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <CardContainer style={style}>
      <SkeletonLoader width="60%" height={24} style={{ marginBottom: modernSpacing.sm }} />
      <SkeletonLoader width="40%" height={16} style={{ marginBottom: modernSpacing.md }} />
      <SkeletonLoader width="100%" height={60} style={{ marginBottom: modernSpacing.sm }} />
      <SkeletonLoader width="80%" height={16} />
    </CardContainer>
  );
};

// Styled Components
const SkeletonContainer = styled.View`
  background-color: ${modernColors.neutral[800]};
  overflow: hidden;
`;

const AnimatedShimmer = styled(Animated.View)`
  flex: 1;
  background-color: ${modernColors.neutral[700]};
`;

const CardContainer = styled.View`
  background-color: ${modernColors.background.paper};
  border-radius: ${modernBorderRadius.card}px;
  padding: ${modernSpacing.cardPadding}px;
  border-width: 1px;
  border-color: ${modernColors.border.light};
`;