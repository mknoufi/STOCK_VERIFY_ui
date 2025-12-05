/**
 * Skeleton Component - Loading placeholder
 * Safe, non-breaking addition for loading states
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { useTheme } from "../../hooks/useTheme";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
  variant = "rectangular",
}) => {
  const theme = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "circular":
        return {
          width: height,
          height,
          borderRadius: height / 2,
        };
      case "text":
        return {
          height,
          borderRadius: borderRadius || 4,
        };
      default:
        return {
          height,
          borderRadius,
        };
    }
  };

  const variantStyle = getVariantStyle();

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: typeof width === "string" ? width : width,
          height: variantStyle.height,
          borderRadius: variantStyle.borderRadius,
          backgroundColor: theme.colors.surface,
        } as any,
        { opacity },
        style as any,
      ]}
    />
  );
};

interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: string | number;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = "60%",
}) => {
  return (
    <View>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          height={lineHeight}
          width={index === lines - 1 ? lastLineWidth : "100%"}
          style={{ marginBottom: 8 }}
          variant="text"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
