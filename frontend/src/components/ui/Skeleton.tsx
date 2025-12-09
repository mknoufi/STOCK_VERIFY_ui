/**
 * Skeleton Component - Loading placeholder
 * Enhanced with shimmer gradient animation inspired by react-native-auto-skeleton
 * Safe, non-breaking addition for loading states
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { modernColors } from "../../styles/modernDesignSystem";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
  variant?: "text" | "circular" | "rectangular";
  shimmer?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
  variant = "rectangular",
  shimmer = true,
}) => {
  const translateX = useRef(new Animated.Value(-1)).current;
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (shimmer) {
      // Shimmer animation - sweeping highlight
      const shimmerAnimation = Animated.loop(
        Animated.timing(translateX, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    } else {
      // Fallback pulse animation
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [translateX, opacity, shimmer]);

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

  if (shimmer) {
    return (
      <View
        style={[
          styles.skeleton,
          {
            width: typeof width === "string" ? width : width,
            height: variantStyle.height,
            borderRadius: variantStyle.borderRadius,
            backgroundColor: modernColors.neutral[200],
          } as ViewStyle,
          style as ViewStyle,
        ]}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            {
              transform: [
                {
                  translateX: translateX.interpolate({
                    inputRange: [-1, 1],
                    outputRange: [-200, 200],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[
              "transparent",
              "rgba(255, 255, 255, 0.4)",
              "transparent",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: typeof width === "string" ? width : width,
          height: variantStyle.height,
          borderRadius: variantStyle.borderRadius,
          backgroundColor: modernColors.neutral[200],
          opacity,
        } as ViewStyle,
        style as ViewStyle,
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

// Card skeleton for common card loading states
export const SkeletonCard: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <Skeleton width={48} height={48} variant="circular" />
        <View style={styles.cardHeaderText}>
          <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <SkeletonText lines={2} lineHeight={14} lastLineWidth="80%" />
    </View>
  );
};

// List item skeleton
export const SkeletonListItem: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  return (
    <View style={[styles.listItem, style]}>
      <Skeleton width={40} height={40} borderRadius={8} />
      <View style={styles.listItemContent}>
        <Skeleton width="60%" height={14} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} />
      </View>
      <Skeleton width={60} height={24} borderRadius={12} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
  card: {
    padding: 16,
    backgroundColor: modernColors.background.paper,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: modernColors.background.paper,
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
});
