/**
 * Skeleton Loader Component
 * Provides loading placeholders for better perceived performance
 */
import React, { useEffect } from "react";
import { View, StyleSheet, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { modernColors } from "../../styles/modernDesignSystem";

interface SkeletonLoaderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Single skeleton loading bar with shimmer animation
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      false,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

/**
 * Stats card skeleton loader
 */
export const StatsCardSkeleton: React.FC = () => (
  <View style={styles.statsCard}>
    <SkeletonLoader width="60%" height={16} style={{ marginBottom: 8 }} />
    <SkeletonLoader width="80%" height={32} />
  </View>
);

/**
 * List item skeleton loader
 */
export const ListItemSkeleton: React.FC = () => (
  <View style={styles.listItem}>
    <SkeletonLoader width={48} height={48} borderRadius={24} />
    <View style={styles.listItemContent}>
      <SkeletonLoader width="70%" height={16} style={{ marginBottom: 6 }} />
      <SkeletonLoader width="50%" height={14} />
    </View>
  </View>
);

/**
 * Session card skeleton loader
 */
export const SessionCardSkeleton: React.FC = () => (
  <View style={styles.sessionCard}>
    <View style={styles.sessionHeader}>
      <SkeletonLoader width="40%" height={18} />
      <SkeletonLoader width={60} height={24} borderRadius={12} />
    </View>
    <View style={styles.sessionStats}>
      <SkeletonLoader width="30%" height={14} />
      <SkeletonLoader width="30%" height={14} />
      <SkeletonLoader width="30%" height={14} />
    </View>
  </View>
);

/**
 * Dashboard skeleton loader with multiple stats cards
 */
export const DashboardSkeleton: React.FC<{ count?: number }> = ({
  count = 4,
}) => (
  <View style={styles.dashboard}>
    {Array.from({ length: count }).map((_, i) => (
      <StatsCardSkeleton key={i} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: modernColors.neutral[200],
  },
  statsCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 8,
  },
  listItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  sessionCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sessionStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dashboard: {
    padding: 16,
  },
});
